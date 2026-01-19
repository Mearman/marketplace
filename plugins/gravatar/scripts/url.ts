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
 */

import {
	buildGravatarUrl,
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
	console: Console;
	process: NodeJS.Process;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	_email: string,
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
	const email = positional[0];

	if (!email) {
		deps.console.log(`Usage: npx tsx url.ts <email> [options]

Options:
  --size=N          Image size in pixels (default: 80, max: 2048)
  --default=TYPE    Default image: mp, identicon, monsterid, wavatar, retro, robohash, blank
  --rating=LEVEL    Rating level: g, pg, r, x (default: g)
  --force-default   Force default image even if user has a Gravatar

Examples:
  npx tsx url.ts user@example.com
  npx tsx url.ts user@example.com --size=200
  npx tsx url.ts user@example.com --default=identicon
  npx tsx url.ts user@example.com --force-default --default=robohash`);
		deps.process.exit(1);
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

	if (flags.has("force-default")) {
		urlOptions.forceDefault = true;
	}

	deps.console.log(`Email: ${email}`);

	try {
		// Generate Gravatar URL (no caching needed - MD5 is trivial)
		const url = buildGravatarUrl(email, urlOptions);
		const hash = md5(email);

		deps.console.log(`Hash: ${hash}`);
		deps.console.log(`URL: ${url}`);

		// Show options
		const params: string[] = [];
		if (urlOptions.size) params.push(`size=${urlOptions.size}px`);
		if (urlOptions.default) params.push(`default=${urlOptions.default}`);
		if (urlOptions.rating) params.push(`rating=${urlOptions.rating}`);
		if (urlOptions.forceDefault) params.push("force-default");

		if (params.length > 0) {
			deps.console.log(`Options: ${params.join(", ")}`);
		}
	} catch (error) {
		handleError(error, email, deps);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
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
