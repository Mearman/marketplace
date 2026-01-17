#!/usr/bin/env npx tsx
/**
 * Analyze npm package quality using NPMS.io
 * Usage: npx tsx analyze.ts <package-name> [options]
 *
 * Options:
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	formatDate,
	formatAge,
	formatNumber,
	formatScore,
	fetchWithCache,
	NpmsPackage,
	parseArgs,
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const packageName = positional[0];

	if (!packageName) {
		console.log(`Usage: npx tsx analyze.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx analyze.ts react
  npx tsx analyze.ts express
  npx tsx analyze.ts @babel/core`);
		process.exit(1);
	}

	const apiUrl = API.package(packageName);
	console.log(`Analyzing: ${packageName}`);

	try {
		const noCache = flags.has("no-cache");
		const data = await fetchWithCache<NpmsPackage>({
			url: apiUrl,
			ttl: 21600, // 6 hours
			cacheKey: `analyze-${packageName}`,
			bypassCache: noCache,
		});

		const metadata = data.collected.metadata;
		const score = data.score;
		const npm = data.collected.npm;
		const github = data.collected.github;

		// Display analysis
		console.log();
		console.log(`${metadata.name} - Package Analysis`);
		console.log("-".repeat(metadata.name.length + 20));
		console.log();

		// Scores
		console.log("Quality Scores:");
		console.log(`  Overall: ${formatScore(score.final)}/100`);
		console.log(`  Quality: ${formatScore(score.detail.quality)}/100`);
		console.log(`  Popularity: ${formatScore(score.detail.popularity)}/100`);
		console.log(`  Maintenance: ${formatScore(score.detail.maintenance)}/100`);
		console.log();

		// Package information
		console.log("Package Information:");
		console.log(`  Version: ${metadata.version}`);
		if (metadata.description) {
			console.log(`  Description: ${metadata.description.substring(0, 80)}${metadata.description.length > 80 ? "..." : ""}`);
		}
		console.log(`  Published: ${formatDate(metadata.date)}`);
		console.log();

		// npm statistics
		if (npm && npm.downloadsAccumulated && npm.downloadsAccumulated.length > 0) {
			console.log("npm Statistics:");
			console.log(`  Week: ${formatNumber(npm.weekDownloads)} downloads`);
			console.log(`  Month: ${formatNumber(npm.monthDownloads)} downloads`);
			console.log(`  Quarter: ${formatNumber(npm.quarterDownloads)} downloads`);
			console.log(`  Year: ${formatNumber(npm.yearDownloads)} downloads`);
			console.log();
		}

		// GitHub activity
		if (github) {
			console.log("GitHub Activity:");
			if (github.stars !== undefined) {
				console.log(`  Stars: ${formatNumber(github.stars)}`);
			}
			if (github.forks !== undefined) {
				console.log(`  Forks: ${formatNumber(github.forks)}`);
			}
			if (github.openIssues !== undefined) {
				console.log(`  Open Issues: ${formatNumber(github.openIssues)}`);
			}
			if (github.contributors !== undefined) {
				console.log(`  Contributors: ${formatNumber(github.contributors)}`);
			}
			if (github.latestCommit) {
				console.log(`  Latest Commit: ${formatAge(github.latestCommit.date)}`);
			}
			console.log();

			// Project health
			console.log("Project Health:");
			console.log(`  ${github.participatesInCoc ? "✓" : "✗"} Participates in CoC`);
			console.log(`  ${github.hasContributingGuide ? "✓" : "✗"} Has contributing guide`);
			console.log(`  ${github.hasLicense ? "✓" : "✗"} Has license`);
			console.log(`  ${github.hasSecurityPolicy ? "✓" : "✗"} Has security policy`);
			console.log(`  ${github.hasOpenDiscussions ? "✓" : "✗"} Has open discussions`);
			console.log();

			// Recent releases
			if (github.recentReleases && github.recentReleases.length > 0) {
				console.log("Recent Releases:");
				github.recentReleases.slice(0, 5).forEach((release) => {
					console.log(`  ${release.version} - ${formatDate(release.date)}`);
				});
				console.log();
			}
		}

		// Links
		if (metadata.links) {
			console.log("Links:");
			if (metadata.links.npm) {
				console.log(`  npm: ${metadata.links.npm}`);
			}
			if (metadata.links.homepage) {
				console.log(`  Homepage: ${metadata.links.homepage}`);
			}
			if (metadata.links.repository) {
				console.log(`  Repository: ${metadata.links.repository}`);
			}
			if (metadata.links.bugs) {
				console.log(`  Bugs: ${metadata.links.bugs}`);
			}
		}

		console.log();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Resource not found")) {
			console.log(`Package "${packageName}" not found or analysis not available`);
		} else {
			console.error("Error:", message);
		}
		process.exit(1);
	}
};

main();
