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

import {
	buildGravatarUrl,
	fetchWithCache,
	GravatarDefault,
	GravatarUrlOptions,
	md5,
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
	writeFile: (path: string, data: Buffer) => Promise<void>;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	_email: string,
	_outputFile: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("\nError:", message);
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;
	const email = positional[0];
	const outputFile = positional[1];

	if (!email || !outputFile) {
		deps.console.log(`Usage: npx tsx download.ts <email> <output-file> [options]

Options:
  --size=N          Image size in pixels (default: 200, max: 2048)
  --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
  --rating=LEVEL    Rating level: g, pg, r, x (default: g)
  --no-cache        Bypass cache and fetch fresh data

Examples:
  npx tsx download.ts user@example.com avatar.jpg
  npx tsx download.ts user@example.com avatar.png --size=400
  npx tsx download.ts user@example.com avatar.jpg --default=identicon`);
		deps.process.exit(1);
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
			deps.console.error(`Error: Invalid default type. Must be one of: ${validDefaults.join(", ")}`);
			deps.process.exit(1);
		}
	}

	const rating = options.get("rating");
	if (rating) {
		const validRatings = ["g", "pg", "r", "x"];
		if (validRatings.includes(rating)) {
			urlOptions.rating = rating as "g" | "pg" | "r" | "x";
		} else {
			deps.console.error(`Error: Invalid rating level. Must be one of: ${validRatings.join(", ")}`);
			deps.process.exit(1);
		}
	}

	deps.console.log(`Email: ${email}`);
	deps.console.log(`Output: ${outputFile}`);
	deps.console.log(`Hash: ${md5(email)}`);

	try {
		const url = buildGravatarUrl(email, urlOptions);

		// Download image using fetchWithCache
		const buffer = await deps.fetchWithCache<ArrayBuffer>({
			url,
			bypassCache: flags.has("no-cache"),
			parseResponse: async (response) => response.arrayBuffer(),
		});

		// Write to file
		await deps.writeFile(outputFile, Buffer.from(buffer));

		deps.console.log();
		deps.console.log("✓ Downloaded successfully");
		deps.console.log(`  Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
		deps.console.log(`  File: ${outputFile}`);
		deps.console.log();
	} catch (error) {
		handleError(error, email, outputFile, deps);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
	writeFile: async (path: string, data: Buffer): Promise<void> => {
		const { writeFile: fsWriteFile } = await import("fs/promises");
		await fsWriteFile(path, data);
	},
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Error:", message);
		process.exit(1);
	});
}
