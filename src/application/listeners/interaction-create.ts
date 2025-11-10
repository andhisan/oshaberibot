import type { Client, Interaction } from "discord.js";
import { handleCommandInteraction } from "@/application/handler";
import { logger } from "@/utils/logger";

/**
 * コマンドに対する反応の定義
 */
export const InteractionCreate = {
	async handler(_client: Client, interaction: Interaction) {
		// コマンド以外は無視する
		if (
			!interaction.isChatInputCommand() &&
			!interaction.isMessageContextMenuCommand()
		) {
			return;
		}

		// この特定のインタラクション用のロガーを作成
		const interactionLogger = logger.child({
			commandName: interaction.commandName,
			user: interaction.user.tag,
		});

		// コマンドインタラクションを処理
		return await handleCommandInteraction(interaction, interactionLogger);
	},
};
