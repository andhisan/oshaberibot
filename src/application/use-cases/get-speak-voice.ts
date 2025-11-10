import type { User } from "discord.js";
import type { Logger } from "pino";
import { AiChatRepository } from "@/adaptors/repository/ai-chat-repository";
import { AiLimitRepository } from "@/adaptors/repository/ai-limit-repository";
import { AiPromptRepository } from "@/adaptors/repository/ai-prompt-repository";
import { AiVoiceRepository } from "@/adaptors/repository/ai-voice-repository";
import { Gemini } from "@/drivers/agents/gemini";
import { OpenAI } from "@/drivers/agents/openai";
import { Ioredis } from "@/drivers/kvs/ioredis";
import { Minimax } from "@/drivers/speakers/minimax";
import { GoogleSpeech } from "@/drivers/transcribers/google-speech";
import { AI_PROVIDER } from "@/utils/env";

export class GetSpeakVoice {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler({
		user,
		audioBuffer,
	}: {
		user: User;
		audioBuffer: Buffer;
	}): Promise<Buffer | undefined> {
		const agent =
			AI_PROVIDER === "google"
				? new Gemini(this.logger, user)
				: new OpenAI(this.logger, user);
		const kv = new Ioredis();
		const aiChatRepository = new AiChatRepository(
			this.logger,
			kv,
			agent,
			new AiPromptRepository(this.logger, kv),
			new AiLimitRepository(this.logger, kv, agent),
		);
		const transcriber = new GoogleSpeech(this.logger);
		const speaker = new Minimax(this.logger);
		const aiVoiceRepository = new AiVoiceRepository(
			this.logger,
			kv,
			aiChatRepository,
			transcriber,
			speaker,
		);

		// なぜ先に書き起こすのか？
		// → 無言の場合に、カウントの減算はしない (雑音を入れまくってカウントを減らすことを防止)
		const transcribe = await aiVoiceRepository.getTranscribe({
			user,
			audioBuffer,
		});
		if (transcribe === "") {
			// 書き起こした結果、無言の場合は何もしない
			return;
		}

		// ここでカウントの減算と比較を行う
		if (!(await aiVoiceRepository.getUserCanUseAi(user))) {
			// 使えない場合
			return;
		}

		// ここでカウントの加算を行う
		const voiceBuffer = await aiVoiceRepository.getVoice({
			user,
			input: transcribe,
		});
		if (!voiceBuffer) {
			return;
		}
		return voiceBuffer;
	}
}
