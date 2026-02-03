/**
 * Shared utilities for Wayback Machine scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatAge as sharedFormatAge, sleep as sharedSleep } from "../../../lib/helpers";
import { isRecord, isArray, isString, isBoolean } from "../../../lib/type-guards";
import type { CacheEntry } from "../../../lib/cache";

// ============================================================================
// Types
// ============================================================================

export type CDXRow = [string, string, string, string, string, string, string];

export interface AvailableResponse {
  archived_snapshots: {
    closest?: {
      available: boolean;
      url?: string;
      timestamp?: string;
      status?: string;
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
export const { getCacheKey, getCached, setCached, clearCache, fetchWithCache } = cache;

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
		// Convert all values to strings for URLSearchParams
		const stringParams: Record<string, string> = { url, output: "json" };
		for (const [key, value] of Object.entries(params)) {
			stringParams[key] = String(value);
		}
		const searchParams = new URLSearchParams(stringParams);
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

// ============================================================================
// Type Guards for API Responses
// ============================================================================

/**
 * Type guard for CDXRow array response
 */
export function isCDXResponse(value: unknown): value is CDXRow[] {
	if (!isArray(value)) return false;
	// CDX responses are arrays of arrays with string elements
	for (const row of value) {
		if (!isArray(row)) return false;
		for (const cell of row) {
			if (!isString(cell)) return false;
		}
	}
	return true;
}

/**
 * Type guard for a single snapshot in AvailableResponse
 */
function isSnapshot(value: unknown): value is { available: boolean; url?: string; timestamp?: string; status?: string } {
	// Must have available as boolean
	if (!isRecord(value) || typeof value.available !== "boolean") {
		return false;
	}
	// When available is true, must have url, timestamp, and status
	if (value.available) {
		return (
			isString(value.url) &&
			isString(value.timestamp) &&
			isString(value.status)
		);
	}
	// When available is false, other fields are optional
	return true;
}

/**
 * Type guard for AvailableResponse
 */
export function isAvailableResponse(value: unknown): value is AvailableResponse {
	if (!isRecord(value)) return false;
	if (!isRecord(value.archived_snapshots)) return false;
	const snapshots = value.archived_snapshots;
	// closest is optional
	if ("closest" in snapshots && snapshots.closest !== undefined) {
		if (!isSnapshot(snapshots.closest)) return false;
	}
	return true;
}

/**
 * Type guard for SPN2Response
 */
export function isSPN2Response(value: unknown): value is SPN2Response {
	if (!isRecord(value)) return false;
	// All fields are optional, but if present they should be strings
	if ("url" in value && value.url !== undefined && !isString(value.url)) return false;
	if ("job_id" in value && value.job_id !== undefined && !isString(value.job_id)) return false;
	if ("status" in value && value.status !== undefined && !isString(value.status)) return false;
	if ("status_ext" in value && value.status_ext !== undefined && !isString(value.status_ext)) return false;
	if ("message" in value && value.message !== undefined && !isString(value.message)) return false;
	if ("timestamp" in value && value.timestamp !== undefined && !isString(value.timestamp)) return false;
	if ("original_url" in value && value.original_url !== undefined && !isString(value.original_url)) return false;
	if ("screenshot" in value && value.screenshot !== undefined && !isString(value.screenshot)) return false;
	return true;
}

/**
 * Validate and cast CDX response
 */
export function validateCDXResponse(data: unknown): CDXRow[] {
	if (!isCDXResponse(data)) {
		throw new Error("Invalid CDX response format");
	}
	return data;
}

/**
 * Validate and cast AvailableResponse
 */
export function validateAvailableResponse(data: unknown): AvailableResponse {
	if (!isAvailableResponse(data)) {
		throw new Error("Invalid availability response format");
	}
	return data;
}
