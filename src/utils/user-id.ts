import type { User } from "discord.js";

/**
 * Generates a standardized user ID for AI services
 * @param user Discord user object
 * @returns Formatted user ID string
 */
export function generateAiUserId(user: User | { id: string }): string {
	return `discord_userid_${user.id}`;
}
