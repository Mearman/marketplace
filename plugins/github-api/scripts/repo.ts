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
	getCached,
	getAuthHeaders,
	GitHubRepository,
	getTokenFromEnv,
	parseArgs,
	parseRepositoryUrl,
	setCached,
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
		const noCache = flags.has("no-cache");
		const cacheKey = `repo-${owner}-${repo}`;
		let data: GitHubRepository;

		const headers = getAuthHeaders(token);

		if (noCache) {
			const response = await fetch(apiUrl, { headers });
			if (!response.ok) {
				if (response.status === 404) {
					console.log(`Repository "${owner}/${repo}" not found`);
					process.exit(1);
				}
				if (response.status === 403) {
					console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
					process.exit(1);
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			data = await response.json();
			await setCached(cacheKey, data, 1800); // 30 minutes
		} else {
			const cached = await getCached<GitHubRepository>(cacheKey);
			if (cached === null) {
				const response = await fetch(apiUrl, { headers });
				if (!response.ok) {
					if (response.status === 404) {
						console.log(`Repository "${owner}/${repo}" not found`);
						process.exit(1);
					}
					if (response.status === 403) {
						console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
						process.exit(1);
					}
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				data = await response.json();
				await setCached(cacheKey, data, 1800);
			} else {
				data = cached;
			}
		}

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
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
