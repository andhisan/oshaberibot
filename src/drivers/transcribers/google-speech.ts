import { SpeechClient } from "@google-cloud/speech";
import type { Logger } from "pino";
import type { ITranscriber } from "@/application/interfaces/transcriber.interface";
import { GCP } from "@/drivers/cloud-providers/gcp";
import { safeEnv } from "@/utils/env";

export class GoogleSpeech implements ITranscriber {
	readonly client: SpeechClient;
	readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
		this.client = new SpeechClient({
			projectId: safeEnv.GOOGLE_PROJECT_ID,
			credentials: GCP.getCredentials(),
		});
	}

	async transcribe(audioBuffer: Buffer): Promise<string> {
		const [response] = await this.client.recognize({
			config: {
				encoding: "LINEAR16" as const,
				// 自動で句読点を入れる
				enableAutomaticPunctuation: true,
				sampleRateHertz: safeEnv.AI_VOICE_SAMPLE_RATE,
				languageCode: "ja-JP",
			},
			audio: {
				content: audioBuffer,
			},
		});
		const transcription = response.results
			?.map((result) => result.alternatives?.[0].transcript)
			?.join("\n");

		this.logger.debug({ transcription }, "transcription");
		return transcription ?? "";
	}
}
