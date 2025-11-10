import type { VoiceConnection } from "@discordjs/voice";
import type { Client } from "discord.js";

export const End = {
	handler: async (
		_client: Client,
		_connection: VoiceConnection,
		_userId: string,
	) => {},
};
