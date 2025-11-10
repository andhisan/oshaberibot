import { EmbedBuilder, type User } from "discord.js";
import type { Logger } from "pino";
import { AiLimitRepository } from "@/adaptors/repository/ai-limit-repository";
import { Gemini } from "@/drivers/agents/gemini";
import { OpenAI } from "@/drivers/agents/openai";
import { Ioredis } from "@/drivers/kvs/ioredis";
import { AI_PROVIDER } from "@/utils/env";

export class GetLimitStatus {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler(user: User): Promise<EmbedBuilder> {
		const agent =
			AI_PROVIDER === "google"
				? new Gemini(this.logger, user)
				: new OpenAI(this.logger, user);
		const kv = new Ioredis();

		// 埋め込みに制限状況を表示する
		const aiLimitRepository = new AiLimitRepository(this.logger, kv, agent);
		const limitModelStatus = await aiLimitRepository.getLimitModelStatus(
			agent.getModelId(),
		);

		const embed = new EmbedBuilder()
			.setColor("Blurple")
			.setTitle("制限状況")
			.addFields([
				{
					inline: true,
					name: "累計トークン使用量",
					value: limitModelStatus.totalTokenSum.toString(),
				},
				{
					inline: true,
					name: "累計リクエスト回数",
					value: limitModelStatus.requestCount.toString(),
				},
			]);

		return embed;
	}
}
