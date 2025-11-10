import type { Client, Message, OmitPartialGroupDMChannel } from "discord.js";
import {
	handleCommandMessage,
	handleMessageReply,
} from "@/application/handler";
import { safeEnv } from "@/utils/env";
import { logger } from "@/utils/logger";

export const MessageCreate = {
	async handler(client: Client, message: OmitPartialGroupDMChannel<Message>) {
		if (safeEnv.DISCORD_GUILD_COMMAND_CHANNEL_ID !== "") {
			if (message.channelId !== safeEnv.DISCORD_GUILD_COMMAND_CHANNEL_ID) {
				// チャンネルが限定されている場合は、限定チャンネル以外のメッセージは無視する
				return;
			}
		}

		const interactionLogger = logger.child({
			guildId: message.guildId,
			userId: message.author.id,
		});

		if (message.author.bot) {
			return;
		}
		if (client.user) {
			if (message.mentions.has(client.user)) {
				await message.channel.sendTyping();
				const commandMessageExecuted = await handleCommandMessage(
					message,
					interactionLogger,
				);

				if (commandMessageExecuted) {
					return;
				}
				return await handleMessageReply(message, interactionLogger);
			}
		}
	},
};
