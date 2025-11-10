import dotenv from "dotenv";
import { bool, envsafe, num, str } from "envsafe";

dotenv.config();

export const safeEnv = envsafe({
	NODE_ENV: str({}),
	COMMIT_SHA: str({}),
	/** 混雑時のリアクション */
	BUSY_REACTION: str({ default: "🥵" }),
	/** Dockerではなくnpm run devを実行している場合 */
	IS_DEV: bool({ default: false }),
	LOG_LEVEL: str({ default: "error" }),
	REDIS_URL: str({}),
	/** AI応答時の使用サービス */
	AI_PROVIDER: str({
		choices: ["google", "openai"],
		// OpenAIを使用する場合はここを変更してください
		default: "google",
	}),
	DISCORD_GUILD_ID: str({}),
	DISCORD_GUILD_COMMAND_CHANNEL_ID: str({
		allowEmpty: true,
		default: "",
	}),
	DISCORD_GUILD_VOICE_CHANNEL_ID: str({
		allowEmpty: true,
		default: "",
	}),
	/** 音声開始/終了の判定に使用する時間(ミリ秒) */
	DISCORD_VOICE_START_END_DURATION: num({
		allowEmpty: true,
		default: 500,
	}),
	DISCORD_APP_ID: str(),
	DISCORD_BOT_TOKEN: str(),
	/** VertexAIで使用するプロジェクトID */
	GOOGLE_PROJECT_ID: str({}),
	/** GCPのサービスアカウントキー */
	GOOGLE_APPLICATION_CREDENTIALS_BASE64: str({}),
	/** あまりに短い発言は無視する */
	AI_VOICE_MIN_STREAM_LENGTH: num({
		allowEmpty: true,
		default: 40,
	}),
	/** 音声のサンプルレート */
	AI_VOICE_SAMPLE_RATE: num({
		allowEmpty: true,
		default: 16000,
	}),
	/** 音声チャットのトークン制限 (text to speechの都合で小さくなる) */
	AI_VOICE_TOKEN_LIMIT: num({
		allowEmpty: true,
		default: 64,
	}),
	/** 音声化の文字数制限 */
	AI_VOICE_SPEECH_LIMIT: num({
		allowEmpty: true,
		default: 100,
	}),
	/**
	 * 1時間あたりの最大発話回数
	 * 1. まず、前回の発話時間と比較する
	 * 2. 時間の差分 * この値 の分だけカウントを減らす
	 * 3. もし、カウントがマイナスになった場合は、0にする
	 * 4. もし、カウントがこの値を超えていれば、お喋りを拒否する
	 **/
	AI_VOICE_MAX_COUNT_PER_HOUR: num({
		allowEmpty: true,
		default: 60,
	}),

	/**
	 * AIチャットのユーザーごとの最小間隔
	 */
	AI_MIN_INTERVAL_SECONDS_PER_USER: num({
		allowEmpty: true,
		default: 10,
	}),
	/**
	 * 画像の場合の最小間隔倍数
	 */
	AI_MIN_INTERVAL_MULTIPLIER_FOR_IMAGE: num({
		allowEmpty: true,
		default: 12,
	}),

	/** 注意: openai@4.98.0現在、この命名にすることで自動的に認証される */
	OPENAI_API_KEY: str({}),
	/** モデルのID */
	OPENAI_MODEL: str({
		default: "gpt-5-nano",
	}),
	/**
	 * これ < レスポンスの全体消費トークンになった場合、会話履歴をリセットする
	 */
	OPENAI_TOKEN_THRESHOLD: num({
		allowEmpty: true,
		default: 4096,
	}),
	/** 回答の最大トークン数 */
	OPENAI_CHAT_GPT_ANSWER_MAX_TOKEN: num({
		allowEmpty: true,
		default: 512,
	}),
	GEMINI_MODEL: str({
		default: "gemini-2.5-flash-lite",
	}),
	/** 画像生成用のモデル */
	GEMINI_MODEL_IMAGE: str({
		default: "gemini-2.5-flash-image",
	}),
	/**
	 * これ < レスポンスの全体消費トークンになった場合、会話履歴をリセットする
	 * ※OpenAIと違い履歴を配列として保持しているので、正確には古い履歴を削除していく
	 */
	GOOGLE_TOKEN_THRESHOLD: num({
		allowEmpty: true,
		default: 4096,
	}),
	/** 回答の最大トークン数 */
	GOOGLE_ANSWER_MAX_TOKEN: num({
		allowEmpty: true,
		default: 1024,
	}),
	/** 出力1Kトークンあたりの最新モデル(gemini-2.0-flash)の料金(ドル) */
	GOOGLE_GEMINI_DOLLAR_PER_1K_TOKEN: num({
		allowEmpty: true,
		default: 0.0004, // $0.0004 per 1K tokens
	}),
	/** REPLICATEのAPIキー */
	REPLICATE_API_TOKEN: str({}),
});

export const BOT_VERSION: string = `__VERSION__ (commit: ${safeEnv.COMMIT_SHA})`;
export const GUILD_ID = safeEnv.DISCORD_GUILD_ID;
export const AI_PROVIDER: "google" | "openai" = safeEnv.AI_PROVIDER as
	| "google"
	| "openai";
