#!/usr/bin/env npx tsx
/**
 * Analyze Wayback Machine capture frequency for a URL
 * Usage: npx tsx frequency.ts <url> [from] [to] [options]
 *
 * Options:
 *   --full            Include detailed breakdown by year/month
 *   --json            Output as JSON
 *   --no-cache        Bypass cache and fetch fresh data from API
 */

import {
	API,
	CDXRow,
	fetchWithCache,
	formatTimestamp,
	parseArgs,
	parseTimestamp,
	validateCDXResponse,
	type ParsedArgs,
} from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface FrequencyResult {
	url: string;
	from: string;
	to: string;
	totalCaptures: number;
	timeSpanDays: number;
	capturesPerDay: number;
	capturesPerMonth: number;
	capturesPerYear: number;
	byYear?: Record<string, number>;
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
 * Parse date string in YYYYMMDD or YYYY-MM format to timestamp string
 */
export const parseDateToTimestamp = (dateStr: string): string => {
	// Remove any non-digit characters
	const cleaned = dateStr.replace(/\D/g, "");
	// Pad to at least 4 digits (year)
	return cleaned.padEnd(14, "0").slice(0, 14);
};

/**
 * Fetch all captures in a date range
 */
export const fetchCaptures = async (
	url: string,
	from: string,
	to: string,
	fetchFn: typeof fetchWithCache
): Promise<CDXRow[]> => {
	const apiUrl = API.cdx(url, {
		from,
		to,
		filter: "statuscode:200",
	});

	const rawData = await fetchFn({
		url: apiUrl,
		ttl: 3600, // 1 hour
	});
	const data = validateCDXResponse(rawData);

	// Skip header row
	return data.length > 1 ? data.slice(1) : [];
};

/**
 * Calculate frequency statistics
 */
export const calculateFrequency = (
	captures: CDXRow[],
	from: string,
	to: string
): FrequencyResult => {
	if (captures.length === 0) {
		return {
			url: captures[0]?.[2] || "",
			from,
			to,
			totalCaptures: 0,
			timeSpanDays: 0,
			capturesPerDay: 0,
			capturesPerMonth: 0,
			capturesPerYear: 0,
		};
	}

	const firstTimestamp = captures[0][1];
	const lastTimestamp = captures[captures.length - 1][1];

	const fromDate = parseTimestamp(firstTimestamp);
	const toDate = parseTimestamp(lastTimestamp);

	const timeSpanMs = toDate.getTime() - fromDate.getTime();
	const timeSpanDays = Math.max(1, Math.floor(timeSpanMs / (1000 * 60 * 60 * 24)));

	const capturesPerDay = captures.length / timeSpanDays;
	const capturesPerMonth = capturesPerDay * 30.44; // Average days per month
	const capturesPerYear = capturesPerDay * 365.25;

	return {
		url: captures[0][2],
		from: formatTimestamp(firstTimestamp),
		to: formatTimestamp(lastTimestamp),
		totalCaptures: captures.length,
		timeSpanDays,
		capturesPerDay: parseFloat(capturesPerDay.toFixed(2)),
		capturesPerMonth: parseFloat(capturesPerMonth.toFixed(2)),
		capturesPerYear: parseFloat(capturesPerYear.toFixed(2)),
	};
};

/**
 * Group captures by year
 */
export const groupByYear = (captures: CDXRow[]): Record<string, number> => {
	const byYear: Record<string, number> = {};

	for (const row of captures) {
		const year = row[1].slice(0, 4);
		byYear[year] = (byYear[year] || 0) + 1;
	}

	return byYear;
};

/**
 * Format compact output
 */
export const formatCompact = (result: FrequencyResult): string => {
	if (result.totalCaptures === 0) {
		return "No captures found in the specified date range.";
	}

	const lines: string[] = [];

	lines.push(`${result.totalCaptures} captures over ${result.timeSpanDays} days`);
	lines.push(`Average: ${result.capturesPerDay}/day, ${result.capturesPerMonth}/month, ${result.capturesPerYear}/year`);

	return lines.join("\n");
};

/**
 * Format full output
 */
export const formatFull = (result: FrequencyResult): string => {
	if (result.totalCaptures === 0) {
		return "No captures found in the specified date range.";
	}

	const lines: string[] = [];

	lines.push("📊 CAPTURE FREQUENCY ANALYSIS");
	lines.push("");
	lines.push(`URL: ${result.url}`);
	lines.push(`Range: ${result.from} to ${result.to} (${result.timeSpanDays} days)`);
	lines.push("");
	lines.push(`Total captures: ${result.totalCaptures}`);
	lines.push("Average rate:");
	lines.push(`  ${result.capturesPerDay} captures per day`);
	lines.push(`  ${result.capturesPerMonth} captures per month`);
	lines.push(`  ${result.capturesPerYear} captures per year`);

	if (result.byYear) {
		lines.push("");
		lines.push("By year:");
		const years = Object.keys(result.byYear).sort();
		for (const year of years) {
			lines.push(`  ${year}: ${result.byYear[year]} captures`);
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
	const json = flags.has("json");
	const url = positional[0];
	const from = positional[1];
	const to = positional[2];

	if (!url) {
		deps.console.log(`Usage: npx tsx frequency.ts <url> [from] [to] [options]

Arguments:
  url              The URL to analyze
  from             Start date (YYYYMMDD or YYYY-MM) - default: oldest capture
  to               End date (YYYYMMDD or YYYY-MM) - default: newest capture

Options:
  --full           Include detailed breakdown by year
  --json           Output as JSON
  --no-cache       Bypass cache and fetch fresh data from API

Examples:
  npx tsx frequency.ts https://example.com
  npx tsx frequency.ts https://example.com 2020 2023
  npx tsx frequency.ts https://example.com 20200101 20231231 --full`);
		deps.process.exit(1);
	}

	const fromTimestamp = from ? parseDateToTimestamp(from) : "";
	const toTimestamp = to ? parseDateToTimestamp(to) : "";

	deps.console.log(`Fetching capture data for: ${url}${from ? ` from ${from}` : ""}${to ? ` to ${to}` : ""}\n`);

	const captures = await fetchCaptures(url, fromTimestamp, toTimestamp, deps.fetchWithCache);

	if (captures.length === 0) {
		deps.console.log("No captures found in the specified date range.");
		deps.process.exit(0);
	}

	const result = calculateFrequency(captures, fromTimestamp, toTimestamp);

	if (full) {
		result.byYear = groupByYear(captures);
	}

	if (json) {
		deps.console.log(JSON.stringify(result, null, 2));
	} else if (full) {
		deps.console.log(formatFull(result));
	} else {
		deps.console.log(formatCompact(result));
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
