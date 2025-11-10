import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { Command } from "@/adaptors/interactions/command";
import { GetVersionMessage } from "@/application/use-cases/get-version-message";

export const GetVersionCommand = new Command({
	channelAllowedAll: true,
	builder: new SlashCommandBuilder()
		.setName("get-version")
		.setDescription("バージョン情報を表示")
		.setContexts([InteractionContextType.Guild]),

	handlerWithoutPermissionCheck: async (
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
		logger: Logger,
	) => {
		const getVersionMessage = new GetVersionMessage(logger);
		const versionMessage = getVersionMessage.handler();

		await interaction.reply({
			embeds: [versionMessage],
			flags: MessageFlags.Ephemeral,
		});
	},
});
