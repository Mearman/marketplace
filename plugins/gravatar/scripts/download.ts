#!/usr/bin/env npx tsx
/**
 * Download a Gravatar image
 * Usage: npx tsx download.ts <email> <output-file> [options]
 *
 * Options:
 *   --size=N          Image size in pixels (default: 200, max: 2048)
 *   --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
 *   --rating=LEVEL    Rating level: g, pg, r, x (default: g)
 *   --no-cache        Bypass cache and fetch fresh data
 */

import { writeFile } from "fs/promises";
import {
	buildGravatarUrl,
	fetchWithCache,
	GravatarDefault,
	GravatarUrlOptions,
	md5,
	parseArgs,
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));
	const email = positional[0];
	const outputFile = positional[1];

	if (!email || !outputFile) {
		console.log(`Usage: npx tsx download.ts <email> <output-file> [options]

Options:
  --size=N          Image size in pixels (default: 200, max: 2048)
  --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
  --rating=LEVEL    Rating level: g, pg, r, x (default: g)
  --no-cache        Bypass cache and fetch fresh data

Examples:
  npx tsx download.ts user@example.com avatar.jpg
  npx tsx download.ts user@example.com avatar.png --size=400
  npx tsx download.ts user@example.com avatar.jpg --default=identicon`);
		process.exit(1);
	}

	// Parse options
	const urlOptions: GravatarUrlOptions = {};

	const size = parseInt(options.get("size") || "200", 10);
	if (size > 0 && size <= 2048) {
		urlOptions.size = size;
	}

	const defaultType = options.get("default");
	if (defaultType) {
		const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];
		if (validDefaults.includes(defaultType)) {
			urlOptions.default = defaultType as GravatarDefault;
		} else {
			console.error(`Error: Invalid default type. Must be one of: ${validDefaults.join(", ")}`);
			process.exit(1);
		}
	}

	const rating = options.get("rating");
	if (rating) {
		const validRatings = ["g", "pg", "r", "x"];
		if (validRatings.includes(rating)) {
			urlOptions.rating = rating as "g" | "pg" | "r" | "x";
		} else {
			console.error(`Error: Invalid rating level. Must be one of: ${validRatings.join(", ")}`);
			process.exit(1);
		}
	}

	console.log(`Email: ${email}`);
	console.log(`Output: ${outputFile}`);
	console.log(`Hash: ${md5(email)}`);

	try {
		const url = buildGravatarUrl(email, urlOptions);

		// Download image using fetchWithCache
		const buffer = await fetchWithCache<ArrayBuffer>({
			url,
			bypassCache: flags.has("no-cache"),
			parseResponse: async (response) => response.arrayBuffer(),
		});

		// Write to file
		await writeFile(outputFile, Buffer.from(buffer));

		console.log();
		console.log("✓ Downloaded successfully");
		console.log(`  Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
		console.log(`  File: ${outputFile}`);
		console.log();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	}
};

main();
