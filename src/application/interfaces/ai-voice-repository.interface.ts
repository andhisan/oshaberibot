import type { User } from "discord.js";

/**
 * AI音声のリポジトリのインターフェース
 *
 * **注意: リポジトリレベルでは、使用制限のチェックを行っていない**
 */
export interface IAiVoiceRepository {
	/**
	 * 音声をテキストに変換する
	 */
	getTranscribe({
		user,
		audioBuffer,
	}: {
		user: User;
		audioBuffer: Buffer;
	}): Promise<string>;

	/**
	 * テキストに対してAIで応答し、Bufferで音声を返す
	 */
	getVoice({
		user,
		input,
	}: {
		user: User;
		input: string;
	}): Promise<Buffer | undefined>;

	/**
	 * 指定されたユーザーが上限まで話したか
	 */
	getUserCanUseAi(user: User): Promise<boolean>;
}
