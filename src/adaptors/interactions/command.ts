import type {
	ChatInputCommandInteraction,
	MessageContextMenuCommandInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import type { Logger } from "pino";
import { safeEnv } from "@/utils/env";

type CommandInteractionHandler = (
	interaction:
		| ChatInputCommandInteraction
		| MessageContextMenuCommandInteraction,
	logger: Logger,
) => Promise<void>;

/**
 * スラッシュコマンド・メッセージコンテキストコマンド
 */
export class Command {
	builder: SlashCommandOptionsOnlyBuilder;

	readonly channelAllowedAll: boolean;
	/**
	 * コマンドを使用できるチャンネルID
	 */
	readonly channelIds: string[];
	handler: CommandInteractionHandler;

	constructor({
		builder,
		channelAllowedAll = false,
		channelIds = [safeEnv.DISCORD_GUILD_COMMAND_CHANNEL_ID],
		handlerWithoutPermissionCheck,
		onChannelCheckFailed = async (
			interaction:
				| ChatInputCommandInteraction
				| MessageContextMenuCommandInteraction,
			_logger: Logger,
		) => {
			await interaction.reply({
				content: `${builder.name}: このチャンネルでは許可されていません`,
			});
		},
	}: {
		builder: SlashCommandOptionsOnlyBuilder;
		channelAllowedAll?: boolean;
		channelIds?: string[];
		handlerWithoutPermissionCheck: CommandInteractionHandler;
		onChannelCheckFailed?: CommandInteractionHandler;
	}) {
		this.builder = builder;
		this.channelAllowedAll = channelAllowedAll;
		this.channelIds = channelIds;
		this.handler = (
			interaction:
				| ChatInputCommandInteraction
				| MessageContextMenuCommandInteraction,
			logger: Logger,
		) => {
			if (!this.isAllowedToChannelIds(interaction)) {
				return onChannelCheckFailed(interaction, logger);
			}
			return handlerWithoutPermissionCheck(interaction, logger);
		};
	}

	public isAllowedToChannelIds(
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
	) {
		const interactionChannelId = interaction.channelId;

		// 明示的に許可されている場合
		if (this.channelAllowedAll) {
			return true;
		}
		console.debug(this.channelIds[0]);
		// 環境年数のセットがない場合は全て許可
		if (this.channelIds.length === 0 || !this.channelIds[0]) {
			return true;
		}
		return this.channelIds.includes(interactionChannelId);
	}

	public match(
		interaction:
			| ChatInputCommandInteraction
			| MessageContextMenuCommandInteraction,
	) {
		return this.builder.name === interaction.commandName;
	}

	public getDefinition() {
		return this.builder.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	}
}
