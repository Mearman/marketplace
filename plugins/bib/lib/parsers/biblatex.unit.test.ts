/**
 * Tests for BibLaTeX parser
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { BibLaTeXParser, createBibLaTeXParser } from "./biblatex.js";
import type { ConversionResult, BibEntry } from "../types.js";

describe("BibLaTeX Parser", () => {
	let biblatexParser: BibLaTeXParser;
	let mockBibTeXParse: ReturnType<typeof mock.fn>;
	let mockBibTeXValidate: ReturnType<typeof mock.fn>;

	beforeEach(() => {
		mock.reset();

		// Create mock functions for BibTeX parser
		mockBibTeXParse = mock.fn();
		mockBibTeXValidate = mock.fn();

		// Create a fresh parser for each test with mocked dependencies
		biblatexParser = new BibLaTeXParser(
			// @ts-expect-error - accessing private property for testing
			{ parse: mockBibTeXParse, validate: mockBibTeXValidate }
		);
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
			mockBibTeXParse.mock.mockReturnValue(mockParseResult);
		});

		it("should delegate to BibTeX parser", () => {
			const content = "@article{test2024,...}";

			const result = biblatexParser.parse(content);

			assert.strictEqual(mockBibTeXParse.mock.calls.length, 1);
			assert.strictEqual(mockBibTeXParse.mock.calls[0][0], content);
			assert.deepStrictEqual(result, mockParseResult);
		});

		it("should update metadata source to biblatex", () => {
			const content = "@article{test2024,...}";

			const result = biblatexParser.parse(content);

			assert.strictEqual(result.entries[0]._formatMetadata?.source, "biblatex");
		});

		it("should handle entries without metadata", () => {
			const entriesWithoutMetadata: BibEntry[] = [
				{
					id: "test2024",
					type: "article-journal",
					title: "Test Article",
				},
			];

			mockBibTeXParse.mock.mockReturnValue({
				entries: entriesWithoutMetadata,
				warnings: [],
				stats: { total: 1, successful: 1, withWarnings: 0, failed: 0 },
			});

			const content = "@article{test2024,...}";
			const result = biblatexParser.parse(content);

			assert.strictEqual(result.entries[0]._formatMetadata, undefined);
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

			mockBibTeXParse.mock.mockReturnValue({
				entries: multipleEntries,
				warnings: [],
				stats: { total: 2, successful: 2, withWarnings: 0, failed: 0 },
			});

			const content = "@article{entry1,...}\n@book{entry2,...}";
			const result = biblatexParser.parse(content);

			assert.strictEqual(result.entries[0]._formatMetadata?.source, "biblatex");
			assert.strictEqual(result.entries[1]._formatMetadata?.source, "biblatex");
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

			mockBibTeXParse.mock.mockReturnValue(resultWithWarnings);

			const content = "@article{test2024,...}";
			const result = biblatexParser.parse(content);

			assert.strictEqual(result.warnings.length, 1);
			assert.strictEqual(result.warnings[0].message, "Unknown field ignored");
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

			mockBibTeXValidate.mock.mockReturnValue(warnings);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			assert.strictEqual(mockBibTeXValidate.mock.calls.length, 1);
			assert.strictEqual(mockBibTeXValidate.mock.calls[0][0], content);
			assert.deepStrictEqual(result, warnings);
		});

		it("should return empty array when BibTeX has no warnings", () => {
			mockBibTeXValidate.mock.mockReturnValue([]);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			assert.deepStrictEqual(result, []);
		});

		it("should handle undefined validate method", () => {
			mockBibTeXValidate.mock.mockReturnValue(undefined as unknown as string[]);

			const content = "@article{test,...}";
			const result = biblatexParser.validate(content);

			assert.deepStrictEqual(result, []);
		});
	});

	describe("createBibLaTeXParser", () => {
		it("should return a BibLaTeXParser instance", () => {
			const parser = createBibLaTeXParser();

			assert.ok(parser instanceof BibLaTeXParser);
			assert.strictEqual(parser.format, "biblatex");
		});
	});
});
