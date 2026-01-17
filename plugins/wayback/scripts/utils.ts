/**
 * Shared utilities for Wayback Machine scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatAge as sharedFormatAge, sleep as sharedSleep } from "../../../lib/helpers";
import type { CacheEntry } from "../../../lib/cache";

// ============================================================================
// Types
// ============================================================================

export type CDXRow = [string, string, string, string, string, string, string];

export interface AvailableResponse {
  archived_snapshots: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string;
      status: string;
    };
  };
}

export interface SPN2Response {
  url?: string;
  job_id?: string;
  status?: string;
  status_ext?: string;
  message?: string;
  timestamp?: string;
  original_url?: string;
  screenshot?: string;
}

export type { CacheEntry };

export type CacheTTL = 30 | 3600 | 86400; // 30s, 1h, 24h in seconds

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for wayback namespace
const cache = createCacheManager("wayback");

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache } = cache;

// Re-export other shared utilities
export const parseArgs = sharedParseArgs;
export const formatAge = sharedFormatAge;
export const sleep = sharedSleep;

// ============================================================================
// API URLs
// ============================================================================

export const API = {
	availability: (url: string, timestamp?: string) => {
		let apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
		if (timestamp) apiUrl += `&timestamp=${timestamp}`;
		return apiUrl;
	},
	cdx: (url: string, params: Record<string, string | number> = {}) => {
		const searchParams = new URLSearchParams({ url, output: "json", ...params } as Record<string, string>);
		return `https://web.archive.org/cdx/search/cdx?${searchParams}`;
	},
	save: "https://web.archive.org/save",
	saveStatus: (jobId: string) => `https://web.archive.org/save/status/${jobId}`,
};

// ============================================================================
// URL Modifiers
// ============================================================================

export type UrlModifier = "" | "id_" | "im_" | "js_" | "cs_";

export const buildArchiveUrl = (
	timestamp: string,
	url: string,
	modifier: UrlModifier = "id_"
): string => {
	return `https://web.archive.org/web/${timestamp}${modifier}/${url}`;
};

export const buildScreenshotUrl = (timestamp: string, url: string): string => {
	return buildArchiveUrl(timestamp, url, "im_");
};

// ============================================================================
// Timestamp Formatting
// ============================================================================

export const formatTimestamp = (ts: string): string => {
	const year = ts.slice(0, 4);
	const month = ts.slice(4, 6);
	const day = ts.slice(6, 8);
	const hour = ts.slice(8, 10) || "00";
	const min = ts.slice(10, 12) || "00";
	return `${year}-${month}-${day} ${hour}:${min}`;
};

export const parseTimestamp = (ts: string): Date => {
	return new Date(
		parseInt(ts.slice(0, 4)),
		parseInt(ts.slice(4, 6)) - 1,
		parseInt(ts.slice(6, 8)),
		parseInt(ts.slice(8, 10) || "0"),
		parseInt(ts.slice(10, 12) || "0"),
		parseInt(ts.slice(12, 14) || "0")
	);
};

// ============================================================================
// Wayback-Specific Utilities
// ============================================================================

// Re-export type for compatibility
export type { ParsedArgs } from "../../../lib/args";

export const getAuthHeaders = (apiKey?: string): Record<string, string> => {
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) {
		headers["Authorization"] = `LOW ${apiKey}`;
	}
	return headers;
};
