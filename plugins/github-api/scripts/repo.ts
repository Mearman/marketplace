#!/usr/bin/env npx tsx
/**
 * Get GitHub repository information
 * Usage: npx tsx repo.ts <repository> [options]
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
	GitHubRepository,
	getTokenFromEnv,
	parseArgs,
	parseRepositoryUrl,
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));
	const repoInput = positional[0];
	const token = options.get("token") || getTokenFromEnv();

	if (!repoInput) {
		console.log(`Usage: npx tsx repo.ts <repository> [options]

Options:
  --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
  --no-cache     Bypass cache and fetch fresh data

Repository formats:
  owner/repo
  https://github.com/owner/repo
  git+https://github.com/owner/repo
  git@github.com:owner/repo

Examples:
  npx tsx repo.ts facebook/react
  npx tsx repo.ts vercel/next.js
  npx tsx repo.ts https://github.com/nodejs/node`);
		process.exit(1);
	}

	// Parse repository URL
	const repoInfo = parseRepositoryUrl(repoInput);
	if (!repoInfo) {
		console.error(`Error: Could not parse repository URL: ${repoInput}`);
		console.error("Valid formats: \"owner/repo\", \"https://github.com/owner/repo\", etc.");
		process.exit(1);
	}

	const { owner, repo } = repoInfo;
	const apiUrl = API.repo(owner, repo);
	console.log(`Fetching: ${owner}/${repo}`);

	try {
		const headers = getAuthHeaders(token);

		const data = await fetchWithCache<GitHubRepository>({
			url: apiUrl,
			ttl: 1800, // 30 minutes
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: `repo-${owner}-${repo}`,
		});

		// Display repository information
		console.log();
		console.log(`${data.full_name}`);
		console.log("-".repeat(data.full_name.length));

		if (data.description) {
			console.log(`Description: ${data.description}`);
		}

		console.log(`Created: ${formatDate(data.created_at)}`);
		console.log(`Updated: ${formatDate(data.updated_at)}`);
		console.log(`Pushed: ${formatDate(data.pushed_at)}`);

		console.log("\nStatistics:");
		console.log(`  Stars: ${formatNumber(data.stargazers_count)}`);
		console.log(`  Forks: ${formatNumber(data.forks_count)}`);
		console.log(`  Open issues: ${formatNumber(data.open_issues_count)}`);
		console.log(`  Watchers: ${formatNumber(data.watchers_count)}`);

		console.log("\nDetails:");
		if (data.language) {
			console.log(`  Language: ${data.language}`);
		}
		if (data.license) {
			console.log(`  License: ${data.license.name}`);
		}
		console.log(`  Private: ${data.private ? "Yes" : "No"}`);
		console.log(`  Fork: ${data.fork ? "Yes" : "No"}`);
		console.log(`  Default branch: ${data.default_branch}`);

		console.log("\nFeatures:");
		console.log(`  Issues: ${data.has_issues ? "Enabled" : "Disabled"}`);
		console.log(`  Projects: ${data.has_projects ? "Enabled" : "Disabled"}`);
		console.log(`  Wiki: ${data.has_wiki ? "Enabled" : "Disabled"}`);
		console.log(`  Pages: ${data.has_pages ? "Enabled" : "Disabled"}`);

		if (data.topics && data.topics.length > 0) {
			console.log(`\nTopics: ${data.topics.slice(0, 10).join(", ")}`);
			if (data.topics.length > 10) {
				console.log(`  (and ${data.topics.length - 10} more)`);
			}
		}

		if (data.homepage) {
			console.log(`\nHomepage: ${data.homepage}`);
		}

		console.log(`\nRepository: https://github.com/${data.full_name}`);
		console.log();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Resource not found")) {
			console.log(`Repository "${owner}/${repo}" not found`);
		} else if (message.includes("Authentication/Authorization failed: 403")) {
			console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
		} else {
			console.error("Error:", message);
		}
		process.exit(1);
	}
};

main();
