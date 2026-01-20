# npm Registry (npm-registry)

npm Registry: Tools for searching packages, getting metadata, checking existence, and fetching download statistics

**Version:** v0.2.0
**Install:** `/plugin install npm-registry@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Get npm Download Statistics

Retrieve download statistics for an npm package over a specified time period.

## Usage

```bash
npx tsx scripts/downloads.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--period=PERIOD` | Time period: last-week, last-month, last-year (default: last-month) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Downloads for react (last-month)
--------------------------------
Period: 2023-10-01 to 2023-10-31 (31 days)
Total downloads: 15,234,567
Average per day: 491,438
Peak day: 2023-10-15 (678,234 downloads)
```

## Script Execution (Preferred)

```bash
npx tsx scripts/downloads.ts <package-name> [options]
```

Options:
- `--period=PERIOD` - Time period: last-week, last-month, last-year (default: last-month)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npm-registry plugin directory: `~/.claude/plugins/cache/npm-registry/`

## Downloads API

```
GET https://api.npmjs.org/downloads/range/{period}:{package}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `period` | Yes | Time period: `last-week`, `last-month`, `last-year`, or date range (`YYYY-MM-DD:YYYY-MM-DD`) |
| `package` | Yes | The exact package name (case-sensitive) |

### Examples

Last week:
```
https://api.npmjs.org/downloads/range/last-week:react
```

Last month:
```
https://api.npmjs.org/downloads/range/last-month:react
```

Last year:
```
https://api.npmjs.org/downloads/range/last-year:react
```

Custom date range:
```
https://api.npmjs.org/downloads/range/2023-01-01:2023-12-31:react
```

## Response Format

```json
{
  "downloads": [
    {
      "downloads": 1234567,
      "day": "2023-10-01"
    }
  ],
  "start": "2023-10-01",
  "end": "2023-10-31",
  "package": "react"
}
```

| `last-month` | Past 30 days |
| `last-year` | Past 365 days |
| `YYYY-MM-DD:YYYY-MM-DD` | Custom date range |

Custom date ranges must be in ISO 8601 format (YYYY-MM-DD).

## Download Trends

The data can show:
- **Weekly patterns** - Higher weekday downloads for development tools
- **Release spikes** - Sudden increases after major version releases
- **Seasonal trends** - Patterns based on project cycles
- **Long-term growth** - Overall adoption trends

## Caching

Download statistics are cached for 24 hours. Historical download data doesn't change, so the cache provides the same data with better performance.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npm-info` to get package metadata alongside download stats
- Use `npm-search` to discover packages with high download counts
- Use NPMS.io for quality scores alongside download metrics

## Error Handling

**Package not found**: Download stats are only available for published packages. Use `npm-exists` to verify the package exists first.

**Invalid period**: Ensure the period format is correct. Date ranges must use colons to separate dates from the package name.

**No data**: Very new packages may not have download statistics yet. Statistics are typically available within 24-48 hours of first publish.

## Data Limitations

- **Delay**: Download counts are typically 24-48 hours behind
- **Granularity**: Data is available per day, not per hour
- **Scope**: Counts include all download sources (npm install, CDN, mirrors)
- **Accuracy**: Numbers are approximate and may include failed downloads

# Check npm Package Existence

Check if a package name exists in the npm registry.

## Usage

```bash
npx tsx scripts/exists.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name to check (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

Package exists:
```
✓ Package "react" exists
  URL: https://www.npmjs.com/package/react
  Published: Yes
```

Package does not exist:
```
✗ Package "my-awesome-pkg-12345" does not exist
  The name is available for use
```

## Script Execution (Preferred)

```bash
npx tsx scripts/exists.ts <package-name> [options]
```

Options:
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npm-registry plugin directory: `~/.claude/plugins/cache/npm-registry/`

## Existence Check API

```
HEAD https://registry.npmjs.org/{package}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `package` | Yes | The exact package name to check (case-sensitive) |

### Examples

Check if a package exists:
```
HEAD https://registry.npmjs.org/react
```

For scoped packages:
```
HEAD https://registry.npmjs.org/@babel/core
```

## Response Interpretation

**Package exists** - HTTP 200 OK
- The package is published and available
- You can use `npm info` or `npm install` with this name

**Package does not exist** - HTTP 404 Not Found
- The package name is available for use
- No package with this exact name exists in the registry

Before publishing a new package, verify the name is available:
```bash
npx tsx exists.ts my-new-package
```

### Validate Package Name
Confirm a package exists before installing or using it:
```bash
npx tsx exists.ts some-dependency
```

### Scoped Packages
Check scoped package names:
```bash
npx tsx exists.ts @myorg/package-name
```

## Naming Rules

Package names must:
- Start with a letter, number, `@`, or `_`
- Contain only URL-safe characters (letters, numbers, hyphens, underscores)
- Not start with `.` or `_`
- Not contain spaces
- Not exceed 214 characters
- Not be the same as a node.js/core module name

Scoped packages (`@scope/name`) have additional rules:
- Scope must be the username of the npm owner
- Scope must be followed by a slash

## Caching

Existence checks are cached for 1 hour. Package availability changes infrequently, so short cache times provide a good balance between freshness and performance.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npm-info` to get detailed package metadata when it exists
- Use `npm-search` to find similar or alternative packages
- Use `npm-downloads` to see package statistics

## Error Handling

**Network errors**: The npm registry may be temporarily unavailable. Retry after a brief delay.

**Rate limiting**: While existence checks use HEAD requests (minimal bandwidth), excessive rapid requests may be rate-limited.

**Scoped packages**: Remember that scoped packages require the full name including the scope (e.g., `@babel/core`, not just `core`).

# Get npm Package Information

Retrieve detailed metadata for a specific npm package.

## Usage

```bash
npx tsx scripts/info.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
react
------
Description: React is a JavaScript library for building user interfaces.
Latest: 18.2.0
License: MIT
Homepage: https://react.dev
Repository: https://github.com/facebook/react

