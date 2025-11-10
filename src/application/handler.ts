import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	type Message,
	type MessageContextMenuCommandInteraction,
} from "discord.js";
import type { Logger } from "pino";
import { ReplyableError } from "@/application/exceptions/replyable-error";
import * as commandMessages from "@/routes/command-messages";
import * as commands from "@/routes/commands";
import { BOT_VERSION, safeEnv } from "@/utils/env";
import { GetMessageReply } from "./use-cases/get-message-reply";

/**
 * コマンドの実行を処理し、エラーを適切に管理する
 */
export async function handleCommandInteraction(
	interaction:
		| ChatInputCommandInteraction
		| MessageContextMenuCommandInteraction,
	logger: Logger,
) {
	try {
		const filteredCommands = Object.values(commands).filter((command) =>
			command.match(interaction),
		);

		// 一致するコマンドが複数ある場合はエラー
		if (filteredCommands.length > 1) {
			throw new Error("複数のコマンドが一致しました");
		}

		if (filteredCommands.length === 0) {
			throw new Error("コマンドが見つかりませんでした");
		}

		return await filteredCommands[0].handler(interaction, logger);
	} catch (e) {
		logger[e instanceof ReplyableError ? "info" : "error"](
			{ error: e },
			"Command error",
		);

		if (interaction.isRepliable()) {
			let description =
				"コマンドでエラーが発生しました。管理者に報告してください。";
			if (e instanceof Error) {
				description = e.message;
			}
			const errorEmber = new EmbedBuilder()
				.setColor("Red")
				.setTitle("死んでしまった！")
				.setDescription(description)
				.setFooter({
					text: `version: ${BOT_VERSION}`,
				});
			await interaction.reply({ embeds: [errorEmber] });
		}
	}
}

/**
 * コマンドメッセージの実行を処理する
 *
 * @returns コマンドメッセージが実行されたかどうか
 */
export async function handleCommandMessage(
	message: Message,
	logger: Logger,
): Promise<boolean> {
	try {
		let commandMessageExecuted = false;
		const filteredCommandMessages = Object.values(commandMessages).filter(
			(commandMessage) => commandMessage.match(message),
		);
		if (filteredCommandMessages.length > 1) {
			throw new Error("複数のコマンドメッセージが一致しました");
		}
		if (filteredCommandMessages.length === 1) {
			await filteredCommandMessages[0].handler(message, logger);
			commandMessageExecuted = true;
		}
		return commandMessageExecuted;
	} catch (e) {
		logger[e instanceof ReplyableError ? "info" : "error"](
			{ error: e },
			"Command message error",
		);

		let description =
			"コマンドメッセージでエラーが発生しました。管理者に報告してください。";
		if (e instanceof Error) {
			description = e.message;
		}
		const errorEmber = new EmbedBuilder()
			.setColor("Red")
			.setTitle("死んでしまった！")
			.setDescription(description)
			.setFooter({
				text: `version: ${BOT_VERSION}`,
			});
		await message.reply({ embeds: [errorEmber] });
	}
	return false;
}

export async function handleMessageReply(
	message: Message,
	logger: Logger,
): Promise<void> {
	try {
		const getMessageReply = new GetMessageReply(logger);
		const replyMessage = await getMessageReply.handler(message);
		if (replyMessage) {
			await message.reply(replyMessage);
			return;
		}
		await message.react(safeEnv.BUSY_REACTION);
	} catch (e) {
		logger[e instanceof ReplyableError ? "info" : "error"](
			{ error: e },
			"Reply error",
		);

		let description = "返信でエラーが発生しました。管理者に報告してください。";
		if (e instanceof Error) {
			description = e.message;
		}
		const errorEmber = new EmbedBuilder()
			.setColor("Red")
			.setTitle("返信失敗！")
			.setDescription(description)
			.setFooter({
				text: `version: ${BOT_VERSION}`,
			});
		await message.reply({ embeds: [errorEmber] });
	}
}
