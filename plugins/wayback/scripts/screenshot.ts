#!/usr/bin/env npx tsx
/**
 * Retrieve screenshots from the Wayback Machine
 * Usage: npx tsx screenshot.ts <url> [options]
 *
 * Options:
 *   --timestamp=DATE   Get screenshot from specific capture (YYYYMMDDhhmmss)
 *   --list             List available screenshots for URL
 *   --download=PATH    Download screenshot to file
 *   --no-cache         Bypass cache and fetch fresh data from API
 */

import { writeFile } from "fs/promises";
import {
	API,
	AvailableResponse,
	CDXRow,
	buildScreenshotUrl,
	formatAge,
	formatTimestamp,
	getCacheKey,
	getCached,
	parseArgs,
	setCached,
} from "./utils";

const listScreenshots = async (url: string): Promise<void> => {
	console.log(`Screenshots for: ${url}\n`);

	const screenshotUrl = `web.archive.org/screenshot/${url}`;
	const cdxUrl = API.cdx(screenshotUrl, { limit: 50 });

	const response = await fetch(cdxUrl);
	const data: CDXRow[] = await response.json();

	if (data.length <= 1) {
		// Try querying with image mimetype filter
		const altCdxUrl = API.cdx(url, { limit: 50, filter: "mimetype:image.*" });
		const altResponse = await fetch(altCdxUrl);
		const altData: CDXRow[] = await altResponse.json();

		if (altData.length <= 1) {
			console.log("No screenshots found");
			console.log("\nTip: Use 'wayback-submit --capture-screenshot' to create a screenshot");
			return;
		}

		const screenshots = altData.slice(1).reverse();
		for (const [, timestamp, original] of screenshots) {
			console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})`);
			console.log(`  ${buildScreenshotUrl(timestamp, original)}\n`);
		}
		console.log(`Total: ${screenshots.length} screenshot(s)`);
		return;
	}

	const screenshots = data.slice(1).reverse();
	for (const [, timestamp, original] of screenshots) {
		const actualUrl = original.replace(/^web\.archive\.org\/screenshot\//, "");
		console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})`);
		console.log(`  ${buildScreenshotUrl(timestamp, actualUrl)}\n`);
	}

	console.log(`Total: ${screenshots.length} screenshot(s)`);
};

const getScreenshot = async (
	url: string,
	noCache: boolean,
	timestamp?: string,
	downloadPath?: string
): Promise<void> => {
	let screenshotUrl: string;

	if (timestamp) {
		screenshotUrl = buildScreenshotUrl(timestamp, url);
		console.log(`Fetching screenshot from ${formatTimestamp(timestamp)}...`);
	} else {
		const availUrl = API.availability(url);

		// Check cache first (24-hour TTL for availability data)
		const cacheKey = getCacheKey(availUrl);
		let availData: AvailableResponse;

		if (noCache) {
			// Bypass cache
			const availResponse = await fetch(availUrl);
			availData = await availResponse.json();
			await setCached(cacheKey, availData, 86400); // Still cache for future requests
		} else {
			const cached = await getCached<AvailableResponse>(cacheKey);
			if (cached === null) {
				const availResponse = await fetch(availUrl);
				availData = await availResponse.json();
				await setCached(cacheKey, availData, 86400); // 24 hours
			} else {
				availData = cached;
			}
		}

		const closest = availData.archived_snapshots?.closest;
		if (!closest?.available) {
			console.log("✗ No archived version found");
			console.log("  Use wayback-submit to archive this URL first.");
			process.exit(1);
		}

		screenshotUrl = buildScreenshotUrl(closest.timestamp, url);
		console.log(`Fetching most recent screenshot (${formatTimestamp(closest.timestamp)})...`);
	}

	console.log(`URL: ${screenshotUrl}`);

	if (downloadPath) {
		try {
			const response = await fetch(screenshotUrl);
			if (!response.ok) {
				console.log(`\n✗ Screenshot not available (${response.status})`);
				console.log("  This capture may not have a screenshot.");
				console.log("  Use --list to see available screenshots.");
				process.exit(1);
			}

			const buffer = await response.arrayBuffer();
			await writeFile(downloadPath, Buffer.from(buffer));
			console.log(`\n✓ Downloaded to: ${downloadPath}`);
		} catch (error) {
			console.error("Error downloading:", error);
			process.exit(1);
		}
	} else {
		console.log("\nUse --download=PATH to save the screenshot");
	}
};

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));

	const listMode = flags.has("list");
	const timestamp = options.get("timestamp");
	const downloadPath = options.get("download");
	const url = positional[0];

	if (!url) {
		console.log(`Usage: npx tsx screenshot.ts <url> [options]

Options:
  --timestamp=DATE   Get screenshot from specific capture (YYYYMMDDhhmmss)
  --list             List available screenshots for URL
  --download=PATH    Download screenshot to file
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx screenshot.ts https://example.com --list
  npx tsx screenshot.ts https://example.com --timestamp=20240101120000
  npx tsx screenshot.ts https://example.com --download=screenshot.png`);
		process.exit(1);
	}

	try {
		if (listMode) {
			await listScreenshots(url);
		} else {
			await getScreenshot(url, flags.has("no-cache"), timestamp, downloadPath);
		}
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
