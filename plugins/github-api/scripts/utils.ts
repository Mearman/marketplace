/**
 * Shared utilities for GitHub API scripts
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";

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

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

export type CacheTTL = 300 | 1800 | 3600; // 5m, 30m, 1h in seconds

// ============================================================================
// Cache Utilities
// ============================================================================

const CACHE_DIR = path.join(os.tmpdir(), "github-api-cache");

const ensureCacheDir = async (): Promise<void> => {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
	} catch (error) {
		console.debug("Cache directory unavailable:", error);
	}
};

export const getCacheKey = (
	url: string,
	params: Record<string, string | number> = {}
): string => {
	const paramsStr = Object.entries(params)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("&");
	const input = `${url}?${paramsStr}`;
	return createHash("sha256").update(input).digest("hex").slice(0, 16);
};

export const getCached = async <T = unknown>(
	key: string
): Promise<T | null> => {
	try {
		const filePath = path.join(CACHE_DIR, `${key}.json`);
		const content = await fs.readFile(filePath, "utf-8");
		const entry: CacheEntry<T> = JSON.parse(content);

		if (Date.now() > entry.expiresAt) {
			await fs.unlink(filePath).catch(() => {});
			return null;
		}

		return entry.data;
	} catch {
		return null;
	}
};

export const setCached = async <T = unknown>(
	key: string,
	data: T,
	ttlSeconds: CacheTTL
): Promise<void> => {
	try {
		await ensureCacheDir();
		const filePath = path.join(CACHE_DIR, `${key}.json`);
		const entry: CacheEntry<T> = {
			data,
			expiresAt: Date.now() + ttlSeconds * 1000,
		};
		await fs.writeFile(filePath, JSON.stringify(entry), "utf-8");
	} catch (error) {
		console.debug("Cache write failed:", error);
	}
};

export const clearCache = async (): Promise<void> => {
	try {
		const files = await fs.readdir(CACHE_DIR);
		const cacheFiles = files.filter((f) => f.endsWith(".json"));
		await Promise.all(
			cacheFiles.map((f) => fs.unlink(path.join(CACHE_DIR, f)))
		);
		console.log(`Cleared ${cacheFiles.length} cache file(s) from ${CACHE_DIR}`);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.log("Cache directory not found or empty");
		} else {
			console.error("Error clearing cache:", error);
		}
	}
};

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

// ============================================================================
// Argument Parsing
// ============================================================================

export interface ParsedArgs {
  flags: Set<string>;
  options: Map<string, string>;
  positional: string[];
}

export const parseArgs = (argv: string[]): ParsedArgs => {
	const flags = new Set<string>();
	const options = new Map<string, string>();
	const positional: string[] = [];

	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				const key = arg.slice(2, eqIndex);
				const value = arg.slice(eqIndex + 1);
				options.set(key, value);
			} else {
				flags.add(arg.slice(2));
			}
		} else {
			positional.push(arg);
		}
	}

	return { flags, options, positional };
};

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

export const formatNumber = (num: number): string => {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
};

export const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const base64Decode = (str: string): string => {
	return Buffer.from(str, "base64").toString("utf-8");
};
