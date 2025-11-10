import type { Message } from "discord.js";
import type { Logger } from "pino";
import { GetLimitStatus } from "@/application/use-cases/get-limit-status";
import { CommandMessage } from "../../adaptors/interactions/command-message";

const KEYWORD = "[get-status]";

export const GetStatus = new CommandMessage({
	keyword: KEYWORD,

	handlerWithoutPermissionCheck: async (message: Message, logger: Logger) => {
		const getLimitStatus = new GetLimitStatus(logger);
		const limitStatus = await getLimitStatus.handler(message.author);
		await message.reply({
			embeds: [limitStatus],
		});
	},
});
