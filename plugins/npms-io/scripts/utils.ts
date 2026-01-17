/**
 * Shared utilities for NPMS.io scripts
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface NpmsPackage {
  collected: {
    metadata: {
      name: string;
      version: string;
      description: string;
      keywords?: string[];
      date: string;
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
      };
      author?: NpmsPerson;
      maintainers?: NpmsPerson[];
      publishers?: NpmsPerson[];
    };
    npm: {
      downloads: number[];
      downloadsAccumulated: number[];
      weekDownloads: number;
      monthDownloads: number;
      quarterDownloads: number;
      yearDownloads: number;
    };
    github: {
      stars: number;
      forks: number;
      subscribers: number;
      issues: {
        open: number;
        closed: number;
        total: number;
      };
      forksCount: number;
      forksOpen: number;
      forksClosed: number;
      stargazers: number;
      subscribersCount: number;
      openIssues: number;
      closedIssues: number;
      issueComments: number;
      contributors: number;
      commitCount: number;
      latestCommit: {
        sha: string;
        date: string;
        message: string;
        author: {
          name: string;
          email: string;
        };
      };
      recentReleases: NpmsRelease[];
      firstRelease: NpmsRelease;
      latestRelease: NpmsRelease;
      participatesInCoc: boolean;
      hasCustomCodeOfConduct: boolean;
      hasOpenDiscussions: boolean;
      hasContributingGuide: boolean;
      hasLicense: boolean;
      hasSecurityPolicy: boolean;
      hasSecurityAudit: boolean;
    };
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  analyzedAt: string;
}

export interface NpmsPerson {
  name?: string;
  email?: string;
  url?: string;
}

export interface NpmsRelease {
  version: string;
  semver: string;
  date: string;
  time: number;
}

export interface NpmsSuggestion {
  name: string;
  score: number;
  searchScore: number;
}

export interface NpmsMgetResponse {
  [key: string]: NpmsPackage | null;
}

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

export type CacheTTL = 3600 | 21600 | 86400; // 1h, 6h, 24h in seconds

// ============================================================================
// Cache Utilities
// ============================================================================

const CACHE_DIR = path.join(os.tmpdir(), "npms-io-cache");

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
	package: (name: string) => `https://api.npms.io/v2/package/${encodeURIComponent(name)}`,
	mget: () => "https://api.npms.io/v2/package/mget",
	search: (query: string, size = 25) =>
		`https://api.npms.io/v2/search?q=${encodeURIComponent(query)}&size=${size}`,
	suggestions: (query: string) =>
		`https://api.npms.io/v2/search/suggestions?q=${encodeURIComponent(query)}`,
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

export const formatAge = (dateStr: string): string => {
	const date = new Date(dateStr);
	const diff = Date.now() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days < 0) return "in the future";
	if (days === 0) return "today";
	if (days === 1) return "1 day ago";
	if (days < 30) return `${days} days ago`;
	const months = Math.floor(days / 30);
	if (months === 1) return "1 month ago";
	if (months < 12) return `${months} months ago`;
	const years = Math.floor(months / 12);
	return years === 1 ? "1 year ago" : `${years} years ago`;
};

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const formatScore = (score: number): string => {
	return (score * 100).toFixed(0);
};
