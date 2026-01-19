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
		deps.console.log(`Package "${packageName}" not found`);
	} else {
		deps.console.error("Error:", message);
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
		deps.console.log(`Usage: npx tsx info.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx info.ts react
  npx tsx info.ts @babel/core
  npx tsx info.ts express`);
		deps.process.exit(1);
	}

	const apiUrl = API.package(packageName);
	deps.console.log(`Fetching: ${packageName}`);

	try {
		const data = await deps.fetchWithCache<NpmPackage>({
			url: apiUrl,
			ttl: 21600, // 6 hours
			cacheKey: packageName,
			bypassCache: flags.has("no-cache"),
		});

		// Display package information
		deps.console.log();
		deps.console.log(`${data.name}`);
		deps.console.log("-".repeat(data.name.length));

		if (data.description) {
			deps.console.log(`Description: ${data.description}`);
		}

		const latestVersion = data["dist-tags"]?.latest || Object.keys(data.versions || {}).pop();
		deps.console.log(`Latest: ${latestVersion}`);

		if (data.license) {
			deps.console.log(`License: ${data.license}`);
		}

		if (data.homepage) {
			deps.console.log(`Homepage: ${data.homepage}`);
		}

		const repoUrl = parseRepositoryUrl(data.repository);
		if (repoUrl) {
			deps.console.log(`Repository: ${repoUrl}`);
		}

		if (data.bugs?.url) {
			deps.console.log(`Bugs: ${data.bugs.url}`);
		}

		// Author
		if (data.author) {
			const author = typeof data.author === "string" ? data.author : data.author.name || data.author.email || "";
			if (author) {
				deps.console.log(`Author: ${author}`);
			}
		}

		// Keywords
		if (data.keywords && data.keywords.length > 0) {
			deps.console.log(`Keywords: ${data.keywords.slice(0, 10).join(", ")}`);
			if (data.keywords.length > 10) {
				deps.console.log(`  (and ${data.keywords.length - 10} more)`);
			}
		}

		// Maintainers
		if (data.maintainers && data.maintainers.length > 0) {
			deps.console.log("\nMaintainers:");
			data.maintainers.slice(0, 5).forEach((m) => {
				const name = m.name || m.email || "unknown";
				deps.console.log(`  - ${name}`);
			});
			if (data.maintainers.length > 5) {
				deps.console.log(`  (and ${data.maintainers.length - 5} more)`);
			}
		}

		// Recent versions
		if (data.time) {
			const versions = Object.entries(data.time)
				.filter(([key]) => key !== "created" && key !== "modified")
				.sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
				.slice(0, 5);

			if (versions.length > 0) {
				deps.console.log("\nVersions (last 5):");
				versions.forEach(([version, date]) => {
					const d = new Date(date as string);
					deps.console.log(`  ${version} - Published ${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`);
				});
			}
		}

		// Dependencies for latest version
		if (latestVersion && data.versions?.[latestVersion]) {
			const versionData = data.versions[latestVersion];
			const depsCount = versionData.dependencies;

			if (depsCount && Object.keys(depsCount).length > 0) {
				deps.console.log("\nDependencies (latest):");
				Object.entries(depsCount)
					.slice(0, 10)
					.forEach(([name, range]) => {
						deps.console.log(`  ${name} ${range}`);
					});
				if (Object.keys(depsCount).length > 10) {
					deps.console.log(`  (and ${Object.keys(depsCount).length - 10} more)`);
				}
			}
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
