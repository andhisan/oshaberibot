import {
	type ChatInputCommandInteraction,
	GuildMember,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { Command } from "@/adaptors/interactions/command";
import { JoinVCConnection } from "@/application/use-cases/join-vc-connection";
import { safeEnv } from "@/utils/env";

/**
 * VC参加コマンド
 */
export const JoinVCCommand = new Command({
	builder: new SlashCommandBuilder()
		.setName("join-vc")
		.setDescription("VCに参加する")
		.setContexts([InteractionContextType.Guild]),
	handlerWithoutPermissionCheck: async (
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
		logger: Logger,
	) => {
		const member = interaction.member;
		if (!(member instanceof GuildMember)) {
			return;
		}
		const voiceChannel = member.voice.channel;

		if (!voiceChannel) {
			await interaction.reply({
				content: "まずVCに入ってください",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (voiceChannel.id !== safeEnv.DISCORD_GUILD_VOICE_CHANNEL_ID) {
			await interaction.reply({
				content: "そのVCチャンネルには参加できません",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (!interaction.guildId) {
			return;
		}

		const joinVCConnection = new JoinVCConnection(logger);
		const content = await joinVCConnection.handler(voiceChannel);
		await interaction.reply({
			content,
			flags: MessageFlags.Ephemeral,
		});
	},
});
