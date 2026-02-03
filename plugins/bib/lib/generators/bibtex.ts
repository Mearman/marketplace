/**
 * BibTeX Generator
 *
 * Generates BibTeX format from intermediate BibEntry format.
 *
 * Features:
 * - LaTeX encoding for special characters
 * - Proper field ordering
 * - Brace formatting
 * - Handling of lossy conversions (warnings for unsupported types)
 */

import type { Generator, BibEntry, GeneratorOptions, DateVariable, Person } from "../types.js";
import { denormalizeFromCslType } from "../mappings/entry-types.js";
import { getBibTeXField } from "../mappings/fields.js";
import { serializeNames } from "../parsers/names.js";
import { serializeBibTeXDate } from "../parsers/dates.js";
import { encodeLatex } from "../parsers/latex.js";

// Type guard for DateVariable
function isDateVariable(value: unknown): value is DateVariable {
	return (
		typeof value === "object" &&
		value !== null &&
		"date-parts" in value
	);
}

// Type guard for Person
function isPerson(value: unknown): value is Person {
	if (typeof value !== "object" || value === null) return false;
	// A Person must have at least family, given, or literal
	// Use 'in' operator for type narrowing instead of type assertions
	const hasFamily = "family" in value && typeof value.family === "string";
	const hasGiven = "given" in value && typeof value.given === "string";
	const hasLiteral = "literal" in value && typeof value.literal === "string";
	return hasFamily || hasGiven || hasLiteral;
}

// Type guard for Person array
function isPersonArray(value: unknown): value is Person[] {
	if (!Array.isArray(value)) return false;
	// Use explicit type checking to avoid 'any' issues with Array.isArray
	for (const item of value) {
		if (!isPerson(item)) return false;
	}
	return true;
}

// Type guard for valid BibEntry keys
function isValidBibEntryKey(key: string): key is Extract<keyof BibEntry, string> {
	const validKeys: Array<string> = [
		"id",
		"type",
		"author",
		"editor",
		"translator",
		"title",
		"container-title",
		"collection-title",
		"issued",
		"accessed",
		"volume",
		"issue",
		"page",
		"page-first",
		"publisher",
		"publisher-place",
		"DOI",
		"ISBN",
		"ISSN",
		"URL",
		"abstract",
		"keyword",
		"note",
		"genre",
		"version",
		"chapter-number",
		"medium",
		"title-short",
		"status",
		"archive",
		"archive_location",
		"call-number",
		"number-of-pages",
		"number-of-volumes",
		"references",
		"reviewed-title",
		"reviewed-author",
		"source",
		"short-title",
		"event-date",
		"event-title",
		"event-place",
		"event",
		"jurisdiction",
		"language",
		"license",
		"original-title",
		"original-date",
		"original-publisher",
		"original-publisher-place",
		"part-title",
		"part-number",
		"part-volume",
		"section",
		"supplement",
		"submitted",
		"dimensions",
		"scale",
		"categories",
		"citation-number",
		"collection-number",
		"collection-editor",
		"collection-editor-first",
		"collection-editor-last",
		"director",
		"composer",
		"illustrator",
		"original-author",
		"recipient",
		"interviewer",
		"container-author",
		"container-author-first",
		"container-author-last",
		"editor-first",
		"editor-last",
		"translator-first",
		"translator-last",
		"editorial-director",
		"issue-date",
		"keyword",
	];
	return validKeys.includes(key);
}

/**
 * BibTeX Generator Implementation
 */
export class BibTeXGenerator implements Generator {
	format = "bibtex" as const;

	generate(entries: BibEntry[], options?: GeneratorOptions): string {
		const indent = options?.indent || "  ";
		const lineEnding = options?.lineEnding || "\n";
		const sort = options?.sort || false;

		// Sort entries if requested
		const sortedEntries = sort ? [...entries].sort((a, b) => a.id.localeCompare(b.id)) : entries;

		const bibEntries: string[] = [];

		for (const entry of sortedEntries) {
			const bibEntry = this.generateEntry(entry, indent, lineEnding);
			bibEntries.push(bibEntry);
		}

		return bibEntries.join(lineEnding + lineEnding) + lineEnding;
	}

