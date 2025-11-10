import type { Logger } from "pino";
import type { IAgent } from "@/application/interfaces/agent.interface";
import type { IAiLimitRepository } from "@/application/interfaces/ai-limit-repository.interface";
import {
	buildKVKey,
	type IKv,
	KV_KEYS,
} from "@/application/interfaces/kv.interface";
import { LimitModelStatus } from "@/domains/entities/ai/limit-model-status";
import { safeEnv } from "@/utils/env";

/**
 * ユーザーのリミット情報をRedisから読み書きするリポジトリクラス
 */
export class AiLimitRepository implements IAiLimitRepository {
	private readonly logger: Logger;
	private readonly kv: IKv;
	private readonly agent: IAgent;

	constructor(logger: Logger, kv: IKv, agent: IAgent) {
		this.logger = logger;
		this.kv = kv;
		this.agent = agent;
	}

	private getTotalTokenSumHashKey() {
		return buildKVKey(KV_KEYS.ai.limit.modelTotalTokenSumHashByAiProvider, {
			AiProvider: this.agent.getAiProvider(),
		});
	}

	private getRequestCountHashKey() {
		return buildKVKey(KV_KEYS.ai.limit.modelRequestCountHashByAiProvider, {
			AiProvider: this.agent.getAiProvider(),
		});
	}

	async getLimitModelStatus(modelId: string): Promise<LimitModelStatus> {
		try {
			const totalTokenSum = Number(
				await this.kv.hget(this.getTotalTokenSumHashKey(), modelId),
			);
			if (!totalTokenSum) {
				this.logger.info(
					`Total token sum for ${modelId} not found, setting to 0`,
				);
				await this.kv.hset(this.getTotalTokenSumHashKey(), modelId, 0);
			}

			const requestCount = Number(
				await this.kv.hget(this.getRequestCountHashKey(), modelId),
			);
			if (!requestCount) {
				this.logger.info(
					`Request count for ${modelId} not found, setting to 0`,
				);
				await this.kv.hset(this.getRequestCountHashKey(), modelId, 0);
			}

			return new LimitModelStatus(totalTokenSum, requestCount);
		} catch (e) {
			this.logger.error(e);
			throw new Error("制限状況の取得に失敗しました");
		}
	}

	async incrementTotalTokenSum(
		modelId: string,
		totalToken?: number,
	): Promise<void> {
		const maxTokenCount = safeEnv.OPENAI_CHAT_GPT_ANSWER_MAX_TOKEN;
		// usage不明でも、予想される最大分増やす
		const tokenCountUsed = totalToken ?? maxTokenCount;
		// リクエスト回数を1回分増やす
		await this.kv.hincrby(this.getRequestCountHashKey(), modelId, 1);
		await this.kv
			.hincrby(this.getTotalTokenSumHashKey(), modelId, tokenCountUsed)
			.then(() => {
				if (process.env.NODE_ENV === "development") {
					this.logger.info(
						`Total token sum for ${modelId} incremented by ${tokenCountUsed}`,
					);
				}
			})
			.catch((e) => {
				this.logger.error(e);
				return 0;
			});
	}
}
