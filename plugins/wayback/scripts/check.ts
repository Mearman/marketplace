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
	buildArchiveUrl,
	fetchWithCache,
	formatAge,
	formatTimestamp,
	parseArgs,
	validateAvailableResponse,
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
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;
	const noRaw = flags.has("no-raw");
	const timestamp = options.get("timestamp");
	const url = positional[0];

	if (!url) {
		deps.console.log(`Usage: npx tsx check.ts <url> [options]

Options:
  --no-raw           Include Wayback toolbar in archived URL
  --timestamp=DATE   Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss)
  --no-cache         Bypass cache and fetch fresh data from API

Examples:
  npx tsx check.ts https://example.com
  npx tsx check.ts https://example.com --timestamp=20200101
  npx tsx check.ts https://example.com --timestamp=20231225120000`);
		deps.process.exit(1);
	}

	const apiUrl = API.availability(url, timestamp);

	if (timestamp) {
		deps.console.log(`Checking: ${url} (closest to ${formatTimestamp(timestamp)})`);
	} else {
		deps.console.log(`Checking: ${url}`);
	}

	try {
		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 86400, // 24 hours
			bypassCache: flags.has("no-cache"),
		});
		const data = validateAvailableResponse(rawData);

		const snapshot = data.archived_snapshots.closest;
		if (snapshot?.available) {
			const modifier = noRaw ? "" : "id_";
			const archiveUrl = buildArchiveUrl(snapshot.timestamp!, url, modifier);

			deps.console.log();
			deps.console.log("✓ Archived");
			deps.console.log(`  Timestamp: ${formatTimestamp(snapshot.timestamp!)} (${formatAge(snapshot.timestamp!)})`);
			deps.console.log(`  Status: ${snapshot.status!}`);
			deps.console.log(`  URL: ${archiveUrl}`);
			deps.console.log();
		} else {
			deps.console.log();
			deps.console.log("✗ Not archived");
			deps.console.log("  Use wayback-submit to archive this URL.");
			deps.console.log();
			deps.process.exit(1);
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
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	});
}
