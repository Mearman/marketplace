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

## Fetch with Cache and Retry

The `fetchWithCache()` method combines fetching, caching, and retry logic into a single call. It automatically handles:

- Cache-first pattern (check cache before fetching)
- Exponential backoff with jitter for retries
- Automatic retries for transient errors (429, 500, 502, 503, 504)
- HTTP error handling with specific messages
- Response parsing (JSON by default)

### Basic Usage

```typescript
import { createCacheManager } from "../../../lib/cache";

const cache = createCacheManager("my-plugin");

// Simple fetch with cache
const data = await cache.fetchWithCache<MyType>({
  url: "https://api.example.com/data",
  ttl: 3600, // 1 hour cache
});

// Bypass cache
const freshData = await cache.fetchWithCache<MyType>({
  url: "https://api.example.com/data",
  ttl: 3600,
  bypassCache: true, // Force fresh fetch
});
```

### Configuring Default Retry Behavior

For APIs with specific rate limiting or retry needs (e.g., GitHub), configure defaults when creating the cache manager:

```typescript
import { createCacheManager } from "../../../lib/cache";

// Configure retry defaults for GitHub API
const cache = createCacheManager("github-api", {
  defaultRetryOptions: {
    maxRetries: 5,
    initialDelay: 2000,
    retryableStatuses: [403, 429, 500, 502, 503, 504], // Include 403 for rate limits
  }
});

// All fetchWithCache calls use these defaults
const userData = await cache.fetchWithCache<UserData>({
  url: "https://api.github.com/user",
  ttl: 7200,
  fetchOptions: {
    headers: { Authorization: `Bearer ${token}` },
  },
  // No need to specify retryOptions - uses defaults
});

// Can still override per-call if needed
const repoData = await cache.fetchWithCache<RepoData>({
  url: "https://api.github.com/repos/owner/repo",
  ttl: 3600,
  retryOptions: {
    maxRetries: 3, // Override just this one option
  },
});
```

### Advanced Options

```typescript
// Custom response parser (e.g., for XML or plain text)
const xmlData = await cache.fetchWithCache<string>({
  url: "https://api.example.com/data.xml",
  ttl: 3600,
  parseResponse: async (response) => response.text(),
});

// Custom cache key for parameterized endpoints
const data = await cache.fetchWithCache<RepoData>({
  url: "https://api.github.com/repos/owner/repo",
  ttl: 21600,
  cacheKey: cache.getCacheKey("github-repo", { owner: "owner", repo: "repo" }),
});

// Custom fetch options (headers, method, etc.)
const data = await cache.fetchWithCache<UserData>({
  url: "https://api.example.com/user",
  ttl: 7200,
  fetchOptions: {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "value" }),
  },
});
```

### Retry Behavior

**Default retry configuration:**
- `maxRetries`: 3 attempts
- `initialDelay`: 1000ms (1 second)
- `maxDelay`: 30000ms (30 seconds)
- `backoffMultiplier`: 2 (exponential)
- `jitter`: true (adds 0-50% random delay)
- `retryableStatuses`: [408, 429, 500, 502, 503, 504]

**Exponential backoff example:**
```
Attempt 1: Wait 1000ms + jitter (0-500ms)
Attempt 2: Wait 2000ms + jitter (0-1000ms)
Attempt 3: Wait 4000ms + jitter (0-2000ms)
Attempt 4: Wait 8000ms + jitter (0-4000ms)
```

**Non-retryable errors** (immediate failure):
- 404 Not Found
- 401 Unauthorized
- Network errors after max retries

### Migration Pattern

**BEFORE (manual fetch + cache + error handling):**
```typescript
const noCache = flags.has("no-cache");
let data: PackageInfo;

if (noCache) {
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Package not found");
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  data = await response.json();
  await setCached(cacheKey, data);
} else {
  const cached = await getCached<PackageInfo>(cacheKey, 21600);
  if (cached === null) {
    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Package not found");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    data = await response.json();
    await setCached(cacheKey, data);
  } else {
    data = cached.data;
  }
}
```

**AFTER (fetchWithCache):**
```typescript
const data = await cache.fetchWithCache<PackageInfo>({
  url: apiUrl,
  ttl: 21600,
  fetchOptions: { headers },
  bypassCache: flags.has("no-cache"),
});
```

**Code reduction:** ~30 lines → ~5 lines per script

## API

### `createCacheManager(namespace: string, options?): CacheManager`

Create a cache manager for the given namespace.

**Parameters:**
- `namespace` - Unique identifier (e.g., "wayback", "npm-registry")
- `options` - Optional configuration object
  - `defaultRetryOptions` - Default retry configuration for all fetchWithCache calls

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

### `fetchWithCache<T>(options): Promise<T>`

Fetch data with automatic caching and retry logic.

**Parameters:**
- `url` - URL to fetch (required)
- `ttl` - Time to live in seconds (required)
- `cacheKey` - Optional custom cache key (auto-generated from URL if not provided)
- `parseResponse` - Custom response parser (default: `response.json()`)
- `fetchOptions` - Fetch options (headers, method, body, etc.)
- `retryOptions` - Retry configuration (see RetryOptions below)
- `bypassCache` - Skip cache check and force fresh fetch (default: false)

**RetryOptions:**
- `maxRetries` - Maximum retry attempts (default: 3)
- `initialDelay` - Initial delay in ms (default: 1000)
- `maxDelay` - Maximum delay in ms (default: 30000)
- `backoffMultiplier` - Exponential backoff multiplier (default: 2)
- `jitter` - Add random jitter to prevent thundering herd (default: true)
- `retryableStatuses` - HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504])

**Returns:** Fetched or cached data of type `T`

**Throws:**
- Error with specific message for 404, 401/403 status codes
- Error after all retries exhausted
- Network errors after max retries

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
