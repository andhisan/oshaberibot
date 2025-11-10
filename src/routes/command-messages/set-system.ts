import type { Message } from "discord.js";
import type { Logger } from "pino";
import {
	CommandMessage,
	SIMULATE_PERMISSION_DENIED_KEYWORD,
} from "@/adaptors/interactions/command-message";
import { SetSystemPrompt } from "@/application/use-cases/set-system-prompt";

const KEYWORD = "[set-system]";

export const SetSystem = new CommandMessage({
	keyword: KEYWORD,

	handlerWithoutPermissionCheck: async (message: Message, logger: Logger) => {
		const setSystemPrompt = new SetSystemPrompt(logger);
		await setSystemPrompt.handler(
			message.cleanContent
				.replace(SIMULATE_PERMISSION_DENIED_KEYWORD, "")
				.split(KEYWORD)[1]
				?.trim(),
			message.author,
		);
		await message.reply({
			content: `${KEYWORD}: システムプロンプトを設定しました`,
		});
	},
});
