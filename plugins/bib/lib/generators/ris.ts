/**
 * RIS Generator
 *
 * Generates RIS format from intermediate BibEntry format.
 *
 * Format:
 * TY  - JOUR
 * AU  - Smith, John
 * TI  - Article Title
 * PY  - 2024
 * ER  -
 */

import type { Generator, BibEntry, GeneratorOptions } from "../types.js";
import { denormalizeFromCslType } from "../mappings/entry-types.js";
import { getRisTag } from "../mappings/fields.js";
import { serializeName } from "../parsers/names.js";
import { serializeRISDate } from "../parsers/dates.js";

/**
 * RIS Generator Implementation
 */
export class RISGenerator implements Generator {
	format = "ris" as const;

	generate(entries: BibEntry[], options?: GeneratorOptions): string {
		const lineEnding = options?.lineEnding || "\n";
		const sort = options?.sort || false;

		// Sort entries if requested
		const sortedEntries = sort ? [...entries].sort((a, b) => a.id.localeCompare(b.id)) : entries;

		const risRecords: string[] = [];

		for (const entry of sortedEntries) {
			const risRecord = this.generateEntry(entry, lineEnding);
			risRecords.push(risRecord);
		}

		return risRecords.join(lineEnding) + lineEnding;
	}

	/**
   * Generate a single RIS entry
   */
	private generateEntry(entry: BibEntry, lineEnding: string): string {
		const lines: string[] = [];

		// Determine RIS type
		const { type: risType } = denormalizeFromCslType(entry.type, "ris");

		// TY tag (entry type)
		lines.push(`TY  - ${risType}`);

		// Field order (conventional RIS ordering)
		const fieldOrder = [
			"author",
			"editor",
			"translator",
			"title",
			"container-title",
			"issued",
			"volume",
			"issue",
			"page",
			"publisher",
			"publisher-place",
			"DOI",
			"ISBN",
			"ISSN",
			"URL",
			"accessed",
			"abstract",
			"keyword",
			"note",
		];

		for (const cslField of fieldOrder) {
			const value = (entry as any)[cslField];
			if (value === undefined || value === null) continue;

			const fieldLines = this.generateField(cslField, value);
			lines.push(...fieldLines);
		}

		// ER tag (end of record)
		lines.push("ER  - ");

		return lines.join(lineEnding);
	}

	/**
   * Generate field lines for a CSL field
   */
	private generateField(cslField: string, value: any): string[] {
		const lines: string[] = [];

		// Handle special field types
		if (cslField === "author") {
			// Authors - one per line with AU tag
			if (Array.isArray(value)) {
				for (const person of value) {
					const name = serializeName(person, "bibtex"); // Use BibTeX format: Last, First
					lines.push(`AU  - ${name}`);
				}
			}
			return lines;
		}

		if (cslField === "editor") {
			// Editors
			if (Array.isArray(value)) {
				for (const person of value) {
					const name = serializeName(person, "bibtex");
					lines.push(`ED  - ${name}`);
				}
			}
			return lines;
		}

		if (cslField === "translator") {
			// Translators (A3 tag)
			if (Array.isArray(value)) {
				for (const person of value) {
					const name = serializeName(person, "bibtex");
					lines.push(`A3  - ${name}`);
				}
			}
			return lines;
		}

		if (cslField === "keyword") {
			// Keywords - split by semicolon
			if (typeof value === "string") {
				const keywords = value.split(/[;,]/).map((k) => k.trim());
				for (const keyword of keywords) {
					if (keyword) {
						lines.push(`KW  - ${keyword}`);
					}
				}
			}
			return lines;
		}

		if (cslField === "issued") {
			// Publication date
			const dateStr = serializeRISDate(value);
			if (dateStr) {
				lines.push(`PY  - ${dateStr}`);
			}
			return lines;
		}

		if (cslField === "accessed") {
			// Access date
			const dateStr = serializeRISDate(value);
			if (dateStr) {
				lines.push(`Y2  - ${dateStr}`);
			}
			return lines;
		}

		if (cslField === "page") {
			// Page range - split into SP and EP
			if (typeof value === "string") {
				const match = value.match(/^(\d+)\s*[-–]\s*(\d+)$/);
				if (match) {
					lines.push(`SP  - ${match[1]}`);
					lines.push(`EP  - ${match[2]}`);
				} else {
					lines.push(`SP  - ${value}`);
				}
			}
			return lines;
		}

		// Get RIS tag for this field
		const risTag = getRisTag(cslField);
		if (!risTag) return lines;

		// String or number fields
		if (typeof value === "string" || typeof value === "number") {
			lines.push(`${risTag}  - ${value}`);
		}

		return lines;
	}
}

/**
 * Create a RIS generator instance
 */
export function createRISGenerator(): Generator {
	return new RISGenerator();
}
