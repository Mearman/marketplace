/**
 * EndNote XML Parser
 *
 * Parses EndNote XML format bibliography files.
 *
 * Format:
 * <xml>
 *   <records>
 *     <record>
 *       <ref-type name="Journal Article">17</ref-type>
 *       <contributors>
 *         <authors>
 *           <author>Smith, John</author>
 *         </authors>
 *       </contributors>
 *       <titles>
 *         <title>Article Title</title>
 *       </titles>
 *       <dates>
 *         <year>2024</year>
 *       </dates>
 *     </record>
 *   </records>
 * </xml>
 */

import type { Parser, ConversionResult, ConversionWarning, BibEntry } from "../types.js";
import { normalizeToCslType } from "../mappings/entry-types.js";
import { parseName } from "./names.js";
import { parseDate } from "./dates.js";

/**
 * EndNote XML Parser Implementation
 *
 * Note: This is a simplified parser that handles common EndNote XML structure.
 * A full implementation would use an XML parser library, but we're implementing
 * a basic regex-based parser to avoid dependencies.
 */
export class EndNoteXMLParser implements Parser {
	format = "endnote" as const;

	parse(content: string): ConversionResult {
		const entries: BibEntry[] = [];
		const warnings: ConversionWarning[] = [];

		try {
			// Extract all <record> elements
			const records = this.extractRecords(content);

			for (let i = 0; i < records.length; i++) {
				try {
					const entry = this.parseRecord(records[i], i);
					entries.push(entry);
				} catch (error) {
					warnings.push({
						entryId: `record-${i}`,
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
				message: `XML parse error: ${error instanceof Error ? error.message : String(error)}`,
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
   * Extract all <record> elements
   */
	private extractRecords(content: string): string[] {
		const records: string[] = [];
		const recordRegex = /<record>([\s\S]*?)<\/record>/gi;
		let match: RegExpExecArray | null;

		while ((match = recordRegex.exec(content)) !== null) {
			records.push(match[1]);
		}

		return records;
	}

	/**
   * Parse a single <record> element
   */
	private parseRecord(recordXml: string, index: number): BibEntry {
		// Extract ref-type
		const refType = this.extractTag(recordXml, "ref-type");
		const refTypeAttr = refType.match(/name="([^"]+)"/);
		const typeName = refTypeAttr ? refTypeAttr[1] : "Journal Article";

		// Normalize type
		const cslType = normalizeToCslType(typeName, "endnote");

		// Generate ID
		const id = this.generateId(recordXml, index);

		const entry: BibEntry = {
			id,
			type: cslType,
			_formatMetadata: {
				source: "endnote",
				originalType: typeName,
				customFields: {},
			},
		};

		// Extract contributors
		const authors = this.extractAuthors(recordXml);
		if (authors.length > 0) {
			entry.author = authors;
		}

		const editors = this.extractEditors(recordXml);
		if (editors.length > 0) {
			entry.editor = editors;
		}

		// Extract titles
		const title = this.extractTag(recordXml, "title");
		if (title) {
			entry.title = this.stripTags(title);
		}

		const secondaryTitle = this.extractTag(recordXml, "secondary-title");
		if (secondaryTitle) {
			entry["container-title"] = this.stripTags(secondaryTitle);
		}

		// Extract dates
		const year = this.extractTag(recordXml, "year");
		if (year) {
			entry.issued = parseDate(this.stripTags(year));
		}

		// Extract other fields
		const volume = this.extractTag(recordXml, "volume");
		if (volume) {
			entry.volume = this.stripTags(volume);
		}

		const issue = this.extractTag(recordXml, "number");
		if (issue) {
			entry.issue = this.stripTags(issue);
		}

		const pages = this.extractTag(recordXml, "pages");
		if (pages) {
			entry.page = this.stripTags(pages);
		}

		const publisher = this.extractTag(recordXml, "publisher");
		if (publisher) {
			entry.publisher = this.stripTags(publisher);
		}

		const doi = this.extractTag(recordXml, "doi") || this.extractTag(recordXml, "electronic-resource-num");
		if (doi) {
			entry.DOI = this.stripTags(doi);
		}

		const url = this.extractTag(recordXml, "url");
		if (url) {
			entry.URL = this.stripTags(url);
		}

		const abstract = this.extractTag(recordXml, "abstract");
		if (abstract) {
			entry.abstract = this.stripTags(abstract);
		}

		const keywords = this.extractTag(recordXml, "keywords");
		if (keywords) {
			entry.keyword = this.stripTags(keywords);
		}

		return entry;
	}

	/**
   * Extract tag content
   */
	private extractTag(xml: string, tagName: string): string {
		const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
		const match = xml.match(regex);
		return match ? match[1].trim() : "";
	}

	/**
   * Extract authors from contributors section
   */
	private extractAuthors(xml: string): any[] {
		const authorsSection = this.extractTag(xml, "authors");
		if (!authorsSection) return [];

		const authorRegex = /<author>([^<]+)<\/author>/gi;
		const authors: any[] = [];
		let match: RegExpExecArray | null;

		while ((match = authorRegex.exec(authorsSection)) !== null) {
			authors.push(parseName(match[1].trim()));
		}

		return authors;
	}

	/**
   * Extract editors from contributors section
   */
	private extractEditors(xml: string): any[] {
		const editorsSection = this.extractTag(xml, "editors") || this.extractTag(xml, "secondary-authors");
		if (!editorsSection) return [];

		const editorRegex = /<(?:editor|author)>([^<]+)<\/(?:editor|author)>/gi;
		const editors: any[] = [];
		let match: RegExpExecArray | null;

		while ((match = editorRegex.exec(editorsSection)) !== null) {
			editors.push(parseName(match[1].trim()));
		}

		return editors;
	}

	/**
   * Strip XML tags from string
   */
	private stripTags(str: string): string {
		return str
			.replace(/<[^>]+>/g, "")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, "\"")
			.replace(/&apos;/g, "'")
			.trim();
	}

	/**
   * Generate entry ID from title + year
   */
	private generateId(xml: string, index: number): string {
		const title = this.extractTag(xml, "title");
		const year = this.extractTag(xml, "year");

		if (title) {
			const cleanTitle = this.stripTags(title);
			const firstWord = cleanTitle.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");

			if (year) {
				const yearStr = this.stripTags(year);
				return `${firstWord}${yearStr}`;
			}

			return firstWord || `entry${index + 1}`;
		}

		return `entry${index + 1}`;
	}

	/**
   * Validate EndNote XML
   */
	validate(content: string): ConversionWarning[] {
		const warnings: ConversionWarning[] = [];

		// Check for XML structure
		if (!content.includes("<record>")) {
			warnings.push({
				entryId: "unknown",
				severity: "error",
				type: "validation-error",
				message: "No <record> elements found in EndNote XML",
			});
		}

		// Count records
		const recordCount = (content.match(/<record>/g) || []).length;
		if (recordCount === 0) {
			warnings.push({
				entryId: "unknown",
				severity: "warning",
				type: "validation-error",
				message: "No records found",
			});
		}

		return warnings;
	}
}

/**
 * Create an EndNote XML parser instance
 */
export function createEndNoteXMLParser(): Parser {
	return new EndNoteXMLParser();
}
