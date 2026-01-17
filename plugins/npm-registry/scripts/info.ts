#!/usr/bin/env npx tsx
/**
 * Get npm package metadata
 * Usage: npx tsx info.ts <package-name> [options]
 *
 * Options:
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	NpmPackage,
	parseArgs,
	parseRepositoryUrl,
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const packageName = positional[0];

	if (!packageName) {
		console.log(`Usage: npx tsx info.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx info.ts react
  npx tsx info.ts @babel/core
  npx tsx info.ts express`);
		process.exit(1);
	}

	const apiUrl = API.package(packageName);
	console.log(`Fetching: ${packageName}`);

	try {
		const data = await fetchWithCache<NpmPackage>({
			url: apiUrl,
			ttl: 21600, // 6 hours
			cacheKey: packageName,
			bypassCache: flags.has("no-cache"),
		});

		// Display package information
		console.log();
		console.log(`${data.name}`);
		console.log("-".repeat(data.name.length));

		if (data.description) {
			console.log(`Description: ${data.description}`);
		}

		const latestVersion = data["dist-tags"]?.latest || Object.keys(data.versions || {}).pop();
		console.log(`Latest: ${latestVersion}`);

		if (data.license) {
			console.log(`License: ${data.license}`);
		}

		if (data.homepage) {
			console.log(`Homepage: ${data.homepage}`);
		}

		const repoUrl = parseRepositoryUrl(data.repository);
		if (repoUrl) {
			console.log(`Repository: ${repoUrl}`);
		}

		if (data.bugs?.url) {
			console.log(`Bugs: ${data.bugs.url}`);
		}

		// Author
		if (data.author) {
			const author = typeof data.author === "string" ? data.author : data.author.name || data.author.email || "";
			if (author) {
				console.log(`Author: ${author}`);
			}
		}

		// Keywords
		if (data.keywords && data.keywords.length > 0) {
			console.log(`Keywords: ${data.keywords.slice(0, 10).join(", ")}`);
			if (data.keywords.length > 10) {
				console.log(`  (and ${data.keywords.length - 10} more)`);
			}
		}

		// Maintainers
		if (data.maintainers && data.maintainers.length > 0) {
			console.log("\nMaintainers:");
			data.maintainers.slice(0, 5).forEach((m) => {
				const name = m.name || m.email || "unknown";
				console.log(`  - ${name}`);
			});
			if (data.maintainers.length > 5) {
				console.log(`  (and ${data.maintainers.length - 5} more)`);
			}
		}

		// Recent versions
		if (data.time) {
			const versions = Object.entries(data.time)
				.filter(([key]) => key !== "created" && key !== "modified")
				.sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
				.slice(0, 5);

			if (versions.length > 0) {
				console.log("\nVersions (last 5):");
				versions.forEach(([version, date]) => {
					const d = new Date(date as string);
					console.log(`  ${version} - Published ${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`);
				});
			}
		}

		// Dependencies for latest version
		if (latestVersion && data.versions?.[latestVersion]) {
			const versionData = data.versions[latestVersion];
			const deps = versionData.dependencies;

			if (deps && Object.keys(deps).length > 0) {
				console.log("\nDependencies (latest):");
				Object.entries(deps)
					.slice(0, 10)
					.forEach(([name, range]) => {
						console.log(`  ${name} ${range}`);
					});
				if (Object.keys(deps).length > 10) {
					console.log(`  (and ${Object.keys(deps).length - 10} more)`);
				}
			}
		}

		console.log();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Resource not found")) {
			console.log(`Package "${packageName}" not found`);
		} else {
			console.error("Error:", message);
		}
		process.exit(1);
	}
};

main();
