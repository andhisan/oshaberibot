import {
	AttachmentBuilder,
	EmbedBuilder,
	type Message,
	MessagePayload,
	type MessagePayloadOption,
} from "discord.js";
import type { Logger } from "pino";
import sharp from "sharp";
import { AiChatRepository } from "@/adaptors/repository/ai-chat-repository";
import { AiLimitRepository } from "@/adaptors/repository/ai-limit-repository";
import { AiPromptRepository } from "@/adaptors/repository/ai-prompt-repository";
import type { ChatUserImage } from "@/domains/entities/ai/chat-user-image";
import { Gemini } from "@/drivers/agents/gemini";
import { GeminiImage } from "@/drivers/agents/gemini-image";
import { OpenAI } from "@/drivers/agents/openai";
import { Ioredis } from "@/drivers/kvs/ioredis";
import { AI_PROVIDER, safeEnv } from "@/utils/env";

/**
 * 画像生成モデルを使用するかどうかを判断するキーワード
 * すべてのキーワードが含まれている場合に画像生成モデルを使用する
 */
export const IMAGE_MODEL_SWITCH_KEYWORDS = [
	["画像"],
	["image", "generate"],
	["加工"],
	["編集"],
	["合成"],
	["削除"],
];

/**
 * AI_PROVIDERに応じて異なるAIサービスを使い、応答を返す
 */
export class GetMessageReply {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	async handler(message: Message): Promise<MessagePayload | undefined> {
		const user = message.author;

		/** 画像生成モデルを使用するかどうか */
		const switchToImageModel =
			AI_PROVIDER === "google" &&
			IMAGE_MODEL_SWITCH_KEYWORDS.some((keywords) =>
				keywords.every((keyword) => message.cleanContent.includes(keyword)),
			);

		const agent =
			AI_PROVIDER === "google"
				? switchToImageModel
					? new GeminiImage(this.logger, message.author)
					: new Gemini(this.logger, message.author)
				: new OpenAI(this.logger, message.author);
		const kv = new Ioredis();
		const aiChatRepository = new AiChatRepository(
			this.logger,
			kv,
			agent,
			new AiPromptRepository(this.logger, kv),
			new AiLimitRepository(this.logger, kv, agent),
		);

		// ユーザーが最小間隔を満たしていない場合
		// すごい適当だが、画像生成モデルの方がコストが高いため、整数倍にする
		if (
			safeEnv.NODE_ENV !== "development" &&
			!(await aiChatRepository.getUserCanUseAi(
				user,
				switchToImageModel ? safeEnv.AI_MIN_INTERVAL_MULTIPLIER_FOR_IMAGE : 1,
			))
		) {
			return;
		}

		// 最初の添付画像のみを使用する
		let userImage: ChatUserImage | undefined;
		if (message.attachments.size > 0) {
			const attachment = message.attachments.first();
			if (attachment) {
				// proxyURLはリサイズ用CDNだが、手元で試した限りでは特にサイズの変化はなかった
				const attachmentResponse = await fetch(attachment.proxyURL);
				const arrayBuffer = await attachmentResponse.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// 応答が遅くなるのは覚悟の上、あまりに大きな画像はsharpで圧縮する
				const processedBuffer = await sharp(buffer)
					.resize({
						width: 1024,
						height: 1024,
						fit: sharp.fit.inside,
						withoutEnlargement: true, // これより小さいなら放置
					})
					.png({ quality: 80 })
					.toBuffer();

				userImage = {
					buffer: processedBuffer,
					contentType: "image/png",
				};
			}
		}

		const chatMessage = await aiChatRepository.getChatMessage({
			user,
			input: message.content,
			userImage,
		});

		let attachment: AttachmentBuilder | undefined;
		if (chatMessage.generatedImageBuffer) {
			// OpenAIもGeminiもpng形式のバッファを返すため、これでよい
			attachment = new AttachmentBuilder(
				chatMessage.generatedImageBuffer,
			).setName("image.png");
		}

		const payload: MessagePayloadOption = {
			content: chatMessage.content,
			files: attachment ? [attachment] : [],
		};

		const embeds: EmbedBuilder[] = [];
		if (attachment) {
			embeds.push(
				new EmbedBuilder()
					.setColor("Blurple")
					.setDescription(
						`${chatMessage.status?.title} - 画像生成にシステムプロンプトは使われません`,
					),
			);
		}
		if (switchToImageModel && !attachment) {
			if (chatMessage.status) {
				embeds.push(
					new EmbedBuilder()
						.setColor("Red")
						.setDescription(
							`${chatMessage.status?.title} - 画像生成モデルを使用しましたが、画像が返ってきませんでした`,
						),
				);
			} else {
				embeds.push(
					new EmbedBuilder()
						.setColor("Red")
						.setDescription(`画像生成モデルの応答がありません`),
				);
			}
		}

		if (chatMessage.status && safeEnv.NODE_ENV === "development") {
			embeds.push(
				new EmbedBuilder()
					.setColor("Green")
					.setDescription(chatMessage.status.title)
					.addFields([
						{
							inline: true,
							name: "トークン使用量",
							value: chatMessage.status.totalToken?.toString() ?? "不明",
						},
						{
							inline: true,
							name: "リセット閾値",
							value: chatMessage.status.threshold.toString(),
						},
					]),
			);
		}

		return new MessagePayload(message.channel, {
			...payload,
			embeds,
		});
	}
}
