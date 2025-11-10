/**
 * AIプロンプトリポジトリのインターフェース
 */
export interface IAiPromptRepository {
	/**
	 * システムメッセージを取得する
	 */
	getSystemMessage(): Promise<string | null>;

	/**
	 * システムメッセージを保存する
	 */
	setSystemMessage(systemMessage: string): Promise<void>;
}
