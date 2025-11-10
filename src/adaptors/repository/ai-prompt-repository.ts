import type { Logger } from "pino";
import type { IAiPromptRepository } from "@/application/interfaces/ai-prompt-repository.interface";
import { type IKv, KV_KEYS } from "@/application/interfaces/kv.interface";

export class AiPromptRepository implements IAiPromptRepository {
	private readonly logger: Logger;
	private readonly kv: IKv;

	constructor(logger: Logger, kv: IKv) {
		this.logger = logger;
		this.kv = kv;
	}

	private getSystemMessageKey() {
		return KV_KEYS.ai.prompt.systemMessage;
	}

	async getSystemMessage(): Promise<string | null> {
		// KVになければクラウドから取得してキャッシュする
		const key = this.getSystemMessageKey();
		let systemMessage: string | null | undefined = null;
		try {
			systemMessage = await this.kv.get<string>(key);
		} catch (e) {
			this.logger.error(e);
			throw new Error("システムプロンプトの取得に失敗しました");
		}

		return systemMessage ?? null;
	}

	async setSystemMessage(systemMessage: string): Promise<void> {
		try {
			const key = this.getSystemMessageKey();
			await this.kv.set(key, systemMessage);
		} catch (e) {
			this.logger.error(e);
			throw new Error("システムプロンプトの保存に失敗しました");
		}
	}
}
