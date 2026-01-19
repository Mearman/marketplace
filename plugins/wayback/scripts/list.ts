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
	fetchWithCache,
	formatAge,
	formatTimestamp,
	parseArgs,
	type ParsedArgs,
} from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface Dependencies {
	fetchWithCache: typeof fetchWithCache;
	console: Console;
	process: NodeJS.Process;
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

export const fetchScreenshotTimestamps = async (url: string): Promise<Set<string>> => {
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

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;

	const noRaw = flags.has("no-raw");
	const withScreenshots = flags.has("with-screenshots");
	const url = positional[0];
	const limit = parseInt(positional[1] || "10", 10);

	if (!url) {
		deps.console.log(`Usage: npx tsx list.ts <url> [limit] [options]

Options:
  --no-raw           Include Wayback toolbar in URLs
  --with-screenshots Cross-reference to show which captures have screenshots
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx list.ts https://example.com
  npx tsx list.ts https://example.com 20
  npx tsx list.ts https://example.com --with-screenshots`);
		deps.process.exit(1);
	}

	deps.console.log(`Fetching last ${limit} snapshots for: ${url}\n`);

	const apiUrl = API.cdx(url, { limit, filter: "statuscode:200" });

	const data = await deps.fetchWithCache<CDXRow[]>({
		url: apiUrl,
		ttl: 3600, // 1 hour
		bypassCache: flags.has("no-cache"),
	});

	if (data.length <= 1) {
		deps.console.log("No snapshots found");
		deps.process.exit(0);
	}

	// Optionally fetch screenshot timestamps for cross-reference
	let screenshotTimestamps = new Set<string>();
	if (withScreenshots) {
		deps.process.stdout.write("Checking for screenshots...");
		screenshotTimestamps = await fetchScreenshotTimestamps(url);
		deps.console.log(` found ${screenshotTimestamps.size}\n`);
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

		deps.console.log(`${formatTimestamp(timestamp)} (${formatAge(timestamp)})${indicator}`);
		deps.console.log(`  ${archiveUrl}`);

		if (hasScreenshot) {
			deps.console.log(`  📷 ${buildScreenshotUrl(timestamp, original)}`);
		}
		deps.console.log();
	}

	deps.console.log(`Total: ${snapshots.length} snapshot(s)`);
	if (withScreenshots) {
		deps.console.log(`Screenshots: ${screenshotCount} capture(s) have screenshots`);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	});
}
