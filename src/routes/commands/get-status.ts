import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { Command } from "@/adaptors/interactions/command";
import { GetLimitStatus } from "@/application/use-cases/get-limit-status";

export const GetStatusCommand = new Command({
	builder: new SlashCommandBuilder()
		.setName("get-status")
		.setDescription("制限状況を表示")
		.setContexts([InteractionContextType.Guild]),

	handlerWithoutPermissionCheck: async (
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
		logger: Logger,
	) => {
		const getLimitStatus = new GetLimitStatus(logger);
		const limitStatus = await getLimitStatus.handler(interaction.user);

		await interaction.reply({
			embeds: [limitStatus],
			flags: MessageFlags.Ephemeral,
		});
	},
});
