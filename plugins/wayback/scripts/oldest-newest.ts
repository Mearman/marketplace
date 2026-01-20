#!/usr/bin/env npx tsx
/**
 * Get oldest and newest Wayback Machine snapshots for a URL
 * Usage: npx tsx oldest-newest.ts <url> [options]
 *
 * Options:
 *   --full            Include archive URLs in output
 *   --oldest-only     Show only oldest capture
 *   --newest-only     Show only newest capture
 *   --json            Output as JSON
 *   --no-cache        Bypass cache and fetch fresh data from API
 */

import {
	API,
	CDXRow,
	buildArchiveUrl,
	fetchWithCache,
	formatAge,
	formatTimestamp,
	parseArgs,
	type ParsedArgs,
} from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface OldestNewestResult {
	url: string;
	oldest: CaptureEntry | null;
	newest: CaptureEntry | null;
}

export interface CaptureEntry {
	timestamp: string;
	url: string;
	original: string;
	age: string;
	formattedDate: string;
}

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

/**
 * Fetch the oldest capture for a URL
 */
export const fetchOldest = async (
	url: string,
	fetchFn: typeof fetchWithCache,
	bypassCache = false
): Promise<CaptureEntry | null> => {
	const apiUrl = API.cdx(url, { limit: 1, filter: "statuscode:200" });

	const data = await fetchFn<CDXRow[]>({
		url: apiUrl,
		ttl: 3600, // 1 hour
		bypassCache,
	});

	if (data.length <= 1) return null;

	const [, timestamp, original] = data[1];

	return {
		timestamp,
		url: buildArchiveUrl(timestamp, original, "id_"),
		original,
		age: formatAge(timestamp),
		formattedDate: formatTimestamp(timestamp),
	};
};

/**
 * Fetch the newest capture for a URL
 */
export const fetchNewest = async (
	url: string,
	fetchFn: typeof fetchWithCache,
	bypassCache = false
): Promise<CaptureEntry | null> => {
	const apiUrl = API.cdx(url, { limit: 1, filter: "statuscode:200", fastLatest: "true" });

	const data = await fetchFn<CDXRow[]>({
		url: apiUrl,
		ttl: 3600, // 1 hour
		bypassCache,
	});

	if (data.length <= 1) return null;

	const [, timestamp, original] = data[1];

	return {
		timestamp,
		url: buildArchiveUrl(timestamp, original, "id_"),
		original,
		age: formatAge(timestamp),
		formattedDate: formatTimestamp(timestamp),
	};
};

/**
 * Format compact output (timestamp + age only)
 */
export const formatCompact = (result: OldestNewestResult, showOldest: boolean, showNewest: boolean): string => {
	const lines: string[] = [];

	if (showOldest) {
		if (result.oldest) {
			lines.push(`${result.oldest.formattedDate} (${result.oldest.age})`);
		} else {
			lines.push("No captures found");
		}
	}

	if (showNewest) {
		if (result.newest) {
			lines.push(`${result.newest.formattedDate} (${result.newest.age})`);
		} else {
			lines.push("No captures found");
		}
	}

	return lines.join("\n");
};

/**
 * Format full output (includes URLs)
 */
export const formatFull = (result: OldestNewestResult, showOldest: boolean, showNewest: boolean): string => {
	const lines: string[] = [];

	if (showOldest) {
		if (result.oldest) {
			lines.push("📜 OLDEST:");
			lines.push(`  ${result.oldest.formattedDate} (${result.oldest.age})`);
			lines.push(`  ${result.oldest.url}`);
		} else {
			lines.push("📜 OLDEST: No captures found");
		}
	}

	if (showNewest) {
		if (result.newest) {
			if (showOldest) lines.push(""); // blank line separator
			lines.push("🆕 NEWEST:");
			lines.push(`  ${result.newest.formattedDate} (${result.newest.age})`);
			lines.push(`  ${result.newest.url}`);
		} else {
			if (showOldest) lines.push(""); // blank line separator
			lines.push("🆕 NEWEST: No captures found");
		}
	}

	// Add archive span if both exist
	if (showOldest && showNewest && result.oldest && result.newest) {
		const oldestYear = parseInt(result.oldest.timestamp.slice(0, 4), 10);
		const oldestMonth = parseInt(result.oldest.timestamp.slice(4, 6), 10) - 1;
		const oldestDay = parseInt(result.oldest.timestamp.slice(6, 8), 10);
		const newestYear = parseInt(result.newest.timestamp.slice(0, 4), 10);
		const newestMonth = parseInt(result.newest.timestamp.slice(4, 6), 10) - 1;
		const newestDay = parseInt(result.newest.timestamp.slice(6, 8), 10);

		const oldestDate = new Date(oldestYear, oldestMonth, oldestDay);
		const newestDate = new Date(newestYear, newestMonth, newestDay);
		const daysDiff = Math.floor((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

		if (daysDiff > 0) {
			lines.push("");
			lines.push(`Archive span: ${daysDiff} days`);
		}
	}

	return lines.join("\n");
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;

	const full = flags.has("full");
	const oldestOnly = flags.has("oldest-only");
	const newestOnly = flags.has("newest-only");
	const json = flags.has("json");
	const url = positional[0];

	const showOldest = !newestOnly;
	const showNewest = !oldestOnly;

	if (!url) {
		deps.console.log(`Usage: npx tsx oldest-newest.ts <url> [options]

Options:
  --full            Include archive URLs in output
  --oldest-only     Show only oldest capture
  --newest-only     Show only newest capture
  --json            Output as JSON
  --no-cache        Bypass cache and fetch fresh data from API

Examples:
  npx tsx oldest-newest.ts https://example.com
  npx tsx oldest-newest.ts https://example.com --full
  npx tsx oldest-newest.ts https://example.com --oldest-only
  npx tsx oldest-newest.ts https://example.com --newest-only`);
		deps.process.exit(1);
	}

	// Build fetch promises conditionally
	const fetchPromises: Promise<CaptureEntry | null>[] = [];
	if (showOldest) {
		fetchPromises.push(fetchOldest(url, deps.fetchWithCache, flags.has("no-cache")));
	}
	if (showNewest) {
		fetchPromises.push(fetchNewest(url, deps.fetchWithCache, flags.has("no-cache")));
	}

	const results = await Promise.all(fetchPromises);

	const oldest = showOldest ? results[0] : null;
	const newest = showNewest ? (showOldest ? results[1] : results[0]) : null;

	const result: OldestNewestResult = {
		url,
		oldest,
		newest,
	};

	if (json) {
		deps.console.log(JSON.stringify(result, null, 2));
	} else if (full) {
		deps.console.log(formatFull(result, showOldest, showNewest));
	} else {
		deps.console.log(formatCompact(result, showOldest, showNewest));
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
