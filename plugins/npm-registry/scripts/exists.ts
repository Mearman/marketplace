#!/usr/bin/env npx tsx
/**
 * Check if an npm package exists
 * Usage: npx tsx exists.ts <package-name> [options]
 *
 * Options:
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	parseArgs,
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const packageName = positional[0];

	if (!packageName) {
		console.log(`Usage: npx tsx exists.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx exists.ts react
  npx tsx exists.ts @babel/core
  npx tsx exists.ts my-new-package`);
		process.exit(1);
	}

	const apiUrl = API.exists(packageName);
	console.log(`Checking: ${packageName}`);

	try {
		let exists: boolean;

		try {
			await fetchWithCache<{ exists: boolean; timestamp: number }>({
				url: apiUrl,
				ttl: 3600, // 1 hour
				cacheKey: `exists-${packageName}`,
				bypassCache: flags.has("no-cache"),
				fetchOptions: { method: "HEAD" },
				parseResponse: async () => ({ exists: true, timestamp: Date.now() }),
			});
			exists = true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes("Resource not found")) {
				exists = false;
			} else {
				throw error;
			}
		}

		console.log();
		if (exists) {
			console.log(`✓ Package "${packageName}" exists`);
			console.log(`  URL: https://www.npmjs.com/package/${packageName}`);
			console.log("  Published: Yes");
		} else {
			console.log(`✗ Package "${packageName}" does not exist`);
			console.log("  The name is available for use");
		}
		console.log();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
