import { createAudioPlayer, getVoiceConnection } from "@discordjs/voice";
import type { Client, VoiceState } from "discord.js";
import { logger } from "@/utils/logger";
import { End, Start } from "./connection-receiver-speaking";

export const VoiceStateUpdate = {
	async handler(client: Client, oldState: VoiceState, newState: VoiceState) {
		// ミュートでも反応してしまうので無視
		// https://azumikan.hatenablog.com/entry/2021/05/04/001556
		const statusChk =
			oldState.serverDeaf === newState.serverDeaf &&
			oldState.serverMute === newState.serverMute &&
			oldState.selfDeaf === newState.selfDeaf &&
			oldState.selfMute === newState.selfMute &&
			oldState.selfVideo === newState.selfVideo &&
			oldState.streaming === newState.streaming;

		const connection = getVoiceConnection(newState.guild.id);

		if (connection) {
			const player = createAudioPlayer();
			connection.subscribe(player);
			const subscribedUsers = new Set<string>();
			connection.receiver.speaking.on("start", (userId) =>
				Start.handler(client, connection, userId, player, subscribedUsers),
			);
			connection.receiver.speaking.on("end", (userId) =>
				End.handler(client, connection, userId),
			);
		}

		if ((statusChk || oldState.serverDeaf == null) && newState.channel) {
			// チャンネル参加時
		}
		if (statusChk && oldState.channel) {
			// 全員抜けた場合
			connection?.destroy();
			logger.debug("destroyed connection");
		}
	},
};
