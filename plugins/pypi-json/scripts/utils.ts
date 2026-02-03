/**
 * Shared utilities for PyPI JSON API scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs, type ParsedArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber } from "../../../lib/helpers";
import { isRecord, isString, isArray, isBoolean } from "../../../lib/type-guards";

// ============================================================================
// Types
// ============================================================================

export interface PyPIPackageInfo {
	info: {
		name: string;
		version: string;
		summary?: string;
		description?: string;
		description_content_type?: string;
		license?: string;
		author?: string;
		author_email?: string;
		maintainer?: string;
		maintainer_email?: string;
		home_page?: string;
		project_urls?: Record<string, string>;
		keywords?: string;
		classifiers?: string[];
		requires_python?: string;
		requires_dist?: string[];
		requires_external?: string[];
		project_url?: string;
		bugtrack_url?: string;
		yanked?: boolean;
		yanked_reason?: string;
		created?: string;
		last_modified?: string;
	};
	releases: Record<string, PyPIDistribution[]>;
	urls: PyPIDistribution[];
}

export interface PyPIDistribution {
	filename: string;
	url: string;
	hashes: Record<string, string>;
	requires_python?: string;
	yanked: boolean;
	yanked_reason?: string;
	upload_time?: string;
	upload_time_iso_8601?: string;
	size?: number;
	comment_text?: string;
	python_version?: string;
}

export interface PyPIError {
	detail: string;
}

// ============================================================================
// Create Cache Manager
// ============================================================================

const cache = createCacheManager("pypi-json", {
	defaultRetryOptions: {
		maxRetries: 3,
		initialDelay: 1000,
		retryableStatuses: [429, 500, 502, 503, 504],
	},
});

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache, fetchWithCache } = cache;

// Re-export other shared utilities
export const parseArgs = sharedParseArgs;
export const formatNumber = sharedFormatNumber;

// Re-export types
export type { ParsedArgs };

// ============================================================================
// API URLs
// ============================================================================

export const API = {
	package: (name: string) => `https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
	packageVersion: (name: string, version: string) =>
		`https://pypi.org/pypi/${encodeURIComponent(name)}/${encodeURIComponent(version)}/json`,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes as human-readable size
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = sizes[i] ?? "B";
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${size}`;
}

/**
 * Get distribution type from filename
 */
export function getDistributionType(filename: string): string {
	if (filename.endsWith(".whl")) return "wheel";
	if (filename.endsWith(".tar.gz")) return "source (tar.gz)";
	if (filename.endsWith(".zip")) return "source (zip)";
	if (filename.endsWith(".egg")) return "egg";
	return "other";
}

/**
 * Parse requires_python string for display
 */
export function formatPythonRequirement(requires_python?: string): string {
	if (!requires_python) return "not specified";
	return requires_python;
}

/**
 * Format classifier for display (remove version prefixes)
 */
export function formatClassifier(classifier: string): string {
	// Example: "Development Status :: 5 - Production/Stable"
	// Remove prefixes that are verbose
	if (classifier.startsWith("Topic :: ")) {
		return classifier.replace("Topic :: ", "").replace(/ :: /g, " > ");
	}
	if (classifier.startsWith("Development Status :: ")) {
		return classifier.replace("Development Status :: ", "");
	}
	if (classifier.startsWith("License :: ")) {
		return classifier.replace("License :: ", "");
	}
	if (classifier.startsWith("Programming Language :: ")) {
		return classifier.replace("Programming Language :: ", "");
	}
	return classifier;
}

/**
 * Get most relevant classifiers (limit to main ones)
 */
export function getMainClassifiers(classifiers?: string[]): string[] {
	if (!classifiers) return [];
	const filtered = classifiers
		.filter(
			(c) =>
				!c.includes("Operating System") &&
				!c.includes("Programming Language :: Python :: Implementation")
		)
		.slice(0, 10);
	return filtered;
}

/**
 * Parse semantic version with PEP 440 pre-release/post-release support
 * Returns [major, minor, patch, release_priority]
 *
 * Priority scale:
 * - 0 = dev release (sorts first)
 * - 1 = alpha/a
 * - 2 = beta/b
 * - 3 = rc/c
 * - 4 = final release
 * - 5 = post release (sorts last)
 */
