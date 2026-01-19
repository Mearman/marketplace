#!/usr/bin/env npx tsx
/**
 * Check GitHub API rate limit status
 * Usage: npx tsx rate-limit.ts [options]
 *
 * Options:
 *   --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
 *   --no-cache     Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	getAuthHeaders,
	GitHubRateLimit,
	getTokenFromEnv,
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
	getAuthHeaders: (token?: string) => Record<string, string>;
	getTokenFromEnv: () => string | undefined;
	Date: {
		now: () => number;
	};
}

// ============================================================================
// Formatters
// ============================================================================

const formatResetTime = (resetTimestamp: number, currentDate: Date): string => {
	const reset = new Date(resetTimestamp * 1000);
	const now = currentDate;
	const diffMs = reset.getTime() - now.getTime();

	if (diffMs <= 0) {
		return "Now";
	}

	const diffMins = Math.floor(diffMs / (1000 * 60));

	if (diffMins < 1) {
		const diffSecs = Math.floor(diffMs / 1000);
		return `${diffSecs} second${diffSecs !== 1 ? "s" : ""}`;
	}

	if (diffMins < 60) {
		return `${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
	}

	const diffHours = Math.floor(diffMins / 60);
	const remainingMins = diffMins % 60;
	if (remainingMins > 0) {
		return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ${remainingMins} minute${remainingMins !== 1 ? "s" : ""}`;
	}
	return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
};

const formatNumber = (num: number): string => {
	return num.toLocaleString("en-US");
};

export { formatResetTime, formatNumber };

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options } = args;
	const token = options.get("token") || deps.getTokenFromEnv();

	const apiUrl = API.rateLimit();
	deps.console.log("Fetching GitHub API rate limit status...");

	try {
		const headers = deps.getAuthHeaders(token);

		const data = await deps.fetchWithCache<GitHubRateLimit>({
			url: apiUrl,
			ttl: 300, // 5 minutes
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: "rate-limit",
		});

		// Display rate limit information
		deps.console.log();
		deps.console.log("GitHub API Rate Limit Status");
		deps.console.log("-".repeat(32));
		deps.console.log();

		const currentDate = new Date(deps.Date.now());

		// Core API
		const core = data.resources.core;
		deps.console.log("Core API:");
		deps.console.log(`  Limit: ${formatNumber(core.limit)} requests/hour`);
		deps.console.log(`  Used: ${formatNumber(core.used)} requests`);
		deps.console.log(`  Remaining: ${formatNumber(core.remaining)} requests`);
		deps.console.log(`  Resets in: ${formatResetTime(core.reset, currentDate)}`);
		deps.console.log();

		// Search API
		const search = data.resources.search;
		deps.console.log("Search API:");
		deps.console.log(`  Limit: ${formatNumber(search.limit)} requests/minute`);
		deps.console.log(`  Used: ${formatNumber(search.used)} requests`);
		deps.console.log(`  Remaining: ${formatNumber(search.remaining)} requests`);
		deps.console.log(`  Resets in: ${formatResetTime(search.reset, currentDate)}`);
		deps.console.log();

		// Authentication status
		if (token) {
			const tokenPreview = token.slice(0, 7) + "...";
			deps.console.log(`Authentication: Authenticated (${tokenPreview})`);
		} else {
			deps.console.log("Authentication: None (unauthenticated)");
			deps.console.log("  Tip: Use a GitHub token for 80x more quota");
		}

		deps.console.log();

		// Warning if approaching limit
		const coreUsagePercent = (core.used / core.limit) * 100;
		if (coreUsagePercent > 90) {
			deps.console.log("Warning: Core API quota nearly exhausted!");
		} else if (coreUsagePercent > 75) {
			deps.console.log("Notice: Core API quota below 25%");
		}

		const searchUsagePercent = (search.used / search.limit) * 100;
		if (searchUsagePercent > 90) {
			deps.console.log("Warning: Search API quota nearly exhausted!");
		} else if (searchUsagePercent > 75) {
			deps.console.log("Notice: Search API quota below 25%");
		}

		if (coreUsagePercent > 75 || searchUsagePercent > 75) {
			deps.console.log();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		deps.console.error("Error:", message);
		deps.process.exit(1);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
	getAuthHeaders,
	getTokenFromEnv,
	Date,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Error:", message);
		process.exit(1);
	});
}
