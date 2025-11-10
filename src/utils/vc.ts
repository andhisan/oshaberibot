import { Readable } from "node:stream";
import { type AudioPlayer, createAudioResource } from "@discordjs/voice";

/**
 * bufferをVCで使える形式に変換して再生
 */
export function playBuffer(player: AudioPlayer, buffer: Buffer) {
	const readable = new Readable();
	readable.push(buffer);
	readable.push(null);
	const audioResource = createAudioResource(readable);
	player.play(audioResource);
}
