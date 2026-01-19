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
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("Error:", message);
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;
	const packageName = positional[0];

	if (!packageName) {
		deps.console.log(`Usage: npx tsx exists.ts <package-name> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx exists.ts react
  npx tsx exists.ts @babel/core
  npx tsx exists.ts my-new-package`);
		deps.process.exit(1);
	}

	const apiUrl = API.exists(packageName);
	deps.console.log(`Checking: ${packageName}`);

	try {
		let exists: boolean;

		try {
			await deps.fetchWithCache<{ exists: boolean; timestamp: number }>({
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

		deps.console.log();
		if (exists) {
			deps.console.log(`✓ Package "${packageName}" exists`);
			deps.console.log(`  URL: https://www.npmjs.com/package/${packageName}`);
			deps.console.log("  Published: Yes");
		} else {
			deps.console.log(`✗ Package "${packageName}" does not exist`);
			deps.console.log("  The name is available for use");
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
