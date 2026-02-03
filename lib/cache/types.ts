/**
 * Cache entry type definitions
 */

export interface CacheEntry<T = unknown> {
	data: T;
	localCacheTimestamp: number;
}

/**
 * Retry configuration options for fetchWithCache
 */
export interface RetryOptions {
	/**
	 * Maximum number of retry attempts
	 * @default 3
	 */
	maxRetries?: number;

	/**
	 * Initial delay in milliseconds before first retry
	 * @default 1000
	 */
	initialDelay?: number;

	/**
	 * Maximum delay in milliseconds between retries
	 * @default 30000
	 */
	maxDelay?: number;

	/**
	 * Multiplier for exponential backoff
	 * @default 2
	 */
	backoffMultiplier?: number;

	/**
	 * Whether to add random jitter to delay (prevents thundering herd)
	 * @default true
	 */
	jitter?: boolean;

	/**
	 * HTTP status codes that should trigger a retry
	 * @default [408, 429, 500, 502, 503, 504]
	 */
	retryableStatuses?: number[];
}

/**
 * Options for fetchWithCache method
 *
 * Note: fetchWithCache returns `unknown` for type safety. Callers should
 * validate the returned data using type guards before use.
 */
export interface FetchWithCacheOptions {
	/**
	 * URL to fetch
	 */
	url: string;

	/**
	 * Time to live in seconds for cached data
	 * Uses defaultTTL from cache manager if not specified
	 * @default 3600 (1 hour)
	 */
	ttl?: number;

	/**
	 * Optional cache key (auto-generated from URL if not provided)
	 */
	cacheKey?: string;

	/**
	 * Custom function to parse the response
	 * Returns unknown - caller should validate the result
	 * @default (response) => response.json()
	 */
	parseResponse?: (response: Response) => Promise<unknown>;

	/**
	 * Fetch options (headers, method, etc.)
	 */
	fetchOptions?: RequestInit;

	/**
	 * Retry configuration (overrides defaults set in createCacheManager)
	 */
	retryOptions?: Partial<RetryOptions>;

	/**
	 * Bypass cache and force fresh fetch
	 * @default false
	 */
	bypassCache?: boolean;
}

/**
 * Options for creating a cache manager
 */
export interface CacheManagerOptions {
	/**
	 * Default retry options for all fetchWithCache calls
	 * Can be overridden per-call with FetchWithCacheOptions.retryOptions
	 */
	defaultRetryOptions?: Partial<RetryOptions>;

	/**
	 * Default TTL in seconds for all fetchWithCache calls
	 * Can be overridden per-call with FetchWithCacheOptions.ttl
	 * @default 3600 (1 hour)
	 */
	defaultTTL?: number;
}
