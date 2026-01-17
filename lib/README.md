# Shared Utilities Library

Reusable utilities for marketplace plugins to reduce code duplication and maintain consistency.

## Overview

The `/lib` directory contains shared utilities used across multiple plugins:

- **`/lib/cache`** - Factory-pattern cache management with client-provided TTL
- **`/lib/args`** - Command-line argument parsing
- **`/lib/helpers`** - Common formatting and utility functions

## Benefits

1. **Code Reduction**: Eliminates ~200 lines of duplicate code per plugin
2. **Consistency**: All plugins use the same cache behavior and utilities
3. **Maintainability**: Bug fixes and improvements benefit all plugins
4. **Better Design**: Client-provided TTL is more flexible than server-provided TTL

## Usage

### Cache Management

```typescript
import { createCacheManager } from "../../../lib/cache";

// Create namespaced cache manager
const cache = createCacheManager("my-plugin");

// Generate cache key
const key = cache.getCacheKey("https://api.example.com", { version: "v1" });

// Write to cache (no TTL)
await cache.setCached(key, data);

// Read from cache (with TTL)
const cached = await cache.getCached<MyType>(key, 3600); // 1 hour
if (cached) {
  console.log(cached.data);
}

// Clear cache
await cache.clearCache();
```

**Re-export pattern** (maintains backward compatibility):

```typescript
// plugins/my-plugin/scripts/utils.ts
import { createCacheManager } from "../../../lib/cache";

const cache = createCacheManager("my-plugin");

// Re-export for plugin scripts
export const { getCacheKey, getCached, setCached, clearCache } = cache;

// Scripts import from utils.ts as usual
// import { getCached, setCached } from "./utils";
```

### Argument Parsing

```typescript
import { parseArgs } from "../../../lib/args";

const args = parseArgs(process.argv.slice(2));

// Check flags
if (args.flags.has("help")) { /* ... */ }

// Get options with defaults
const format = args.options.get("format") ?? "json";

// Get positional arguments
const url = args.positional[0];
```

### Helper Functions

```typescript
import { formatNumber, formatAge, sleep } from "../../../lib/helpers";

console.log(formatNumber(1234567)); // "1.2M"
console.log(formatAge("20240101120000")); // "15 days ago"
await sleep(1000); // Wait 1 second
```

## Migrated Plugins

All 5 plugins using the shared library:

| Plugin | Scripts | Lines Removed | TTL Values | Status |
|--------|---------|---------------|------------|--------|
| wayback | 4+ | ~60 | 30s, 1h, 24h | ✅ Migrated |
| npm-registry | 4 | ~70 | 1h, 6h, 24h | ✅ Migrated |
| github-api | 4 | ~70 | 5m, 30m, 1h | ✅ Migrated |
| npms-io | 3 | ~70 | 1h, 6h, 24h | ✅ Migrated |
| gravatar | 1 | ~30 | 24h | ✅ Migrated |

**Total code reduction:** ~300 lines of duplicate code eliminated

## Cache Approach: Client-Provided TTL

### Why Client-Provided TTL?

**OLD approach (server-provided):**
```typescript
const cached = await getCached<T>(key);
await setCached(key, data, 3600); // TTL stored in file
```

**NEW approach (client-provided):**
```typescript
const cached = await getCached<T>(key, 3600); // TTL evaluated at read time
await setCached(key, data); // No TTL stored
```

**Advantages:**
1. **Flexibility**: Same data can be cached with different TTLs for different use cases
2. **Separation of concerns**: Write logic doesn't need to know about expiration
3. **Simpler writes**: No TTL parameter to pass around
4. **Runtime decisions**: TTL determined at read time based on context

## Directory Structure

```
lib/
├── cache/
│   ├── index.ts          # Factory: createCacheManager(namespace)
│   ├── types.ts          # CacheEntry interface
│   └── README.md         # Cache documentation
├── args/
│   ├── index.ts          # parseArgs() function
│   └── README.md         # Args documentation
├── helpers/
│   ├── index.ts          # Formatting and utility functions
│   └── README.md         # Helpers documentation
└── README.md             # This file
```

## Adding New Utilities

When adding new shared utilities:

1. **Identify duplication** - Look for code repeated across 2+ plugins
2. **Extract to /lib** - Create appropriate subdirectory
3. **Write tests** - Ensure reliability
4. **Document** - Add README.md with usage examples
5. **Migrate plugins** - Update existing plugins to use shared code
6. **Update this README** - Document the new utility

## Type Checking

All shared utilities are strictly typed with TypeScript. Use path aliases in `tsconfig.json` for convenience (type-checking only):

```json
{
  "compilerOptions": {
    "paths": {
      "@lib/cache": ["./lib/cache/index.ts"],
      "@lib/args": ["./lib/args/index.ts"],
      "@lib/helpers": ["./lib/helpers/index.ts"]
    }
  }
}
```

**Note:** Plugins use relative imports (`../../../lib/cache`) to ensure tsx runtime compatibility.
