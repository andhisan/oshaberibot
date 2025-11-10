import type { LimitModelStatus } from "@/domains/entities/ai/limit-model-status";

export interface IAiLimitRepository {
	/**
	 * 指定されたモデルの制限状況を取得する
	 */
	getLimitModelStatus(modelId: string): Promise<LimitModelStatus>;

	/**
	 * 指定されたモデルのトークン使用量カウントを増やす。
	 * 同時に、リクエストカウントを増やす。
	 */
	incrementTotalTokenSum(modelId: string, totalToken?: number): Promise<void>;
}
