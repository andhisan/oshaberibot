import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { Command } from "@/adaptors/interactions/command";
import { GetSystemPrompt } from "@/application/use-cases/get-system-prompt";

/**
 * システムプロンプト入手コマンド
 * - 権限はサーバー管理者権限をデフォルトとする
 *   - 「連携サービス」→「(このbot)」→「コマンド」で適宜ロールを許史すること
 */
export const GetSystemPromptCommand = new Command({
	builder: new SlashCommandBuilder()
		.setName("get-system-prompt")
		.setDescription("システムプロンプトを入手する")
		.setContexts([InteractionContextType.Guild]),
	handlerWithoutPermissionCheck: async (
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
		logger: Logger,
	) => {
		const getSystemPrompt = new GetSystemPrompt(logger);

		const systemPrompt = await getSystemPrompt.handler();

		await interaction.reply({
			content: systemPrompt ?? "システムプロンプトが設定されていません",
			flags: MessageFlags.Ephemeral,
		});
	},
});
