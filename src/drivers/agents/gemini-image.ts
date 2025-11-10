import {
	type Content,
	type CreateChatParameters,
	type GenerateContentParameters,
	type GenerateContentResponse,
	Modality,
} from "@google/genai";
import type { AgentResponse } from "@/domains/entities/ai/agent-response";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import { safeEnv } from "@/utils/env";
import { Gemini } from "./gemini";

/**
 * 画像モデル版
 * - systemInstructionを指定できないため、背景情報の指定方法を変更
 *   - →結局指定できていない。initialMessageはおまじないでしかない
 */
export class GeminiImage extends Gemini {
	/**
	 * @see https://ai.google.dev/gemini-api/docs/text-generation?hl=ja#multi-turn-conversations
	 */
	static getResponseCreationOptions({
		tokenLimit,
	}: {
		tokenLimit?: number;
	} = {}): GenerateContentParameters {
		return {
			model: safeEnv.GEMINI_MODEL_IMAGE,
			contents: [],
			config: {
				// 画像を考慮して、最大トークンを増やす
				maxOutputTokens: tokenLimit ?? safeEnv.GOOGLE_ANSWER_MAX_TOKEN * 10,
				// 画像出力に対応
				responseModalities: [Modality.IMAGE, Modality.TEXT],
			},
		};
	}

	public sanitizeInput({ input }: { input: string }): string {
		// 画像モデルにここで文脈を与えると、画像が返ってこなくなる
		// メンションの文脈は邪魔なので削除
		return input.replace(/<@\d+>/g, "").replace(/<@!\d+>/g, "");
	}

	public getModelId(): string {
		return GeminiImage.getResponseCreationOptions().model;
	}

	static getThreshold(): number {
		return safeEnv.GOOGLE_TOKEN_THRESHOLD;
	}

	/**
	 * 画像はresponse.textのように簡単に取り出せないため、
	 * 面倒だが、以下のように取り出す
	 * @see https://ai.google.dev/gemini-api/docs/image-generation?hl=ja
	 */
	static getImageBufferFromResponse(
		response: GenerateContentResponse,
	): Buffer | null {
		let buffer: Buffer | null = null;
		const candidate = response.candidates?.[0];
		if (candidate) {
			const parts = candidate.content?.parts;
			if (parts && parts.length > 0) {
				const partsWithNoText = parts.filter((part) => !part.text);
				if (partsWithNoText.length > 0) {
					const imageData = partsWithNoText[0].inlineData?.data;
					if (imageData) {
						buffer = Buffer.from(imageData, "base64");
					}
				}
			}
		}
		return buffer;
	}

	/**
	 * イメージモデルがinstructionに対応していないため、仕方なく最初にねじ込む
	 */
	private getInitialMessage({
		systemPrompt,
	}: {
		systemPrompt?: string | null;
	}): Content[] {
		return systemPrompt
			? [{ role: "user", parts: [{ text: systemPrompt }] }]
			: [
					{
						role: "user",
						parts: [
							{
								text: "ここからの会話では、それまでの指示内容やなりきり結果を保持してください。",
							},
						],
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
			this.logger.debug(`getting first response for ${userId}`);
			const bodyOptions = GeminiImage.getResponseCreationOptions({
				tokenLimit,
			});
			// https://ai.google.dev/gemini-api/docs/text-generation?hl=ja#multi-turn-conversations
			const body: CreateChatParameters = {
				...bodyOptions,
				history: this.getInitialMessage({ systemPrompt }),
				config: {
					...bodyOptions.config,
					// 重要: **gemini-2.0-flash-preview-image-generation**は、
					// systemInstructionを指定できない仕様
					// systemInstruction: `${systemPrompt}\n\n${this.customizeInput({ input })}`,
				},
			};
			const chat = this.getClient().chats.create(body);
			const response = await chat.sendMessage({
				message: GeminiImage.getContentParts(
					this.sanitizeInput({ input }),
					userImage,
				),
			});
			const generatedImageBuffer =
				GeminiImage.getImageBufferFromResponse(response);

			// 最初のメッセージは不要
			const history = chat.getHistory().slice(1);
			const historyJson = JSON.stringify(history);

			return {
				content: response.text ?? "",
				generatedImageBuffer,
				id: historyJson,
				historyLength: history.length,
				totalToken: response.usageMetadata?.totalTokenCount,
				threshold: GeminiImage.getThreshold(),
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
		systemPrompt?: string | null;
		tokenLimit?: number;
	}): Promise<AgentResponse | null> {
		try {
			const previousHistory = [
				// instructionの代わりに、履歴の先頭にシステムプロンプトを仕込む
				...this.getInitialMessage({ systemPrompt }),
				...Gemini.parseMessageHistoryJSON(previousResponseId),
			];
			// 会話の続きなので、instructionを書かず、前回のIDを指定したいが、
			// Geminiにそういう機能はない
			const bodyOptions = GeminiImage.getResponseCreationOptions({
				tokenLimit,
			});
			const body: CreateChatParameters = {
				...bodyOptions,
				history: previousHistory,
				config: {
					...bodyOptions.config,
					// 重要: **gemini-2.5-flash-image**はsystemInstructionを指定できない仕様
					// https://ai.google.dev/api/generate-content?hl=ja#v1beta.GenerationConfig
					// systemInstruction: systemPrompt,
				},
			};

			// HACK: いったん、真面目な生成支持をはさむことで、
			// 確実に画像を生成する
			const chat = this.getClient().chats.create(body);
			await chat.sendMessage({
				message:
					"次に内容を指示します。**画像を必ず生成し、画像のレスポンスを必ず返してください。**",
			});

			const response = await chat.sendMessage({
				message: GeminiImage.getContentParts(
					this.sanitizeInput({ input }),
					userImage,
				),
			});
			const generatedImageBuffer =
				GeminiImage.getImageBufferFromResponse(response);
			// トークン消費 * 会話履歴数が制限を超えた場合は、会話履歴をリセットする
			const threshold = GeminiImage.getThreshold();
			const totalTokens = Number(response.usageMetadata?.totalTokenCount);
			const shouldReset = totalTokens > threshold;

			const history = chat.getHistory().slice(1);
			const historyJson = JSON.stringify(history);

			this.logger.debug(
				{
					threshold,
					shouldReset,
					historyLength: history.length,
				},
				`got continued response for ${userId}`,
			);

			return {
				content: response.text ?? "",
				generatedImageBuffer,
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
