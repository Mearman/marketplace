#!/usr/bin/env npx tsx
/**
 * Get GitHub repository README
 * Usage: npx tsx readme.ts <repository> [options]
 *
 * Options:
 *   --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
 *   --no-cache     Bypass cache and fetch fresh data
 */

import {
	API,
	base64Decode,
	fetchWithCache,
	getAuthHeaders,
	getTokenFromEnv,
	parseArgs,
	parseRepositoryUrl,
	validateGitHubReadme,
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
	base64Decode: (str: string) => string;
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
		deps.console.log(`Repository "${owner}/${repo}" has no README or does not exist`);
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
		deps.console.log(`Usage: npx tsx readme.ts <repository> [options]

Options:
  --token=TOKEN  GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
  --no-cache     Bypass cache and fetch fresh data

Repository formats:
  owner/repo
  https://github.com/owner/repo
  git+https://github.com/owner/repo
  git@github.com:owner/repo

Examples:
  npx tsx readme.ts facebook/react
  npx tsx readme.ts vercel/next.js
  npx tsx readme.ts https://github.com/nodejs/node`);
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
	const apiUrl = API.readme(owner, repo);
	deps.console.log(`Fetching README for: ${owner}/${repo}`);

	try {
		const headers = deps.getAuthHeaders(token);

		const rawData = await deps.fetchWithCache({
			url: apiUrl,
			ttl: 3600, // 1 hour
			fetchOptions: { headers },
			bypassCache: flags.has("no-cache"),
			cacheKey: `readme-${owner}-${repo}`,
		});
		const data = validateGitHubReadme(rawData);

		// Decode and display README
		const content = deps.base64Decode(data.content);
		const sizeKB = (data.size / 1024).toFixed(1);

		deps.console.log();
		deps.console.log(`${data.name} from ${owner}/${repo}`);
		deps.console.log("-".repeat(data.name.length + 9 + owner.length + repo.length));
		deps.console.log(`Size: ${sizeKB} KB`);
		deps.console.log(`URL: ${data.html_url}`);
		deps.console.log();
		deps.console.log(content);
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
	base64Decode,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Error:", message);
		process.exit(1);
	});
}
