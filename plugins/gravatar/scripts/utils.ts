/**
 * Shared utilities for Gravatar scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import type { CacheEntry } from "../../../lib/cache";
import { createHash } from "crypto";

// ============================================================================
// Types
// ============================================================================

export type GravatarDefault = "mp" | "identicon" | "monsterid" | "wavatar" | "retro" | "robohash" | "blank" | "404";

export interface GravatarUrlOptions {
  size?: number;
  default?: GravatarDefault;
  rating?: "g" | "pg" | "r" | "x";
  forceDefault?: boolean;
}

export type { CacheEntry };

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for gravatar namespace
const cache = createCacheManager("gravatar", {
	defaultTTL: 86400, // 24 hours - gravatars change infrequently
});

// Re-export cache utilities
export const { fetchWithCache, clearCache } = cache;

// ============================================================================
// MD5 Hashing
// ============================================================================

export const md5 = (input: string): string => {
	return createHash("md5").update(input.toLowerCase().trim()).digest("hex");
};

// ============================================================================
// Re-export shared utilities
// ============================================================================

export const parseArgs = sharedParseArgs;
export type { ParsedArgs } from "../../../lib/args";

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

// ============================================================================
// Type Guards
// ============================================================================

const VALID_DEFAULTS: readonly string[] = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];
const VALID_RATINGS: readonly string[] = ["g", "pg", "r", "x"];

export type GravatarRating = "g" | "pg" | "r" | "x";

/**
 * Type guard for GravatarDefault
 */
export function isGravatarDefault(value: string): value is GravatarDefault {
	return VALID_DEFAULTS.includes(value);
}

/**
 * Type guard for Gravatar rating
 */
export function isGravatarRating(value: string): value is GravatarRating {
	return VALID_RATINGS.includes(value);
}
