import type { User } from "discord.js";
import type { Logger } from "pino";
import type { IAiChatRepository } from "@/application/interfaces/ai-chat-repository.inteface";
import type { IAiVoiceRepository } from "@/application/interfaces/ai-voice-repository.interface";
import type { IKv } from "@/application/interfaces/kv.interface";
import { KV_KEYS } from "@/application/interfaces/kv.interface";
import type { ISpeaker } from "@/application/interfaces/speaker.interface";
import type { ITranscriber } from "@/application/interfaces/transcriber.interface";
import { safeEnv } from "@/utils/env";

/**
 * このリポジトリクラスでAiChatRepositoryをラップすることで、
 * AiChatRepositoryに対して音声データで入出力できる
 */
export class AiVoiceRepository implements IAiVoiceRepository {
	private readonly logger: Logger;
	private readonly kv: IKv;
	private readonly aiChatRepository: IAiChatRepository;
	private readonly transcriber: ITranscriber;
	private readonly speaker: ISpeaker;

	constructor(
		logger: Logger,
		kv: IKv,
		aiChatRepository: IAiChatRepository,
		transcriber: ITranscriber,
		speaker: ISpeaker,
	) {
		this.logger = logger;
		this.kv = kv;
		this.aiChatRepository = aiChatRepository;
		this.transcriber = transcriber;
		this.speaker = speaker;
	}

	public async getTranscribe({
		user,
		audioBuffer,
	}: {
		user: User;
		audioBuffer: Buffer;
	}): Promise<string> {
		this.logger.debug(`getting transcribe for user ${user.id}`);
		return this.transcriber.transcribe(audioBuffer);
	}

	public async getVoice({
		user,
		input,
	}: {
		user: User;
		input: string;
	}): Promise<Buffer | undefined> {
		await this.incrementUserSpeakCount(user);

		// 2. テキストをAIチャットに送信
		// 重要: **ここでは通常チャットにおけるインターバルチェックを行わない**
		const chatMessage = await this.aiChatRepository.getChatMessage({
			user,
			input,
			tokenLimit: safeEnv.AI_VOICE_TOKEN_LIMIT,
		});
		if (!chatMessage) {
			throw new Error("チャットに失敗しました");
		}
		// 3. AIチャットの応答を音声に変換
		const replyAudioBuffer = await this.speaker.textToAudioBuffer(
			user,
			chatMessage.content.slice(0, safeEnv.AI_VOICE_SPEECH_LIMIT),
		);
		if (!replyAudioBuffer) {
			throw new Error("音声生成に失敗しました");
		}
		return replyAudioBuffer;
	}

	private getUserSpeakCountHashKey() {
		return KV_KEYS.ai.limit.userSpeakCountHash;
	}

	private getUserLastSpeakedTimeHashKey() {
		return KV_KEYS.ai.limit.userLastSpeakedTimeHash;
	}

	private async incrementUserSpeakCount(user: User): Promise<void> {
		// 3. 最後に話した時刻を更新する
		await this.kv.hset(
			this.getUserLastSpeakedTimeHashKey(),
			user.id,
			Date.now(),
		);
		// 4. 話した回数を増やす
		await this.kv.hincrby(this.getUserSpeakCountHashKey(), user.id, 1);
		this.logger.debug(
			{
				user,
			},
			"set user last speaked time and increment speak count",
		);
	}

	private async decrementUserSpeakCountIfTimePassed(user: User): Promise<void> {
		// 1. 最後に話した時刻を取得する
		const lastSpeakedTime = await this.kv.hget<number>(
			this.getUserLastSpeakedTimeHashKey(),
			user.id,
		);
		// 2. 過去に話していた場合は、最後に話した時刻と現在時刻を比較し、
		// 時間差 * AI_VOICE_MAX_COUNT_PER_HOUR の分だけspeakCountを減らす
		if (lastSpeakedTime) {
			const diff = Date.now() - lastSpeakedTime;
			const diffHour = diff / (60 * 60 * 1000);
			const countDiff = Math.floor(
				diffHour * safeEnv.AI_VOICE_MAX_COUNT_PER_HOUR,
			);
			// 前回から長い時間がたっていれば、過剰に減らしてしまう場合があるため、0にする
			if (countDiff > safeEnv.AI_VOICE_MAX_COUNT_PER_HOUR) {
				await this.kv.hset(this.getUserSpeakCountHashKey(), user.id, 0);
				this.logger.debug(
					{
						user,
						diffHour,
						countDiff,
					},
					"reset user speak count as diff hour is too large",
				);
			} else if (countDiff > 0) {
				// 差分があればマイナスする
				await this.kv.hincrby(
					this.getUserSpeakCountHashKey(),
					user.id,
					-countDiff,
				);
				this.logger.debug(
					{
						user,
						diffHour,
						countDiff,
					},
					"decremented user speak count",
				);
			} else {
				// 連続でしゃべるなどして、時間が経っていなかった場合は何もしない
				this.logger.debug(
					{
						user,
						diffHour,
						countDiff,
					},
					"user speak count is not decremented as diff hour is too small",
				);
			}
		}
	}

	public async getUserCanUseAi(user: User): Promise<boolean> {
		// チェックの度に、カウントの引き算を試行する
		await this.decrementUserSpeakCountIfTimePassed(user);
		const speakCount = await this.kv.hget<number>(
			this.getUserSpeakCountHashKey(),
			user.id,
		);
		// 一度も喋っていない場合は、使用可能
		if (!speakCount) {
			return true;
		}
		// 過去に話していた場合は、カウントを比較する
		return speakCount < safeEnv.AI_VOICE_MAX_COUNT_PER_HOUR;
	}
}
