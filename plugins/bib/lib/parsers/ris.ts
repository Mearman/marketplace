/**
 * RIS Parser
 *
 * Parses RIS (Research Information Systems) format bibliography files.
 *
 * Format:
 * TY  - JOUR
 * AU  - Smith, John
 * AU  - Doe, Jane
 * TI  - Article Title
 * PY  - 2024
 * ER  -
 *
 * Handles:
 * - Multi-line tags (AU, KW, etc.)
 * - Both RIS 2001 and 2011 specifications
 * - Page ranges (SP/EP tags)
 */

import type { Parser, ConversionResult, ConversionWarning, BibEntry } from "../types.js";
import { normalizeToCslType } from "../mappings/entry-types.js";
import { getCslFieldFromRis } from "../mappings/fields.js";
import { parseName } from "./names.js";
import { parseDate } from "./dates.js";

/**
 * Raw RIS entry (before normalization)
 */
interface RawRISEntry {
  type: string;
  fields: Record<string, string[]>;
}

/**
 * RIS Parser Implementation
 */
export class RISParser implements Parser {
	format = "ris" as const;

	parse(content: string): ConversionResult {
		const entries: BibEntry[] = [];
		const warnings: ConversionWarning[] = [];

		const rawEntries = this.extractEntries(content);

		for (let i = 0; i < rawEntries.length; i++) {
			const raw = rawEntries[i];

			try {
				const entry = this.parseEntry(raw, i);
				entries.push(entry);
			} catch (error) {
				warnings.push({
					entryId: `entry-${i}`,
					severity: "error",
					type: "parse-error",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return {
			entries,
			warnings,
			stats: {
				total: rawEntries.length,
				successful: entries.length,
				withWarnings: warnings.filter((w) => w.severity === "warning").length,
				failed: warnings.filter((w) => w.severity === "error").length,
			},
		};
	}

	/**
   * Extract entries from RIS content.
   * Each entry starts with TY and ends with ER.
   */
	private extractEntries(content: string): RawRISEntry[] {
		const entries: RawRISEntry[] = [];
		const lines = content.split(/\r?\n/);

		let currentEntry: RawRISEntry | null = null;

		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines and comments
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}

			// Parse tag-value pair
			const match = trimmed.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/);

			if (!match) {
				continue; // Malformed line - skip
			}

			const tag = match[1];
			const value = match[2];

			// TY starts a new entry
			if (tag === "TY") {
				if (currentEntry) {
					entries.push(currentEntry);
				}
				currentEntry = {
					type: value,
					fields: {},
				};
				continue;
			}

			// ER ends the current entry
			if (tag === "ER") {
				if (currentEntry) {
					entries.push(currentEntry);
					currentEntry = null;
				}
				continue;
			}

			// Add field to current entry
			if (currentEntry) {
				if (!currentEntry.fields[tag]) {
					currentEntry.fields[tag] = [];
				}
				currentEntry.fields[tag].push(value);
			}
		}

		// Add last entry if not closed
		if (currentEntry) {
			entries.push(currentEntry);
		}

		return entries;
	}

	/**
   * Convert raw RIS entry to normalized BibEntry
   */
	private parseEntry(raw: RawRISEntry, index: number): BibEntry {
		const { type, fields } = raw;

		// Normalize type
		const cslType = normalizeToCslType(type, "ris");

		// Generate ID from first author + year, or use index
		const id = this.generateId(fields, index);

		const entry: BibEntry = {
			id,
			type: cslType,
			_formatMetadata: {
				source: "ris",
				originalType: type,
				customFields: {},
			},
		};

		// Parse fields
		for (const [tag, values] of Object.entries(fields)) {
			const cslField = getCslFieldFromRis(tag);

			if (!cslField) {
        // Unknown tag - store in metadata
        entry._formatMetadata!.customFields![tag] = values;
        continue;
			}

			// Handle multi-value fields
			if (tag === "AU" || tag === "A1") {
				// Authors - one per line
				entry.author = values.map((v) => parseName(v));
			} else if (tag === "ED" || tag === "A2") {
				// Editors
				entry.editor = values.map((v) => parseName(v));
			} else if (tag === "A3") {
				// Translators or Series Editors
				entry.translator = values.map((v) => parseName(v));
			} else if (tag === "KW") {
				// Keywords - join with semicolon
				entry.keyword = values.join("; ");
			} else if (tag === "PY" || tag === "Y1") {
				// Publication year/date
				const dateStr = values[0];
				entry.issued = parseDate(dateStr);
			} else if (tag === "Y2") {
				// Access date
				const dateStr = values[0];
				entry.accessed = parseDate(dateStr);
			} else if (tag === "SP") {
				// Start page - combine with EP if available
				const startPage = values[0];
				const endPage = fields.EP?.[0];
				entry.page = endPage ? `${startPage}-${endPage}` : startPage;
			} else if (tag === "EP" && !fields.SP) {
				// End page only (unusual)
				entry.page = values[0];
			} else {
				// Single-value field - use first value
				(entry as any)[cslField] = values[0];
			}
		}

		return entry;
	}

	/**
   * Generate entry ID from author + year
   */
	private generateId(fields: Record<string, string[]>, index: number): string {
		const authors = fields.AU || fields.A1 || [];
		const year = fields.PY || fields.Y1 || [];

		if (authors.length > 0) {
			// Extract first author's last name
			const firstAuthor = authors[0];
			const lastName = this.extractLastName(firstAuthor);

			if (year.length > 0) {
				const yearStr = year[0].split("/")[0]; // Extract year from YYYY/MM/DD
				return `${lastName}${yearStr}`;
			}

			return lastName;
		}

		return `entry${index + 1}`;
	}

	/**
   * Extract last name from "Last, First" format
   */
	private extractLastName(name: string): string {
		const parsed = parseName(name);

		if (parsed.family) {
			return parsed.family.toLowerCase().replace(/\s+/g, "");
		}

		if (parsed.literal) {
			return parsed.literal.toLowerCase().replace(/\s+/g, "");
		}

		return "unknown";
	}

	/**
   * Validate RIS format
   */
	validate(content: string): ConversionWarning[] {
		const warnings: ConversionWarning[] = [];
		const lines = content.split(/\r?\n/);

		let entryCount = 0;
		let inEntry = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (!line || line.startsWith("#")) {
				continue;
			}

			// Check line format
			if (!/^[A-Z][A-Z0-9]\s*-\s*/.test(line)) {
				warnings.push({
					entryId: "unknown",
					severity: "warning",
					type: "parse-error",
					message: `Line ${i + 1}: Invalid RIS format`,
				});
				continue;
			}

			const tag = line.substring(0, 2);

			if (tag === "TY") {
				if (inEntry) {
					warnings.push({
						entryId: "unknown",
						severity: "warning",
						type: "validation-error",
						message: `Line ${i + 1}: TY tag without ER tag to close previous entry`,
					});
				}
				inEntry = true;
				entryCount++;
			}

			if (tag === "ER") {
				if (!inEntry) {
					warnings.push({
						entryId: "unknown",
						severity: "warning",
						type: "validation-error",
						message: `Line ${i + 1}: ER tag without matching TY tag`,
					});
				}
				inEntry = false;
			}
		}

		if (inEntry) {
			warnings.push({
				entryId: "unknown",
				severity: "warning",
				type: "validation-error",
				message: "Unclosed entry (missing ER tag)",
			});
		}

		if (entryCount === 0) {
			warnings.push({
				entryId: "unknown",
				severity: "warning",
				type: "validation-error",
				message: "No entries found",
			});
		}

		return warnings;
	}
}

/**
 * Create a RIS parser instance
 */
export function createRISParser(): Parser {
	return new RISParser();
}
