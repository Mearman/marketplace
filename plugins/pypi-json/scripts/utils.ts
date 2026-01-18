/**
 * Shared utilities for PyPI JSON API scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import { formatNumber as sharedFormatNumber } from "../../../lib/helpers";

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
	releases: Record<string, PyPIRelease[]>;
	urls: PyPIFile[];
}

export interface PyPIRelease {
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

export interface PyPIFile {
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
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): string {
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
	if (!requires_python) return "Any Python version";
	return `Python ${requires_python}`;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname || url;
	} catch {
		return url;
	}
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
 * Parse semver for sorting
 */
export function parseVersion(version: string): number[] {
	return version.split(".").map((v) => {
		const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
		return isNaN(num) ? 0 : num;
	});
}

/**
 * Compare two versions
 */
export function compareVersions(v1: string, v2: string): number {
	const v1parts = parseVersion(v1);
	const v2parts = parseVersion(v2);
	const length = Math.max(v1parts.length, v2parts.length);

	for (let i = 0; i < length; i++) {
		const v1part = v1parts[i] || 0;
		const v2part = v2parts[i] || 0;
		if (v1part > v2part) return 1;
		if (v1part < v2part) return -1;
	}
	return 0;
}
