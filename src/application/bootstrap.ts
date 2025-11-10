import type { Client } from "discord.js";
import type { Logger } from "pino";
import * as commandMessages from "@/routes/command-messages";
import * as commands from "@/routes/commands";
import { GUILD_ID } from "@/utils/env";

/**
 * スラッシュコマンドを登録する
 */
export async function registerCommands(client: Client, logger: Logger) {
	if (!client.application) {
		throw new Error("Application is not available");
	}

	const commandInstances = Object.values(commands);
	const allNames = commandInstances.map(
		(command) => command.getDefinition().name,
	);
	// 名前かぶり対策
	const names = new Set();
	const duplicatedNames: string[] = [];
	for (const name of allNames) {
		if (names.has(name)) {
			duplicatedNames.push(name);
		} else {
			names.add(name);
		}
	}
	if (duplicatedNames.length > 0) {
		throw new Error(
			`Command name is duplicated: ${duplicatedNames.join(", ")}`,
		);
	}

	const commandSetResult = await client.application.commands.set(
		commandInstances.map((command) => command.getDefinition()),
		GUILD_ID,
	);

	logger.info({
		commandsRegistered: Object.fromEntries(
			commandSetResult.map((cmd) => [
				cmd.name,
				{
					id: cmd.id,
					permissions: cmd.defaultMemberPermissions?.toArray() ?? [],
				},
			]),
		),
		msg: "Slash commands registered",
	});
}

/**
 * メッセージコマンドを登録する
 */
export function registerMessageCommands(logger: Logger) {
	const commandMessageInstances = Object.values(commandMessages);
	const registeredCommands = Object.fromEntries(
		commandMessageInstances.map((commandMessage) => [
			commandMessage.KEYWORD,
			{
				permissions: commandMessage.permissionBits ?? [],
			},
		]),
	);

	logger.info({
		commandMessagesRegistered: registeredCommands,
		msg: "Command messages registered",
	});
}
