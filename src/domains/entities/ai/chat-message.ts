export interface ChatMessage {
	content: string;
	generatedImageBuffer?: Buffer | null;

	status?: {
		title: string | null;
		totalToken?: number;
		threshold: number;
	};
}
