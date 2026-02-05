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
	buildScreenshotUrl,
	fetchWithCache,
	formatAge,
	formatTimestamp,
	parseArgs,
	validateAvailableResponse,
	validateCDXResponse,
	type ParsedArgs,
} from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface Dependencies {
	fetchWithCache: typeof fetchWithCache;
	console: Console;
	process: NodeJS.Process;
	fs: {
		writeFile: typeof writeFile;
	};
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	_url: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("\nError:", message);
	deps.process.exit(1);
};

// ============================================================================
// Helper Functions
// ============================================================================

export const listScreenshots = async (
	url: string,
	deps: Dependencies
): Promise<void> => {
	deps.console.log(`Screenshots for: ${url}\n`);

	const screenshotUrl = `web.archive.org/screenshot/${url}`;
	const cdxUrl = API.cdx(screenshotUrl, { limit: 50 });

	const response = await fetch(cdxUrl);
	const rawData: unknown = await response.json();
	const data = validateCDXResponse(rawData);

	if (data.length <= 1) {
		// Try querying with image mimetype filter
		const altCdxUrl = API.cdx(url, { limit: 50, filter: "mimetype:image.*" });
		const altResponse = await fetch(altCdxUrl);
		const altRawData: unknown = await altResponse.json();
		const altData = validateCDXResponse(altRawData);

		if (altData.length <= 1) {
			deps.console.log("No screenshots found");
			deps.console.log("\nTip: Use 'wayback-submit --capture-screenshot' to create a screenshot");
			return;
		}

		const screenshots = altData.slice(1).reverse();
		for (const [, timestamp, original] of screenshots) {
			deps.console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})`);
			deps.console.log(`  ${buildScreenshotUrl(timestamp, original)}\n`);
		}
		deps.console.log(`Total: ${screenshots.length} screenshot(s)`);
		return;
	}

	const screenshots = data.slice(1).reverse();
	for (const [, timestamp, original] of screenshots) {
		const actualUrl = original.replace(/^web\.archive\.org\/screenshot\//, "");
		deps.console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})`);
		deps.console.log(`  ${buildScreenshotUrl(timestamp, actualUrl)}\n`);
	}

	deps.console.log(`Total: ${screenshots.length} screenshot(s)`);
};

export const checkScreenshotAvailable = async (
	url: string,
	deps: Dependencies,
	timestamp?: string
): Promise<boolean> => {
	const screenshotUrl = `web.archive.org/screenshot/${url}`;
	let cdxUrl: string;

	if (timestamp) {
		// Check for screenshot at specific timestamp
		cdxUrl = API.cdx(screenshotUrl, { timestamp });
	} else {
		// Check for latest screenshot
		cdxUrl = API.cdx(screenshotUrl, { limit: 1 });
	}

	try {
		const response = await fetch(cdxUrl);
		const rawData: unknown = await response.json();
		const data = validateCDXResponse(rawData);

		// CDX returns header row + data rows, so length > 1 means screenshot exists
		return data.length > 1;
	} catch {
		return false;
	}
};

const getScreenshot = async (
	url: string,
	noCache: boolean,
	timestamp: string | undefined,
	downloadPath: string | undefined,
	deps: Dependencies
): Promise<void> => {
	let screenshotUrl: string;

	if (timestamp) {
		// Check if screenshot is available at the specified timestamp
		const isAvailable = await checkScreenshotAvailable(url, deps, timestamp);
		if (!isAvailable) {
			deps.console.log(`✗ No screenshot found at ${formatTimestamp(timestamp)}`);
			deps.console.log("  Use --list to see available screenshots.");
			deps.process.exit(1);
		}

		screenshotUrl = buildScreenshotUrl(timestamp, url);
		deps.console.log(`Fetching screenshot from ${formatTimestamp(timestamp)}...`);
	} else {
		const availUrl = API.availability(url);

		const rawAvailData = await deps.fetchWithCache({
			url: availUrl,
			ttl: 86400, // 24 hours
			bypassCache: noCache,
		});
		const availData = validateAvailableResponse(rawAvailData);

		const closest = availData.archived_snapshots.closest;
		if (!closest?.available) {
			deps.console.log("✗ No archived version found");
			deps.console.log("  Use wayback-submit to archive this URL first.");
			deps.process.exit(1);
		}

		// Check if a screenshot is available for this capture
		const isAvailable = await checkScreenshotAvailable(url, deps, closest.timestamp);
		if (!isAvailable) {
			deps.console.log("✗ No screenshot available for this capture");
			deps.console.log("  The page was archived but no screenshot was taken.");
			deps.console.log("  Use --list to see available screenshots.");
			deps.process.exit(1);
		}

		screenshotUrl = buildScreenshotUrl(closest.timestamp, url);
		deps.console.log(`Fetching most recent screenshot (${formatTimestamp(closest.timestamp)})...`);
	}

	deps.console.log(`URL: ${screenshotUrl}`);

	if (downloadPath) {
		try {
			const response = await fetch(screenshotUrl);
			if (!response.ok) {
				deps.console.log(`\n✗ Screenshot not available (${response.status})`);
				deps.console.log("  This capture may not have a screenshot.");
				deps.console.log("  Use --list to see available screenshots.");
				deps.process.exit(1);
			}

			const buffer = await response.arrayBuffer();
			await deps.fs.writeFile(downloadPath, Buffer.from(buffer));
			deps.console.log(`\n✓ Downloaded to: ${downloadPath}`);
		} catch (error) {
			handleError(error, url, deps);
		}
	} else {
		deps.console.log("\nUse --download=PATH to save the screenshot");
	}
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;

	const listMode = flags.has("list");
	const timestamp = options.get("timestamp");
	const downloadPath = options.get("download");
	const url = positional[0];

	if (!url) {
		deps.console.log(`Usage: npx tsx screenshot.ts <url> [options]

Options:
  --timestamp=DATE   Get screenshot from specific capture (YYYYMMDDhhmmss)
  --list             List available screenshots for URL
  --download=PATH    Download screenshot to file
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx screenshot.ts https://example.com --list
  npx tsx screenshot.ts https://example.com --timestamp=20240101120000
  npx tsx screenshot.ts https://example.com --download=screenshot.png`);
		deps.process.exit(1);
	}

	try {
		if (listMode) {
			await listScreenshots(url, deps);
		} else {
			await getScreenshot(url, flags.has("no-cache"), timestamp, downloadPath, deps);
		}
	} catch (error) {
		handleError(error, url, deps);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
	fs: { writeFile },
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	});
}
