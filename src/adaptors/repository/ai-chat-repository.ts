import type { Content } from "@google/genai";
import type { User } from "discord.js";
import type { Logger } from "pino";
import type { IAgent } from "@/application/interfaces/agent.interface";
import type { IAiChatRepository } from "@/application/interfaces/ai-chat-repository.inteface";
import type { IAiLimitRepository } from "@/application/interfaces/ai-limit-repository.interface";
import type { IAiPromptRepository } from "@/application/interfaces/ai-prompt-repository.interface";
import {
	buildKVKey,
	type IKv,
	KV_KEYS,
} from "@/application/interfaces/kv.interface";
import type { ChatMessage } from "@/domains/entities/ai/chat-message";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import { safeEnv } from "@/utils/env";
import { generateAiUserId } from "@/utils/user-id";

export class AiChatRepository implements IAiChatRepository {
	private readonly logger: Logger;
	private readonly kv: IKv;
	private readonly agent: IAgent;
	private readonly aiPromptRepository: IAiPromptRepository;
	private readonly aiLimitRepository: IAiLimitRepository;

	constructor(
		logger: Logger,
		kv: IKv,
		agent: IAgent,
		aiPromptRepository: IAiPromptRepository,
		aiLimitRepository: IAiLimitRepository,
	) {
		this.logger = logger;
		this.kv = kv;
		this.agent = agent;
		this.aiPromptRepository = aiPromptRepository;
		this.aiLimitRepository = aiLimitRepository;
	}

	private getPreviousResponseIdKey() {
		return KV_KEYS.ai.chat.previousResponseId;
	}

	private async startNewChat({
		user,
		input,
		userImage,
		tokenLimit,
	}: {
		user: User;
		input: string;
		userImage?: ChatUserImage;
		tokenLimit?: number;
	}): Promise<ChatMessage> {
		this.logger.info({ user: user.id }, "starting new chat");
		const systemMessage = await this.aiPromptRepository.getSystemMessage();
		if (!systemMessage) {
			this.logger.warn("system message not found");
			throw new Error("システムメッセージが見つかりませんでした");
		}
		const response = await this.agent.getFirstResponse({
			userId: generateAiUserId(user),
			input,
			systemPrompt: systemMessage,
			userImage,
			tokenLimit,
		});
		if (!response) {
			return {
				content: "会話開始に失敗しました",
			};
		}
		const { id, content, generatedImageBuffer, totalToken, threshold } =
			response;

		await this.kv.set(this.getPreviousResponseIdKey(), id);
		await this.aiLimitRepository.incrementTotalTokenSum(
			this.agent.getModelId(),
			totalToken,
		);
		return {
			content,
			generatedImageBuffer,
			status: {
				title: "会話状況",
				totalToken,
				threshold,
			},
		};
	}

