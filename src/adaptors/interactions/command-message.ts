import type { Message } from "discord.js";
import type { Logger } from "pino";

/** このキーワードを含めると、権限不足を模倣する */
export const SIMULATE_PERMISSION_DENIED_KEYWORD =
	"[simulate-permission-denied]";

/**
 * コマンドメッセージ
 * 厳密にはDiscordの機能ではないが、スラッシュコマンドのように
 * 「登録」の概念を自作している
 */
export class CommandMessage {
	readonly KEYWORD: string;

	/**
	 * このコマンドメッセージを実行できる権限
	 * 無指定の場合は、権限チェックをしない
	 * ※コマンドと違い、サーバー設定画面でオーバーライドできないため、
	 * 管理者以外に使わせるコマンドメッセージはあまり作るべきではない
	 * PermissionsBitFieldのtoArrayで変換すれば名前になる
	 **/
	readonly permissionBits?: bigint;
	handler: (message: Message, logger: Logger) => Promise<void>;

	constructor({
		keyword,
		permissionBits,
		handlerWithoutPermissionCheck,
		onPermissionCheckFailed = async (message: Message, _logger: Logger) => {
			await message.reply({
				content: `${keyword}: 権限がありません`,
			});
		},
	}: {
		keyword: string;
		permissionBits?: bigint;
		handlerWithoutPermissionCheck: (
			message: Message,
			logger: Logger,
		) => Promise<void>;
		onPermissionCheckFailed?: (
			message: Message,
			logger: Logger,
		) => Promise<void>;
	}) {
		this.KEYWORD = keyword;
		this.permissionBits = permissionBits;

		this.handler = (message: Message, logger: Logger): Promise<void> => {
			if (!this.isAllowedToPermissionBits(message)) {
				return onPermissionCheckFailed(message, logger);
			}
			return handlerWithoutPermissionCheck(message, logger);
		};
	}

	public isAllowedToPermissionBits(message: Message) {
		if (this.permissionBits === undefined) {
			return true;
		}
		if (message.cleanContent.includes(SIMULATE_PERMISSION_DENIED_KEYWORD)) {
			return false;
		}
		return message.member?.permissions.has(this.permissionBits);
	}

	public match(message: Message) {
		// パイプが含まれる場合は分割してArray.someで
		return this.KEYWORD.split("|").some((keyword) =>
			message.cleanContent.includes(keyword),
		);
	}
}
