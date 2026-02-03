/**
 * Shared utilities for GitHub API scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber, sleep as sharedSleep } from "../../../lib/helpers";
import { isRecord, isString, isNumber } from "../../../lib/type-guards";
import type { CacheEntry } from "../../../lib/cache";

// ============================================================================
// Types
// ============================================================================

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  languages_url: string;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  forks_count: number;
  open_issues_count: number;
  license: GitHubLicense | null;
  topics: string[];
  default_branch: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  url: string | null;
  spdx_id: string;
  node_id: string;
}

export interface GitHubReadme {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
}

export interface GitHubRateLimit {
  resources: {
    core: {
      limit: number;
      used: number;
      remaining: number;
      reset: number;
    };
    search: {
      limit: number;
      used: number;
      remaining: number;
      reset: number;
    };
  };
  rate: {
    limit: number;
    used: number;
    remaining: number;
    reset: number;
  };
}

export type { CacheEntry };

export type CacheTTL = 300 | 1800 | 3600; // 5m, 30m, 1h in seconds

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for github-api namespace
const cache = createCacheManager("github-api");

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache, fetchWithCache } = cache;

// ============================================================================
// API URLs
// ============================================================================

export const API = {
	repo: (owner: string, repo: string) =>
		`https://api.github.com/repos/${owner}/${repo}`,
	readme: (owner: string, repo: string) =>
		`https://api.github.com/repos/${owner}/${repo}/readme`,
	user: (username: string) => `https://api.github.com/users/${username}`,
	rateLimit: () => "https://api.github.com/rate_limit",
};

// ============================================================================
// Repository URL Parsing
// ============================================================================

export const parseRepositoryUrl = (url: string): { owner: string; repo: string } | null => {
	// Handle various URL formats:
	// https://github.com/owner/repo
	// git+https://github.com/owner/repo
	// git@github.com:owner/repo
	// ssh://git@github.com/owner/repo
	// owner/repo

	const patterns = [
		/(?:https?:\/\/|git\+https:\/\/)?github\.com\/([^\/]+)\/([^\/\?#]+)/i,
		/git@github\.com:([^\/]+)\/([^\/\?#\.]+)/i,
		/ssh:\/\/git@github\.com\/([^\/]+)\/([^\/\?#\.]+)/i,
		/^([^\/]+)\/([^\/\?#\.]+)$/, // owner/repo format
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
	}

	return null;
};

// Re-export shared arg parsing
export const parseArgs = sharedParseArgs;
export type { ParsedArgs } from "../../../lib/args";

// ============================================================================
// Authentication
// ============================================================================

export const getAuthHeaders = (token?: string): Record<string, string> => {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
		"User-Agent": "claude-code-github-api",
	};

	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return headers;
};

export const getTokenFromEnv = (): string | undefined => {
	return process.env.GITHUB_TOKEN;
};

// ============================================================================
// Helpers
// ============================================================================

// Re-export shared helpers
export const formatNumber = sharedFormatNumber;
export const sleep = sharedSleep;

// GitHub-specific helper
export const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export const base64Decode = (str: string): string => {
	return Buffer.from(str, "base64").toString("utf-8");
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for GitHub User
 */
export function isGitHubUser(value: unknown): value is GitHubUser {
	if (!isRecord(value)) return false;
	return isString(value.login) && isNumber(value.id);
}

/**
 * Type guard for GitHub Repository
 */
export function isGitHubRepository(value: unknown): value is GitHubRepository {
	if (!isRecord(value)) return false;
	return (
		isNumber(value.id) &&
		isString(value.name) &&
		isString(value.full_name) &&
		isRecord(value.owner)
	);
}

/**
 * Type guard for GitHub Readme
 */
export function isGitHubReadme(value: unknown): value is GitHubReadme {
	if (!isRecord(value)) return false;
	return (
		isString(value.name) &&
		isString(value.path) &&
		isString(value.content) &&
		isString(value.encoding)
	);
}

/**
 * Type guard for rate limit resource
 */
function isRateLimitResource(value: unknown): value is { limit: number; used: number; remaining: number; reset: number } {
	return (
		isRecord(value) &&
		isNumber(value.limit) &&
		isNumber(value.used) &&
		isNumber(value.remaining) &&
		isNumber(value.reset)
	);
}

/**
 * Type guard for GitHub Rate Limit
 */
export function isGitHubRateLimit(value: unknown): value is GitHubRateLimit {
	if (!isRecord(value)) return false;
	if (!isRecord(value.resources)) return false;
	return (
		isRateLimitResource(value.resources.core) &&
		isRateLimitResource(value.resources.search)
	);
}

/**
 * Validate and cast GitHubRepository
 */
export function validateGitHubRepository(data: unknown): GitHubRepository {
	if (!isGitHubRepository(data)) {
		throw new Error("Invalid GitHub repository response");
	}
	return data;
}

/**
 * Validate and cast GitHubUser
 */
export function validateGitHubUser(data: unknown): GitHubUser {
	if (!isGitHubUser(data)) {
		throw new Error("Invalid GitHub user response");
	}
	return data;
}

/**
 * Validate and cast GitHubReadme
 */
export function validateGitHubReadme(data: unknown): GitHubReadme {
	if (!isGitHubReadme(data)) {
		throw new Error("Invalid GitHub readme response");
	}
	return data;
}

/**
 * Validate and cast GitHubRateLimit
 */
export function validateGitHubRateLimit(data: unknown): GitHubRateLimit {
	if (!isGitHubRateLimit(data)) {
		throw new Error("Invalid GitHub rate limit response");
	}
	return data;
}
