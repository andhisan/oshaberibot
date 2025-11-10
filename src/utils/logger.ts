import pino from "pino";
import { safeEnv } from "./env";

/**
 * pinoロガー
 * docker logsで見れるように標準出力に書き出している
 *
 * **できるだけコンストラクタで注入するようにし、childメソッドで情報を継承する**
 */
export const logger = pino({
	transport: {
		target: "pino/file",
		options: {
			// 1: stdout
			destination: 1,
		},
	},
	level: safeEnv.LOG_LEVEL,
});
