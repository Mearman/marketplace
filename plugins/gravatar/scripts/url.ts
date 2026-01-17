#!/usr/bin/env npx tsx
/**
 * Generate a Gravatar URL from an email address
 * Usage: npx tsx url.ts <email> [options]
 *
 * Options:
 *   --size=N          Image size in pixels (default: 80, max: 2048)
 *   --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
 *   --rating=LEVEL    Rating level: g, pg, r, x (default: g)
 *   --force-default   Force default image even if user has a Gravatar
 *   --no-cache        Bypass cache
 */

import {
  buildGravatarUrl,
  getCached,
  getCacheKey,
  GravatarUrlOptions,
  parseArgs,
  setCached,
} from "./utils.js";

const main = async () => {
  const { flags, options, positional } = parseArgs(process.argv.slice(2));
  const email = positional[0];

  if (!email) {
    console.log(`Usage: npx tsx url.ts <email> [options]

Options:
  --size=N          Image size in pixels (default: 80, max: 2048)
  --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
  --rating=LEVEL    Rating level: g, pg, r, x (default: g)
  --force-default   Force default image even if user has a Gravatar
  --no-cache        Bypass cache

Examples:
  npx tsx url.ts user@example.com
  npx tsx url.ts user@example.com --size=200
  npx tsx url.ts user@example.com --default=identicon
  npx tsx url.ts user@example.com --force-default --default=robohash`);
    process.exit(1);
  }

  // Parse options
  const urlOptions: GravatarUrlOptions = {};

  const size = parseInt(options.get("size") || "80", 10);
  if (size > 0 && size <= 2048) {
    urlOptions.size = size;
  }

  const defaultType = options.get("default");
  if (defaultType) {
    const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];
    if (validDefaults.includes(defaultType)) {
      urlOptions.default = defaultType as any;
    } else {
      console.error(`Error: Invalid default type. Must be one of: ${validDefaults.join(", ")}`);
      process.exit(1);
    }
  }

  const rating = options.get("rating");
  if (rating) {
    const validRatings = ["g", "pg", "r", "x"];
    if (validRatings.includes(rating)) {
      urlOptions.rating = rating as any;
    } else {
      console.error(`Error: Invalid rating level. Must be one of: ${validRatings.join(", ")}`);
      process.exit(1);
    }
  }

  if (flags.has("force-default")) {
    urlOptions.forceDefault = true;
  }

  console.log(`Email: ${email}`);

  try {
    const noCache = flags.has("no-cache");
    const cacheKey = getCacheKey(email, urlOptions);
    let url: string;

    if (noCache) {
      url = buildGravatarUrl(email, urlOptions);
      await setCached(cacheKey, url, 86400); // 24 hours
    } else {
      const cached = await getCached<string>(cacheKey);
      if (cached === null) {
        url = buildGravatarUrl(email, urlOptions);
        await setCached(cacheKey, url, 86400);
      } else {
        url = cached;
      }
    }

    // Parse URL to show hash
    const urlObj = new URL(url);
    const hash = urlObj.pathname.split("/").pop() || "";

    console.log(`Hash: ${hash}`);
    console.log(`URL: ${url}`);

    // Show options
    const params: string[] = [];
    if (urlOptions.size) params.push(`size=${urlOptions.size}px`);
    if (urlOptions.default) params.push(`default=${urlOptions.default}`);
    if (urlOptions.rating) params.push(`rating=${urlOptions.rating}`);
    if (urlOptions.forceDefault) params.push("force-default");

    if (params.length > 0) {
      console.log(`Options: ${params.join(", ")}`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
