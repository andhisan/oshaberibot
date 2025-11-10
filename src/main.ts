import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import {
	registerCommands,
	registerMessageCommands,
} from "./application/bootstrap";
import { InteractionCreate } from "./application/listeners/interaction-create";
import { MessageCreate } from "./application/listeners/message-create";
import { VoiceStateUpdate } from "./application/listeners/voice-state-update";
import { getCurrentDatetime } from "./utils/date";
import { AI_PROVIDER, BOT_VERSION, safeEnv } from "./utils/env";
import { logger } from "./utils/logger";

process.title = "oshaberibot";
const activityName = `${safeEnv.BUSY_REACTION}が出たら間隔あけてね (${getCurrentDatetime()}起動) v${BOT_VERSION}`;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [
			{
				type: ActivityType.Custom,
				name: activityName,
			},
		],
	},
});

client.on(Events.MessageCreate, async (message) =>
	MessageCreate.handler(client, message),
);

client.on(
	Events.InteractionCreate,
	async (interaction) => await InteractionCreate.handler(client, interaction),
);

client.on(
	Events.VoiceStateUpdate,
	async (oldState, newState) =>
		await VoiceStateUpdate.handler(client, oldState, newState),
);

client.once(Events.ClientReady, async (client) => {
	logger.info(
		{
			tag: client.user.tag,
			activityName,
			aiProvider: AI_PROVIDER,
			logLevel: safeEnv.LOG_LEVEL,
		},
		"Logged in",
	);

	// コマンドを登録する
	await registerCommands(client, logger);
	registerMessageCommands(logger);
});

function shutdown(signal: NodeJS.Signals) {
	logger.info(`${signal}: SHUTTING DOWN`);
	void client.destroy().then(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("BOOTING bot");

logger.info("Proceeding to login");
void client.login(safeEnv.DISCORD_BOT_TOKEN);
