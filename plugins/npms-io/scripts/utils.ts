/**
 * Shared utilities for NPMS.io scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber, sleep as sharedSleep } from "../../../lib/helpers";
import type { CacheEntry } from "../../../lib/cache";

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

export type { CacheEntry };

export type CacheTTL = 3600 | 21600 | 86400; // 1h, 6h, 24h in seconds

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for npms-io namespace
const cache = createCacheManager("npms-io");

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache } = cache;

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
// Re-export shared utilities
// ============================================================================

export const parseArgs = sharedParseArgs;
export type { ParsedArgs } from "../../../lib/args";
export const formatNumber = sharedFormatNumber;
export const sleep = sharedSleep;

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

export const formatScore = (score: number): string => {
	return (score * 100).toFixed(0);
};
