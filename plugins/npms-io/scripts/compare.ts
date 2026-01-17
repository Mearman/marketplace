#!/usr/bin/env npx tsx
/**
 * Compare multiple npm packages using NPMS.io
 * Usage: npx tsx compare.ts <package1> <package2> [package3...] [options]
 *
 * Options:
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	formatNumber,
	formatScore,
	fetchWithCache,
	NpmsMgetResponse,
	NpmsPackage,
	parseArgs,
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const packages = positional;

	if (packages.length < 2) {
		console.log(`Usage: npx tsx compare.ts <package1> <package2> [package3...] [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx compare.ts react vue angular
  npx tsx compare.ts axios got node-fetch
  npx tsx compare.ts express koa fastify hapi`);
		process.exit(1);
	}

	console.log(`Comparing: ${packages.join(" vs ")}`);

	try {
		const data = await fetchWithCache<NpmsMgetResponse>({
			url: API.mget(),
			ttl: 21600, // 6 hours
			cacheKey: `compare-${packages.join("-")}`,
			bypassCache: flags.has("no-cache"),
			fetchOptions: {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(packages),
			},
		});

		// Process results
		const results: Array<{ name: string; data: NpmsPackage | null }> = packages.map((name) => ({
			name,
			data: data[name] || null,
		}));

		// Filter out packages with no data
		const available = results.filter((r) => r.data !== null);
		const missing = results.filter((r) => r.data === null);

		if (available.length === 0) {
			console.log("\nNo packages found or analyzed");
			if (missing.length > 0) {
				console.log(`\nNot found: ${missing.map((m) => m.name).join(", ")}`);
			}
			process.exit(1);
		}

		console.log();
		console.log(`Package Comparison: ${available.map((r) => r.name).join(" vs ")}`);
		console.log("-".repeat(60));
		console.log();

		// Build table rows
		const maxWidth = Math.max(...available.map((r) => r.name.length));

		// Header
		const header = "Metric".padEnd(15) + available.map((r) => r.name.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(header);

		const separator = "─".repeat(15) + available.map(() => "─".repeat(Math.max(12, maxWidth))).join("  ");
		console.log(separator);

		// Scores
		const scoresRow = "Overall".padEnd(15) +
      available.map((r) => `${formatScore(r.data!.score.final)}/100`.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(scoresRow);

		const qualityRow = "Quality".padEnd(15) +
      available.map((r) => `${formatScore(r.data!.score.detail.quality)}/100`.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(qualityRow);

		const popularityRow = "Popularity".padEnd(15) +
      available.map((r) => `${formatScore(r.data!.score.detail.popularity)}/100`.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(popularityRow);

		const maintenanceRow = "Maintenance".padEnd(15) +
      available.map((r) => `${formatScore(r.data!.score.detail.maintenance)}/100`.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(maintenanceRow);

		console.log(separator);

		// Version
		const versionRow = "Version".padEnd(15) +
      available.map((r) => r.data!.collected.metadata.version.padEnd(Math.max(12, maxWidth))).join("  ");
		console.log(versionRow);

		// GitHub stats
		const starsRow = "Stars".padEnd(15) +
      available.map((r) => {
      	const stars = r.data!.collected.github?.stars;
      	return stars ? formatNumber(stars).padEnd(Math.max(12, maxWidth)) : "N/A".padEnd(Math.max(12, maxWidth));
      }).join("  ");
		console.log(starsRow);

		const forksRow = "Forks".padEnd(15) +
      available.map((r) => {
      	const forks = r.data!.collected.github?.forks;
      	return forks ? formatNumber(forks).padEnd(Math.max(12, maxWidth)) : "N/A".padEnd(Math.max(12, maxWidth));
      }).join("  ");
		console.log(forksRow);

		const issuesRow = "Issues".padEnd(15) +
      available.map((r) => {
      	const issues = r.data!.collected.github?.openIssues;
      	return issues ? formatNumber(issues).padEnd(Math.max(12, maxWidth)) : "N/A".padEnd(Math.max(12, maxWidth));
      }).join("  ");
		console.log(issuesRow);

		// Downloads
		const downloadsRow = "Downloads/Mo".padEnd(15) +
      available.map((r) => {
      	const dl = r.data!.collected.npm?.monthDownloads;
      	return dl ? formatNumber(dl).padEnd(Math.max(12, maxWidth)) : "N/A".padEnd(Math.max(12, maxWidth));
      }).join("  ");
		console.log(downloadsRow);

		console.log();

		// Show missing packages
		if (missing.length > 0) {
			console.log(`Not found or not analyzed: ${missing.map((m) => m.name).join(", ")}`);
			console.log();
		}

		// Recommendation
		const best = available.reduce((best, current) =>
      current.data!.score.final > best.data!.score.final ? current : best
		);
		console.log(`Highest overall score: ${best.name} (${formatScore(best.data!.score.final)}/100)`);
		console.log();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
