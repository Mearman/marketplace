/**
 * Shared utilities for npm registry scripts
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";

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

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

export type CacheTTL = 3600 | 21600 | 86400; // 1h, 6h, 24h in seconds

// ============================================================================
// Cache Utilities
// ============================================================================

const CACHE_DIR = path.join(os.tmpdir(), "npm-registry-cache");

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

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