	/**
   * Generate a single BibTeX entry
   */
	private generateEntry(entry: BibEntry, indent: string, lineEnding: string): string {
		// Determine BibTeX entry type
		const { type: bibtexType } = denormalizeFromCslType(entry.type, "bibtex");

		// Start entry
		const lines: string[] = [`@${bibtexType}{${entry.id},`];

		// Field order (conventional BibTeX ordering)
		// Type as Array<Extract<keyof BibEntry, string>> for type-safe string-only property access
		const fieldOrder: Array<Extract<keyof BibEntry, string>> = [
			"author",
			"editor",
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
			"abstract",
			"keyword",
			"note",
		];

		// Generate fields
		const generatedFields = new Set<Extract<keyof BibEntry, string>>();

		for (const cslField of fieldOrder) {
			if (!(cslField in entry)) continue;
			const value = entry[cslField];
			if (value === undefined || value === null) continue;

			const bibtexField = getBibTeXField(cslField, bibtexType);
			if (!bibtexField) continue;

			const fieldLine = this.generateField(bibtexField, cslField, value);
			if (fieldLine) {
				lines.push(indent + fieldLine + ",");
				generatedFields.add(cslField);
			}
		}

		// Add any remaining fields not in fieldOrder
		for (const [cslField, value] of Object.entries(entry)) {
			if (cslField === "id" || cslField === "type" || cslField === "_formatMetadata") continue;
			if (!isValidBibEntryKey(cslField)) continue;
			if (generatedFields.has(cslField)) continue;
			if (value === undefined || value === null) continue;

			const bibtexField = getBibTeXField(cslField, bibtexType);
			if (!bibtexField) continue;

			const fieldLine = this.generateField(bibtexField, cslField, value);
			if (fieldLine) {
				lines.push(indent + fieldLine + ",");
			}
		}

		// Remove trailing comma from last field
		if (lines.length > 1) {
			const lastLine = lines[lines.length - 1];
			lines[lines.length - 1] = lastLine.slice(0, -1);
		}

		// Close entry
		lines.push("}");

		return lines.join(lineEnding);
	}

	/**
   * Generate a single field
   */
	private generateField(bibtexField: string, cslField: string, value: unknown): string | null {
		// Handle special field types
		if (cslField === "author" || cslField === "editor" || cslField === "translator") {
			// Name fields - validate it's a Person array
			if (!isPersonArray(value) || value.length === 0) return null;
			// Explicitly type the persons array after validation
			const persons: Person[] = value;
			const names = serializeNames(persons, " and ", "bibtex");
			const encoded = encodeLatex(names);
			return `${bibtexField} = {${encoded}}`;
		}

		if (cslField === "issued") {
			// Date field - expand to year/month/day
			if (!isDateVariable(value)) return null;
			const dateFields = serializeBibTeXDate(value);
			const parts: string[] = [];

			if (dateFields.year) {
				parts.push(`year = {${dateFields.year}}`);
			}
			if (dateFields.month) {
				parts.push(`month = ${dateFields.month}`); // Month macros don't need braces
			}
			if (dateFields.day) {
				parts.push(`day = {${dateFields.day}}`);
			}

			return parts.length > 0 ? parts.join(",\n  ") : null;
		}

		if (cslField === "accessed") {
			// Access date
			if (!isDateVariable(value)) return null;
			const dateFields = serializeBibTeXDate(value);
			if (dateFields.year) {
				return `urldate = {${dateFields.year}${dateFields.month ? "-" + dateFields.month : ""}${
					dateFields.day ? "-" + dateFields.day : ""
				}}`;
			}
			return null;
		}

		// String fields
		if (typeof value === "string") {
			const encoded = encodeLatex(value);
			return `${bibtexField} = {${encoded}}`;
		}

		// Number fields
		if (typeof value === "number") {
			return `${bibtexField} = {${value}}`;
		}

		// Unknown type - skip
		return null;
	}
}

/**
 * Create a BibTeX generator instance
 */
export function createBibTeXGenerator(): Generator {
	return new BibTeXGenerator();
}
