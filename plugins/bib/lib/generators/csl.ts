/**
 * CSL JSON Generator
 *
 * Generates CSL JSON format from intermediate BibEntry format.
 *
 * CSL JSON is the intermediate format, so this is mostly serialization
 * with optional cleanup of internal metadata.
 */

import type { Generator, BibEntry, GeneratorOptions } from "../types.js";

/**
 * CSL JSON Generator Implementation
 */
export class CSLJSONGenerator implements Generator {
	format = "csl-json" as const;

	generate(entries: BibEntry[], options?: GeneratorOptions): string {
		const indent = options?.indent || "  ";
		const sort = options?.sort || false;

		// Sort entries if requested
		const sortedEntries = sort ? [...entries].sort((a, b) => a.id.localeCompare(b.id)) : entries;

		// Remove format metadata (internal use only)
		const cleanEntries = sortedEntries.map((entry) => {
			const { _formatMetadata, ...cleanEntry } = entry;
			return cleanEntry;
		});

		// Serialize to JSON
		return JSON.stringify(cleanEntries, null, indent);
	}
}

/**
 * Create a CSL JSON generator instance
 */
export function createCSLJSONGenerator(): Generator {
	return new CSLJSONGenerator();
}
