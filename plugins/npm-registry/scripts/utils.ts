/**
 * Shared utilities for npm registry scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber, sleep as sharedSleep } from "../../../lib/helpers";
import { isRecord, isString, isNumber, isArray } from "../../../lib/type-guards";
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
export const { getCacheKey, getCached, setCached, clearCache, fetchWithCache } = cache;

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

// ============================================================================
// Type Guards for API Responses
// ============================================================================

/**
 * Type guard for NpmDownloadsPoint
 */
function isNpmDownloadsPoint(value: unknown): value is NpmDownloadsPoint {
	return isRecord(value) && isNumber(value.downloads) && isString(value.day);
}

/**
 * Type guard for NpmDownloadsResponse
 */
export function isNpmDownloadsResponse(value: unknown): value is NpmDownloadsResponse {
	return (
		isRecord(value) &&
		isArray(value.downloads) &&
		value.downloads.every(isNpmDownloadsPoint) &&
		isString(value.start) &&
		isString(value.end) &&
		isString(value.package)
	);
}

/**
 * Type guard for NpmPerson
 */
export function isNpmPerson(value: unknown): value is NpmPerson {
	if (!isRecord(value)) return false;
	if ("name" in value && value.name !== undefined && !isString(value.name)) return false;
	if ("email" in value && value.email !== undefined && !isString(value.email)) return false;
	if ("url" in value && value.url !== undefined && !isString(value.url)) return false;
	return true;
}

/**
 * Type guard for NpmRepository
 */
export function isNpmRepository(value: unknown): value is NpmRepository {
	if (!isRecord(value)) return false;
	if ("type" in value && value.type !== undefined && !isString(value.type)) return false;
	if ("url" in value && value.url !== undefined && !isString(value.url)) return false;
	return true;
}

/**
 * Type guard for NpmPackage (partial check for commonly used fields)
 */
export function isNpmPackage(value: unknown): value is NpmPackage {
	if (!isRecord(value)) return false;
	if (!isString(value.name)) return false;
	if (!isString(value.version)) return false;
	// description is required by our interface
	if (!isString(value.description) && value.description !== undefined) return false;
	return true;
}

/**
 * Type guard for NpmSearchResult
 */
function isNpmSearchResult(value: unknown): value is NpmSearchResult {
	if (!isRecord(value)) return false;
	if (!isRecord(value.package)) return false;
	const pkg = value.package;
	if (!isString(pkg.name) || !isString(pkg.version)) return false;
	return true;
}

/**
 * Type guard for NpmSearchResponse
 */
export function isNpmSearchResponse(value: unknown): value is NpmSearchResponse {
	return (
		isRecord(value) &&
		isArray(value.objects) &&
		value.objects.every(isNpmSearchResult) &&
		isNumber(value.total) &&
		isString(value.time)
	);
}

/**
 * Validate and cast NpmDownloadsResponse
 */
export function validateNpmDownloadsResponse(data: unknown): NpmDownloadsResponse {
	if (!isNpmDownloadsResponse(data)) {
		throw new Error("Invalid npm downloads response format");
	}
	return data;
}

/**
 * Validate and cast NpmPackage
 */
export function validateNpmPackage(data: unknown): NpmPackage {
	if (!isNpmPackage(data)) {
		throw new Error("Invalid npm package response format");
	}
	return data;
}

/**
 * Validate and cast NpmSearchResponse
 */
export function validateNpmSearchResponse(data: unknown): NpmSearchResponse {
	if (!isNpmSearchResponse(data)) {
		throw new Error("Invalid npm search response format");
	}
	return data;
}
