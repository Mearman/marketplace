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
  getCached,
  parseArgs,
  setCached,
} from "./utils.js";

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
    const noCache = flags.has("no-cache");
    const cacheKey = `exists-${packageName}`;
    let exists: boolean;

    if (noCache) {
      const response = await fetch(apiUrl, { method: "HEAD" });
      exists = response.ok;
      // Cache the result for 1 hour
      await setCached(cacheKey, { exists, timestamp: Date.now() }, 3600);
    } else {
      const cached = await getCached<{ exists: boolean; timestamp: number }>(cacheKey);
      if (cached === null) {
        const response = await fetch(apiUrl, { method: "HEAD" });
        exists = response.ok;
        await setCached(cacheKey, { exists, timestamp: Date.now() }, 3600);
      } else {
        exists = cached.exists;
      }
    }

    console.log();
    if (exists) {
      console.log(`✓ Package "${packageName}" exists`);
      console.log(`  URL: https://www.npmjs.com/package/${packageName}`);
      console.log(`  Published: Yes`);
    } else {
      console.log(`✗ Package "${packageName}" does not exist`);
      console.log(`  The name is available for use`);
    }
    console.log();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
