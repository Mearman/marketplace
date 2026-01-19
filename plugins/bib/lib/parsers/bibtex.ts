/**
 * BibTeX Parser
 *
 * Parses BibTeX format bibliography files into intermediate BibEntry format.
 *
 * Handles:
 * - Entry types: @article{key, ...}
 * - Nested braces: {The {RNA} World}
 * - String macros: @string{PREFIX = "Dr."}
 * - String concatenation: author # " " # suffix
 * - Crossref references: crossref = {otherkey}
 * - Comments and preambles
 */

import type { Parser, ConversionResult, ConversionWarning, BibEntry } from "../types.js";
import { normalizeToCslType } from "../mappings/entry-types.js";
import { getCslFieldFromBibTeX } from "../mappings/fields.js";
import { parseNames } from "./names.js";
import { parseBibTeXDate } from "./dates.js";
import { decodeLatex } from "../../../../lib/latex/index.js";

/**
 * Parsed BibTeX entry (raw format before normalization)
 */
interface RawBibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

/**
 * BibTeX Parser Implementation
 */
export class BibTeXParser implements Parser {
	format = "bibtex" as const;

	/** @string macro definitions */
	private strings: Record<string, string> = {};

	parse(content: string): ConversionResult {
		const entries: BibEntry[] = [];
		const warnings: ConversionWarning[] = [];

		// Reset string macros
		this.strings = {};

		// Extract all entries
		const rawEntries = this.extractEntries(content);

		for (const raw of rawEntries) {
			try {
				const entry = this.parseEntry(raw);
				entries.push(entry);
			} catch (error) {
				warnings.push({
					entryId: raw.key || "unknown",
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
   * Extract all entries from BibTeX content.
   * Handles @entry{...}, @string{...}, @preamble{...}, @comment{...}
   */
	private extractEntries(content: string): RawBibTeXEntry[] {
		const entries: RawBibTeXEntry[] = [];

		// Remove line comments (%)
		const cleanContent = content.replace(/%.*$/gm, "");

		// Find all @ entries
		const entryRegex = /@(\w+)\s*\{/g;
		let match: RegExpExecArray | null;

		while ((match = entryRegex.exec(cleanContent)) !== null) {
			const type = match[1].toLowerCase();

			// Find matching closing brace
			const bodyStart = match.index + match[0].length;
			const bodyEnd = this.findMatchingBrace(cleanContent, bodyStart - 1);

			if (bodyEnd === -1) {
				continue; // Skip malformed entries
			}

			const body = cleanContent.substring(bodyStart, bodyEnd);

			// Handle special entry types
			if (type === "string") {
				this.parseStringMacro(body);
				continue;
			}

			if (type === "preamble" || type === "comment") {
				continue; // Ignore preambles and comments
			}

			// Parse regular entry
			const entry = this.parseEntryBody(type, body);
			if (entry) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
   * Find matching closing brace for an opening brace.
   */
	private findMatchingBrace(content: string, openPos: number): number {
		let depth = 1;
		let pos = openPos + 1;

		while (pos < content.length && depth > 0) {
			const char = content[pos];

			if (char === "{") {
				depth++;
			} else if (char === "}") {
				depth--;
			}

			if (depth === 0) {
				return pos;
			}

			pos++;
		}

		return -1; // No matching brace found
	}

	/**
   * Parse @string{name = "value"} macro
   */
	private parseStringMacro(body: string): void {
		const match = body.match(/^\s*(\w+)\s*=\s*(.+)\s*$/);
		if (match) {
			const name = match[1];
			const value = this.parseFieldValue(match[2].trim());
			this.strings[name.toLowerCase()] = value;
		}
	}

	/**
   * Parse entry body: key, field1 = value1, field2 = value2, ...
   */
	private parseEntryBody(type: string, body: string): RawBibTeXEntry | null {
		// Extract citation key (first item before comma)
		const keyMatch = body.match(/^\s*([^,]+)\s*,/);
		if (!keyMatch) {
			return null;
		}

		const key = keyMatch[1].trim();

		// Parse fields
		const fields: Record<string, string> = {};
		const fieldsStr = body.substring(keyMatch[0].length);

		// Split by commas (but not commas inside braces)
		const fieldPairs = this.splitFields(fieldsStr);

		for (const pair of fieldPairs) {
			const eqPos = pair.indexOf("=");
			if (eqPos === -1) continue;

			const fieldName = pair.substring(0, eqPos).trim().toLowerCase();
			const fieldValue = pair.substring(eqPos + 1).trim();

			if (fieldName && fieldValue) {
				fields[fieldName] = this.parseFieldValue(fieldValue);
			}
		}

		return { type, key, fields };
	}

	/**
   * Split fields by comma, respecting braces.
   */
	private splitFields(fieldsStr: string): string[] {
		const fields: string[] = [];
		let current = "";
		let depth = 0;

		for (let i = 0; i < fieldsStr.length; i++) {
			const char = fieldsStr[i];

			if (char === "{") {
				depth++;
				current += char;
			} else if (char === "}") {
				depth--;
				current += char;
			} else if (char === "," && depth === 0) {
				if (current.trim()) {
					fields.push(current.trim());
				}
				current = "";
			} else {
				current += char;
			}
		}

		// Add last field
		if (current.trim()) {
			fields.push(current.trim());
		}

		return fields;
	}

	/**
   * Parse field value: {value}, "value", or macro # concatenation
   */
	private parseFieldValue(value: string): string {
		// Handle string concatenation: prefix # " " # suffix
		if (value.includes("#")) {
			const parts = value.split("#").map((p) => this.parseSingleValue(p.trim()));
			return parts.join("");
		}

		return this.parseSingleValue(value);
	}

	/**
   * Parse single value: {value}, "value", or macro name
   */
	private parseSingleValue(value: string): string {
		// Braced value: {The Title}
		if (value.startsWith("{") && value.endsWith("}")) {
			return value.slice(1, -1);
		}

		// Quoted value: "The Title"
		if (value.startsWith("\"") && value.endsWith("\"")) {
			return value.slice(1, -1);
		}

		// Number
		if (/^\d+$/.test(value)) {
			return value;
		}

		// Macro reference
		const macroValue = this.strings[value.toLowerCase()];
		if (macroValue) {
			return macroValue;
		}

		// Unknown - return as-is
		return value;
	}

	/**
   * Convert raw BibTeX entry to normalized BibEntry
   */
	private parseEntry(raw: RawBibTeXEntry): BibEntry {
		const { type, key, fields } = raw;

		// Normalize entry type
		const cslType = normalizeToCslType(type, "bibtex");

		const entry: BibEntry = {
			id: key,
			type: cslType,
			_formatMetadata: {
				source: "bibtex",
				originalType: type,
				customFields: {},
			},
		};

		// Parse known fields
		for (const [bibtexField, value] of Object.entries(fields)) {
			const cslField = getCslFieldFromBibTeX(bibtexField);

			if (!cslField) {
        // Unknown field - store in metadata
        entry._formatMetadata!.customFields![bibtexField] = value;
        continue;
			}

			// Decode LaTeX
			const decodedValue = decodeLatex(value);

			// Handle field transformations
			if (cslField === "author" || cslField === "editor" || cslField === "translator") {
				// Parse names
				entry[cslField] = parseNames(decodedValue, " and ");
			} else if (cslField === "issued") {
				// Parse date from year/month/day fields
				const year = fields.year;
				const month = fields.month;
				const day = fields.day;
				const issued = parseBibTeXDate(year, month, day);
				if (issued) {
					entry.issued = issued;
				}
			} else if (cslField === "accessed") {
				// Parse urldate
				const urldate = fields.urldate;
				if (urldate) {
					const accessed = parseBibTeXDate(urldate);
					if (accessed) {
						entry.accessed = accessed;
					}
				}
			} else {
				// Direct mapping
				(entry as Record<string, unknown>)[cslField] = decodedValue;
			}
		}

		return entry;
	}

	/**
   * Validate BibTeX syntax (optional implementation)
   */
	validate(content: string): ConversionWarning[] {
		const warnings: ConversionWarning[] = [];

		// Check for unmatched braces
		let braceDepth = 0;
		for (let i = 0; i < content.length; i++) {
			if (content[i] === "{") braceDepth++;
			if (content[i] === "}") braceDepth--;
			if (braceDepth < 0) {
				warnings.push({
					entryId: "unknown",
					severity: "error",
					type: "parse-error",
					message: `Unmatched closing brace at position ${i}`,
				});
				break;
			}
		}

		if (braceDepth > 0) {
			warnings.push({
				entryId: "unknown",
				severity: "error",
				type: "parse-error",
				message: `${braceDepth} unclosed braces`,
			});
		}

		// Check for entries
		const entryCount = (content.match(/@\w+\s*\{/g) || []).length;
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
 * Create a BibTeX parser instance
 */
export function createBibTeXParser(): Parser {
	return new BibTeXParser();
}
