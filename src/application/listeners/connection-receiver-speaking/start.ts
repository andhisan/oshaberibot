import {
	type AudioPlayer,
	EndBehaviorType,
	type VoiceConnection,
} from "@discordjs/voice";
import type { Client } from "discord.js";
import { GetSpeakVoice } from "@/application/use-cases/get-speak-voice";
import { safeEnv } from "@/utils/env";
import { logger } from "@/utils/logger";
import { decodeOpus } from "@/utils/opus";
import { playBuffer } from "@/utils/vc";
import { streamToBuffer } from "@/utils/wav";

export const Start = {
	handler: async (
		client: Client,
		connection: VoiceConnection,
		userId: string,
		player: AudioPlayer,
		subscribedUsers: Set<string>,
	) => {
		const interactionLogger = logger.child({
			guildId: connection.joinConfig.guildId,
			userId,
		});
		// 2重録音を防止 https://zenn.dev/ksk000/articles/3d9ae0821d3564
		if (subscribedUsers.has(userId)) {
			interactionLogger.debug("already subscribed");
			return;
		}
		const user = client.users.cache.get(userId);
		if (!user) {
			return;
		}
		// botの発言を無視する
		if (user.bot) {
			return;
		}
		subscribedUsers.add(userId);
		const audio = connection.receiver.subscribe(userId, {
			end: {
				behavior: EndBehaviorType.AfterSilence,
				duration: safeEnv.DISCORD_VOICE_START_END_DURATION,
			},
		});
		subscribedUsers.add(userId);

		const opusStream: Uint8Array[] = [];

		audio.on("data", async (chunk) => {
			const decodedChunk = await decodeOpus(chunk);
			if (decodedChunk) {
				opusStream.push(decodedChunk);
			}
		});

		audio.on("end", async () => {
			// あまりに短い発言は無視する
			const minLength = safeEnv.AI_VOICE_MIN_STREAM_LENGTH;
			if (opusStream.length < minLength) {
				interactionLogger.debug(`voice is shorter than ${minLength}; skipping`);
				subscribedUsers.delete(userId);
				return;
			}
			try {
				const wavData = await streamToBuffer(opusStream);
				audio.destroy();
				interactionLogger.debug("wav data created");
				const getSpeakVoice = new GetSpeakVoice(interactionLogger);
				const voiceBuffer = await getSpeakVoice.handler({
					user,
					audioBuffer: wavData,
				});
				if (!voiceBuffer) {
					// 無言が返ってきた場合
					subscribedUsers.delete(userId);
					return;
				}
				playBuffer(player, voiceBuffer);
			} catch (error) {
				interactionLogger.error(error);
			} finally {
				audio.destroy();
				subscribedUsers.delete(userId);
			}
		});
	},
};
