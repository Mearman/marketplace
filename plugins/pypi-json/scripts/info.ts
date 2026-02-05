#!/usr/bin/env npx tsx
/**
 * Get PyPI package metadata
 * Usage: npx tsx info.ts <package-name> [options]
 *
 * Options:
 *   --no-cache     Bypass cache and fetch fresh data from PyPI
 *   --releases     Show detailed release history
 *   --files        Show distribution files for the latest release
 */

import {
	API,
	PyPIDistribution,
	compareVersions,
	fetchWithCache,
	formatBytes,
	formatClassifier,
	formatPythonRequirement,
	getDistributionType,
	getMainClassifiers,
	parseArgs,
	validatePyPIPackageInfo,
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
	_packageName: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	if (error instanceof Error) {
		const message = error.message;

		// Check for HTTP 404 - package not found
		if (message.includes("404")) {
			deps.console.error(`Error: Package '${_packageName}' not found on PyPI`);
			deps.process.exit(1);
		}

		// Check for network/timeout errors
		if (
			message.includes("ECONNREFUSED") ||
			message.includes("ETIMEDOUT") ||
			message.includes("timeout") ||
			message.includes("ENOTFOUND")
		) {
			deps.console.error(
				"Error: Network error. Check your connection or try again with --no-cache"
			);
			deps.process.exit(1);
		}

		deps.console.error("Error:", message);
	} else {
		deps.console.error("Error:", String(error));
	}
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;
	const packageName = positional[0];

	if (!packageName) {
		deps.console.log("Usage: npx tsx info.ts <package-name> [options]");
		deps.console.log("\nOptions:");
		deps.console.log("  --no-cache     Bypass cache and fetch fresh data from PyPI");
		deps.console.log("  --releases     Show detailed release history");
		deps.console.log("  --files        Show distribution files for the latest release");
		deps.process.exit(1);
	}

	const apiUrl = API.package(packageName);

	try {
		deps.console.log(`Fetching: ${packageName}`);

		// Fetch with cache - critical for performance
		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 21600, // 6 hours
			bypassCache: flags.has("no-cache"),
		});
		const data = validatePyPIPackageInfo(rawData);

		const info = data.info;

		// Display package name and basic info
		deps.console.log(`\n${info.name}`);
		deps.console.log("=".repeat(50));

		deps.console.log(`Latest Version: ${info.version}`);
		if (info.license) deps.console.log(`License: ${info.license}`);
		if (info.author) deps.console.log(`Author: ${info.author}`);
		if (info.maintainer) deps.console.log(`Maintainer: ${info.maintainer}`);

		// Display summary
		if (info.summary) {
			deps.console.log("\nSummary:");
			deps.console.log(info.summary);
		}

		// Display full description if available
		if (info.description && info.description.length > 200) {
			deps.console.log("\nDescription:");
			const lines = info.description.split("\n").slice(0, 5).join("\n");
			deps.console.log(lines);
			if (info.description.split("\n").length > 5) {
				deps.console.log("...");
			}
		}

		// Display project URLs
		if (info.project_urls && Object.keys(info.project_urls).length > 0) {
			deps.console.log("\nProject URLs:");
			Object.entries(info.project_urls).forEach(([label, url]) => {
				deps.console.log(`  ${label}: ${url}`);
			});
		}

		// Display Python requirement
		const pythonReq = formatPythonRequirement(info.requires_python);
		deps.console.log(`\nPython Requirement: ${pythonReq}`);

		// Display keywords
		if (info.keywords) {
			deps.console.log(`\nKeywords: ${info.keywords}`);
		}

		// Display classifiers
		if (info.classifiers && info.classifiers.length > 0) {
			const mainClassifiers = getMainClassifiers(info.classifiers);
			if (mainClassifiers.length > 0) {
				deps.console.log("\nClassifiers:");
				mainClassifiers.slice(0, 8).forEach((classifier) => {
					deps.console.log(`  - ${formatClassifier(classifier)}`);
				});
				if (mainClassifiers.length > 8) {
					deps.console.log(`  ... and ${mainClassifiers.length - 8} more`);
				}
			}
		}

		// Display latest release files
		if (flags.has("files") && data.urls.length > 0) {
			deps.console.log(`\nLatest Release Files (${data.urls.length} total):`);
			data.urls.slice(0, 10).forEach((file: PyPIDistribution) => {
				const size = file.size ? formatBytes(file.size) : "unknown";
				const fileType = getDistributionType(file.filename);
				deps.console.log(`  ${file.filename} [${fileType}] - ${size}`);
				if (file.yanked) {
					deps.console.log(`    ⚠️  YANKED${file.yanked_reason ? `: ${file.yanked_reason}` : ""}`);
				}
			});
			if (data.urls.length > 10) {
				deps.console.log(`  ... and ${data.urls.length - 10} more files`);
			}
		}

		// Display release history
		if (flags.has("releases")) {
			const versions = Object.keys(data.releases).sort(compareVersions).reverse();
			deps.console.log(`\nRelease History (${versions.length} total releases):`);

			versions.slice(0, 15).forEach((version) => {
				const files = data.releases[version];
				const primaryFile = files[0];
				const hasWheel = files.some((f) => f.filename.endsWith(".whl"));
				const hasSource = files.some((f) => f.filename.endsWith(".tar.gz"));
				const fileTypes = [hasWheel ? "wheel" : "", hasSource ? "source" : ""].filter(Boolean).join(", ");

				deps.console.log(`  ${version} (${fileTypes})`);
				if (primaryFile.yanked) {
					deps.console.log(`    ⚠️  YANKED${primaryFile.yanked_reason ? `: ${primaryFile.yanked_reason}` : ""}`);
				}
				if (primaryFile.upload_time_iso_8601) {
					const date = new Date(primaryFile.upload_time_iso_8601).toLocaleDateString();
					deps.console.log(`    Released: ${date}`);
				}
			});

			if (versions.length > 15) {
				deps.console.log(`  ... and ${versions.length - 15} more releases`);
			}
		}

		deps.console.log("");
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
		handleError(error, "", defaultDeps);
	});
}
