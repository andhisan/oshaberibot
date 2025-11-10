/**
 * 音声をテキストに変換する
 */
export interface ITranscriber {
	transcribe(audioBuffer: Buffer): Promise<string>;
}
