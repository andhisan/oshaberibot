import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import type { Logger } from "pino";

/**
 * 音声チャンネルに参加する
 */
export class JoinVCConnection {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler(voiceChannel: VoiceBasedChannel): Promise<string> {
		const connection = getVoiceConnection(voiceChannel.guild.id);
		if (connection) {
			this.logger.debug({ voiceChannel }, "already joined voice channel");
			return "すでに参加しています";
		}
		this.logger.debug({ voiceChannel }, "joined voice channel");

		joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: voiceChannel.guild.id,
			adapterCreator: voiceChannel.guild.voiceAdapterCreator,
			selfDeaf: true,
		});
		return "参加しました";
	}
}
