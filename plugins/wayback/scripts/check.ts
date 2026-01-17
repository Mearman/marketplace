#!/usr/bin/env npx tsx
/**
 * Check if a URL is archived in the Wayback Machine
 * Usage: npx tsx check.ts <url> [options]
 *
 * Options:
 *   --no-raw           Include Wayback toolbar in archived URL
 *   --timestamp=DATE   Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss)
 *   --no-cache         Bypass cache and fetch fresh data from API
 */

import {
  API,
  AvailableResponse,
  buildArchiveUrl,
  formatAge,
  formatTimestamp,
  getCacheKey,
  getCached,
  parseArgs,
  setCached,
} from "./utils.js";

const main = async () => {
  const { flags, options, positional } = parseArgs(process.argv.slice(2));
  const noRaw = flags.has("no-raw");
  const timestamp = options.get("timestamp");
  const url = positional[0];

  if (!url) {
    console.log(`Usage: npx tsx check.ts <url> [options]

Options:
  --no-raw           Include Wayback toolbar in archived URL
  --timestamp=DATE   Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss)
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx check.ts https://example.com
  npx tsx check.ts https://example.com --timestamp=20200101
  npx tsx check.ts https://example.com --timestamp=20231225120000`);
    process.exit(1);
  }

  const apiUrl = API.availability(url, timestamp);

  if (timestamp) {
    console.log(`Checking: ${url} (closest to ${formatTimestamp(timestamp)})`);
  } else {
    console.log(`Checking: ${url}`);
  }

  try {
    // Check cache first (24-hour TTL for availability data)
    const noCache = flags.has("no-cache");
    const cacheKey = getCacheKey(apiUrl);
    let data: AvailableResponse;

    if (noCache) {
      // Bypass cache
      const response = await fetch(apiUrl);
      data = await response.json();
      await setCached(cacheKey, data, 86400); // Still cache for future requests
    } else {
      const cached = await getCached<AvailableResponse>(cacheKey);
      if (cached === null) {
        const response = await fetch(apiUrl);
        data = await response.json();
        await setCached(cacheKey, data, 86400); // 24 hours
      } else {
        data = cached;
      }
    }

    const snapshot = data.archived_snapshots.closest;
    if (snapshot?.available) {
      const modifier = noRaw ? "" : "id_";
      const archiveUrl = buildArchiveUrl(snapshot.timestamp, url, modifier);

      console.log("✓ Archived");
      console.log(`  Timestamp: ${formatTimestamp(snapshot.timestamp)} (${formatAge(snapshot.timestamp)})`);
      console.log(`  Status: ${snapshot.status}`);
      console.log(`  URL: ${archiveUrl}`);
    } else {
      console.log("✗ Not archived");
      console.log("  Use wayback-submit to archive this URL.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
