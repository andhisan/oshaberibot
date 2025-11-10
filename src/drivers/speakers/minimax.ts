import type { User } from "discord.js";
import type { Logger } from "pino";
import Replicate, { type FileOutput } from "replicate";
import type { ISpeaker } from "@/application/interfaces/speaker.interface";

export class Minimax implements ISpeaker {
	readonly logger: Logger;
	readonly client: Replicate;

	constructor(logger: Logger) {
		this.logger = logger;
		this.client = new Replicate();
	}

	async textToAudioBuffer(_user: User, text: string): Promise<Buffer | null> {
		const response = await this.client.run("minimax/speech-02-turbo", {
			/**
			 * minimax / speech-02-turboにおける入力パラメータ
			 * @see https://replicate.com/minimax/speech-02-turbo?input=json
			 */
			input: {
				text,
				voice_id: "Deep_Voice_Man",
				pitch: 0,
				speed: 1.5,
				volume: 1,
				bitrate: 128000,
				channel: "mono",
				emotion: "auto",
				sample_rate: 16000,
				language_boost: "Japanese",
				english_normalization: true,
			},
		});

		if (!response) {
			return null;
		}
		const fileOutput = response as FileOutput;
		const blob = await fileOutput.blob();
		return Buffer.from(await blob.arrayBuffer());
	}
}
