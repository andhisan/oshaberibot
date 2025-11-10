import type { AgentResponse } from "@/domains/entities/ai/agent-response";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import type { AI_PROVIDER } from "@/utils/env";

export interface IAgent {
	getAiProvider(): typeof AI_PROVIDER;

	getModelId(): string;

	buildInstructions({ tokenLimit }: { tokenLimit?: number }): string;

	getFirstResponse({
		userId,
		input,
		userImage,
		systemPrompt,
		tokenLimit,
	}: {
		/**
		 * OpenAI APIにおける `user`
		 * @see https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids
		 */
		userId: string;
		input: string;
		/** 添付画像 */
		userImage?: ChatUserImage;
		/**
		 * 新しい会話を開始するための指示
		 */
		systemPrompt: string;
		tokenLimit?: number;
	}): Promise<AgentResponse | null>;

	getContinuedResponse({
		userId,
		input,
		userImage,
		previousResponseId,
		systemPrompt,
		tokenLimit,
	}: {
		/**
		 * OpenAI APIにおける `user`
		 * @see https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids
		 */
		userId: string;
		input: string;
		/** 添付画像 */
		userImage?: ChatUserImage;
		/**
		 * OpenAI APIにおける `previous_response_id`
		 * いったんKVに保存すること
		 */
		previousResponseId: string;
		/**
		 * **GeminiAPIに  `previous_response_id` がないので、代わりに履歴をJSONとして渡しており、**
		 * **仕方なくシステムプロンプトを毎回渡す必要がある**
		 */
		systemPrompt?: string | null;
		/**
		 * 任意でトークン制限を適用する
		 */
		tokenLimit?: number;
	}): Promise<AgentResponse | null>;
}