Versions (last 5):
  18.2.0 - Published 2022-06-14
  18.1.0 - Published 2022-04-26
  18.0.0 - Published 2022-03-29
  17.0.2 - Published 2021-03-10
  17.0.1 - Published 2020-12-20

Maintainers:
  - @hzoo
  - @acdlite
```

## Script Execution (Preferred)

```bash
npx tsx scripts/info.ts <package-name> [options]
```

Options:
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npm-registry plugin directory: `~/.claude/plugins/cache/npm-registry/`

## Package Metadata API

```
GET https://registry.npmjs.org/{package}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `package` | Yes | The exact package name (case-sensitive) |

### Examples

Get package metadata:
```
https://registry.npmjs.org/react
```

## Response Format

The response contains comprehensive package metadata:

- **`name`** - Package name
- **`versions`** - Object mapping version numbers to full version metadata
- **`dist-tags`** - Tags like `latest`, `next`, `canary`
- **`time`** - Timestamps for each version publish
- **`maintainers`** - Array of package maintainers
- **`description`** - Package description
- **`homepage`** - Project homepage URL
- **`repository`** - Repository information (type, URL)
- **`bugs`** - Bug tracker URL or email
- **`license`** - License identifier
- **`author`** - Author information
- **`keywords`** - Array of keywords
- **`dependencies`** - Production dependencies (per version)
- **`devDependencies`** - Development dependencies (per version)
- **`peerDependencies`** - Peer dependencies (per version)

## Repository URL Formats

The registry accepts various repository URL formats:
- `https://github.com/owner/repo`
- `git+https://github.com/owner/repo`
- `git@github.com:owner/repo`
- `ssh://git@github.com/owner/repo`

These are automatically parsed and normalized.

## Caching

Package metadata is cached for 6 hours. Versions change infrequently, and most metadata remains stable between releases.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npm-search` to find packages before getting details
- Use `npm-exists` for a quick availability check
- Use `npm-downloads` to see usage statistics

## Error Handling

**Package not found**: If the package doesn't exist, you'll receive a 404 response. Use `npm-exists` to check availability first.

**Invalid package name**: Package names must be valid npm package names (lowercase, can contain hyphens, underscores, periods).

**Scope issues**: For scoped packages like `@babel/core`, include the scope in the name.

# Search npm Registry

Search the npm registry for packages by keyword, name, or description.

## Usage

```bash
npx tsx scripts/search.ts <query> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search query (can be package name, keyword, or description text) |

### Options

| Option | Description |
|--------|-------------|
| `--size=N` | Number of results to return (default: 20, max: 250) |
| `--from=N` | Offset for pagination (default: 0) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Found 1,234 packages for "http"

1. express (4.18.2)
   Fast, unopinionated, minimalist web framework
   Score: 0.98 (quality: 0.95, popularity: 1.0, maintenance: 0.99)
   https://www.npmjs.com/package/express

2. axios (1.6.0)
   Promise based HTTP client for the browser and node.js
   Score: 0.97 (quality: 0.94, popularity: 1.0, maintenance: 0.98)
   https://www.npmjs.com/package/axios
```

## Script Execution (Preferred)

```bash
npx tsx scripts/search.ts <query> [options]
```

Options:
- `--size=N` - Number of results to return (default: 20, max: 250)
- `--from=N` - Offset for pagination (default: 0)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npm-registry plugin directory: `~/.claude/plugins/cache/npm-registry/`

## Search API

```
GET https://registry.npmjs.org/-/v1/search
```

### Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `text` | Yes | string | Search query (can be package name, keyword, or description text) |
| `size` | No | number | Number of results to return (default: 20, max: 250) |
| `from` | No | number | Offset for pagination (default: 0) |

### Examples

Search for HTTP-related packages:
```
https://registry.npmjs.org/-/v1/search?text=http&size=10
```

Search with pagination:
```
https://registry.npmjs.org/-/v1/search?text=react&size=20&from=20
```

## Response Format

Each result contains:
- `package.name` - Package name
- `package.version` - Latest version
- `package.description` - Package description
- `package.keywords` - Array of keywords (if available)
- `package.author` - Author information
- `package.links` - URLs to npm, homepage, repository, bugs
- `score.final` - Overall score (0-1)
- `score.detail.quality` - Quality score (0-1)
- `score.detail.popularity` - Popularity score (0-1)
- `score.detail.maintenance` - Maintenance score (0-1)
- `searchScore` - Relevance to search query

## Search Tips

- **Keyword search**: Use common keywords like "http", "database", "testing"
- **Specific packages**: Type the package name directly
- **Combine terms**: Use multiple words for more specific results
- **Author search**: Search by author name to find their packages

## Caching

Search results are cached for 1 hour. The npm registry search index is updated frequently but package metadata changes less often.

Use the `--no-cache` flag to bypass the cache and fetch fresh results.

## Related

- Use `npm-info` to get detailed package metadata
- Use `npm-exists` to quickly check if a package name is available
- Use `npm-downloads` to view download statistics

## Error Handling

If the search returns no results, try:
1. Using more general search terms
2. Checking for typos in the query
3. Exploring alternative keywords

Rate limiting: The npm registry may rate limit excessive requests. If you encounter rate limiting, wait a few minutes before trying again.

<!-- AUTO-GENERATED CONTENT END -->