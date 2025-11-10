import type { User } from "discord.js";

export interface ISpeaker {
	textToAudioBuffer: (user: User, text: string) => Promise<Buffer | null>;
}
