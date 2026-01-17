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
  getCached,
  getAuthHeaders,
  GitHubReadme,
  getTokenFromEnv,
  parseArgs,
  parseRepositoryUrl,
  setCached,
} from "./utils.js";

const main = async () => {
  const { flags, options, positional } = parseArgs(process.argv.slice(2));
  const repoInput = positional[0];
  const token = options.get("token") || getTokenFromEnv();

  if (!repoInput) {
    console.log(`Usage: npx tsx readme.ts <repository> [options]

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
    process.exit(1);
  }

  // Parse repository URL
  const repoInfo = parseRepositoryUrl(repoInput);
  if (!repoInfo) {
    console.error(`Error: Could not parse repository URL: ${repoInput}`);
    console.error('Valid formats: "owner/repo", "https://github.com/owner/repo", etc.');
    process.exit(1);
  }

  const { owner, repo } = repoInfo;
  const apiUrl = API.readme(owner, repo);
  console.log(`Fetching README for: ${owner}/${repo}`);

  try {
    const noCache = flags.has("no-cache");
    const cacheKey = `readme-${owner}-${repo}`;
    let data: GitHubReadme;

    const headers = getAuthHeaders(token);

    if (noCache) {
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Repository "${owner}/${repo}" has no README or does not exist`);
          process.exit(1);
        }
        if (response.status === 403) {
          console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
          process.exit(1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      data = await response.json();
      await setCached(cacheKey, data, 3600); // 1 hour
    } else {
      const cached = await getCached<GitHubReadme>(cacheKey);
      if (cached === null) {
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Repository "${owner}/${repo}" has no README or does not exist`);
            process.exit(1);
          }
          if (response.status === 403) {
            console.log("API rate limit exceeded. Use a GitHub token to increase your quota.");
            process.exit(1);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
        await setCached(cacheKey, data, 3600);
      } else {
        data = cached;
      }
    }

    // Decode and display README
    const content = base64Decode(data.content);
    const sizeKB = (data.size / 1024).toFixed(1);

    console.log();
    console.log(`${data.name} from ${owner}/${repo}`);
    console.log("-".repeat(data.name.length + 9 + owner.length + repo.length));
    console.log(`Size: ${sizeKB} KB`);
    console.log(`URL: ${data.html_url}`);
    console.log();
    console.log(content);
    console.log();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
