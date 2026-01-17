# Cache Utilities

Shared caching implementation using the factory pattern. Each plugin creates a namespaced cache manager with isolated storage.

## Features

- **Client-provided TTL**: Evaluate cache expiration at read time, not write time
- **Namespace isolation**: Each plugin gets its own cache directory
- **SHA-256 key generation**: Deterministic cache keys from URLs and parameters
- **Silent failures**: Cache errors don't break functionality
- **Automatic expiration**: Expired entries are deleted on read

## Usage

```typescript
import { createCacheManager } from "../../../lib/cache";

// Create namespaced cache manager
const cache = createCacheManager("my-plugin");

// Generate cache key
const key = cache.getCacheKey("https://api.example.com/data", { version: "v1" });

// Write to cache (no TTL)
await cache.setCached(key, { foo: "bar" });

// Read from cache (with TTL)
const cached = await cache.getCached<MyType>(key, 3600); // 1 hour TTL
if (cached) {
  console.log(cached.data); // Access via .data property
  console.log(cached.localCacheTimestamp); // When it was cached
}

// Clear all cache files
await cache.clearCache();
```

## API

### `createCacheManager(namespace: string): CacheManager`

Create a cache manager for the given namespace.

**Parameters:**
- `namespace` - Unique identifier (e.g., "wayback", "npm-registry")

**Returns:** Cache manager with the following methods

### `getCacheKey(url, params?): string`

Generate a 16-character hex cache key.

**Parameters:**
- `url` - Base URL or identifier
- `params` - Optional key-value parameters

**Returns:** Deterministic cache key (SHA-256 hash)

### `getCached<T>(key, ttlSeconds): Promise<CacheEntry<T> | null>`

Retrieve cached data if not expired.

**Parameters:**
- `key` - Cache key from `getCacheKey()`
- `ttlSeconds` - Time to live in seconds

**Returns:** Cache entry with `.data` and `.localCacheTimestamp`, or `null` if not found/expired

### `setCached<T>(key, data): Promise<void>`

Store data with current timestamp.

**Parameters:**
- `key` - Cache key from `getCacheKey()`
- `data` - Data to cache (must be JSON-serializable)

### `clearCache(): Promise<void>`

Remove all `.json` files in the cache directory.

## Cache Directory

Cache files are stored in:
```
/tmp/{namespace}-cache/
├── abc123def456.json
├── 789ghi012jkl.json
└── ...
```

Each file contains:
```json
{
  "data": { ... },
  "localCacheTimestamp": 1234567890000
}
```

## Migration from OLD Approach

**Before (server-provided TTL):**
```typescript
const cached = await getCached<T>(key);
if (cached === null) {
  const data = await fetch(...);
  await setCached(key, data, 3600); // TTL at write time
} else {
  const value = cached; // Direct access
}
```

**After (client-provided TTL):**
```typescript
const cached = await getCached<T>(key, 3600); // TTL at read time
if (cached === null) {
  const data = await fetch(...);
  await setCached(key, data); // No TTL
} else {
  const value = cached.data; // Access via .data
}
```

## Benefits of Client-Provided TTL

1. **Flexibility**: Same data can be cached with different TTLs for different use cases
2. **Separation of concerns**: Write logic doesn't need to know about expiration
3. **Simpler writes**: No TTL parameter to pass around
4. **Runtime decisions**: TTL can be determined at read time based on context
