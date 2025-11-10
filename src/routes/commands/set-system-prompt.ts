import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { Command } from "@/adaptors/interactions/command";
import { SetSystemPrompt } from "@/application/use-cases/set-system-prompt";

/**
 * システムプロンプト設定コマンド
 * - 権限はサーバー管理者権限をデフォルトとする
 *   - 「連携サービス」→「(このbot)」→「コマンド」で適宜ロールを許史すること
 */
export const SetSystemPromptCommand = new Command({
	builder: new SlashCommandBuilder()
		.setName("set-system-prompt")
		.setDescription("システムプロンプトを設定する")
		.setContexts([InteractionContextType.Guild])
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("システムプロンプト")
				.setRequired(true),
		),
	handlerWithoutPermissionCheck: async (
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
		logger: Logger,
	) => {
		let prompt = "";
		const setSystemPrompt = new SetSystemPrompt(logger);
		if (interaction.isChatInputCommand()) {
			prompt = interaction.options.getString("prompt") as string;
		}

		// まだ実装していないが、何かしらのメニューでコマンドを発火した場合、そのテキストをシステムプロンプトとして設定する
		if (interaction.isMessageContextMenuCommand()) {
			prompt = interaction.targetMessage.content;
		}

		await setSystemPrompt.handler(prompt, interaction.user);

		await interaction.reply({
			content: "システムプロンプトを設定しました",
			flags: MessageFlags.Ephemeral,
		});
	},
});
