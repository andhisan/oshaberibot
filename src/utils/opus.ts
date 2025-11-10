import opus from "@discordjs/opus";
import { safeEnv } from "./env";

/**
 * opus -> PCM
 * @see https://qiita.com/TanakaTakeshikun/items/141ab84b91f33d21f03c
 */
export async function decodeOpus(OpusStream: Buffer): Promise<Buffer | null> {
	return new Promise((resolve) => {
		try {
			const opusDecoder = new opus.OpusEncoder(safeEnv.AI_VOICE_SAMPLE_RATE, 1);
			const pcmData = opusDecoder.decode(OpusStream);
			resolve(pcmData);
		} catch (e) {
			console.error(e);
			resolve(null);
		}
	});
}
