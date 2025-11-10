/**
 * PCM -> WAVに変換
 * @see https://github.com/chasecs/wav-converter/blob/master/index.js
 * @param rawPCM buffer || binary
 * @throws Exception
 */
function encodeWav(
	rawPCM: Buffer | string,
	options: {
		numChannels?: number;
		sampleRate?: number;
		byteRate?: number;
	} = {},
): Buffer {
	let rawPCMFinal: Buffer;
	if (typeof rawPCM === "string") {
		rawPCMFinal = Buffer.from(rawPCM, "binary");
	} else {
		rawPCMFinal = rawPCM;
	}

	if (!Buffer.isBuffer(rawPCMFinal)) {
		throw new TypeError("rawPCM must be Buffer|string");
	}
	const opt = options || {};
	const sampleRate = opt.sampleRate || 16000;
	const numChannels = opt.numChannels || 1; // ここはシングルチャンネルに変更している
	const byteRate = opt.byteRate || 16;

	const buf = rawPCMFinal;
	const header = Buffer.alloc(44);

	header.write("RIFF", 0);
	header.writeUInt32LE(buf.length, 4);
	header.write("WAVE", 8);
	header.write("fmt ", 12);
	header.writeUInt8(16, 16);
	header.writeUInt8(1, 20);
	header.writeUInt8(numChannels, 22);
	header.writeUInt32LE(sampleRate, 24);
	header.writeUInt32LE(byteRate, 28);
	header.writeUInt8(4, 32);
	header.writeUInt8(16, 34);
	header.write("data", 36);
	header.writeUInt32LE(buf.length + 44 - 8, 40);

	return Buffer.concat([header, buf]);
}
/**
 * @see https://qiita.com/TanakaTakeshikun/items/141ab84b91f33d21f03c
 */
export async function streamToBuffer(stream: Uint8Array[]): Promise<Buffer> {
	const pcmDataArray = await Promise.all(stream);
	const concatenatedBuffer = Buffer.concat(pcmDataArray);
	const encodeData = encodeWav(concatenatedBuffer);
	return encodeData;
}
