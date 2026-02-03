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
	getTokenFromEnv,
	parseArgs,
	parseRepositoryUrl,
	validateGitHubRepository,
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
	owner: string,
	repo: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("Resource not found")) {
		deps.console.log(`Repository "${owner}/${repo}" not found`);
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
	const repoInput = positional[0];
	const token = options.get("token") || deps.getTokenFromEnv();

	if (!repoInput) {
		deps.console.log(`Usage: npx tsx repo.ts <repository> [options]

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
		deps.process.exit(1);
	}

	// Parse repository URL
	const repoInfo = parseRepositoryUrl(repoInput);
	if (!repoInfo) {
		deps.console.error(`Error: Could not parse repository URL: ${repoInput}`);
		deps.console.error("Valid formats: \"owner/repo\", \"https://github.com/owner/repo\", etc.");
		deps.process.exit(1);
	}

	const { owner, repo } = repoInfo;
	const apiUrl = API.repo(owner, repo);
	deps.console.log(`Fetching: ${owner}/${repo}`);

	try {
		const headers = deps.getAuthHeaders(token);

		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 1800, // 30 minutes
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: `repo-${owner}-${repo}`,
		});
		const data = validateGitHubRepository(rawData);

		// Display repository information
		deps.console.log();
		deps.console.log(data.full_name);
		deps.console.log("-".repeat(data.full_name.length));

		if (data.description) {
			deps.console.log(`Description: ${data.description}`);
		}

		deps.console.log(`Created: ${formatDate(data.created_at)}`);
		deps.console.log(`Updated: ${formatDate(data.updated_at)}`);
		deps.console.log(`Pushed: ${formatDate(data.pushed_at)}`);

		deps.console.log("\nStatistics:");
		deps.console.log(`  Stars: ${formatNumber(data.stargazers_count)}`);
		deps.console.log(`  Forks: ${formatNumber(data.forks_count)}`);
		deps.console.log(`  Open issues: ${formatNumber(data.open_issues_count)}`);
		deps.console.log(`  Watchers: ${formatNumber(data.watchers_count)}`);

		deps.console.log("\nDetails:");
		if (data.language) {
			deps.console.log(`  Language: ${data.language}`);
		}
		if (data.license) {
			deps.console.log(`  License: ${data.license.name}`);
		}
		deps.console.log(`  Private: ${data.private ? "Yes" : "No"}`);
		deps.console.log(`  Fork: ${data.fork ? "Yes" : "No"}`);
		deps.console.log(`  Default branch: ${data.default_branch}`);

		deps.console.log("\nFeatures:");
		deps.console.log(`  Issues: ${data.has_issues ? "Enabled" : "Disabled"}`);
		deps.console.log(`  Projects: ${data.has_projects ? "Enabled" : "Disabled"}`);
		deps.console.log(`  Wiki: ${data.has_wiki ? "Enabled" : "Disabled"}`);
		deps.console.log(`  Pages: ${data.has_pages ? "Enabled" : "Disabled"}`);

		if (data.topics.length > 0) {
			deps.console.log(`\nTopics: ${data.topics.slice(0, 10).join(", ")}`);
			if (data.topics.length > 10) {
				deps.console.log(`  (and ${data.topics.length - 10} more)`);
			}
		}

		if (data.homepage) {
			deps.console.log(`\nHomepage: ${data.homepage}`);
		}

		deps.console.log(`\nRepository: https://github.com/${data.full_name}`);
		deps.console.log();
	} catch (error) {
		handleError(error, owner, repo, deps);
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
