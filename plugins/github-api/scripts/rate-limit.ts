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
	getCached,
	getAuthHeaders,
	GitHubRateLimit,
	getTokenFromEnv,
	parseArgs,
	setCached,
} from "./utils";

const formatResetTime = (resetTimestamp: number): string => {
	const reset = new Date(resetTimestamp * 1000);
	const now = new Date();
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

const main = async () => {
	const { flags, options } = parseArgs(process.argv.slice(2));
	const token = options.get("token") || getTokenFromEnv();

	const apiUrl = API.rateLimit();
	console.log("Fetching GitHub API rate limit status...");

	try {
		const noCache = flags.has("no-cache");
		const cacheKey = "rate-limit";
		let data: GitHubRateLimit;

		const headers = getAuthHeaders(token);

		if (noCache) {
			const response = await fetch(apiUrl, { headers });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			data = await response.json();
			await setCached(cacheKey, data); // 5 minutes
		} else {
			const cached = await getCached<GitHubRateLimit>(cacheKey, 300);
			if (cached === null) {
				const response = await fetch(apiUrl, { headers });
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				data = await response.json();
				await setCached(cacheKey, data);
			} else {
				data = cached.data;
			}
		}

		// Display rate limit information
		console.log();
		console.log("GitHub API Rate Limit Status");
		console.log("-".repeat(32));
		console.log();

		// Core API
		const core = data.resources.core;
		console.log("Core API:");
		console.log(`  Limit: ${formatNumber(core.limit)} requests/hour`);
		console.log(`  Used: ${formatNumber(core.used)} requests`);
		console.log(`  Remaining: ${formatNumber(core.remaining)} requests`);
		console.log(`  Resets in: ${formatResetTime(core.reset)}`);
		console.log();

		// Search API
		const search = data.resources.search;
		console.log("Search API:");
		console.log(`  Limit: ${formatNumber(search.limit)} requests/minute`);
		console.log(`  Used: ${formatNumber(search.used)} requests`);
		console.log(`  Remaining: ${formatNumber(search.remaining)} requests`);
		console.log(`  Resets in: ${formatResetTime(search.reset)}`);
		console.log();

		// Authentication status
		if (token) {
			const tokenPreview = token.slice(0, 7) + "...";
			console.log(`Authentication: Authenticated (${tokenPreview})`);
		} else {
			console.log("Authentication: None (unauthenticated)");
			console.log("  Tip: Use a GitHub token for 80x more quota");
		}

		console.log();

		// Warning if approaching limit
		const coreUsagePercent = (core.used / core.limit) * 100;
		if (coreUsagePercent > 90) {
			console.log("⚠️  Warning: Core API quota nearly exhausted!");
		} else if (coreUsagePercent > 75) {
			console.log("⚠️  Notice: Core API quota below 25%");
		}

		const searchUsagePercent = (search.used / search.limit) * 100;
		if (searchUsagePercent > 90) {
			console.log("⚠️  Warning: Search API quota nearly exhausted!");
		} else if (searchUsagePercent > 75) {
			console.log("⚠️  Notice: Search API quota below 25%");
		}

		if (coreUsagePercent > 75 || searchUsagePercent > 75) {
			console.log();
		}
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
