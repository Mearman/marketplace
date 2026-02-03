/**
 * CSL JSON Parser
 *
 * Parses CSL JSON format into intermediate BibEntry format.
 *
 * CSL JSON is already the intermediate format, so this is mostly
 * validation and light normalization.
 */

import type { Parser, ConversionResult, ConversionWarning, BibEntry, CSLItemType } from "../types.js";

/**
 * Type guard to check if a string is a valid CSLItemType
 * Uses a Set for O(1) lookup and type safety without type assertions
 */
function isCSLItemType(value: string): value is CSLItemType {
	const validTypes = new Set<string>([
		"article",
		"article-journal",
		"article-magazine",
		"article-newspaper",
		"bill",
		"book",
		"broadcast",
		"chapter",
		"dataset",
		"entry",
		"entry-dictionary",
		"entry-encyclopedia",
		"figure",
		"graphic",
		"interview",
		"legal_case",
		"legislation",
		"manuscript",
		"map",
		"motion_picture",
		"musical_score",
		"paper-conference",
		"patent",
		"personal_communication",
		"post",
		"post-weblog",
		"report",
		"review",
		"review-book",
		"song",
		"speech",
		"thesis",
		"treaty",
		"webpage",
		"software",
	]);
	return validTypes.has(value);
}

/**
 * Safely get id from parsed item as string
 */
function getItemId(item: unknown, index: number): string {
	if (typeof item === "object" && item !== null && "id" in item) {
		// After 'in' check, TypeScript knows item has 'id' property
		const id = item.id;
		if (typeof id === "string") return id;
		if (typeof id === "number") return String(id);
	}
	return `item-${index}`;
}

/**
 * CSL JSON Parser Implementation
 */
export class CSLJSONParser implements Parser {
	format = "csl-json" as const;

	parse(content: string): ConversionResult {
		const entries: BibEntry[] = [];
		const warnings: ConversionWarning[] = [];

		try {
			const parsed: unknown = JSON.parse(content);

			// Handle both array and single object
			const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const itemId = getItemId(item, i);

				try {
					const entry = this.parseEntry(item, i);
					entries.push(entry);
				} catch (error) {
					warnings.push({
						entryId: itemId,
						severity: "error",
						type: "parse-error",
						message: error instanceof Error ? error.message : String(error),
					});
				}
			}
		} catch (error) {
			warnings.push({
				entryId: "unknown",
				severity: "error",
				type: "parse-error",
				message: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
			});
		}

		return {
			entries,
			warnings,
			stats: {
				total: entries.length + warnings.filter((w) => w.severity === "error").length,
				successful: entries.length,
				withWarnings: warnings.filter((w) => w.severity === "warning").length,
				failed: warnings.filter((w) => w.severity === "error").length,
			},
		};
	}

	/**
	 * Safely convert unknown value to string for IDs
	 */
	private safeStringify(value: unknown): string {
		if (typeof value === "string") return value;
		if (typeof value === "number") return String(value);
		if (typeof value === "boolean") return String(value);
		return JSON.stringify(value);
	}

	/**
   * Parse a single CSL JSON item into BibEntry
   */
	private parseEntry(item: unknown, index: number): BibEntry {
		// Validate item is an object
		if (typeof item !== "object" || item === null) {
			throw new Error(`Entry at index ${index} is not an object`);
		}

		// Validate required fields using 'in' operator for type narrowing
		if (!("id" in item) || item.id === undefined || item.id === null) {
			throw new Error(`Entry at index ${index} missing required 'id' field`);
		}

		if (!("type" in item) || item.type === undefined || item.type === null) {
			const id = this.safeStringify(item.id);
			throw new Error(`Entry '${id}' missing required 'type' field`);
		}

		// Now we know item has id and type - extract them safely
		const entryId = this.safeStringify(item.id);

		// Create entry with metadata
		const entry: BibEntry = {
			id: entryId,
			type: this.normalizeType(item.type),
			_formatMetadata: {
				source: "csl-json",
			},
		};

		// Copy all other fields using Object.entries on the validated object
		for (const [key, value] of Object.entries(item)) {
			if (key === "id" || key === "type") {
				continue; // Already handled
			}

			// Store field in entry (BibEntry has index signature for dynamic access)
			entry[key] = value;
		}

		return entry;
	}

	/**
   * Normalize type field to CSLItemType
   */
	private normalizeType(type: unknown): CSLItemType {
		if (typeof type !== "string") {
			return "article"; // Fallback
		}

		// CSL JSON types should already be normalized
		// Just validate it's a known type
		const normalized = type.toLowerCase().replace(/_/g, "-");

		// Use type guard to check if normalized is valid
		if (isCSLItemType(normalized)) {
			return normalized;
		}

		return "article";
	}

	/**
   * Validate CSL JSON syntax
   */
	validate(content: string): ConversionWarning[] {
		const warnings: ConversionWarning[] = [];

		try {
			const parsed: unknown = JSON.parse(content);

			// Check if it's an array or object
			if (typeof parsed !== "object" || parsed === null) {
				warnings.push({
					entryId: "unknown",
					severity: "error",
					type: "validation-error",
					message: "CSL JSON must be an object or array of objects",
				});
				return warnings;
			}

			const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

			// Validate each item
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const itemId = getItemId(item, i);

				// Check if item is an object
				if (typeof item !== "object" || item === null) {
					warnings.push({
						entryId: `item-${i}`,
						severity: "error",
						type: "validation-error",
						message: `Item at index ${i} is not an object`,
					});
					continue;
				}

				// Use 'in' operator for type narrowing instead of type assertions
				if (!("id" in item) || item.id === undefined || item.id === null) {
					warnings.push({
						entryId: `item-${i}`,
						severity: "error",
						type: "validation-error",
						message: `Item at index ${i} missing required 'id' field`,
					});
				}

				if (!("type" in item) || item.type === undefined || item.type === null) {
					warnings.push({
						entryId: itemId,
						severity: "error",
						type: "validation-error",
						message: `Item '${itemId}' missing required 'type' field`,
					});
				}
			}

			if (items.length === 0) {
				warnings.push({
					entryId: "unknown",
					severity: "warning",
					type: "validation-error",
					message: "No entries found in CSL JSON",
				});
			}
		} catch (error) {
			warnings.push({
				entryId: "unknown",
				severity: "error",
				type: "parse-error",
				message: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
			});
		}

		return warnings;
	}
}

/**
 * Create a CSL JSON parser instance
 */
export function createCSLJSONParser(): Parser {
	return new CSLJSONParser();
}
