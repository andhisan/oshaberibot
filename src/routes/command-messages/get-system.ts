import type { Message } from "discord.js";
import type { Logger } from "pino";
import { GetSystemPrompt } from "@/application/use-cases/get-system-prompt";
import { CommandMessage } from "../../adaptors/interactions/command-message";

const KEYWORD = "[get-system]";

export const GetSystem = new CommandMessage({
	keyword: KEYWORD,

	handlerWithoutPermissionCheck: async (message: Message, logger: Logger) => {
		const getSystemPrompt = new GetSystemPrompt(logger);
		const systemPrompt = await getSystemPrompt.handler();
		await message.reply({
			content: systemPrompt ?? "システムプロンプトが設定されていません",
		});
	},
});