	async getChatMessage({
		user,
		input,
		userImage,
		tokenLimit,
	}: {
		user: User;
		input: string;
		userImage?: ChatUserImage;
		/** 音声チャットの場合、text to speechのトークン制限を適用する */
		tokenLimit?: number;
	}): Promise<ChatMessage> {
		// 最終使用時間を記録
		await this.setUserLastUsedTime(user);

		let previousResponseId = null;
		try {
			previousResponseId = await this.kv.get<string>(
				this.getPreviousResponseIdKey(),
			);
		} catch (e) {
			this.logger.error(e);
			throw new Error("会話履歴の取得に失敗しました");
		}
		if (!previousResponseId) {
			return await this.startNewChat({ user, input, userImage, tokenLimit });
		}
		if (this.agent.getAiProvider() === "google") {
			this.logger.info(
				{ user: user.id },
				"continuing chat using saved history JSON",
			);
		} else {
			this.logger.info(
				{ user: user.id, previousResponseId },
				"continuing chat using response ID",
			);
		}

		/** 会話継続時もシステムプロンプトは必要 (2025-05-18修正) */
		const systemPrompt = await this.aiPromptRepository.getSystemMessage();
		const response = await this.agent.getContinuedResponse({
			userId: generateAiUserId(user),
			input,
			previousResponseId,
			userImage,
			systemPrompt,
			tokenLimit,
		});
		if (!response) {
			// 履歴データが原因でBad Requestになる場合を想定
			await this.resetChat({ user });
			return {
				content: "会話継続に失敗しました",
			};
		}

		try {
			const {
				id,
				content,
				generatedImageBuffer,
				totalToken,
				historyLength,
				threshold,
				shouldReset,
			} = response;

			await this.kv.set(this.getPreviousResponseIdKey(), id);
			await this.aiLimitRepository.incrementTotalTokenSum(
				this.agent.getModelId(),
				totalToken,
			);
			let statusTitle = `${this.agent.getAiProvider()}:${this.agent.getModelId()} [画像添付:${userImage ? "あり" : "なし"}]`;
			if (this.agent.getAiProvider() === "google") {
				statusTitle += ` 履歴の長さ: ${historyLength ?? "不明"}`;
			}
			if (shouldReset) {
				statusTitle += ` ${this.agent.getAiProvider()}の記憶容量が${threshold}を超えたため、コスト削減のため履歴をリセットしました`;

				await this.resetChat({ user });
			}

			return {
				content,
				generatedImageBuffer,
				status: {
					title: statusTitle,
					totalToken,
					threshold,
				},
			};
		} catch (e) {
			this.logger.error(e);
			throw new Error("会話は取得できましたが、制限状況の更新に失敗しました");
		}
	}

	/**
	 * Googleはチャット履歴をJSONで保持するため、
	 * 逆順に走査して、最後の5個以内の交互ペアを構築する
	 * ただし、最初がuserになるよう調整する
	 */
	private trimChatHistory(history: Content[], maxLength: number): Content[] {
		// historyを逆走して "user" で始まる最後の5個以内の交互ペアを構築
		const result: Content[] = [];
		for (let i = history.length - 1; i >= 0 && result.length < maxLength; i--) {
			result.unshift(history[i]);
		}

		// 先頭が 'user' になるように調整
		while (result.length > 0 && result[0].role !== "user") {
			result.shift();
		}

		return result;
	}

	async resetChat({ user }: { user: User }): Promise<void> {
		try {
			this.logger.info({ user: user.id }, "resetting chat");
			if (this.agent.getAiProvider() === "google") {
				// Googleの場合、過去の参照を消さず、最も古い履歴を削除する
				const previousResponseId = await this.kv.get<string>(
					this.getPreviousResponseIdKey(),
				);
				if (previousResponseId) {
					let history = JSON.parse(previousResponseId);
					if (history.length > 1) {
						history = this.trimChatHistory(history, 5);
					}
					await this.kv.set(
						this.getPreviousResponseIdKey(),
						JSON.stringify(history),
					);
				}
			} else {
				await this.kv.del(this.getPreviousResponseIdKey());
			}
		} catch (e) {
			this.logger.error(e);
			throw new Error("会話履歴のリセットに失敗しました");
		}
	}

	private getUserLastUsedTimeHashKey() {
		return buildKVKey(KV_KEYS.ai.limit.userLastUsedTimeHashByAiProvider, {
			AiProvider: this.agent.getAiProvider(),
		});
	}

	private async setUserLastUsedTime(user: User): Promise<void> {
		await this.kv.hset(this.getUserLastUsedTimeHashKey(), user.id, Date.now());
	}

	async getUserCanUseAi(user: User, multiplier: number): Promise<boolean> {
		const lastUsedTime = await this.kv.hget<number>(
			this.getUserLastUsedTimeHashKey(),
			user.id,
		);
		if (!lastUsedTime) {
			return true;
		}
		const now = Date.now();
		const diff = now - lastUsedTime;
		return diff >= safeEnv.AI_MIN_INTERVAL_SECONDS_PER_USER * 1000 * multiplier;
	}
}
