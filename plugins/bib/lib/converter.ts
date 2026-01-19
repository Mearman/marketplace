/**
 * Bibliography Format Converter
 *
 * Orchestrates conversion between bibliography formats using parsers and generators.
 *
 * Architecture: Hub-and-spoke with CSL JSON as intermediate format
 * - Parse source format → CSL JSON (BibEntry[])
 * - Generate target format from CSL JSON
 */

import type { BibFormat, ConversionResult, BibEntry, GeneratorOptions } from "./types.js";
import { createBibTeXParser, createBibLaTeXParser, createCSLJSONParser, createRISParser, createEndNoteXMLParser } from "./parsers/index.js";
import { createBibTeXGenerator, createBibLaTeXGenerator, createCSLJSONGenerator, createRISGenerator, createEndNoteXMLGenerator } from "./generators/index.js";

/**
 * Convert bibliography from one format to another
 *
 * @param content - Source bibliography content
 * @param fromFormat - Source format
 * @param toFormat - Target format
 * @param options - Generator options
 * @returns Conversion result with generated content and warnings
 */
export function convert(
	content: string,
	fromFormat: BibFormat,
	toFormat: BibFormat,
	options?: GeneratorOptions
): { output: string; result: ConversionResult } {
	// Step 1: Parse source format to intermediate format
	const parseResult = parse(content, fromFormat);

	// Step 2: Generate target format from intermediate
	const output = generate(parseResult.entries, toFormat, options);

	return {
		output,
		result: parseResult,
	};
}

/**
 * Parse bibliography content to intermediate format
 *
 * @param content - Bibliography content
 * @param format - Source format
 * @returns Parse result with entries and warnings
 */
export function parse(content: string, format: BibFormat): ConversionResult {
	const parser = getParser(format);
	return parser.parse(content);
}

/**
 * Generate bibliography content from intermediate format
 *
 * @param entries - Bibliography entries
 * @param format - Target format
 * @param options - Generator options
 * @returns Generated bibliography content
 */
export function generate(entries: BibEntry[], format: BibFormat, options?: GeneratorOptions): string {
	const generator = getGenerator(format);
	return generator.generate(entries, options);
}

/**
 * Validate bibliography syntax
 *
 * @param content - Bibliography content
 * @param format - Format to validate
 * @returns Validation warnings
 */
export function validate(content: string, format: BibFormat) {
	const parser = getParser(format);
	return parser.validate?.(content) || [];
}

/**
 * Get parser for format
 */
function getParser(format: BibFormat) {
	switch (format) {
	case "bibtex":
		return createBibTeXParser();
	case "biblatex":
		return createBibLaTeXParser();
	case "csl-json":
		return createCSLJSONParser();
	case "ris":
		return createRISParser();
	case "endnote":
		return createEndNoteXMLParser();
	default:
		throw new Error(`Unsupported source format: ${format}`);
	}
}

/**
 * Get generator for format
 */
function getGenerator(format: BibFormat) {
	switch (format) {
	case "bibtex":
		return createBibTeXGenerator();
	case "biblatex":
		return createBibLaTeXGenerator();
	case "csl-json":
		return createCSLJSONGenerator();
	case "ris":
		return createRISGenerator();
	case "endnote":
		return createEndNoteXMLGenerator();
	default:
		throw new Error(`Unsupported target format: ${format}`);
	}
}

/**
 * Get all supported formats
 */
export function getSupportedFormats(): BibFormat[] {
	return ["bibtex", "biblatex", "csl-json", "ris", "endnote"];
}

/**
 * Detect format from content (best effort)
 *
 * @param content - Bibliography content
 * @returns Detected format or null
 */
export function detectFormat(content: string): BibFormat | null {
	const trimmed = content.trim();

	// JSON - check for array or object with id/type fields
	if (trimmed.startsWith("[") || (trimmed.startsWith("{") && trimmed.includes("\"type\""))) {
		try {
			const parsed = JSON.parse(trimmed);
			const item = Array.isArray(parsed) ? parsed[0] : parsed;
			if (item && item.type && item.id) {
				return "csl-json";
			}
		} catch {
			// Not valid JSON
		}
	}

	// BibTeX/BibLaTeX - check for @entry{
	if (/@\w+\s*\{/.test(trimmed)) {
		// Distinguish BibTeX from BibLaTeX by checking for BibLaTeX-specific types
		if (/@(?:dataset|software|online|patent)\s*\{/i.test(trimmed)) {
			return "biblatex";
		}
		return "bibtex";
	}

	// RIS - check for TY  - tag
	if (/^TY\s+-\s+/m.test(trimmed)) {
		return "ris";
	}

	// EndNote XML - check for XML structure
	if (trimmed.startsWith("<?xml") && trimmed.includes("<record>")) {
		return "endnote";
	}

	return null;
}
