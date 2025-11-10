import type { User } from "discord.js";
import type { Logger } from "pino";
import { AiChatRepository } from "@/adaptors/repository/ai-chat-repository";
import { AiLimitRepository } from "@/adaptors/repository/ai-limit-repository";
import { AiPromptRepository } from "@/adaptors/repository/ai-prompt-repository";
import { Gemini } from "@/drivers/agents/gemini";
import { OpenAI } from "@/drivers/agents/openai";
import { Ioredis } from "@/drivers/kvs/ioredis";
import { AI_PROVIDER } from "@/utils/env";

/**
 * システムプロンプトを設定する
 */
export class SetSystemPrompt {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler(
		systemPromptPossibleMarkdown: string,
		user: User,
	): Promise<void> {
		const kv = new Ioredis();
		const agent =
			AI_PROVIDER === "google"
				? new Gemini(this.logger, user)
				: new OpenAI(this.logger, user);
		const aiPromptRepository = new AiPromptRepository(this.logger, kv);
		const aiChatRepository = new AiChatRepository(
			this.logger,
			kv,
			agent,
			aiPromptRepository,
			new AiLimitRepository(this.logger, kv, agent),
		);

		// markdownのコードブロックに囲まれている場合、コードブロックを外す
		let systemPrompt = systemPromptPossibleMarkdown;
		if (
			systemPromptPossibleMarkdown.startsWith("```\n") &&
			systemPromptPossibleMarkdown.endsWith("\n``")
		) {
			systemPrompt = systemPromptPossibleMarkdown
				.replaceAll("```", "")
				.replaceAll("```md", "");
		}

		this.logger.info({ systemPrompt }, "Setting system prompt");
		await aiPromptRepository.setSystemMessage(systemPrompt);
		await aiChatRepository.resetChat({ user });
	}
}
