/**
 * Bibliography Format Converter
 *
 * Orchestrates conversion between bibliography formats using parsers and generators.
 *
 * Architecture: Hub-and-spoke with CSL JSON as intermediate format
 * - Parse source format → CSL JSON (BibEntry[])
 * - Generate target format from CSL JSON
 */

import type { BibFormat, ConversionResult, BibEntry, GeneratorOptions, ConversionWarning } from "./types.js";
import { createBibTeXParser, createBibLaTeXParser, createCSLJSONParser, createRISParser, createEndNoteXMLParser } from "./parsers/index.js";
import { createBibTeXGenerator, createBibLaTeXGenerator, createCSLJSONGenerator, createRISGenerator, createEndNoteXMLGenerator } from "./generators/index.js";

/**
 * Parser interface for dependency injection
 */
export interface Parser {
	parse(content: string): ConversionResult;
	validate?(content: string): ConversionWarning[];
	format: string;
	mock?: {
		calls: Array<{ arguments: [string] }>;
	};
}

/**
 * Generator interface for dependency injection
 */
export interface Generator {
	generate(entries: BibEntry[], options?: GeneratorOptions): string;
	format: string;
	mock?: {
		calls: Array<{ arguments: [BibEntry[], (GeneratorOptions | undefined)?] }>;
	};
}

/**
 * Dependencies for converter functions (for testing)
 */
export interface ConverterDependencies {
	getParser: (format: BibFormat) => Parser;
	getGenerator: (format: BibFormat) => Generator;
}

/**
 * Default dependencies using real parsers and generators
 */
const defaultDeps: ConverterDependencies = {
	getParser(format: BibFormat): Parser {
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
	},
	getGenerator(format: BibFormat): Generator {
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
	},
};

/**
 * Internal parse with dependencies
 */
function parseWithDeps(content: string, format: BibFormat, deps: ConverterDependencies): ConversionResult {
	const parser = deps.getParser(format);
	return parser.parse(content);
}

/**
 * Internal generate with dependencies
 */
function generateWithDeps(entries: BibEntry[], format: BibFormat, options: GeneratorOptions | undefined, deps: ConverterDependencies): string {
	const generator = deps.getGenerator(format);
	return generator.generate(entries, options);
}

/**
 * Internal validate with dependencies
 */
function validateWithDeps(content: string, format: BibFormat, deps: ConverterDependencies): ConversionWarning[] {
	const parser = deps.getParser(format);
	return parser.validate?.(content) || [];
}

/**
 * Convert bibliography from one format to another
 *
 * @param content - Source bibliography content
 * @param fromFormat - Source format
 * @param toFormat - Target format
 * @param options - Generator options
 * @param deps - Dependencies (for testing)
 * @returns Conversion result with generated content and warnings
 */
export function convert(
	content: string,
	fromFormat: BibFormat,
	toFormat: BibFormat,
	options?: GeneratorOptions,
	deps: ConverterDependencies = defaultDeps
): { output: string; result: ConversionResult } {
	// Step 1: Parse source format to intermediate format
	const parseResult = parseWithDeps(content, fromFormat, deps);

	// Step 2: Generate target format from intermediate
	const output = generateWithDeps(parseResult.entries, toFormat, options, deps);

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
 * @param deps - Dependencies (for testing)
 * @returns Parse result with entries and warnings
 */
export function parse(content: string, format: BibFormat, deps: ConverterDependencies = defaultDeps): ConversionResult {
	return parseWithDeps(content, format, deps);
}

/**
 * Generate bibliography content from intermediate format
 *
 * @param entries - Bibliography entries
 * @param format - Target format
 * @param options - Generator options
 * @param deps - Dependencies (for testing)
 * @returns Generated bibliography content
 */
export function generate(entries: BibEntry[], format: BibFormat, options?: GeneratorOptions, deps: ConverterDependencies = defaultDeps): string {
	return generateWithDeps(entries, format, options, deps);
}

/**
 * Validate bibliography syntax
 *
 * @param content - Bibliography content
 * @param format - Format to validate
 * @param deps - Dependencies (for testing)
 * @returns Validation warnings
 */
export function validate(content: string, format: BibFormat, deps: ConverterDependencies = defaultDeps): ConversionWarning[] {
	return validateWithDeps(content, format, deps);
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
