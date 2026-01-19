/**
 * Tests for BibLaTeX parser
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BibLaTeXParser, createBibLaTeXParser } from "./biblatex";
import type { ConversionResult, BibEntry } from "../types";

// Mock BibTeX parser - must use factory function to avoid hoisting issues
const mockBibTeXParse = vi.fn();
const mockBibTeXValidate = vi.fn();

vi.mock("./bibtex", () => ({
	BibTeXParser: class {
		parse = mockBibTeXParse;
		validate = mockBibTeXValidate;
	},
}));

describe("BibLaTeX Parser", () => {
	let biblatexParser: BibLaTeXParser;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create a fresh parser for each test
		biblatexParser = new BibLaTeXParser();
	});

	describe("parse", () => {
		const mockEntries: BibEntry[] = [
			{
				id: "test2024",
				type: "article-journal",
				title: "Test Article",
				_formatMetadata: {
					source: "bibtex" as const,
					originalType: "article",
				},
			},
		];

		const mockParseResult: ConversionResult = {
			entries: mockEntries,
			warnings: [],
			stats: {
				total: 1,
				successful: 1,
				withWarnings: 0,
				failed: 0,
			},
		};

		beforeEach(() => {
			mockBibTeXParse.mockReturnValue(mockParseResult);
		});

		it("should delegate to BibTeX parser", () => {
			const content = "@article{test2024,...}";

			const result = biblatexParser.parse(content);

			expect(mockBibTeXParse).toHaveBeenCalledWith(content);
			expect(result).toEqual(mockParseResult);
		});

		it("should update metadata source to biblatex", () => {
			const content = "@article{test2024,...}";

			const result = biblatexParser.parse(content);

			expect(result.entries[0]._formatMetadata?.source).toBe("biblatex");
		});

		it("should handle entries without metadata", () => {
			const entriesWithoutMetadata: BibEntry[] = [
				{
					id: "test2024",
					type: "article-journal",
					title: "Test Article",
				},
			];

			mockBibTeXParse.mockReturnValue({
				entries: entriesWithoutMetadata,
				warnings: [],
				stats: { total: 1, successful: 1, withWarnings: 0, failed: 0 },
			});

			const content = "@article{test2024,...}";
			const result = biblatexParser.parse(content);

			// Should not throw error
			expect(result.entries[0]._formatMetadata).toBeUndefined();
		});

		it("should handle multiple entries", () => {
			const multipleEntries: BibEntry[] = [
				{
					id: "entry1",
					type: "article-journal",
					_formatMetadata: { source: "bibtex" as const },
				},
				{
					id: "entry2",
					type: "book",
					_formatMetadata: { source: "bibtex" as const },
				},
			];

			mockBibTeXParse.mockReturnValue({
				entries: multipleEntries,
				warnings: [],
				stats: { total: 2, successful: 2, withWarnings: 0, failed: 0 },
			});

			const content = "@article{entry1,...}\n@book{entry2,...}";
			const result = biblatexParser.parse(content);

			expect(result.entries[0]._formatMetadata?.source).toBe("biblatex");
			expect(result.entries[1]._formatMetadata?.source).toBe("biblatex");
		});

		it("should preserve warnings from BibTeX parser", () => {
			const resultWithWarnings: ConversionResult = {
				entries: mockEntries,
				warnings: [
					{
						entryId: "test2024",
						severity: "warning",
						type: "field-loss",
						message: "Unknown field ignored",
					},
				],
				stats: { total: 1, successful: 1, withWarnings: 1, failed: 0 },
			};

			mockBibTeXParse.mockReturnValue(resultWithWarnings);

			const content = "@article{test2024,...}";
			const result = biblatexParser.parse(content);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].message).toBe("Unknown field ignored");
		});
	});

	describe("validate", () => {
		it("should delegate to BibTeX validator", () => {
			const warnings = [
				{
					entryId: "test",
					severity: "error" as const,
					type: "validation-error" as const,
					message: "Missing required field: author",
				},
			];

			mockBibTeXValidate.mockReturnValue(warnings);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			expect(mockBibTeXValidate).toHaveBeenCalledWith(content);
			expect(result).toEqual(warnings);
		});

		it("should return empty array when BibTeX has no warnings", () => {
			mockBibTeXValidate.mockReturnValue([]);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			expect(result).toEqual([]);
		});

		it("should handle undefined validate method", () => {
			// @ts-ignore
			mockBibTeXValidate.mockReturnValue(undefined);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			expect(result).toEqual([]);
		});
	});

	describe("createBibLaTeXParser", () => {
		it("should return a BibLaTeXParser instance", () => {
			const parser = createBibLaTeXParser();

			expect(parser).toBeInstanceOf(BibLaTeXParser);
			expect(parser.format).toBe("biblatex");
		});
	});
});
