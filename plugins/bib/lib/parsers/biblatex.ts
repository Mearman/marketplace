/**
 * BibLaTeX Parser
 *
 * Handles BibLaTeX-specific features:
 * - Additional entry types (dataset, software, online, etc.)
 * - Additional fields (journaltitle, location, etc.)
 * - Extended date handling
 *
 * BibLaTeX is a superset of BibTeX, so we reuse the BibTeX parser
 * implementation through delegation.
 */

import { BibTeXParser } from "./bibtex.js";
import type { Parser, ConversionResult, ConversionWarning } from "../types.js";

/**
 * BibLaTeX Parser Implementation
 *
 * Delegates to BibTeXParser since BibLaTeX syntax is identical to BibTeX.
 * The mapping tables already handle BibLaTeX-specific types and fields.
 */
export class BibLaTeXParser implements Parser {
	format = "biblatex" as const;

	private bibtexParser: BibTeXParser;

	constructor() {
		this.bibtexParser = new BibTeXParser();
	}

	/**
   * Parse BibLaTeX content using BibTeX parser.
   *
   * BibLaTeX uses the same syntax as BibTeX but recognizes additional
   * entry types and fields. The mapping tables handle these differences.
   */
	parse(content: string): ConversionResult {
		const result = this.bibtexParser.parse(content);

		// Update metadata to indicate BibLaTeX source
		for (const entry of result.entries) {
			if (entry._formatMetadata) {
				entry._formatMetadata.source = "biblatex";
			}
		}

		return result;
	}

	/**
   * Validate BibLaTeX syntax (same as BibTeX)
   */
	validate(content: string): ConversionWarning[] {
		return this.bibtexParser.validate?.(content) || [];
	}
}

/**
 * Create a BibLaTeX parser instance
 */
export function createBibLaTeXParser(): Parser {
	return new BibLaTeXParser();
}
