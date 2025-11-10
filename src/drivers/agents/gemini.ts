import {
	type Content,
	type CreateChatParameters,
	type GenerateContentParameters,
	GoogleGenAI,
	type Part,
} from "@google/genai";
import type { User } from "discord.js";
import type { Logger } from "pino";
import type { IAgent } from "@/application/interfaces/agent.interface";
import type { AgentResponse } from "@/domains/entities/ai/agent-response";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import { type AI_PROVIDER, safeEnv } from "@/utils/env";
import { GCP } from "../cloud-providers/gcp";

export class Gemini implements IAgent {
	readonly logger: Logger;
	readonly user: User;

	constructor(logger: Logger, user: User) {
		this.logger = logger;
		this.user = user;
	}

	public getClient() {
		return new GoogleGenAI({
			// 既にspeech APIを使っているため、同一のサービスアカウントで
			// Vertex AIを経由してGeminiを使用する
			vertexai: true,
			project: safeEnv.GOOGLE_PROJECT_ID,
			location: "global",
			googleAuthOptions: {
				credentials: GCP.getCredentials(),
			},
		});
	}

	/**
	 * @see https://ai.google.dev/gemini-api/docs/text-generation?hl=ja#multi-turn-conversations
	 */
	static getResponseCreationOptions({
		tokenLimit,
	}: {
		tokenLimit?: number;
	} = {}): GenerateContentParameters {
		return {
			model: safeEnv.GEMINI_MODEL,
			contents: [],
			config: {
				temperature: 1.1,
				maxOutputTokens: tokenLimit ?? safeEnv.GOOGLE_ANSWER_MAX_TOKEN,
			},
		};
	}

	/**
	 * 会話の続きなので、前回のIDを指定したいが、
	 * Geminiにそういう機能はない
	 * そこで、無理やりID欄に履歴のJSONを保存したものを、ここで戻している
	 */
	static parseMessageHistoryJSON(string: string): Content[] {
		//
		const historyParsed = JSON.parse(string) as Content[];

		if (!Array.isArray(historyParsed)) {
			return [];
		}

		/** 画像のbase64を読み取らせてもよいが、入力が膨大になってしまう */
		return historyParsed.map((content) => {
			const parts = content.parts?.filter((part) => {
				return !Object.hasOwn(part, "inlineData");
			});
			return {
				...content,
				parts,
			};
		});
	}

	public buildInstructions({
		systemPrompt,
		tokenLimit,
	}: {
		systemPrompt?: string;
		tokenLimit?: number;
	}): string {
		return `${tokenLimit ? `(※最大${tokenLimit}トークンで回答をやめてください)\n` : ""}[PERSIST_RULES] \n
- あなたはチャットの参加者として、自然な会話をしてください。\n
- ただし、「なりきり」の指示は必ず守り、全力でキャラクターを演じてください。\n
- **画像・メディアを添付した場合、または出力する場合、必ず読み取りや理解を試み、キャラを保ちつつそれに応じた会話をしてください。**\n
- **自分がAIであること・Geminiに関するメタ的な情報は忘れてください。**\n最新の話者の名前は${this.user.displayName}といいます\n[/PERSIST_RULES]\n\n${systemPrompt ?? ""}`;
	}

	public getModelId(): string {
		return Gemini.getResponseCreationOptions().model;
	}

	public getAiProvider(): typeof AI_PROVIDER {
		return "google";
	}

	static getThreshold(): number {
		return safeEnv.GOOGLE_TOKEN_THRESHOLD;
	}

	/** 添付画像があるならインラインで添付する */
	public static getContentParts(
		text: string,
		userImage?: ChatUserImage,
	): Part[] {
		if (!userImage) {
			return [
				{
					text,
				},
			];
		}
		return [
			{
				text,
			},
			{
				inlineData: {
					mimeType: userImage.contentType,
					data: userImage.buffer.toString("base64"),
				},
			},
		];
	}

	async getFirstResponse({
		userId,
		input,
		userImage,
		systemPrompt,
		tokenLimit,
	}: {
		/**
		 * OpenAI APIにおける `user`
		 * @see https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids
		 */
		userId: string;
		input: string;
		/** 添付画像のバッファ */
		userImage?: ChatUserImage;
		/**
		 * 新しい会話を開始するための指示
		 */
		systemPrompt?: string;
		tokenLimit?: number;
	}): Promise<AgentResponse | null> {
		try {
			this.logger.debug(`Generating response for ${userId}`);
			const bodyOptions = Gemini.getResponseCreationOptions({
				tokenLimit,
			});
			// https://ai.google.dev/gemini-api/docs/text-generation?hl=ja#multi-turn-conversations
			const body: CreateChatParameters = {
				...bodyOptions,
				history: [],
				// OpenAIと異なり、過去の履歴を1つづつ消してしまうため、
				// 背景情報はinstructionsに追加する
				config: {
					...bodyOptions.config,
					systemInstruction: this.buildInstructions({
						systemPrompt,
						tokenLimit,
					}),
				},
			};
			const chat = this.getClient().chats.create(body);
			const response = await chat.sendMessage({
				message: Gemini.getContentParts(input, userImage),
			});

			/**
			 * 会話の続きなので、instructionを書かず、前回のIDを指定したいが、
			 * Geminiにそういう機能はない
			 * そこで、無理やりID欄に履歴のJSONを保存し、後で戻している
			 */
			const history = chat.getHistory();
			const historyJson = JSON.stringify(history);

			return {
				content: response.text ?? "",
				generatedImageBuffer: null,
				id: historyJson,
				historyLength: history.length,
				totalToken: response.usageMetadata?.totalTokenCount,
				threshold: Gemini.getThreshold(),
				shouldReset: false,
			};
		} catch (error) {
			this.logger.error(error);
			return null;
		}
	}

	async getContinuedResponse({
		userId,
		input,
		userImage,
		previousResponseId,
		systemPrompt,
		tokenLimit,
	}: {
		userId: string;
		input: string;
		userImage?: ChatUserImage;
		previousResponseId: string;
		systemPrompt?: string;
		tokenLimit?: number;
	}): Promise<AgentResponse | null> {
		try {
			const bodyOptions = Gemini.getResponseCreationOptions({
				tokenLimit,
			});
			const history = Gemini.parseMessageHistoryJSON(previousResponseId);

			this.logger.debug(
				{
					history,
				},
				`using history from kv for ${userId}`,
			);
			const body: CreateChatParameters = {
				...bodyOptions,
				history,
				config: {
					...bodyOptions.config,
					systemInstruction: this.buildInstructions({
						systemPrompt,
						tokenLimit,
					}),
				},
			};
			const chat = this.getClient().chats.create(body);
			const response = await chat.sendMessage({
				message: Gemini.getContentParts(input, userImage),
			});
			// トークン消費 * 会話履歴数が制限を超えた場合は、会話履歴をリセットする
			const threshold = Gemini.getThreshold();
			const totalTokens = Number(response.usageMetadata?.totalTokenCount);
			const shouldReset = totalTokens > threshold;

			// 履歴のJSONが返ってくるため、改めてJSONを保存する
			const historyJson = JSON.stringify(chat.getHistory());
			// this.logger.debug(
			// 	{
			// 		body,
			// 		response,
			// 		threshold,
			// 		shouldReset,
			// 		historyLength: history.length,
			// 	},
			// 	"got continued response",
			// );
			return {
				content: response.text ?? "",
				generatedImageBuffer: null,
				id: historyJson,
				totalToken: totalTokens,
				historyLength: history.length,
				threshold,
				shouldReset,
			};
		} catch (error) {
			this.logger.error(error);
			return null;
		}
	}
}
