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
 * CSL JSON Parser Implementation
 */
export class CSLJSONParser implements Parser {
	format = "csl-json" as const;

	parse(content: string): ConversionResult {
		const entries: BibEntry[] = [];
		const warnings: ConversionWarning[] = [];

		try {
			const parsed = JSON.parse(content);

			// Handle both array and single object
			const items = Array.isArray(parsed) ? parsed : [parsed];

			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				try {
					const entry = this.parseEntry(item, i);
					entries.push(entry);
				} catch (error) {
					warnings.push({
						entryId: item.id || `item-${i}`,
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
   * Parse a single CSL JSON item into BibEntry
   */
	private parseEntry(item: any, index: number): BibEntry {
		// Validate required fields
		if (!item.id) {
			throw new Error(`Entry at index ${index} missing required 'id' field`);
		}

		if (!item.type) {
			throw new Error(`Entry '${item.id}' missing required 'type' field`);
		}

		// Create entry with metadata
		const entry: BibEntry = {
			id: String(item.id),
			type: this.normalizeType(item.type),
			_formatMetadata: {
				source: "csl-json",
			},
		};

		// Copy all other fields
		for (const [key, value] of Object.entries(item)) {
			if (key === "id" || key === "type") {
				continue; // Already handled
			}

			// Store field in entry
			(entry as any)[key] = value;
		}

		return entry;
	}

	/**
   * Normalize type field to CSLItemType
   */
	private normalizeType(type: any): CSLItemType {
		if (typeof type !== "string") {
			return "article"; // Fallback
		}

		// CSL JSON types should already be normalized
		// Just validate it's a known type
		const normalized = type.toLowerCase().replace(/_/g, "_");

		// If unknown type, fall back to article
		return normalized as CSLItemType;
	}

	/**
   * Validate CSL JSON syntax
   */
	validate(content: string): ConversionWarning[] {
		const warnings: ConversionWarning[] = [];

		try {
			const parsed = JSON.parse(content);

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

			const items = Array.isArray(parsed) ? parsed : [parsed];

			// Validate each item
			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				if (!item.id) {
					warnings.push({
						entryId: `item-${i}`,
						severity: "error",
						type: "validation-error",
						message: `Item at index ${i} missing required 'id' field`,
					});
				}

				if (!item.type) {
					warnings.push({
						entryId: item.id || `item-${i}`,
						severity: "error",
						type: "validation-error",
						message: `Item '${item.id || i}' missing required 'type' field`,
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
