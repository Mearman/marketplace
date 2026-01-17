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
	getCached,
	NpmSearchResponse,
	parseArgs,
	setCached,
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));
	const query = positional[0];
	const size = parseInt(options.get("size") || "20", 10);
	const from = parseInt(options.get("from") || "0", 10);

	if (!query) {
		console.log(`Usage: npx tsx search.ts <query> [options]

Options:
  --size=N    Number of results (default: 20, max: 250)
  --from=N    Offset for pagination (default: 0)
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx search.ts http
  npx tsx search.ts react --size=10
  npx tsx search.ts database --from=20`);
		process.exit(1);
	}

	const apiUrl = API.search(query, Math.min(size, 250), from);
	console.log(`Searching: "${query}"`);

	try {
		const noCache = flags.has("no-cache");
		const cacheKey = `${query}-${size}-${from}`;
		let data: NpmSearchResponse;

		if (noCache) {
			const response = await fetch(apiUrl);
			data = await response.json();
			await setCached(cacheKey, data, 3600); // 1 hour
		} else {
			const cached = await getCached<NpmSearchResponse>(cacheKey);
			if (cached === null) {
				const response = await fetch(apiUrl);
				data = await response.json();
				await setCached(cacheKey, data, 3600);
			} else {
				data = cached;
			}
		}

		if (data.objects.length === 0) {
			console.log(`No packages found for "${query}"`);
			process.exit(0);
		}

		console.log(`\nFound ${data.total.toLocaleString()} package(s) for "${query}"\n`);

		data.objects.forEach((result, index) => {
			const pkg = result.package;
			const score = result.score.final * 100;
			const quality = result.score.detail.quality * 100;
			const popularity = result.score.detail.popularity * 100;
			const maintenance = result.score.detail.maintenance * 100;

			console.log(`${from + index + 1}. ${pkg.name} (${pkg.version})`);
			if (pkg.description) {
				console.log(`   ${pkg.description}`);
			}
			console.log(
				`   Score: ${score.toFixed(0)}% (quality: ${quality.toFixed(0)}%, popularity: ${popularity.toFixed(0)}%, maintenance: ${maintenance.toFixed(0)}%)`
			);
			if (pkg.links?.npm) {
				console.log(`   ${pkg.links.npm}`);
			}
			console.log();
		});

		if (data.total > from + size) {
			console.log(`Showing ${from + 1}-${from + data.objects.length} of ${data.total.toLocaleString()} results`);
			console.log(`Use --from=${from + size} to see more results`);
		}
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
