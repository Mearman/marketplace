/**
 * EndNote XML Generator
 *
 * Generates EndNote XML format from intermediate BibEntry format.
 */

import type { Generator, BibEntry, GeneratorOptions } from "../types.js";
import { denormalizeFromCslType } from "../mappings/entry-types.js";
import { serializeName } from "../parsers/names.js";
import { serializeDate } from "../parsers/dates.js";

/**
 * EndNote XML Generator Implementation
 */
export class EndNoteXMLGenerator implements Generator {
  format = "endnote" as const;

  generate(entries: BibEntry[], options?: GeneratorOptions): string {
    const indent = options?.indent || "  ";
    const lineEnding = options?.lineEnding || "\n";
    const sort = options?.sort || false;

    // Sort entries if requested
    const sortedEntries = sort ? [...entries].sort((a, b) => a.id.localeCompare(b.id)) : entries;

    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push("<xml>");
    lines.push(`${indent}<records>`);

    // Generate records
    for (const entry of sortedEntries) {
      const recordLines = this.generateEntry(entry, indent, lineEnding);
      lines.push(...recordLines);
    }

    // Close tags
    lines.push(`${indent}</records>`);
    lines.push("</xml>");

    return lines.join(lineEnding) + lineEnding;
  }

  /**
   * Generate a single EndNote record
   */
  private generateEntry(entry: BibEntry, indent: string, lineEnding: string): string[] {
    const lines: string[] = [];
    const i1 = indent + indent; // level 1 indent
    const i2 = i1 + indent; // level 2 indent
    const i3 = i2 + indent; // level 3 indent

    // Determine EndNote ref-type
    const { type: endnoteType } = denormalizeFromCslType(entry.type, "endnote");

    lines.push(`${i1}<record>`);

    // ref-type
    lines.push(`${i2}<ref-type name="${this.escapeXml(endnoteType)}">0</ref-type>`);

    // Contributors
    if (entry.author || entry.editor) {
      lines.push(`${i2}<contributors>`);

      if (entry.author && entry.author.length > 0) {
        lines.push(`${i3}<authors>`);
        for (const person of entry.author) {
          const name = serializeName(person, "bibtex");
          lines.push(`${i3 + indent}<author>${this.escapeXml(name)}</author>`);
        }
        lines.push(`${i3}</authors>`);
      }

      if (entry.editor && entry.editor.length > 0) {
        lines.push(`${i3}<secondary-authors>`);
        for (const person of entry.editor) {
          const name = serializeName(person, "bibtex");
          lines.push(`${i3 + indent}<author>${this.escapeXml(name)}</author>`);
        }
        lines.push(`${i3}</secondary-authors>`);
      }

      lines.push(`${i2}</contributors>`);
    }

    // Titles
    if (entry.title || entry["container-title"]) {
      lines.push(`${i2}<titles>`);

      if (entry.title) {
        lines.push(`${i3}<title>${this.escapeXml(entry.title)}</title>`);
      }

      if (entry["container-title"]) {
        lines.push(`${i3}<secondary-title>${this.escapeXml(entry["container-title"])}</secondary-title>`);
      }

      lines.push(`${i2}</titles>`);
    }

    // Dates
    if (entry.issued) {
      lines.push(`${i2}<dates>`);
      const yearStr = serializeDate(entry.issued).split("-")[0]; // Extract year
      lines.push(`${i3}<year>${this.escapeXml(yearStr)}</year>`);
      lines.push(`${i2}</dates>`);
    }

    // Other fields
    if (entry.volume) {
      lines.push(`${i2}<volume>${this.escapeXml(String(entry.volume))}</volume>`);
    }

    if (entry.issue) {
      lines.push(`${i2}<number>${this.escapeXml(String(entry.issue))}</number>`);
    }

    if (entry.page) {
      lines.push(`${i2}<pages>${this.escapeXml(entry.page)}</pages>`);
    }

    if (entry.publisher) {
      lines.push(`${i2}<publisher>${this.escapeXml(entry.publisher)}</publisher>`);
    }

    if (entry["publisher-place"]) {
      lines.push(`${i2}<pub-location>${this.escapeXml(entry["publisher-place"])}</pub-location>`);
    }

    if (entry.DOI) {
      lines.push(`${i2}<electronic-resource-num>${this.escapeXml(entry.DOI)}</electronic-resource-num>`);
    }

    if (entry.URL) {
      lines.push(`${i2}<urls>`);
      lines.push(`${i3}<related-urls>`);
      lines.push(`${i3 + indent}<url>${this.escapeXml(entry.URL)}</url>`);
      lines.push(`${i3}</related-urls>`);
      lines.push(`${i2}</urls>`);
    }

    if (entry.abstract) {
      lines.push(`${i2}<abstract>${this.escapeXml(entry.abstract)}</abstract>`);
    }

    if (entry.keyword) {
      lines.push(`${i2}<keywords>`);
      lines.push(`${i3}<keyword>${this.escapeXml(entry.keyword)}</keyword>`);
      lines.push(`${i2}</keywords>`);
    }

    lines.push(`${i1}</record>`);

    return lines;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

/**
 * Create an EndNote XML generator instance
 */
export function createEndNoteXMLGenerator(): Generator {
  return new EndNoteXMLGenerator();
}
