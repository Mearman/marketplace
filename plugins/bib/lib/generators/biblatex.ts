/**
 * BibLaTeX Generator
 *
 * Generates BibLaTeX format from intermediate BibEntry format.
 *
 * BibLaTeX extends BibTeX with:
 * - Additional entry types (dataset, software, online, etc.)
 * - Additional fields (journaltitle, location, date, etc.)
 * - No lossy conversions for modern types
 */

import { BibTeXGenerator } from "./bibtex.js";
import type { Generator, BibEntry, GeneratorOptions } from "../types.js";

/**
 * BibLaTeX Generator Implementation
 *
 * Delegates to BibTeX generator since the syntax is identical.
 * The mapping tables handle BibLaTeX-specific types and fields.
 */
export class BibLaTeXGenerator implements Generator {
	format = "biblatex" as const;

	private bibtexGenerator: BibTeXGenerator;

	constructor() {
		this.bibtexGenerator = new BibTeXGenerator();
	}

	/**
   * Generate BibLaTeX output.
   *
   * Uses the same generation logic as BibTeX, but mapping tables
   * will use BibLaTeX types (dataset, software, online) and fields
   * (journaltitle, location) instead of BibTeX equivalents.
   */
	generate(entries: BibEntry[], options?: GeneratorOptions): string {
		// The mapping functions check entry metadata to determine
		// whether to use BibTeX or BibLaTeX mappings
		return this.bibtexGenerator.generate(entries, options);
	}
}

/**
 * Create a BibLaTeX generator instance
 */
export function createBibLaTeXGenerator(): Generator {
	return new BibLaTeXGenerator();
}
