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
	PyPIFile,
	PyPIPackageInfo,
	compareVersions,
	extractDomain,
	fetchWithCache,
	formatBytes,
	formatClassifier,
	formatPythonRequirement,
	getFileType,
	getMainClassifiers,
	parseArgs,
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const packageName = positional[0];

	if (!packageName) {
		console.log(`Usage: npx tsx info.ts <package-name> [options]`);
		console.log(`\nOptions:`);
		console.log(`  --no-cache     Bypass cache and fetch fresh data from PyPI`);
		console.log(`  --releases     Show detailed release history`);
		console.log(`  --files        Show distribution files for the latest release`);
		process.exit(1);
	}

	const apiUrl = API.package(packageName);

	try {
		console.log(`Fetching: ${packageName}`);

		// Fetch with cache - critical for performance
		const data = await fetchWithCache<PyPIPackageInfo>({
			url: apiUrl,
			ttl: 21600, // 6 hours
			bypassCache: flags.has("no-cache"),
		});

		const info = data.info;

		// Display package name and basic info
		console.log(`\n${info.name}`);
		console.log("=".repeat(50));

		console.log(`Latest Version: ${info.version}`);
		if (info.license) console.log(`License: ${info.license}`);
		if (info.author) console.log(`Author: ${info.author}`);
		if (info.maintainer) console.log(`Maintainer: ${info.maintainer}`);

		// Display summary
		if (info.summary) {
			console.log(`\nSummary:`);
			console.log(info.summary);
		}

		// Display full description if available
		if (info.description && info.description.length > 200) {
			console.log(`\nDescription:`);
			const lines = info.description.split("\n").slice(0, 5).join("\n");
			console.log(lines);
			if (info.description.split("\n").length > 5) {
				console.log("...");
			}
		}

		// Display project URLs
		if (info.project_urls && Object.keys(info.project_urls).length > 0) {
			console.log(`\nProject URLs:`);
			Object.entries(info.project_urls).forEach(([label, url]) => {
				const domain = extractDomain(url);
				console.log(`  ${label}: ${url}`);
			});
		}

		// Display Python requirement
		console.log(`\nPython Requirement: ${formatPythonRequirement(info.requires_python)}`);

		// Display keywords
		if (info.keywords) {
			console.log(`\nKeywords: ${info.keywords}`);
		}

		// Display classifiers
		if (info.classifiers && info.classifiers.length > 0) {
			const mainClassifiers = getMainClassifiers(info.classifiers);
			if (mainClassifiers.length > 0) {
				console.log(`\nClassifiers:`);
				mainClassifiers.slice(0, 8).forEach((classifier) => {
					console.log(`  - ${formatClassifier(classifier)}`);
				});
				if (mainClassifiers.length > 8) {
					console.log(`  ... and ${mainClassifiers.length - 8} more`);
				}
			}
		}

		// Display latest release files
		if (flags.has("files") && data.urls && data.urls.length > 0) {
			console.log(`\nLatest Release Files (${data.urls.length} total):`);
			data.urls.slice(0, 10).forEach((file: PyPIFile) => {
				const size = file.size ? formatBytes(file.size) : "unknown";
				const fileType = getFileType(file.filename);
				console.log(`  ${file.filename} [${fileType}] - ${size}`);
				if (file.yanked) {
					console.log(`    ⚠️  YANKED${file.yanked_reason ? `: ${file.yanked_reason}` : ""}`);
				}
			});
			if (data.urls.length > 10) {
				console.log(`  ... and ${data.urls.length - 10} more files`);
			}
		}

		// Display release history
		if (flags.has("releases")) {
			const versions = Object.keys(data.releases).sort(compareVersions).reverse();
			console.log(`\nRelease History (${versions.length} total releases):`);

			versions.slice(0, 15).forEach((version) => {
				const files = data.releases[version];
				const primaryFile = files[0];
				const hasWheel = files.some((f) => f.filename.endsWith(".whl"));
				const hasSource = files.some((f) => f.filename.endsWith(".tar.gz"));
				const fileTypes = [hasWheel ? "wheel" : "", hasSource ? "source" : ""].filter(Boolean).join(", ");

				console.log(`  ${version} (${fileTypes})`);
				if (primaryFile.yanked) {
					console.log(`    ⚠️  YANKED${primaryFile.yanked_reason ? `: ${primaryFile.yanked_reason}` : ""}`);
				}
				if (primaryFile.upload_time_iso_8601) {
					const date = new Date(primaryFile.upload_time_iso_8601).toLocaleDateString();
					console.log(`    Released: ${date}`);
				}
			});

			if (versions.length > 15) {
				console.log(`  ... and ${versions.length - 15} more releases`);
			}
		}

		console.log("");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		// Check for specific error cases
		if (message.includes("404")) {
			console.error(`Error: Package '${packageName}' not found on PyPI`);
			process.exit(1);
		}

		if (message.includes("Network")) {
			console.error(`Error: Network timeout. Try again or use --no-cache to force a fresh request`);
			process.exit(1);
		}

		console.error("Error:", message);
		process.exit(1);
	}
};

main();