export function parseVersion(version: string): number[] {
	const parts: number[] = [];

	// Remove epoch if present (e.g., "1!2.0.0" -> "2.0.0")
	// Defensive: check if content exists after the "!"
	let withoutEpoch = version;
	if (version.includes("!")) {
		const epochParts = version.split("!");
		// Use content after "!" if it exists, otherwise use original
		withoutEpoch = epochParts.length > 1 && epochParts[1] ? epochParts[1] : version;
	}

	// Extract base version and release identifiers (PEP 440 compatible)
	// Matches: "1.2.3", "1.2.3a1", "1.2.3-alpha", "1.2.3.post1", "1.2.3.dev1"
	const versionRegex = /^(\d+(?:\.\d+)*)((?:a|alpha|b|beta|rc|c)\d*)?(?:\.post\d+)?(?:\.dev\d+)?(?:[-+].*)?$/i;
	const match = withoutEpoch.match(versionRegex);

	if (!match) {
		// Fallback: treat entire string as base version
		const baseParts = withoutEpoch.split(".").map((p) => parseInt(p, 10) || 0);
		parts.push(...baseParts.slice(0, 3));
	} else {
		// Parse base version (limited to 3 components: major.minor.patch)
		const baseParts = match[1].split(".").map((p) => parseInt(p, 10) || 0);
		parts.push(...baseParts.slice(0, 3));

		const fullMatch = match[0].toLowerCase();

		// Determine release type priority (for sorting)
		// Check in order: dev < pre-release < final < post
		let releasePriority = 4; // Default to final release

		if (fullMatch.includes(".dev")) {
			releasePriority = 0; // Dev releases sort before everything
		} else if (/(?:alpha|a)\d*/.test(fullMatch)) {
			releasePriority = 1; // Alpha
		} else if (/(?:beta|b)\d*/.test(fullMatch)) {
			releasePriority = 2; // Beta
		} else if (/(?:rc|c)\d*/.test(fullMatch)) {
			releasePriority = 3; // RC
		} else if (fullMatch.includes(".post")) {
			releasePriority = 5; // Post releases sort after final
		}

		parts.push(releasePriority);
	}

	// Ensure we have at least major.minor.patch + priority (4 elements)
	while (parts.length < 3) {
		parts.push(0);
	}
	if (parts.length === 3) {
		parts.push(4); // Default to final release if no release type detected
	}

	return parts;
}

/**
 * Compare two versions, handling semantic versioning with pre-releases
 */
export function compareVersions(v1: string, v2: string): number {
	const v1parts = parseVersion(v1);
	const v2parts = parseVersion(v2);
	const length = Math.max(v1parts.length, v2parts.length);

	for (let i = 0; i < length; i++) {
		const v1part = v1parts[i] ?? 0;
		const v2part = v2parts[i] ?? 0;
		if (v1part > v2part) return 1;
		if (v1part < v2part) return -1;
	}
	return 0;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for PyPIDistribution
 */
export function isPyPIDistribution(value: unknown): value is PyPIDistribution {
	if (!isRecord(value)) return false;
	if (!isString(value.filename)) return false;
	if (!isString(value.url)) return false;
	if (!isBoolean(value.yanked)) return false;
	return true;
}

/**
 * Type guard for PyPIPackageInfo
 */
export function isPyPIPackageInfo(value: unknown): value is PyPIPackageInfo {
	if (!isRecord(value)) return false;
	if (!isRecord(value.info)) return false;
	if (!isString(value.info.name)) return false;
	if (!isString(value.info.version)) return false;
	if (!isRecord(value.releases)) return false;
	if (!isArray(value.urls)) return false;
	return true;
}

/**
 * Validate and cast PyPIPackageInfo
 */
export function validatePyPIPackageInfo(data: unknown): PyPIPackageInfo {
	if (!isPyPIPackageInfo(data)) {
		throw new Error("Invalid PyPI package response");
	}
	return data;
}
