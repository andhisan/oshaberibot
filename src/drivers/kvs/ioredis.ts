import type { Redis, RedisOptions } from "ioredis";
import DefaultRedis from "ioredis";
import type { IKv, KeyType } from "@/application/interfaces/kv.interface";
import { safeEnv } from "@/utils/env";

/**
 * ioredisによるKVの実装
 */
export class Ioredis implements IKv {
	private client: Redis;

	constructor() {
		const options = this.parseRedisUrl(safeEnv.REDIS_URL);
		this.client = new DefaultRedis(options);
	}

	/** URLを分解してオプションを指定できるように */
	private parseRedisUrl(url: string): RedisOptions {
		const parsedUrl = new URL(url);

		const options: RedisOptions = {
			host: parsedUrl.hostname,
			port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
			db: parsedUrl.pathname
				? Number.parseInt(parsedUrl.pathname.slice(1), 10)
				: 0,
			maxRetriesPerRequest: 5,
			// upstash.ioの名前解決できない問題を修正
			// https://community.fly.io/t/upstash-redis-node-error-getaddrinfo-enotfound/19322/3
			family: parsedUrl.hostname.includes("upstash.io") ? 6 : 4,
		};

		if (parsedUrl.username) {
			options.username = decodeURIComponent(parsedUrl.username);
		}

		if (parsedUrl.password) {
			options.password = decodeURIComponent(parsedUrl.password);
		}

		return options;
	}

	async get<T>(key: KeyType) {
		return (await this.client.get(key)) as T;
	}

	async hget<T>(key: KeyType, field: string) {
		return (await this.client.hget(key, field)) as T;
	}

	async getParsed<T>(key: KeyType) {
		const data = await this.client.get(key);
		return data ? (JSON.parse(data as string) as T) : null;
	}

	async hgetParsed<T>(key: KeyType, field: string) {
		const data = await this.client.hget(key, field);
		return data ? (JSON.parse(data as string) as T) : null;
	}

	async set<T>(key: KeyType, data: T) {
		let value = data as string;
		if (typeof data !== "string") {
			value = JSON.stringify(data);
		}
		return await this.client.set(key, value).then(async () => {
			return (await this.client.get(key)) as T;
		});
	}

	async hset<T>(key: KeyType, field: string, data: T) {
		let value = data as string;
		if (typeof data !== "string") {
			value = JSON.stringify(data);
		}
		return await this.client.hset(key, field, value).then(async () => {
			return (await this.client.hget(key, field)) as T;
		});
	}

	async incrby(key: KeyType, value: number) {
		return await this.client.incrby(key, value);
	}

	async hincrby(key: KeyType, field: string, value: number) {
		return await this.client.hincrby(key, field, value);
	}

	async del(key: KeyType) {
		await this.client.del(key);
	}
}
