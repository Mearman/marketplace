# Wayback Machine Archive (wayback)

Wayback Machine Archive: Tools for checking, submitting, listing, screenshotting, and cache management for archived URLs

**Version:** v0.10.0
**Install:** `/plugin install wayback@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Wayback Cache Management

Manage the OS tmpdir-based cache for Wayback Machine API responses.

## Usage

```bash
npx tsx scripts/cache.ts <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `clear` | Clear all cached Wayback data |
| `status` | Show cache directory location and file count |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache for single operation |

## Cache Location

Cached responses are stored in the OS temporary directory:
```
os.tmpdir()/wayback-cache/
```

Cache keys are generated from URLs and parameters using SHA-256 hashing.

## Cache TTL by Operation

| Operation | TTL | Rationale |
|-----------|-----|-----------|
| Availability API | 24 hours | Snapshots don't change often |
| CDX API | 1 hour | Snapshot list can change |
| Save status | 30 seconds | Only during polling |

Cached entries expire automatically and are deleted on access.

## Script Execution

```bash
npx tsx scripts/cache.ts <command> [options]
```

Commands:
- `clear` - Clear all cached Wayback data
- `status` - Show cache directory location and file count

## Clear Cache

Remove all cached API responses:
```bash
npx tsx scripts/cache.ts clear
```

This deletes all `.json` cache files from the cache directory.

## Check Cache Status

Display cache information:
```bash
npx tsx scripts/cache.ts status
```

Shows:
- Cache directory path
- Number of cached files
- Total cache size (if available)

## Usage Examples

```bash
# Clear all cache before checking a URL
npx tsx scripts/cache.ts clear
npx tsx scripts/check.ts https://example.com

# Clear cache, then list snapshots
npx tsx scripts/cache.ts clear
npx tsx scripts/list.ts https://example.com 20

# Check cache status
npx tsx scripts/cache.ts status
```

## Bypass Cache for Single Operation

Individual scripts support `--no-cache` to skip cache for one operation without clearing all cached data:

```bash
npx tsx scripts/check.ts https://example.com --no-cache
npx tsx scripts/list.ts https://example.com --no-cache
npx tsx scripts/screenshot.ts https://example.com --no-cache
```

The `--no-cache` flag bypasses reading from cache but still caches the fresh response for future requests.

## Cache Key Format

Cache keys are 16-character hexadecimal strings:
```
a1b2c3d4e5f6g7h8.json
```

Each key represents a unique URL + parameter combination.

## Manual Cache Inspection

View cache directory contents:
```bash
# On macOS/Linux
ls -la $(getconf DARWIN_USER_TEMP_DIR)/wayback-cache/
# Or
ls -la /tmp/wayback-cache/

# View individual cache file
cat /tmp/wayback-cache/a1b2c3d4e5f6g7h8.json | jq
```

## Related

- Use `wayback-check` to verify if a URL is archived
- Use `wayback-list` to see all captures with filtering options
- Use `wayback-screenshot` to retrieve visual screenshots
- Use `wayback-submit` to create a new archive

# Check Wayback Machine Archive Status

Check if a URL has been archived by the Internet Archive's Wayback Machine.

## Usage

```bash
npx tsx scripts/check.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to check |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in archived URL |
| `--timestamp=DATE` | Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

When archived:
```
✓ Archived
  Timestamp: January 1, 2024 (3 days ago)
  URL: https://web.archive.org/web/20240101120000id_/https://example.com
```

When not archived:
```
✗ Not archived
  Consider using wayback-submit to archive this URL.
```

## Script Execution (Preferred)

```bash
npx tsx scripts/check.ts <url> [options]
```

Options:
- `--no-raw` - Include Wayback toolbar in archived URL
- `--timestamp=DATE` - Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## Availability API

```
https://archive.org/wayback/available?url={URL}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | The URL to check |
| `timestamp` | No | Find snapshot closest to this date (YYYYMMDDhhmmss, partial dates OK) |
| `callback` | No | JSONP callback for cross-domain requests |

