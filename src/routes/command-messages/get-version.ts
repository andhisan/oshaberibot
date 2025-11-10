import type { Message } from "discord.js";
import type { Logger } from "pino";
import { GetVersionMessage } from "@/application/use-cases/get-version-message";
import { CommandMessage } from "../../adaptors/interactions/command-message";

const KEYWORD = "[get-version]";

export const GetVersion = new CommandMessage({
	keyword: KEYWORD,

	handlerWithoutPermissionCheck: async (message: Message, logger: Logger) => {
		const getVersionMessage = new GetVersionMessage(logger);
		const versionMessage = getVersionMessage.handler();
		await message.reply({
			embeds: [versionMessage],
		});
	},
});
