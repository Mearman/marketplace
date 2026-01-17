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
import type { CacheEntry, RetryOptions, FetchWithCacheOptions, CacheManagerOptions } from "./types";
import { sleep } from "../helpers";

export type { CacheEntry, RetryOptions, FetchWithCacheOptions, CacheManagerOptions } from "./types";

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
	 * Fetch data with automatic caching and retry logic
	 * @param options - Fetch and cache options
	 * @returns Fetched or cached data
	 */
	fetchWithCache<T = unknown>(options: FetchWithCacheOptions<T>): Promise<T>;

	/**
	 * The cache directory path for this namespace
	 */
	readonly CACHE_DIR: string;
}

/**
 * Create a namespaced cache manager
 * @param namespace - Unique namespace for this cache (e.g., "wayback", "npm-registry")
 * @param options - Optional configuration for default retry behavior
 * @returns Cache manager with isolated cache directory
 */
export function createCacheManager(namespace: string, options?: CacheManagerOptions): CacheManager {
	const CACHE_DIR = path.join(os.tmpdir(), `${namespace}-cache`);
	const defaultRetryOptions = options?.defaultRetryOptions || {};

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

	/**
	 * Calculate exponential backoff delay with optional jitter
	 * @param attempt - Current retry attempt (0-based)
	 * @param options - Retry options
	 * @returns Delay in milliseconds
	 */
	const calculateDelay = (attempt: number, options: Required<RetryOptions>): number => {
		const baseDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
		const cappedDelay = Math.min(baseDelay, options.maxDelay);

		if (options.jitter) {
			// Add random jitter (0-50% of delay) to prevent thundering herd
			const jitterAmount = Math.random() * cappedDelay * 0.5;
			return cappedDelay + jitterAmount;
		}

		return cappedDelay;
	};

	/**
	 * Fetch with automatic retry logic
	 * @param url - URL to fetch
	 * @param fetchOptions - Fetch options
	 * @param retryOptions - Retry configuration (merged with defaultRetryOptions)
	 * @returns Response
	 */
	const fetchWithRetry = async (
		url: string,
		fetchOptions: RequestInit = {},
		retryOptions: Partial<RetryOptions> = {}
	): Promise<Response> => {
		// Merge: hardcoded defaults < defaultRetryOptions < call-specific retryOptions
		const mergedOptions = { ...defaultRetryOptions, ...retryOptions };
		const options: Required<RetryOptions> = {
			maxRetries: mergedOptions.maxRetries ?? 3,
			initialDelay: mergedOptions.initialDelay ?? 1000,
			maxDelay: mergedOptions.maxDelay ?? 30000,
			backoffMultiplier: mergedOptions.backoffMultiplier ?? 2,
			jitter: mergedOptions.jitter ?? true,
			retryableStatuses: mergedOptions.retryableStatuses ?? [408, 429, 500, 502, 503, 504],
		};

		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
			try {
				const response = await fetch(url, fetchOptions);

				// Check if status is retryable
				if (!response.ok && options.retryableStatuses.includes(response.status)) {
					if (attempt < options.maxRetries) {
						const delay = calculateDelay(attempt, options);
						console.debug(
							`Retry ${attempt + 1}/${options.maxRetries} after ${Math.round(delay)}ms (status ${response.status})`
						);
						await sleep(delay);
						continue; // Retry
					}
				}

				return response; // Success or non-retryable error

			} catch (error) {
				lastError = error as Error;
				if (attempt < options.maxRetries) {
					const delay = calculateDelay(attempt, options);
					console.debug(
						`Retry ${attempt + 1}/${options.maxRetries} after ${Math.round(delay)}ms (network error)`
					);
					await sleep(delay);
					continue; // Retry network error
				}
			}
		}

		// All retries exhausted
		throw lastError || new Error("Fetch failed after all retries");
	};

	/**
	 * Fetch data with automatic caching and retry logic
	 * @param options - Fetch and cache options
	 * @returns Fetched or cached data
	 */
	const fetchWithCache = async <T = unknown>(
		options: FetchWithCacheOptions<T>
	): Promise<T> => {
		const {
			url,
			ttl,
			cacheKey: providedKey,
			parseResponse = async (response: Response) => response.json() as Promise<T>,
			fetchOptions = {},
			retryOptions = {},
			bypassCache = false,
		} = options;

		// Generate cache key
		const cacheKey = providedKey || getCacheKey(url);

		// Check cache first (unless bypassing)
		if (!bypassCache) {
			const cached = await getCached<T>(cacheKey, ttl);
			if (cached !== null) {
				return cached.data;
			}
		}

		// Fetch with retry logic
		const response = await fetchWithRetry(url, fetchOptions, retryOptions);

		// Check for HTTP errors
		if (!response.ok) {
			// Provide more specific error messages for common status codes
			if (response.status === 404) {
				throw new Error(`Resource not found: ${url}`);
			}
			if (response.status === 401 || response.status === 403) {
				throw new Error(`Authentication/Authorization failed: ${response.status} ${response.statusText}`);
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Parse response
		const data = await parseResponse(response);

		// Cache the result
		await setCached(cacheKey, data);

		return data;
	};

	return {
		getCacheKey,
		getCached,
		setCached,
		clearCache,
		fetchWithCache,
		CACHE_DIR,
	};
}
