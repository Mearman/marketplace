#!/usr/bin/env npx tsx
/**
 * List Wayback Machine snapshots for a URL
 * Usage: npx tsx list.ts <url> [limit] [options]
 *
 * Options:
 *   --no-raw           Include Wayback toolbar in URLs
 *   --with-screenshots Cross-reference to show which captures have screenshots
 *   --no-cache         Bypass cache and fetch fresh data from API
 */

import {
	API,
	CDXRow,
	buildArchiveUrl,
	buildScreenshotUrl,
	formatAge,
	formatTimestamp,
	getCacheKey,
	getCached,
	parseArgs,
	setCached,
} from "./utils";

const fetchScreenshotTimestamps = async (url: string): Promise<Set<string>> => {
	const screenshotUrl = `web.archive.org/screenshot/${url}`;
	const cdxUrl = API.cdx(screenshotUrl, { fl: "timestamp" });

	try {
		const response = await fetch(cdxUrl);
		const data: string[][] = await response.json();

		const timestamps = new Set<string>();
		for (let i = 1; i < data.length; i++) {
			// Store first 12 digits for matching (YYYYMMDDhhmm)
			timestamps.add(data[i][0].slice(0, 12));
		}
		return timestamps;
	} catch {
		return new Set();
	}
};

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));

	const noRaw = flags.has("no-raw");
	const withScreenshots = flags.has("with-screenshots");
	const url = positional[0];
	const limit = parseInt(positional[1] || "10", 10);

	if (!url) {
		console.log(`Usage: npx tsx list.ts <url> [limit] [options]

Options:
  --no-raw           Include Wayback toolbar in URLs
  --with-screenshots Cross-reference to show which captures have screenshots
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx list.ts https://example.com
  npx tsx list.ts https://example.com 20
  npx tsx list.ts https://example.com --with-screenshots`);
		process.exit(1);
	}

	console.log(`Fetching last ${limit} snapshots for: ${url}\n`);

	const apiUrl = API.cdx(url, { limit, filter: "statuscode:200" });

	// Check cache first (1-hour TTL for CDX data)
	const noCache = flags.has("no-cache");
	const cacheKey = getCacheKey(apiUrl);
	let data: CDXRow[];

	if (noCache) {
		// Bypass cache
		const response = await fetch(apiUrl);
		data = await response.json();
		await setCached(cacheKey, data); // Still cache for future requests
	} else {
		const cached = await getCached<CDXRow[]>(cacheKey, 3600);
		if (cached === null) {
			const response = await fetch(apiUrl);
			data = await response.json();
			await setCached(cacheKey, data); // 1 hour
		} else {
			data = cached.data;
		}
	}

	if (data.length <= 1) {
		console.log("No snapshots found");
		process.exit(0);
	}

	// Optionally fetch screenshot timestamps for cross-reference
	let screenshotTimestamps = new Set<string>();
	if (withScreenshots) {
		process.stdout.write("Checking for screenshots...");
		screenshotTimestamps = await fetchScreenshotTimestamps(url);
		console.log(` found ${screenshotTimestamps.size}\n`);
	}

	// Skip header row, reverse for most recent first
	const snapshots = data.slice(1).reverse();
	let screenshotCount = 0;
	const modifier = noRaw ? "" : "id_";

	for (const row of snapshots) {
		const [, timestamp, original] = row;
		const archiveUrl = buildArchiveUrl(timestamp, original, modifier);

		// Check if this timestamp has a screenshot
		const hasScreenshot = screenshotTimestamps.has(timestamp.slice(0, 12));
		if (hasScreenshot) screenshotCount++;

		const indicator = withScreenshots ? (hasScreenshot ? " 📷" : "   ") : "";

		console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})${indicator}`);
		console.log(`  ${archiveUrl}`);

		if (hasScreenshot) {
			console.log(`  📷 ${buildScreenshotUrl(timestamp, original)}`);
		}
		console.log();
	}

	console.log(`Total: ${snapshots.length} snapshot(s)`);
	if (withScreenshots) {
		console.log(`Screenshots: ${screenshotCount} capture(s) have screenshots`);
	}
};

main().catch((e) => {
	console.error("Error:", e);
	process.exit(1);
});
