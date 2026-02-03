#!/usr/bin/env npx tsx
/**
 * Search npm registry for packages
 * Usage: npx tsx search.ts <query> [options]
 *
 * Options:
 *   --size=N    Number of results (default: 20, max: 250)
 *   --from=N    Offset for pagination (default: 0)
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	API,
	fetchWithCache,
	parseArgs,
	validateNpmSearchResponse,
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
	_query: string,
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
	const { flags, options, positional } = args;
	const query = positional[0];
	const size = parseInt(options.get("size") || "20", 10);
	const from = parseInt(options.get("from") || "0", 10);

	if (!query) {
		deps.console.log(`Usage: npx tsx search.ts <query> [options]

Options:
  --size=N    Number of results (default: 20, max: 250)
  --from=N    Offset for pagination (default: 0)
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx search.ts http
  npx tsx search.ts react --size=10
  npx tsx search.ts database --from=20`);
		deps.process.exit(1);
	}

	const apiUrl = API.search(query, Math.min(size, 250), from);
	deps.console.log(`Searching: "${query}"`);

	try {
		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 3600, // 1 hour
			cacheKey: `${query}-${size}-${from}`,
			bypassCache: flags.has("no-cache"),
		});
		const data = validateNpmSearchResponse(rawData);

		if (data.objects.length === 0) {
			deps.console.log(`No packages found for "${query}"`);
			deps.process.exit(0);
		}

		deps.console.log(`\nFound ${data.total.toLocaleString()} package(s) for "${query}"\n`);

		data.objects.forEach((result, index) => {
			const pkg = result.package;
			const score = result.score.final * 100;
			const quality = result.score.detail.quality * 100;
			const popularity = result.score.detail.popularity * 100;
			const maintenance = result.score.detail.maintenance * 100;

			deps.console.log(`${from + index + 1}. ${pkg.name} (${pkg.version})`);
			if (pkg.description) {
				deps.console.log(`   ${pkg.description}`);
			}
			deps.console.log(
				`   Score: ${score.toFixed(0)}% (quality: ${quality.toFixed(0)}%, popularity: ${popularity.toFixed(0)}%, maintenance: ${maintenance.toFixed(0)}%)`
			);
			if (pkg.links?.npm) {
				deps.console.log(`   ${pkg.links.npm}`);
			}
			deps.console.log();
		});

		if (data.total > from + size) {
			deps.console.log(`Showing ${from + 1}-${from + data.objects.length} of ${data.total.toLocaleString()} results`);
			deps.console.log(`Use --from=${from + size} to see more results`);
		}
	} catch (error) {
		handleError(error, query, deps);
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
