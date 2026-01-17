/**
 * Cache entry type definitions
 */

export interface CacheEntry<T = unknown> {
	data: T;
	localCacheTimestamp: number;
}
