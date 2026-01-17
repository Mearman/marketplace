/**
 * Shared utilities for Gravatar scripts
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { createHash } from "crypto";

// ============================================================================
// Types
// ============================================================================

export type GravatarDefault = "mp" | "identicon" | "monsterid" | "wavatar" | "retro" | "robohash" | "blank";

export interface GravatarUrlOptions {
  size?: number;
  default?: GravatarDefault;
  rating?: "g" | "pg" | "r" | "x";
  forceDefault?: boolean;
}

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

// ============================================================================
// Cache Utilities
// ============================================================================

const CACHE_DIR = path.join(os.tmpdir(), "gravatar-cache");

const ensureCacheDir = async (): Promise<void> => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.debug("Cache directory unavailable:", error);
  }
};

export const getCacheKey = (
  email: string,
  options: GravatarUrlOptions = {}
): string => {
  const optsStr = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const input = `${email.toLowerCase().trim()}?${optsStr}`;
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
  ttlSeconds: number = 86400 // 24 hours default
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
// MD5 Hashing
// ============================================================================

export const md5 = (input: string): string => {
  return createHash("md5").update(input.toLowerCase().trim()).digest("hex");
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
// URL Generation
// ============================================================================

export const buildGravatarUrl = (
  email: string,
  options: GravatarUrlOptions = {}
): string => {
  const hash = md5(email);
  const params = new URLSearchParams();

  if (options.size) {
    params.append("size", options.size.toString());
  }
  if (options.default) {
    params.append("d", options.default);
  }
  if (options.rating) {
    params.append("r", options.rating);
  }
  if (options.forceDefault) {
    params.append("f", "y");
  }

  const queryStr = params.toString();
  return `https://www.gravatar.com/avatar/${hash}${queryStr ? `?${queryStr}` : ""}`;
};

export const getGravatarProfileUrl = (email: string): string => {
  const hash = md5(email);
  return `https://www.gravatar.com/${hash}`;
};
