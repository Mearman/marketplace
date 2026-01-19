#!/usr/bin/env npx tsx
/**
 * Get GitHub user profile
 * Usage: npx tsx user.ts <username> [options]
 *
 * Options:
 *   --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
 *   --no-cache     Bypass cache and fetch fresh data
 */

import {
	API,
	formatDate,
	formatNumber,
	fetchWithCache,
	getAuthHeaders,
	GitHubUser,
	getTokenFromEnv,
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
	getAuthHeaders: (token?: string) => Record<string, string>;
	getTokenFromEnv: () => string | undefined;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	username: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("Resource not found")) {
		deps.console.log(`User "${username}" not found`);
	} else if (message.includes("Authentication/Authorization failed: 403")) {
		deps.console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
	} else {
		deps.console.error("Error:", message);
	}
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;
	const username = positional[0];
	const token = options.get("token") || deps.getTokenFromEnv();

	if (!username) {
		deps.console.log(`Usage: npx tsx user.ts <username> [options]

Options:
  --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
  --no-cache     Bypass cache and fetch fresh data

Examples:
  npx tsx user.ts torvalds
  npx tsx user.ts facebook
  npx tsx user.ts sindresorhus`);
		deps.process.exit(1);
	}

	const apiUrl = API.user(username);
	deps.console.log(`Fetching user: ${username}`);

	try {
		const headers = deps.getAuthHeaders(token);

		const data = await deps.fetchWithCache<GitHubUser>({
			url: apiUrl,
			ttl: 3600, // 1 hour
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: `user-${username}`,
		});

		// Display user information
		deps.console.log();
		const header = `${data.login}${data.name ? ` (${data.name})` : ""}`;
		deps.console.log(header);
		deps.console.log("-".repeat(header.length));

		if (data.bio) {
			deps.console.log(`Bio: ${data.bio}`);
		}

		if (data.location) {
			deps.console.log(`Location: ${data.location}`);
		}

		if (data.company) {
			deps.console.log(`Company: ${data.company}`);
		}

		deps.console.log("\nAccount:");
		deps.console.log(`  Type: ${data.type === "User" ? "User" : "Organization"}`);
		deps.console.log(`  Created: ${formatDate(data.created_at)}`);
		deps.console.log(`  Updated: ${formatDate(data.updated_at)}`);
		if (data.hireable !== null && data.hireable !== undefined) {
			deps.console.log(`  Hireable: ${data.hireable ? "Yes" : "No"}`);
		}

		deps.console.log("\nStatistics:");
		deps.console.log(`  Public repos: ${data.public_repos}`);
		deps.console.log(`  Public gists: ${data.public_gists}`);
		deps.console.log(`  Followers: ${formatNumber(data.followers)}`);
		deps.console.log(`  Following: ${formatNumber(data.following)}`);

		deps.console.log("\nLinks:");
		deps.console.log(`  Profile: ${data.html_url}`);
		if (data.blog) {
			deps.console.log(`  Blog: ${data.blog}`);
		}
		if (data.email) {
			deps.console.log(`  Email: ${data.email}`);
		}
		deps.console.log(`  Avatar: ${data.avatar_url}`);
		deps.console.log();
	} catch (error) {
		handleError(error, username, deps);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	fetchWithCache,
	console,
	process,
	getAuthHeaders,
	getTokenFromEnv,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Error:", message);
		process.exit(1);
	});
}
