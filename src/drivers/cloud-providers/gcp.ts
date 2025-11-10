import { safeEnv } from "../../utils/env";

export const GCP = {
	/**
	 * base64エンコードしたサービスアカウントJSONを使用する
	 * https://www.paulie.dev/posts/2024/06/how-to-use-google-application-json-credentials-in-environment-variables/
	 */
	getCredentials() {
		return JSON.parse(
			Buffer.from(
				safeEnv.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
				"base64",
			).toString("utf-8"),
		);
	},
};