### Examples

Latest snapshot:
```
https://archive.org/wayback/available?url=https://example.com
```

Snapshot closest to a specific date:
```
https://archive.org/wayback/available?url=https://example.com&timestamp=20200101
```

## Response Interpretation

**Archived** - Response contains `archived_snapshots.closest` with:
- `available`: true
- `url`: The archived URL (format: `https://web.archive.org/web/{timestamp}/{original_url}`)
- `timestamp`: Archive timestamp (YYYYMMDDhhmmss format)
- `status`: HTTP status code

**Not Archived** - Response has empty `archived_snapshots` object.

## Raw Mode

By default, append `id_` after the timestamp in URLs to get raw content without the Wayback toolbar:
- With toolbar: `https://web.archive.org/web/20240101120000/https://example.com`
- Raw (no toolbar): `https://web.archive.org/web/20240101120000id_/https://example.com`

## URL Modifiers

| Modifier | URL Pattern | Description |
|----------|-------------|-------------|
| (none) | `/web/{ts}/` | Page with Wayback toolbar |
| `id_` | `/web/{ts}id_/` | Raw page content (no toolbar) |
| `im_` | `/web/{ts}im_/` | Screenshot image |
| `js_` | `/web/{ts}js_/` | JavaScript content |
| `cs_` | `/web/{ts}cs_/` | CSS content |

## Related

- Use `wayback-screenshot` to retrieve visual screenshots of archived pages
- Use `wayback-list` to see all captures with filtering options
- Use `wayback-submit` to create a new archive (with optional screenshot)

## Caching

Availability API responses are cached for 24 hours using the OS temporary directory (`os.tmpdir()`). Cache keys are generated from the URL and timestamp parameters using SHA-256 hashing. Cached responses expire automatically and are deleted on access.

Use `wayback-cache` to manage cached data:
```bash
npx tsx scripts/cache.ts clear    # Clear all cache
npx tsx scripts/cache.ts status   # Show cache status
```

See `wayback-cache` skill for complete cache management documentation.

## Error Handling

If the Wayback Machine API returns an error or is unavailable, retry after a brief delay. The API may be rate-limited during high traffic periods.

# Analyze Wayback Machine Capture Frequency

Analyze the capture frequency and rate for a URL over a specified time range.

## Usage

```bash
npx tsx scripts/frequency.ts <url> [from] [to] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to analyze |
| `from` | No | Start date (YYYYMMDD or YYYY-MM). Default: oldest capture |
| `to` | No | End date (YYYYMMDD or YYYY-MM). Default: newest capture |

### Options

| Option | Description |
|--------|-------------|
| `--full` | Include detailed breakdown by year |
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

**Default (compact):**
```
1423 captures over 3652 days
Average: 0.39/day, 11.87/month, 142.3/year
```

**With --full:**
```
📊 CAPTURE FREQUENCY ANALYSIS

URL: https://example.com
Range: 2015-01-01 12:00 to 2025-01-01 08:00 (3652 days)

Total captures: 1423
Average rate:
  0.39 captures per day
  11.87 captures per month
  142.3 captures per year

By year:
  2015: 156 captures
  2016: 203 captures
  2017: 189 captures
  ...
```

## Script Execution

```bash
npx tsx scripts/frequency.ts <url> [from] [to] [options]
```

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## Examples

```bash
# Analyze entire archive history
npx tsx scripts/frequency.ts https://example.com

# Analyze specific date range
npx tsx scripts/frequency.ts https://example.com 2020 2023

# Full breakdown with year-by-year stats
npx tsx scripts/frequency.ts https://example.com 2020 2023 --full

