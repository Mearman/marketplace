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

import type { Generator, BibEntry, GeneratorOptions } from "../types.js";
import { denormalizeFromCslType } from "../mappings/entry-types.js";
import { getBibTeXField } from "../mappings/fields.js";
import { serializeNames } from "../parsers/names.js";
import { serializeBibTeXDate } from "../parsers/dates.js";
import { encodeLatex } from "../parsers/latex.js";

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
    const { type: bibtexType, lossy } = denormalizeFromCslType(entry.type, "bibtex");

    // Start entry
    const lines: string[] = [`@${bibtexType}{${entry.id},`];

    // Field order (conventional BibTeX ordering)
    const fieldOrder = [
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
    const generatedFields = new Set<string>();

    for (const cslField of fieldOrder) {
      const value = (entry as any)[cslField];
      if (value === undefined || value === null) continue;

      const bibtexField = getBibTeXField(cslField, bibtexType);
      if (!bibtexField) continue;

      const fieldLine = this.generateField(bibtexField, cslField, value, entry);
      if (fieldLine) {
        lines.push(indent + fieldLine + ",");
        generatedFields.add(cslField);
      }
    }

    // Add any remaining fields not in fieldOrder
    for (const [cslField, value] of Object.entries(entry)) {
      if (cslField === "id" || cslField === "type" || cslField === "_formatMetadata") continue;
      if (generatedFields.has(cslField)) continue;
      if (value === undefined || value === null) continue;

      const bibtexField = getBibTeXField(cslField, bibtexType);
      if (!bibtexField) continue;

      const fieldLine = this.generateField(bibtexField, cslField, value, entry);
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
  private generateField(bibtexField: string, cslField: string, value: any, entry: BibEntry): string | null {
    // Handle special field types
    if (cslField === "author" || cslField === "editor" || cslField === "translator") {
      // Name fields
      if (!Array.isArray(value) || value.length === 0) return null;
      const names = serializeNames(value, " and ", "bibtex");
      const encoded = encodeLatex(names);
      return `${bibtexField} = {${encoded}}`;
    }

    if (cslField === "issued") {
      // Date field - expand to year/month/day
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
