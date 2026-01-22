/**
 * Shared utilities for JSON Schema validation scripts
 */

import { createCacheManager } from "../../../lib/cache";
import { parseArgs as sharedParseArgs } from "../../../lib/args";
import type { CacheEntry } from "../../../lib/cache";

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
	path: string;
	message: string;
	keyword: string;
	params?: Record<string, unknown>;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	schema?: string;
	file?: string;
	draft?: string;
}

export type DraftVersion = "draft-04" | "draft-06" | "draft-07" | "2019-09" | "2020-12";

export type { CacheEntry };

// ============================================================================
// Re-export Shared Utilities
// ============================================================================

// Create cache manager for json-schema namespace
const cache = createCacheManager("json-schema");

// Re-export cache utilities
export const { getCacheKey, getCached, setCached, clearCache, fetchWithCache } = cache;

// Re-export other shared utilities
export const parseArgs = sharedParseArgs;

// Re-export type for compatibility
export type { ParsedArgs } from "../../../lib/args";

// ============================================================================
// Draft Detection
// ============================================================================

const DRAFT_PATTERNS: Record<string, DraftVersion> = {
	"draft-04": "draft-04",
	"draft-06": "draft-06",
	"draft-07": "draft-07",
	"2019-09": "2019-09",
	"2020-12": "2020-12",
	"draft/2019-09": "2019-09",
	"draft/2020-12": "2020-12",
};

export const detectDraftVersion = (schemaUri?: string): DraftVersion => {
	if (!schemaUri) return "2020-12";

	for (const [pattern, version] of Object.entries(DRAFT_PATTERNS)) {
		if (schemaUri.includes(pattern)) {
			return version;
		}
	}

	return "2020-12";
};

// ============================================================================
// Schema URLs
// ============================================================================

export const META_SCHEMAS: Record<DraftVersion, string> = {
	"draft-04": "http://json-schema.org/draft-04/schema#",
	"draft-06": "http://json-schema.org/draft-06/schema#",
	"draft-07": "http://json-schema.org/draft-07/schema#",
	"2019-09": "https://json-schema.org/draft/2019-09/schema",
	"2020-12": "https://json-schema.org/draft/2020-12/schema",
};

// ============================================================================
// Output Formatting
// ============================================================================

export const formatValidationResult = (result: ValidationResult, verbose = false): string => {
	const lines: string[] = [];

	if (result.valid) {
		lines.push("\u2713 Valid" + (result.draft ? ` (${result.draft})` : ""));
		if (result.schema) lines.push(`  Schema: ${result.schema}`);
		if (result.file) lines.push(`  File: ${result.file}`);
	} else {
		const errorCount = result.errors.length;
		lines.push(`\u2717 Invalid (${errorCount} error${errorCount === 1 ? "" : "s"})`);
		if (result.schema) lines.push(`  Schema: ${result.schema}`);

		result.errors.forEach((error, index) => {
			const prefix = `  ${index + 1}. `;
			lines.push(`${prefix}${error.path}: ${error.message}`);
			if (verbose && error.params) {
				lines.push(`     ${JSON.stringify(error.params)}`);
			}
		});
	}

	return lines.join("\n");
};

export const formatJsonResult = (result: ValidationResult): string => {
	return JSON.stringify(result, null, 2);
};

// ============================================================================
// Error Handling
// ============================================================================

export const handleError = (
	error: unknown,
	context: string,
	deps: { console: Console; process: NodeJS.Process }
): never => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error(`Error${context ? ` ${context}` : ""}: ${message}`);
	deps.process.exit(1);
	throw error; // TypeScript needs this for type narrowing
};
