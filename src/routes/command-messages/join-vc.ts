import type { Message } from "discord.js";
import type { Logger } from "pino";
import { CommandMessage } from "@/adaptors/interactions/command-message";
import { JoinVCConnection } from "@/application/use-cases/join-vc-connection";
import { safeEnv } from "@/utils/env";

const KEYWORD = "[join-vc]|vcきて|VCきて";

export const JoinVC = new CommandMessage({
	keyword: KEYWORD,

	handlerWithoutPermissionCheck: async (message: Message, logger: Logger) => {
		const voiceChannel = message.member?.voice.channel;

		if (!voiceChannel) {
			await message.reply({
				content: "まずVCに入ってください",
			});
			return;
		}
		if (voiceChannel.id !== safeEnv.DISCORD_GUILD_VOICE_CHANNEL_ID) {
			await message.reply({
				content: "そのVCチャンネルには参加できません",
			});
			return;
		}
		if (!message.guildId) {
			return;
		}

		const joinVCConnection = new JoinVCConnection(logger);
		const content = await joinVCConnection.handler(voiceChannel);
		await message.reply({
			content,
		});
	},
});
