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
	formatNumber,
	getCached,
	NpmDownloadsResponse,
	parseArgs,
	setCached,
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));
	const packageName = positional[0];
	const period = options.get("period") || "last-month";

	if (!packageName) {
		console.log(`Usage: npx tsx downloads.ts <package-name> [options]

Options:
  --period=PERIOD  Time period: last-week, last-month, last-year (default: last-month)
  --no-cache       Bypass cache and fetch fresh data

Examples:
  npx tsx downloads.ts react
  npx tsx downloads.ts express --period=last-week
  npx tsx downloads.ts vue --period=last-year`);
		process.exit(1);
	}

	const apiUrl = API.downloads(period, packageName);
	console.log(`Fetching downloads for: ${packageName} (${period})`);

	try {
		const noCache = flags.has("no-cache");
		const cacheKey = `downloads-${period}-${packageName}`;
		let data: NpmDownloadsResponse;

		if (noCache) {
			const response = await fetch(apiUrl);
			if (!response.ok) {
				if (response.status === 404) {
					console.log(`Package "${packageName}" not found or no download data available`);
					process.exit(1);
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			data = await response.json();
			await setCached(cacheKey, data); // 24 hours
		} else {
			const cached = await getCached<NpmDownloadsResponse>(cacheKey, 86400);
			if (cached === null) {
				const response = await fetch(apiUrl);
				if (!response.ok) {
					if (response.status === 404) {
						console.log(`Package "${packageName}" not found or no download data available`);
						process.exit(1);
					}
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				data = await response.json();
				await setCached(cacheKey, data);
			} else {
				data = cached.data;
			}
		}

		// Calculate statistics
		const totalDownloads = data.downloads.reduce((sum, point) => sum + point.downloads, 0);
		const avgPerDay = Math.round(totalDownloads / data.downloads.length);
		const peakDay = data.downloads.reduce((max, point) =>
			point.downloads > max.downloads ? point : max
		);

		const startDate = new Date(data.start);
		const endDate = new Date(data.end);
		const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

		console.log();
		console.log(`Downloads for ${data.package} (${period})`);
		console.log("-".repeat(40));
		console.log(`Period: ${data.start} to ${data.end} (${daysDiff} days)`);
		console.log(`Total downloads: ${formatNumber(totalDownloads)}`);
		console.log(`Average per day: ${formatNumber(avgPerDay)}`);
		console.log(`Peak day: ${peakDay.day} (${formatNumber(peakDay.downloads)} downloads)`);

		// Show first and last few days
		const showDays = Math.min(data.downloads.length, 7);
		if (data.downloads.length > 14) {
			console.log(`\nFirst ${showDays} days:`);
			data.downloads.slice(0, showDays).forEach((point) => {
				console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
			console.log(`  ... (${data.downloads.length - showDays * 2} more days)`);
			console.log(`\nLast ${showDays} days:`);
			data.downloads.slice(-showDays).forEach((point) => {
				console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
		} else {
			console.log("\nDaily breakdown:");
			data.downloads.forEach((point) => {
				console.log(`  ${point.day}: ${formatNumber(point.downloads)}`);
			});
		}

		console.log();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
