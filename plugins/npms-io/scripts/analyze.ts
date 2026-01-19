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
	ParsedArgs,
} from "./utils";

export interface Dependencies {
	fetchWithCache: typeof fetchWithCache;
	console: Console;
	process: NodeJS.Process;
}

export const handleError = (
	error: unknown,
	_packageName: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("Resource not found")) {
		deps.console.log(`Package "${_packageName}" not found or analysis not available`);
	} else {
		deps.console.error("Error:", message);
	}
	deps.process.exit(1);
};

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;
	const packageName = positional[0];

	if (!packageName) {
		deps.console.log(`Usage: npx tsx analyze.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx analyze.ts react
  npx tsx analyze.ts express
  npx tsx analyze.ts @babel/core`);
		deps.process.exit(1);
	}

	const apiUrl = API.package(packageName);
	deps.console.log(`Analyzing: ${packageName}`);

	const noCache = flags.has("no-cache");
	const data = await deps.fetchWithCache<NpmsPackage>({
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
	deps.console.log();
	deps.console.log(`${metadata.name} - Package Analysis`);
	deps.console.log("-".repeat(metadata.name.length + 20));
	deps.console.log();

	// Scores
	deps.console.log("Quality Scores:");
	deps.console.log(`  Overall: ${formatScore(score.final)}/100`);
	deps.console.log(`  Quality: ${formatScore(score.detail.quality)}/100`);
	deps.console.log(`  Popularity: ${formatScore(score.detail.popularity)}/100`);
	deps.console.log(`  Maintenance: ${formatScore(score.detail.maintenance)}/100`);
	deps.console.log();

	// Package information
	deps.console.log("Package Information:");
	deps.console.log(`  Version: ${metadata.version}`);
	if (metadata.description) {
		deps.console.log(`  Description: ${metadata.description.substring(0, 80)}${metadata.description.length > 80 ? "..." : ""}`);
	}
	deps.console.log(`  Published: ${formatDate(metadata.date)}`);
	deps.console.log();

	// npm statistics
	if (npm && npm.downloadsAccumulated && npm.downloadsAccumulated.length > 0) {
		deps.console.log("npm Statistics:");
		deps.console.log(`  Week: ${formatNumber(npm.weekDownloads)} downloads`);
		deps.console.log(`  Month: ${formatNumber(npm.monthDownloads)} downloads`);
		deps.console.log(`  Quarter: ${formatNumber(npm.quarterDownloads)} downloads`);
		deps.console.log(`  Year: ${formatNumber(npm.yearDownloads)} downloads`);
		deps.console.log();
	}

	// GitHub activity
	if (github) {
		deps.console.log("GitHub Activity:");
		if (github.stars !== undefined) {
			deps.console.log(`  Stars: ${formatNumber(github.stars)}`);
		}
		if (github.forks !== undefined) {
			deps.console.log(`  Forks: ${formatNumber(github.forks)}`);
		}
		if (github.openIssues !== undefined) {
			deps.console.log(`  Open Issues: ${formatNumber(github.openIssues)}`);
		}
		if (github.contributors !== undefined) {
			deps.console.log(`  Contributors: ${formatNumber(github.contributors)}`);
		}
		if (github.latestCommit) {
			deps.console.log(`  Latest Commit: ${formatAge(github.latestCommit.date)}`);
		}
		deps.console.log();

		// Project health
		deps.console.log("Project Health:");
		deps.console.log(`  ${github.participatesInCoc ? "✓" : "✗"} Participates in CoC`);
		deps.console.log(`  ${github.hasContributingGuide ? "✓" : "✗"} Has contributing guide`);
		deps.console.log(`  ${github.hasLicense ? "✓" : "✗"} Has license`);
		deps.console.log(`  ${github.hasSecurityPolicy ? "✓" : "✗"} Has security policy`);
		deps.console.log(`  ${github.hasOpenDiscussions ? "✓" : "✗"} Has open discussions`);
		deps.console.log();

		// Recent releases
		if (github.recentReleases && github.recentReleases.length > 0) {
			deps.console.log("Recent Releases:");
			github.recentReleases.slice(0, 5).forEach((release) => {
				deps.console.log(`  ${release.version} - ${formatDate(release.date)}`);
			});
			deps.console.log();
		}
	}

	// Links
	if (metadata.links) {
		deps.console.log("Links:");
		if (metadata.links.npm) {
			deps.console.log(`  npm: ${metadata.links.npm}`);
		}
		if (metadata.links.homepage) {
			deps.console.log(`  Homepage: ${metadata.links.homepage}`);
		}
		if (metadata.links.repository) {
			deps.console.log(`  Repository: ${metadata.links.repository}`);
		}
		if (metadata.links.bugs) {
			deps.console.log(`  Bugs: ${metadata.links.bugs}`);
		}
	}

	deps.console.log();
};

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		handleError(error, "", defaultDeps);
	});
}
