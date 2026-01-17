# Helper Utilities

Common formatting and utility functions used across plugins.

## Functions

### `sleep(ms: number): Promise<void>`

Sleep for a specified duration.

```typescript
import { sleep } from "../../../lib/helpers";

await sleep(1000); // Wait 1 second
await sleep(500);  // Wait 0.5 seconds
```

**Use cases:**
- Rate limiting API calls
- Retry delays
- Polling intervals

---

### `formatNumber(num: number): string`

Format a number with K/M suffixes.

```typescript
import { formatNumber } from "../../../lib/helpers";

formatNumber(42);        // "42"
formatNumber(1234);      // "1.2K"
formatNumber(1234567);   // "1.2M"
formatNumber(9999999);   // "10.0M"
```

**Use cases:**
- Download counts
- GitHub stars
- Package sizes
- User counts

---

### `formatAge(ts: string): string`

Format a timestamp as human-readable age.

```typescript
import { formatAge } from "../../../lib/helpers";

formatAge("20240101120000"); // "X days ago" (depends on current date)
formatAge("20231215000000"); // "1 month ago"
formatAge("20220101000000"); // "2 years ago"
```

**Timestamp format:** `YYYYMMDDHHMMSS`
- `YYYY` - 4-digit year
- `MM` - 2-digit month (01-12)
- `DD` - 2-digit day (01-31)
- `HH` - 2-digit hour (00-23, optional)
- `MM` - 2-digit minute (00-59, optional)
- `SS` - 2-digit second (00-59, optional)

**Output formats:**
- `"today"` - Same day
- `"1 day ago"` - Yesterday
- `"X days ago"` - 2-29 days
- `"1 month ago"` - 30-59 days
- `"X months ago"` - 2-11 months
- `"1 year ago"` - 12-23 months
- `"X years ago"` - 2+ years
- `"in the future"` - Future timestamps

**Use cases:**
- Wayback Machine snapshot ages
- Package publish dates
- Last modified times

---

### `formatDate(date: Date | number): string`

Format a date as `YYYY-MM-DD HH:MM`.

```typescript
import { formatDate } from "../../../lib/helpers";

formatDate(new Date());           // "2024-01-15 14:30"
formatDate(Date.now());           // "2024-01-15 14:30"
formatDate(new Date(2024, 0, 1)); // "2024-01-01 00:00"
```

**Use cases:**
- Cache timestamps
- Log messages
- Display timestamps

## Import Pattern

Import only what you need:

```typescript
// Import specific functions
import { formatNumber, sleep } from "../../../lib/helpers";

// Or import all
import * as helpers from "../../../lib/helpers";
```

## Usage Examples

### Rate-limited API calls

```typescript
import { sleep } from "../../../lib/helpers";

for (const url of urls) {
  const data = await fetch(url);
  await sleep(100); // Wait 100ms between requests
}
```

### Display download statistics

```typescript
import { formatNumber } from "../../../lib/helpers";

console.log(`Downloads: ${formatNumber(downloads.total)}`);
// "Downloads: 1.2M"
```

### Show snapshot age

```typescript
import { formatAge, formatDate } from "../../../lib/helpers";

const timestamp = "20240101120000";
console.log(`Snapshot from ${formatAge(timestamp)}`);
// "Snapshot from 15 days ago"

const date = new Date();
console.log(`Current time: ${formatDate(date)}`);
// "Current time: 2024-01-15 14:30"
```
