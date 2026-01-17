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
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));
	const username = positional[0];
	const token = options.get("token") || getTokenFromEnv();

	if (!username) {
		console.log(`Usage: npx tsx user.ts <username> [options]

Options:
  --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
  --no-cache     Bypass cache and fetch fresh data

Examples:
  npx tsx user.ts torvalds
  npx tsx user.ts facebook
  npx tsx user.ts sindresorhus`);
		process.exit(1);
	}

	const apiUrl = API.user(username);
	console.log(`Fetching user: ${username}`);

	try {
		const headers = getAuthHeaders(token);

		const data = await fetchWithCache<GitHubUser>({
			url: apiUrl,
			ttl: 3600, // 1 hour
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: `user-${username}`,
		});

		// Display user information
		console.log();
		const header = `${data.login}${data.name ? ` (${data.name})` : ""}`;
		console.log(header);
		console.log("-".repeat(header.length));

		if (data.bio) {
			console.log(`Bio: ${data.bio}`);
		}

		if (data.location) {
			console.log(`Location: ${data.location}`);
		}

		if (data.company) {
			console.log(`Company: ${data.company}`);
		}

		console.log("\nAccount:");
		console.log(`  Type: ${data.type === "User" ? "User" : "Organization"}`);
		console.log(`  Created: ${formatDate(data.created_at)}`);
		console.log(`  Updated: ${formatDate(data.updated_at)}`);
		if (data.hireable !== null && data.hireable !== undefined) {
			console.log(`  Hireable: ${data.hireable ? "Yes" : "No"}`);
		}

		console.log("\nStatistics:");
		console.log(`  Public repos: ${data.public_repos}`);
		console.log(`  Public gists: ${data.public_gists}`);
		console.log(`  Followers: ${formatNumber(data.followers)}`);
		console.log(`  Following: ${formatNumber(data.following)}`);

		console.log("\nLinks:");
		console.log(`  Profile: ${data.html_url}`);
		if (data.blog) {
			console.log(`  Blog: ${data.blog}`);
		}
		if (data.email) {
			console.log(`  Email: ${data.email}`);
		}
		console.log(`  Avatar: ${data.avatar_url}`);
		console.log();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Resource not found")) {
			console.log(`User "${username}" not found`);
		} else if (message.includes("Authentication/Authorization failed: 403")) {
			console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
		} else {
			console.error("Error:", message);
		}
		process.exit(1);
	}
};

main();