# Specific dates
npx tsx scripts/frequency.ts https://example.com 20200101 20231231
```

## Caching

CDX API responses are cached for 1 hour. Use `--no-cache` to bypass.

## Related Skills

- **wayback-range** - Show oldest and newest captures with archive span
- **wayback-list** - List all snapshots with pagination
- **wayback-oldest** - Find the earliest capture
- **wayback-newest** - Find the most recent capture

# List Wayback Machine Snapshots

Retrieve a list of archived snapshots for a URL from the Wayback Machine CDX API.

## Usage

```bash
npx tsx scripts/list.ts <url> [limit] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to search for |
| `limit` | No | Max number of results (default: unlimited) |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in URLs |
| `--with-screenshots` | Cross-reference to show which captures have screenshots (📷) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
January 1, 2024 (3 days ago)
  https://web.archive.org/web/20240101120000id_/https://example.com

December 15, 2023 (20 days ago)
  https://web.archive.org/web/20231215100000id_/https://example.com

Total: 2 snapshot(s)
```

## Script Execution (Preferred)

```bash
npx tsx scripts/list.ts <url> [limit] [options]
```

Options:
- `--no-raw` - Include Wayback toolbar in URLs
- `--with-screenshots` - Cross-reference to show which captures have screenshots (📷)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## CDX API Endpoint

```
https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit={N}
```

## Authentication (Optional)

Most CDX queries don't require authentication. For restricted data access:

```bash
# Cookie-based auth for restricted content
curl "https://web.archive.org/cdx/search/cdx?url=..." \
  --cookie "cdx-auth-token=YOUR_TOKEN"
```

Get API keys at https://archive.org/account/s3.php

## Parameters

| Parameter | Description |
|-----------|-------------|
| `url` | The URL to search for (required) |
| `output` | Response format: `json` (recommended) |
| `matchType` | `exact` (default), `prefix`, `host`, or `domain` |
| `limit` | Max results. Use `-N` for last N results |
| `offset` | Skip first N records |
| `from` | Start date (YYYYMMDD or partial like "2020") |
| `to` | End date (YYYYMMDD or partial) |
| `filter` | Field filter: `[!]field:regex` (e.g., `statuscode:200`, `!mimetype:image.*`) |
| `collapse` | Dedupe: `field` or `field:N` (e.g., `timestamp:8` = daily) |
| `fl` | Fields to return: comma-separated (urlkey, timestamp, original, mimetype, statuscode, digest, length) |
| `fastLatest` | `true` for efficient recent results |
| `showResumeKey` | `true` to get pagination token |
| `resumeKey` | Continue from previous query |

## How to List Snapshots

Use WebFetch to query the CDX API:

```
https://web.archive.org/cdx/search/cdx?url=https://example.com&output=json&limit=10
```

## Response Format

JSON array where first row is headers:
```json
[
  ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
  ["com,example)/", "20240101120000", "https://example.com/", "text/html", "200", "ABC123", "1234"]
]
```

## Constructing Archive URLs

From timestamp, build the archived URL:
```
https://web.archive.org/web/{timestamp}/{original_url}
```

For raw content (no Wayback toolbar):
```
https://web.archive.org/web/{timestamp}id_/{original_url}
```

## Common Queries

```
# Only successful pages
&filter=statuscode:200

# Exclude images
&filter=!mimetype:image.*

# One snapshot per day (collapse on first 8 digits of timestamp)
&collapse=timestamp:8

# One snapshot per hour
&collapse=timestamp:10

# Date range (partial dates work)
&from=2023&to=2024

# All pages under a path (prefix match)
&url=example.com/blog/&matchType=prefix

# Entire domain including subdomains
&url=example.com&matchType=domain

# Get last 5 snapshots efficiently
&limit=-5&fastLatest=true

