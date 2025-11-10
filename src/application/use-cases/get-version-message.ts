import { EmbedBuilder } from "discord.js";
import type { Logger } from "pino";
import { BOT_VERSION } from "@/utils/env";

export class GetVersionMessage {
	private readonly logger: Logger;
	constructor(logger: Logger) {
		this.logger = logger;
	}

	handler(): EmbedBuilder {
		this.logger.debug("getting version");
		const embed = new EmbedBuilder()
			.setColor("Blurple")
			.setTitle("AI Oshaberi Bot by @andhisan")
			.setFooter({
				text: `version: ${BOT_VERSION}`,
			});
		return embed;
	}
}
