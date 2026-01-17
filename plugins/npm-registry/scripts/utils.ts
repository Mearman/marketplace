/**
 * Shared utilities for npm registry scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber, sleep as sharedSleep } from "../../../lib/helpers";
import type { CacheEntry } from "../../../lib/cache";

// ============================================================================
// Types
// ============================================================================

export interface NpmPackage {
  name: string;
  version: string;
  description: string;
  keywords?: string[];
  author?: NpmPerson;
  maintainers?: NpmPerson[];
  homepage?: string;
  repository?: NpmRepository;
  bugs?: NpmBugs;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  time?: Record<string, string>;
  versions?: Record<string, NpmVersion>;
  "dist-tags"?: Record<string, string>;
}

export interface NpmVersion {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface NpmPerson {
  name?: string;
  email?: string;
  url?: string;
}

export interface NpmRepository {
  type?: string;
  url?: string;
}

export interface NpmBugs {
  url?: string;
  email?: string;
}

export interface NpmSearchResult {
  package: {
    name: string;
    version: string;
    description: string;
    keywords?: string[];
    author?: NpmPerson;
    links?: {
      npm?: string;
      homepage?: string;
      repository?: string;
      bugs?: string;
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
  searchScore: number;
}

export interface NpmSearchResponse {
  objects: NpmSearchResult[];
  total: number;
  time: string;
}

export interface NpmDownloadsPoint {
  downloads: number;
  day: string;
}

export interface NpmDownloadsResponse {
  downloads: NpmDownloadsPoint[];
  start: string;
  end: string;
  package: string;
}

export type { CacheEntry };

export type CacheTTL = 3600 | 21600 | 86400; // 1h, 6h, 24h in seconds

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for npm-registry namespace
const cache = createCacheManager("npm-registry");

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache } = cache;

// Re-export other shared utilities
export const parseArgs = sharedParseArgs;
export const formatNumber = sharedFormatNumber;
export const sleep = sharedSleep;

// ============================================================================
// API URLs
// ============================================================================

export const API = {
	search: (query: string, size = 20, from = 0) => {
		const params = new URLSearchParams({
			text: query,
			size: size.toString(),
			from: from.toString(),
		});
		return `https://registry.npmjs.org/-/v1/search?${params}`;
	},
	package: (name: string) => `https://registry.npmjs.org/${name}`,
	exists: (name: string) => `https://registry.npmjs.org/${name}`,
	downloads: (period: string, name: string) =>
		`https://api.npmjs.org/downloads/range/${period}/${name}`,
};

// ============================================================================
// Repository URL Parsing
// ============================================================================

export const parseRepositoryUrl = (repo: NpmRepository | string | undefined): string | null => {
	if (!repo) return null;

	let url: string;
	if (typeof repo === "string") {
		url = repo;
	} else if (repo.url) {
		url = repo.url;
	} else {
		return null;
	}

	// Remove git+, git://, git@, and .git suffix
	url = url
		.replace(/^git\+/, "")
		.replace(/^git:/, "https:")
		.replace(/^git@github\.com:/, "https://github.com/")
		.replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
		.replace(/\.git$/, "");

	return url;
};

// ============================================================================
// npm-registry-Specific Types (Re-exported for compatibility)
// ============================================================================

export type { ParsedArgs } from "../../../lib/args";
