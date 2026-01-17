/**
 * Shared utilities for Wayback Machine scripts
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";

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

export interface CacheEntry<T = unknown> {
  data: T;
  localCacheTimestamp: number;
}

export type CacheTTL = 30 | 3600 | 86400; // 30s, 1h, 24h in seconds

// ============================================================================
// Cache Utilities
// ============================================================================

const CACHE_DIR = path.join(os.tmpdir(), "wayback-cache");

const ensureCacheDir = async (): Promise<void> => {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
	} catch (error) {
		// If directory creation fails, cache will be disabled
		console.debug("Cache directory unavailable:", error);
	}
};

export const getCacheKey = (url: string, params: Record<string, string | number> = {}): string => {
	const paramsStr = Object.entries(params)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("&");
	const input = `${url}?${paramsStr}`;
	return createHash("sha256").update(input).digest("hex").slice(0, 16);
};

export const getCached = async <T = unknown>(
	key: string,
	ttlSeconds: CacheTTL
): Promise<CacheEntry<T> | null> => {
	try {
		const filePath = path.join(CACHE_DIR, `${key}.json`);
		const content = await fs.readFile(filePath, "utf-8");
		const entry: CacheEntry<T> = JSON.parse(content);

		const expiresAt = entry.localCacheTimestamp + ttlSeconds * 1000;
		if (Date.now() > expiresAt) {
			// Cache expired, delete it
			await fs.unlink(filePath).catch(() => {});
			return null;
		}

		return entry;
	} catch {
		// File doesn't exist or is invalid
		return null;
	}
};

export const setCached = async <T = unknown>(
	key: string,
	data: T
): Promise<void> => {
	try {
		await ensureCacheDir();
		const filePath = path.join(CACHE_DIR, `${key}.json`);
		const entry: CacheEntry<T> = {
			data,
			localCacheTimestamp: Date.now(),
		};
		await fs.writeFile(filePath, JSON.stringify(entry), "utf-8");
	} catch (error) {
		// Fail silently - cache is optional
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

export const formatAge = (ts: string): string => {
	const date = parseTimestamp(ts);
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

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const getAuthHeaders = (apiKey?: string): Record<string, string> => {
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) {
		headers["Authorization"] = `LOW ${apiKey}`;
	}
	return headers;
};
