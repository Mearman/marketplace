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
} from "./utils";

const main = async () => {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const email = positional[0];

	if (!email) {
		console.log(`Usage: npx tsx check.ts <email> [options]

Options:
  --no-cache  Bypass cache and fetch fresh data

Examples:
  npx tsx check.ts user@example.com
  npx tsx check.ts beau@dentedreality.com.au`);
		process.exit(1);
	}

	console.log(`Checking: ${email}`);

	try {
		const url = buildGravatarUrl(email, { default: "404" });
		const hash = md5(email);

		// Use fetchWithCache with HEAD request to check if gravatar exists
		// Using d=404 means Gravatar returns 404 if no image exists
		let exists = false;
		try {
			await fetchWithCache<boolean>({
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

		console.log();
		if (exists) {
			console.log("✓ Gravatar exists");
			console.log(`  Hash: ${hash}`);
			console.log(`  URL: ${buildGravatarUrl(email)}`);
			console.log(`  Profile: https://www.gravatar.com/${hash}`);
		} else {
			console.log("✗ No Gravatar found");
			console.log(`  Hash: ${hash}`);
			console.log("  This email does not have a Gravatar image.");
			console.log("  A default image will be shown.");
		}
		console.log();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
