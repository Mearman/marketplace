#!/usr/bin/env npx tsx
/**
 * Get npm package name suggestions from NPMS.io
 * Usage: npx tsx suggest.ts <query> [options]
 *
 * Options:
 *   --size=N    Number of suggestions (default: 25, max: 250)
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	parseArgs,
	validateNpmsSuggestions,
	type ParsedArgs,
} from "./utils";

export interface Dependencies {
	fetchWithCache: typeof fetchWithCache;
	console: Console;
	process: NodeJS.Process;
}

export const handleError = (
	error: unknown,
	_query: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("Error:", message);
	deps.process.exit(1);
};

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;
	const query = positional[0];
	const size = Math.min(parseInt(options.get("size") || "25", 10), 250);

	if (!query) {
		deps.console.log(`Usage: npx tsx suggest.ts <query> [options]

Options:
  --size=N    Number of suggestions (default: 25, max: 250)
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx suggest.ts react
  npx tsx suggest.ts --size=10 express
  npx tsx suggest.ts @babel/core`);
		deps.process.exit(1);
	}

	if (query.length < 2) {
		deps.console.log("Error: Query must be at least 2 characters");
		deps.process.exit(1);
	}

	const apiUrl = API.suggestions(query);
	deps.console.log(`Searching for: "${query}"`);

	try {
		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 3600, // 1 hour
			cacheKey: `suggest-${query}-${size}`,
			bypassCache: flags.has("no-cache"),
		});
		const data = validateNpmsSuggestions(rawData);

		// Limit results to requested size
		const results = data.slice(0, size);

		if (results.length === 0) {
			deps.console.log(`\nNo suggestions found for "${query}"`);
			deps.process.exit(0);
		}

		deps.console.log();
		deps.console.log(`Suggestions for "${query}" (${results.length} result${results.length !== 1 ? "s" : ""})`);
		deps.console.log("-".repeat(query.length + 25));
		deps.console.log();

		// Show top 15 detailed results
		const showDetailed = Math.min(results.length, 15);
		results.slice(0, showDetailed).forEach((pkg, index) => {
			deps.console.log(`${index + 1}. ${pkg.name}`);
			deps.console.log(`   Score: ${pkg.score.toLocaleString()}`);
			deps.console.log(`   URL: https://www.npmjs.com/package/${pkg.name}`);
			if (index < showDetailed - 1) {
				deps.console.log();
			}
		});

		// Show condensed list for additional results
		if (results.length > 15) {
			deps.console.log();
			deps.console.log(`Top ${results.length} suggestions:`);
			deps.console.log(`  ${results.map((r) => r.name).join(", ")}`);
		}

		deps.console.log();
	} catch (error) {
		handleError(error, query, deps);
	}
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
