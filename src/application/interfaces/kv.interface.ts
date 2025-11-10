import {
	createRedisKey,
	createRedisKeyParam,
	createRedisKeysMap,
} from "create-redis-key";

/**
 * multi-persona-chatgpt-discordbotの構造をそのまま流用
 * @see https://github.com/andhisan/multi-persona-chatgpt-discordbot/blob/main/src/_utils/redis.ts
 */
const KEYS_MAPPING = {
	SCOPE_FIRST_PART: [],
	ai: {
		SCOPE_FIRST_PART: ["ai"],
		limit: {
			SCOPE_FIRST_PART: ["limit"],
			/**
			 * AIプロバイダーごとのモデルのリクエスト回数を保存する
			 *
			 * 例:
			 * ```
			 * "ai:limit:model-request-count-hash:openai": {
			 *      "gpt-4o-mini": 100,
			 * }
			 * ```
			 */
			modelRequestCountHashByAiProvider: [
				"model-request-count-hash",
				createRedisKeyParam("AiProvider"),
			],

			/**
			 * AIプロバイダーとモデルごとのトークン使用量を保存する
			 *
			 * 例:
			 * ```
			 * "ai:limit:model-total-token-sum-hash-by-ai-provider:openai": {
			 *      "gpt-4o-mini": 3000,
			 * }
			 * ```
			 */
			modelTotalTokenSumHashByAiProvider: [
				"model-total-token-sum-hash-by-ai-provider",
				createRedisKeyParam("AiProvider"),
			],

			/**
			 * AIプロバイダーとユーザーごとの最終使用時間を保存する
			 *
			 * 例:
			 * ```
			 * "ai:limit:user-last-used-time-hash-by-ai-provider:openai": {
			 * 		"user-id": 1746901897505,
			 * }
			 * ```
			 */
			userLastUsedTimeHashByAiProvider: [
				"user-last-used-time-hash-by-ai-provider",
				createRedisKeyParam("AiProvider"),
			],

			/**
			 * botタイプごとの喋った回数
			 *
			 * 例:
			 * ```
			 * "ai:chat:user-speak-count-hash": {
			 * 		"user-id": 1,
			 * }
			 * ```
			 */
			userSpeakCountHash: ["user-speak-count-hash"],

			/**
			 * Botタイプとユーザーごとの最後の発話時間
			 *
			 * 例:
			 * ```
			 * "ai:limit:user-last-speaked-time-hash": {
			 * 		"user-id": 1746901897505,
			 * }
			 * ```
			 */
			userLastSpeakedTimeHash: ["user-last-speaked-time-hash"],
		},

		chat: {
			SCOPE_FIRST_PART: ["chat"],
			/**
			 * Botタイプごとの最後のレスポンスIDを保存する
			 *
			 * 例:
			 * ```
			 * "ai:chat:previous-response-id": "xxxx"
			 * ```
			 */
			previousResponseId: ["previous-response-id"],
		},
		prompt: {
			SCOPE_FIRST_PART: ["prompt"],
			/**
			 * Botタイプごとのシステムメッセージを保存する
			 *
			 * 例:
			 * ```
			 * "ai:prompt:system-message": {
			 *   // システムメッセージ
			 * }
			 * ```
			 */
			systemMessage: ["system-message"],
		},
	},
} as const;

export const KV_KEYS = createRedisKeysMap(KEYS_MAPPING);

/**
 * {@link KV_KEYS} と {@link buildKVKey} を活用すること
 * @example ```ts
 * buildKVKey(KV_KEYS.discordBot.openai.totalTokenString, null)
 * ```
 */
export const buildKVKey = createRedisKey;
export type KeyType = ReturnType<typeof buildKVKey>;

/**
 * KV
 * Redis/ValKeyを想定
 */
export interface IKv {
	/**
	 * 値を取得する
	 */
	get<T>(key: KeyType): Promise<T | null | undefined>;

	/**
	 * hash値を取得する
	 */
	hget<T>(key: KeyType, field: string): Promise<T | null | undefined>;

	/**
	 * 値をパースして取得する
	 */
	getParsed<T>(key: KeyType): Promise<T | null | undefined> | null;

	/**
	 * hash値をパースして取得する
	 */
	hgetParsed<T>(
		key: KeyType,
		field: string,
	): Promise<T | null | undefined> | null;

	/**
	 * 保存する
	 */
	set<T>(key: KeyType, data: T): Promise<T | null | undefined>;

	/**
	 * hash値を保存する
	 */
	hset<T>(key: KeyType, field: string, value: T): Promise<T | null | undefined>;

	/**
	 * 値を増やして保存する
	 */
	incrby(key: KeyType, value: number): Promise<number>;

	/**
	 * hash値を増やして保存する
	 */
	hincrby(key: KeyType, field: string, value: number): Promise<number>;

	/**
	 * 値を削除する
	 */
	del(key: KeyType): Promise<void>;
}
