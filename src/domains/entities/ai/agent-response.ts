export interface AgentResponse {
	id: string;
	totalToken?: number;
	/** Geminiは履歴を保持するため、履歴の長さを返してデバッグする */
	historyLength?: number;
	content: string;
	/** 生成された画像のバッファ */
	generatedImageBuffer?: Buffer | null;
	threshold: number;
	shouldReset: boolean;
}
