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
 */
export interface FetchWithCacheOptions<T = unknown> {
	/**
	 * URL to fetch
	 */
	url: string;

	/**
	 * Time to live in seconds for cached data
	 */
	ttl: number;

	/**
	 * Optional cache key (auto-generated from URL if not provided)
	 */
	cacheKey?: string;

	/**
	 * Custom function to parse the response
	 * @default (response) => response.json()
	 */
	parseResponse?: (response: Response) => Promise<T>;

	/**
	 * Fetch options (headers, method, etc.)
	 */
	fetchOptions?: RequestInit;

	/**
	 * Retry configuration
	 */
	retryOptions?: RetryOptions;

	/**
	 * Bypass cache and force fresh fetch
	 * @default false
	 */
	bypassCache?: boolean;
}
