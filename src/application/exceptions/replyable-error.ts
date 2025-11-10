/**
 * Build script, written by contributors of discordjs-japan/om
 *
 * MIT License
 *
 * Copyright (c) 2024 Discord.js Japan User Group
 *
 * @see https://github.com/discordjs-japan/om/blob/main/src/error.ts
 * @packageDocumentation
 */
import { type InteractionReplyOptions, MessageFlags } from "discord.js";

export class ReplyableError extends Error {
	public static from(e: unknown) {
		if (e instanceof ReplyableError) return e;
		if (e instanceof Error) return new ReplyableError(e.message);
		return new ReplyableError(String(e));
	}

	public toReply(): InteractionReplyOptions {
		return {
			content: this.message,
			flags: MessageFlags.Ephemeral,
		};
	}
}
