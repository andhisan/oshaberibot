import type { Logger } from "pino";
import { AiPromptRepository } from "@/adaptors/repository/ai-prompt-repository";
import { Ioredis } from "@/drivers/kvs/ioredis";

/**
 * システムプロンプトを取得する
 */
export class GetSystemPrompt {
	static readonly KEYWORD = "[get-system]";

	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler(): Promise<string | null> {
		const aiPromptRepository = new AiPromptRepository(
			this.logger,
			new Ioredis(),
		);

		const systemMessage = await aiPromptRepository.getSystemMessage();
		if (systemMessage) {
			// コードブロックで囲むことで使いやすくする
			return `\`\`\`\n${systemMessage}\n\`\`\``;
		}
		return null;
	}
}
