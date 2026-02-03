#!/usr/bin/env npx tsx
/**
 * Get npm download statistics
 * Usage: npx tsx downloads.ts <package-name> [options]
 *
 * Options:
 *   --period=PERIOD  Time period: last-week, last-month, last-year (default: last-month)
 *   --no-cache       Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	formatNumber,
	parseArgs,
	validateNpmDownloadsResponse,
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
	packageName: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("Resource not found")) {
		deps.console.log(`Package "${packageName}" not found or no download data available`);
	} else {
		deps.console.error("Error:", message);
	}
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;
	const packageName = positional[0];
	const period = options.get("period") || "last-month";

	if (!packageName) {
		deps.console.log(`Usage: npx tsx downloads.ts <package-name> [options]

Options:
  --period=PERIOD  Time period: last-week, last-month, last-year (default: last-month)
  --no-cache       Bypass cache and fetch fresh data

Examples:
  npx tsx downloads.ts react
  npx tsx downloads.ts express --period=last-week
  npx tsx downloads.ts vue --period=last-year`);
		deps.process.exit(1);
	}

	const apiUrl = API.downloads(period, packageName);
	deps.console.log(`Fetching downloads for: ${packageName} (${period})`);

	try {
		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 86400, // 24 hours
			cacheKey: `downloads-${period}-${packageName}`,
			bypassCache: flags.has("no-cache"),
		});
		const data = validateNpmDownloadsResponse(rawData);

		// Calculate statistics
		const totalDownloads = data.downloads.reduce((sum, point) => sum + point.downloads, 0);
		const avgPerDay = Math.round(totalDownloads / data.downloads.length);
		const peakDay = data.downloads.reduce((max, point) =>
			point.downloads > max.downloads ? point : max
		);

		const startDate = new Date(data.start);
		const endDate = new Date(data.end);
		const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

		deps.console.log();
		deps.console.log(`Downloads for ${data.package} (${period})`);
		deps.console.log("-".repeat(40));
		deps.console.log(`Period: ${data.start} to ${data.end} (${daysDiff} days)`);
		deps.console.log(`Total downloads: ${formatNumber(totalDownloads)}`);
		deps.console.log(`Average per day: ${formatNumber(avgPerDay)}`);
		deps.console.log(`Peak day: ${peakDay.day} (${formatNumber(peakDay.downloads)} downloads)`);

		// Show first and last few days
		const showDays = Math.min(data.downloads.length, 7);
		if (data.downloads.length > 14) {
			deps.console.log(`\nFirst ${showDays} days:`);
			data.downloads.slice(0, showDays).forEach((point) => {
				deps.console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
			deps.console.log(`  ... (${data.downloads.length - showDays * 2} more days)`);
			deps.console.log(`\nLast ${showDays} days:`);
			data.downloads.slice(-showDays).forEach((point) => {
				deps.console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
		} else {
			deps.console.log("\nDaily breakdown:");
			data.downloads.forEach((point) => {
				deps.console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
		}

		deps.console.log();
	} catch (error) {
		handleError(error, packageName, deps);
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
		console.error("Error:", message);
		process.exit(1);
	});
}
