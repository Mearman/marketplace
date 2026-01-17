/**
 * Shared cache utilities using factory pattern
 *
 * Creates namespaced cache managers that store data with timestamps,
 * evaluating TTL at read time (client-provided TTL approach).
 *
 * @example
 * import { createCacheManager } from "../../../lib/cache";
 *
 * const cache = createCacheManager("my-plugin");
 * const key = cache.getCacheKey("https://api.example.com", { foo: "bar" });
 * await cache.setCached(key, data);
 * const cached = await cache.getCached<MyType>(key, 3600);
 * if (cached) {
 *   console.log(cached.data);
 * }
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";
import type { CacheEntry } from "./types";

export type { CacheEntry } from "./types";

export interface CacheManager {
	/**
	 * Generate a cache key from URL and parameters
	 * @param url - Base URL or identifier
	 * @param params - Optional parameters to include in key
	 * @returns 16-character hex hash
	 */
	getCacheKey(url: string, params?: Record<string, string | number>): string;

	/**
	 * Retrieve cached data if not expired
	 * @param key - Cache key from getCacheKey()
	 * @param ttlSeconds - Time to live in seconds
	 * @returns Cache entry with data and timestamp, or null if not found/expired
	 */
	getCached<T = unknown>(key: string, ttlSeconds: number): Promise<CacheEntry<T> | null>;

	/**
	 * Store data in cache with current timestamp
	 * @param key - Cache key from getCacheKey()
	 * @param data - Data to cache
	 */
	setCached<T = unknown>(key: string, data: T): Promise<void>;

	/**
	 * Clear all cache files for this namespace
	 */
	clearCache(): Promise<void>;

	/**
	 * The cache directory path for this namespace
	 */
	readonly CACHE_DIR: string;
}

/**
 * Create a namespaced cache manager
 * @param namespace - Unique namespace for this cache (e.g., "wayback", "npm-registry")
 * @returns Cache manager with isolated cache directory
 */
export function createCacheManager(namespace: string): CacheManager {
	const CACHE_DIR = path.join(os.tmpdir(), `${namespace}-cache`);

	const ensureCacheDir = async (): Promise<void> => {
		try {
			await fs.mkdir(CACHE_DIR, { recursive: true });
		} catch (error) {
			// If directory creation fails, cache will be disabled
			console.debug("Cache directory unavailable:", error);
		}
	};

	const getCacheKey = (url: string, params: Record<string, string | number> = {}): string => {
		const paramsStr = Object.entries(params)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}=${v}`)
			.join("&");
		const input = `${url}?${paramsStr}`;
		return createHash("sha256").update(input).digest("hex").slice(0, 16);
	};

	const getCached = async <T = unknown>(
		key: string,
		ttlSeconds: number
	): Promise<CacheEntry<T> | null> => {
		try {
			const filePath = path.join(CACHE_DIR, `${key}.json`);
			const content = await fs.readFile(filePath, "utf-8");
			const entry: CacheEntry<T> = JSON.parse(content);

			const expiresAt = entry.localCacheTimestamp + ttlSeconds * 1000;
			if (Date.now() > expiresAt) {
				// Cache expired, delete it
				await fs.unlink(filePath).catch(() => {});
				return null;
			}

			return entry;
		} catch {
			// File doesn't exist or is invalid
			return null;
		}
	};

	const setCached = async <T = unknown>(key: string, data: T): Promise<void> => {
		try {
			await ensureCacheDir();
			const filePath = path.join(CACHE_DIR, `${key}.json`);
			const entry: CacheEntry<T> = {
				data,
				localCacheTimestamp: Date.now(),
			};
			await fs.writeFile(filePath, JSON.stringify(entry), "utf-8");
		} catch (error) {
			// Fail silently - cache is optional
			console.debug("Cache write failed:", error);
		}
	};

	const clearCache = async (): Promise<void> => {
		try {
			const files = await fs.readdir(CACHE_DIR);
			const cacheFiles = files.filter((f) => f.endsWith(".json"));
			await Promise.all(cacheFiles.map((f) => fs.unlink(path.join(CACHE_DIR, f))));
			console.log(`Cleared ${cacheFiles.length} cache file(s) from ${CACHE_DIR}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				console.log("Cache directory not found or empty");
			} else {
				console.error("Error clearing cache:", error);
			}
		}
	};

	return {
		getCacheKey,
		getCached,
		setCached,
		clearCache,
		CACHE_DIR,
	};
}
