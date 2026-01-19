#!/usr/bin/env npx tsx
/**
 * Check if a Gravatar exists for an email address
 * Usage: npx tsx check.ts <email> [options]
 *
 * Options:
 *   --no-cache  Bypass cache and fetch fresh data
 */

import {
	buildGravatarUrl,
	fetchWithCache,
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
	deps.console.error("\nError:", message);
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, positional } = args;
	const email = positional[0];

	if (!email) {
		deps.console.log(`Usage: npx tsx check.ts <email> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx check.ts user@example.com
  npx tsx check.ts beau@dentedreality.com.au`);
		deps.process.exit(1);
	}

	deps.console.log(`Checking: ${email}`);

	try {
		const url = buildGravatarUrl(email, { default: "404" });
		const hash = md5(email);

		// Use fetchWithCache with HEAD request to check if gravatar exists
		// Using d=404 means Gravatar returns 404 if no image exists
		let exists = false;
		try {
			await deps.fetchWithCache<boolean>({
				url,
				bypassCache: flags.has("no-cache"),
				fetchOptions: {
					method: "HEAD",
				},
				parseResponse: async (response) => response.ok,
			});
			exists = true;
		} catch (error) {
			// 404 error means no gravatar exists - this is expected
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes("Resource not found")) {
				throw error; // Re-throw if it's not a 404 error
			}
		}

		deps.console.log();
		if (exists) {
			deps.console.log("✓ Gravatar exists");
			deps.console.log(`  Hash: ${hash}`);
			deps.console.log(`  URL: ${buildGravatarUrl(email)}`);
			deps.console.log(`  Profile: https://www.gravatar.com/${hash}`);
		} else {
			deps.console.log("✗ No Gravatar found");
			deps.console.log(`  Hash: ${hash}`);
			deps.console.log("  This email does not have a Gravatar image.");
			deps.console.log("  A default image will be shown.");
		}
		deps.console.log();
	} catch (error) {
		handleError(error, email, deps);
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
