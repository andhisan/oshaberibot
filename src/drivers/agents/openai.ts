import type { User } from "discord.js";
import { OpenAI as OpenAiClient } from "openai";
import type {
	ResponseCreateParamsNonStreaming,
	ResponseInput,
} from "openai/resources/responses/responses.mjs";
import type { Logger } from "pino";
import type { IAgent } from "@/application/interfaces/agent.interface";
import type { AgentResponse } from "@/domains/entities/ai/agent-response";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import { type AI_PROVIDER, safeEnv } from "@/utils/env";

export class OpenAI implements IAgent {
	private readonly logger: Logger;
	private readonly user: User;

	constructor(logger: Logger, user: User) {
		this.logger = logger;
		this.user = user;
	}

	private getClient() {
		// 注意: `OPENAI_API_KEY` 環境変数は自動的に読み込まれる
		return new OpenAiClient();
	}

	/**
	 * @see https://platform.openai.com/docs/api-reference/responses/create
	 */
	private getResponseCreationOptions({
		tokenLimit,
	}: {
		tokenLimit?: number;
	} = {}): ResponseCreateParamsNonStreaming {
		return {
			model: safeEnv.OPENAI_MODEL,
			input: "",
			// 万が一モデルが扱えるトークン数を超えると、インプットサイズを会話中に自動で制限する
			truncation: "auto",
			max_output_tokens: tokenLimit ?? safeEnv.OPENAI_CHAT_GPT_ANSWER_MAX_TOKEN,
		};
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
- **自分がAIであること・OpenAIに関するメタ的な情報は忘れてください。**\n最新の話者の名前は${this.user.displayName}といいます\n[/PERSIST_RULES]\n\n${systemPrompt ?? ""}`;
	}

	public getModelId(): string {
		return safeEnv.OPENAI_MODEL;
	}

	public getAiProvider(): typeof AI_PROVIDER {
		return "openai";
	}

	private static getThreshold(): number {
		return safeEnv.OPENAI_TOKEN_THRESHOLD;
	}

	/** 画像があるならインラインで添付する */
	private static getContentParts(
		text: string,
		userImage?: ChatUserImage,
	): ResponseInput {
		if (!userImage) {
			return [
				{
					type: "message",
					content: text,
					role: "user",
				},
			];
		}
		return [
			{
				role: "user",
				content: [
					{
						type: "input_text",
						text,
					},
					{
						type: "input_image",
						image_url: `data:${userImage.contentType};base64,${userImage.buffer.toString("base64")}`,
						// openAI APIの機能で、画像の詳細度を自動で調整する
						// もし「low」にすれば勝手に512x512 (85トークン) で処理してくれるが、
						// Geminiとの整合性のため、ここはautoにしている
						// https://platform.openai.com/docs/guides/images-vision?lang=javascript#specify-image-input-detail-level
						detail: "auto",
					},
				],
			},
		];
	}

	async getFirstResponse({
		userId,
		input,
		systemPrompt,
		userImage,
		tokenLimit,
	}: {
		userId: string;
		input: string;
		systemPrompt: string;
		userImage?: ChatUserImage;
		tokenLimit?: number;
	}): Promise<AgentResponse | null> {
		try {
			// https://platform.openai.com/docs/api-reference/responses/create
			const body = {
				...this.getResponseCreationOptions({
					tokenLimit,
				}),
				input: OpenAI.getContentParts(input, userImage),
				instructions: this.buildInstructions({ systemPrompt, tokenLimit }),
				user: userId,
			};
			const response = await this.getClient().responses.create(body);
			this.logger.debug({ body, response }, "got first response");
			const threshold = OpenAI.getThreshold();
			return {
				id: response.id,
				totalToken: response.usage?.total_tokens,
				content: response.output_text,
				threshold,
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
			const body = {
				...this.getResponseCreationOptions({
					tokenLimit,
				}),
				input: OpenAI.getContentParts(input, userImage),
				// 2025-05-18修正
				// previous_response_idを勘違いしていた
				// (previous_response->instructionsが無視されため、
				// 当然、システムプロンプトはもう一度指定する必要があった)
				// https://platform.openai.com/docs/api-reference/responses/create#responses-create-instructions
				instructions: this.buildInstructions({ systemPrompt, tokenLimit }),
				previous_response_id: previousResponseId,
				user: userId,
			};
			const response = await this.getClient().responses.create(body);
			// トークン消費 * 会話履歴数が制限を超えた場合は、会話履歴をリセットする
			const threshold = OpenAI.getThreshold();
			const shouldReset = Number(response.usage?.total_tokens) > threshold;

			this.logger.debug(
				{ body, response, threshold, shouldReset },
				"got continued response",
			);
			return {
				content: response.output_text,
				id: response.id,
				totalToken: response.usage?.total_tokens,
				threshold,
				shouldReset,
			};
		} catch (error) {
			this.logger.error(error);
			return null;
		}
	}
}