# Paginate large results
&showResumeKey=true&limit=1000
# Then continue with: &resumeKey={token_from_previous}
```

## Checking for Screenshots

The CDX API doesn't include a screenshot field. To find captures with screenshots, cross-reference with:

```
https://web.archive.org/cdx/search/cdx?url=web.archive.org/screenshot/{URL}/*&output=json
```

The `--with-screenshots` flag in the script does this automatically, showing 📷 next to captures that have screenshots.

## Caching

CDX API responses are cached for 1 hour using the OS temporary directory (`os.tmpdir()`). Cache keys are generated from the URL and query parameters using SHA-256 hashing. Cached responses expire automatically and are deleted on access.

Use `wayback-cache` to manage cached data:
```bash
npx tsx scripts/cache.ts clear    # Clear all cache
npx tsx scripts/cache.ts status   # Show cache status
```

See `wayback-cache` skill for complete cache management documentation.

## Output Format (with --with-screenshots)

```
2024-01-15 12:34 (3 days ago) 📷
  https://web.archive.org/web/20240115123456id_/https://example.com/
  📷 https://web.archive.org/web/20240115123456im_/https://example.com/

2024-01-10 08:00 (8 days ago)
  https://web.archive.org/web/20240110080000id_/https://example.com/

Total: 2 snapshot(s)
Screenshots: 1 capture(s) have screenshots
```

# Find Newest Wayback Machine Capture

Find the most recent archived snapshot of a URL from the Wayback Machine.

## Usage

```bash
npx tsx scripts/oldest-newest.ts <url> --newest-only [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to search for |

### Options

| Option | Description |
|--------|-------------|
| `--full` | Include archive URL in output |
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

**Default (compact):**
```
2024-01-15 14:30 (2 days ago)
```

**With --full:**
```
🆕 NEWEST:
  2024-01-15 14:30 (2 days ago)
  https://web.archive.org/web/20240115143000id_/https://example.com
```

## Script Execution

```bash
npx tsx scripts/oldest-newest.ts <url> --newest-only
```

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## CDX API Endpoint

```
https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=1&filter=statuscode:200&fastLatest=true
```

The `fastLatest=true` parameter efficiently returns the most recent capture without scanning the entire index.

## Caching

CDX API responses are cached for 1 hour. Use `--no-cache` to bypass.

## Related Skills

- **wayback-oldest** - Find the earliest capture
- **wayback-range** - Show both oldest and newest with archive span
- **wayback-list** - List all snapshots with pagination

# Find Oldest Wayback Machine Capture

Find the earliest archived snapshot of a URL from the Wayback Machine.

## Usage

```bash
npx tsx scripts/oldest-newest.ts <url> --oldest-only [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to search for |

### Options

| Option | Description |
|--------|-------------|
| `--full` | Include archive URL in output |
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

**Default (compact):**
```
1998-12-01 08:00 (9200 days ago)
```

**With --full:**
```
📜 OLDEST:
  1998-12-01 08:00 (9200 days ago)
  https://web.archive.org/web/19981201080000id_/https://example.com
```

## Script Execution

```bash
npx tsx scripts/oldest-newest.ts <url> --oldest-only
```

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## CDX API Endpoint

```
https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=1&filter=statuscode:200
```

The `limit=1` parameter with default ascending sort returns the oldest capture first.

## Caching

CDX API responses are cached for 1 hour. Use `--no-cache` to bypass.

## Related Skills

- **wayback-newest** - Find the most recent capture
- **wayback-range** - Show both oldest and newest with archive span
- **wayback-list** - List all snapshots with pagination

# Show Wayback Machine Archive Range

Show both the oldest and newest archived snapshots for a URL, displaying the full archive time span.

## Usage

```bash
npx tsx scripts/oldest-newest.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to search for |

### Options

| Option | Description |
|--------|-------------|
| `--full` | Include archive URLs in output |
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

**Default (compact):**
```
1998-12-01 08:00 (9200 days ago)
2024-01-15 14:30 (2 days ago)
```

**With --full:**
```
📜 OLDEST:
  1998-12-01 08:00 (9200 days ago)
  https://web.archive.org/web/19981201080000id_/https://example.com

🆕 NEWEST:
  2024-01-15 14:30 (2 days ago)
  https://web.archive.org/web/20240115143000id_/https://example.com

Archive span: 9198 days
```

## Script Execution

```bash
npx tsx scripts/oldest-newest.ts <url>
```

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## How It Works

Queries the CDX API twice:
1. Oldest capture: `limit=1` with default ascending sort
2. Newest capture: `limit=1` with `fastLatest=true`

Calculates the day span between first and last capture to show how long the URL has been tracked.

## Caching

CDX API responses are cached for 1 hour. Use `--no-cache` to bypass.

## Related Skills

- **wayback-oldest** - Find only the earliest capture
- **wayback-newest** - Find only the most recent capture
- **wayback-list** - List all snapshots with pagination

# Retrieve Wayback Machine Screenshots

Access existing screenshots stored by the Wayback Machine.

## Usage

```bash
npx tsx scripts/screenshot.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to find screenshots for |

### Options

| Option | Description |
|--------|-------------|
| `--timestamp=DATE` | Get screenshot from specific capture (YYYYMMDDhhmmss) |
| `--list` | List available screenshots for URL |
| `--download=PATH` | Download screenshot to file |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Screenshots for: https://example.com/

January 15, 2024 12:34 (3 days ago)
  https://web.archive.org/web/20240115123456im_/https://example.com/

December 1, 2023 08:00 (46 days ago)
  https://web.archive.org/web/20231201080000im_/https://example.com/

Total: 2 screenshot(s)
```

## Script Execution (Preferred)

```bash
npx tsx scripts/screenshot.ts <url> [options]
```

Options:
- `--timestamp=DATE` - Get screenshot from specific capture (YYYYMMDDhhmmss)
- `--list` - List available screenshots for URL
- `--download=PATH` - Download screenshot to file
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## Screenshot URL Pattern

```
https://web.archive.org/screenshot/{URL}
```

### Direct Access

Get the most recent screenshot:
```
https://web.archive.org/screenshot/https://example.com/
```

### With Timestamp

Get screenshot from a specific capture:
```
https://web.archive.org/web/{timestamp}im_/https://example.com/
```

The `im_` modifier returns the screenshot image for that timestamp.

### List Available Screenshots

Use CDX API with wildcard to find all screenshots:
```
https://web.archive.org/cdx/search/cdx?url=web.archive.org/screenshot/https://example.com/*&output=json
```

Or browse visually:
```
https://web.archive.org/web/*/https://web.archive.org/screenshot/https://example.com/*
```

## Via Wayback Toolbar

When viewing any archived page:
1. Look for the camera icon (📷) in the top-right of the Wayback toolbar
2. Click to view available screenshots for that capture

## From SPN2 Response

When submitting with `capture_screenshot=1`, the response includes:
```json
{
  "status": "success",
  "screenshot": "https://web.archive.org/web/20240115123456im_/https://example.com/"
}
```

```

## Caveats

- **Not all captures have screenshots** - depends on whether `capture_screenshot=1` was used during archiving
- **Undocumented feature** - may be unreliable or change without notice
- **Indexing delays** - newly captured screenshots may not appear immediately
- **Coverage varies** - older archives typically don't have screenshots

## Caching

Availability API responses are cached for 24 hours using the OS temporary directory (`os.tmpdir()`). Cache keys are generated from the URL using SHA-256 hashing. Cached responses expire automatically and are deleted on access.

Use `wayback-cache` to manage cached data:
```bash
npx tsx scripts/cache.ts clear    # Clear all cache
npx tsx scripts/cache.ts status   # Show cache status
```

See `wayback-cache` skill for complete cache management documentation.

## Related

- Use `wayback-submit --capture-screenshot` to create a new screenshot
- Use `wayback-check` to verify if a URL is archived
- Use `wayback-list` to see all captures (not just those with screenshots)

# Submit URL to Wayback Machine

Submit a URL to the Internet Archive's Wayback Machine using the Save Page Now 2 (SPN2) API.

## Usage

```bash
npx tsx scripts/submit.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | URL to archive |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in archived URL |
| `--key=ACCESS:SECRET` | Use API authentication (get keys at https://archive.org/account/s3.php) |

### Output

When submission succeeds:
```
✓ Archive submitted successfully
  Job ID: spn2-abc123...
  Check status: https://web.archive.org/save/status/spn2-abc123...

  Waiting for capture...
  ✓ Capture complete
  URL: https://web.archive.org/web/20240115123456id_/https://example.com
```

## Script Execution (Preferred)

```bash
npx tsx scripts/submit.ts <url> [options]
```

Options:
- `--no-raw` - Include Wayback toolbar in archived URL
- `--key=ACCESS:SECRET` - Use API authentication

Run from the wayback plugin directory: `~/.claude/plugins/cache/wayback/`

## Authentication

Get API keys at https://archive.org/account/s3.php (requires free account).

**Header format:**
```
Authorization: LOW {access_key}:{secret_key}
```

### Rate Limits

| Limit | Authenticated | Anonymous |
|-------|---------------|-----------|
| Concurrent captures | 12 | 6 |
| Daily captures | 100,000 | 4,000 |
| Per-URL daily | 10 | 10 |
| Capture timeout | 50s page load, 2min total |

## SPN2 API

**Endpoint:** `POST https://web.archive.org/save`

### Basic Request

```bash
curl -X POST https://web.archive.org/save \
  -H "Accept: application/json" \
  -H "Authorization: LOW myaccesskey:mysecret" \
  -d "url=https://example.com"
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `url` | URL to archive (required) |
| `capture_all=1` | Capture even 4xx/5xx error pages |
| `capture_outlinks=1` | Also archive linked pages (first 100) |
| `capture_screenshot=1` | Generate PNG screenshot |
| `delay_wb_availability=1` | Delay indexing ~12 hours (reduces load) |
| `skip_first_archive=1` | Skip check if URL was already archived |
| `if_not_archived_within=30d` | Skip if archived within timeframe (e.g., `30d`, `1h`) |
| `js_behavior_timeout=10` | Run JavaScript for N seconds (max 30) |
| `force_get=1` | Use simple HTTP GET instead of browser |
| `capture_cookie=name=value` | Include custom cookie in request |
| `target_username` / `target_password` | Login credentials for protected pages |

### Response

**Success:**
```json
{
  "url": "https://example.com",
  "job_id": "spn2-abc123..."
}
```

## Check Job Status

```bash
curl "https://web.archive.org/save/status/{job_id}" \
  -H "Authorization: LOW myaccesskey:mysecret"
```

**Pending:**
```json
{"status": "pending", "resources": []}
```

**Success:**
```json
{
  "status": "success",
  "timestamp": "20240115123456",
  "original_url": "https://example.com",
  "resources": ["https://example.com/style.css"],
  "outlinks": {},
  "screenshot": "https://web.archive.org/web/.../screenshot.png"
}
```

**Error codes:** `error:blocked-url`, `error:too-many-daily-captures`, `error:soft-time-limit-exceeded`, `error:invalid-host-resolution`

## Check Your Quota

```bash
curl "https://web.archive.org/save/status/user" \
  -H "Authorization: LOW myaccesskey:mysecret"
```

Returns: `{"available": 99950, "processing": 2}`

## Simple Method (No Auth)

For quick one-off saves without authentication:

```
https://web.archive.org/save/{URL}
```

Lower rate limits apply (6 concurrent, 4k daily).

2. Use `delay_wb_availability=1` for batch jobs (reduces server load)
3. Check job status for captures that take time (JS-heavy pages)
4. Use `capture_screenshot=1` for visual verification

<!-- AUTO-GENERATED CONTENT END -->