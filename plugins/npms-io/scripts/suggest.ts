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
  getCached,
  NpmsSuggestion,
  parseArgs,
  setCached,
} from "./utils.js";

const main = async () => {
  const { flags, options, positional } = parseArgs(process.argv.slice(2));
  const query = positional[0];
  const size = Math.min(parseInt(options.get("size") || "25", 10), 250);

  if (!query) {
    console.log(`Usage: npx tsx suggest.ts <query> [options]

Options:
  --size=N    Number of suggestions (default: 25, max: 250)
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx suggest.ts react
  npx tsx suggest.ts --size=10 express
  npx tsx suggest.ts @babel/core`);
    process.exit(1);
  }

  if (query.length < 2) {
    console.log("Error: Query must be at least 2 characters");
    process.exit(1);
  }

  const apiUrl = API.suggestions(query);
  console.log(`Searching for: "${query}"`);

  try {
    const noCache = flags.has("no-cache");
    const cacheKey = `suggest-${query}-${size}`;
    let data: NpmsSuggestion[];

    if (noCache) {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      data = await response.json();
      await setCached(cacheKey, data, 3600); // 1 hour
    } else {
      const cached = await getCached<NpmsSuggestion[]>(cacheKey);
      if (cached === null) {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
        await setCached(cacheKey, data, 3600);
      } else {
        data = cached;
      }
    }

    // Limit results to requested size
    const results = data.slice(0, size);

    if (results.length === 0) {
      console.log(`\nNo suggestions found for "${query}"`);
      process.exit(0);
    }

    console.log();
    console.log(`Suggestions for "${query}" (${results.length} result${results.length !== 1 ? "s" : ""})`);
    console.log("-".repeat(query.length + 25));
    console.log();

    // Show top 15 detailed results
    const showDetailed = Math.min(results.length, 15);
    results.slice(0, showDetailed).forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   Score: ${pkg.score.toLocaleString()}`);
      console.log(`   URL: https://www.npmjs.com/package/${pkg.name}`);
      if (index < showDetailed - 1) {
        console.log();
      }
    });

    // Show condensed list for additional results
    if (results.length > 15) {
      console.log();
      console.log(`Top ${results.length} suggestions:`);
      console.log(`  ${results.map((r) => r.name).join(", ")}`);
    }

    console.log();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
