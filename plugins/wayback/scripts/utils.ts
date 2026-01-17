/**
 * Shared utilities for Wayback Machine scripts
 */

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
