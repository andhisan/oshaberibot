import type { User } from "discord.js";
import type { ChatMessage } from "@/domains/entities/ai/chat-message";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";

/**
 * AIチャットのリポジトリのインターフェース
 *
 * **注意: リポジトリレベルでは、使用制限のチェックを行っていない**
 */
export interface IAiChatRepository {
	/** 既存の応答を追加して取得 */
	getChatMessage({
		user,
		input,
		userImage,
		tokenLimit,
	}: {
		user: User;
		input: string;
		userImage?: ChatUserImage;
		tokenLimit?: number;
	}): Promise<ChatMessage | null>;

	/** 会話をリセットする (最後の会話のIDを忘れることで、次からシステムプロンプトが使われる) */
	resetChat({ user }: { user: User }): Promise<void>;

	/**
	 * 指定されたユーザーが最小インターバルを満たしたか
	 */
	getUserCanUseAi(user: User, multiplier: number): Promise<boolean>;
}
