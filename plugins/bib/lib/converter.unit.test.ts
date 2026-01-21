/**
 * Tests for bibliography converter
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import type { BibEntry, ConversionResult, ConversionWarning } from "./types.js";
import type { ConverterDependencies, Parser, Generator } from "./converter.js";
import { convert, parse, generate, validate, getSupportedFormats, detectFormat } from "./converter.js";

const mockEntries: BibEntry[] = [
	{
		id: "doi:10.1234/test",
		type: "article-journal",
		title: "Test Article",
		author: [{ family: "Smith", given: "John" }],
		"container-title": "Test Journal",
		issued: { "date-parts": [[2024, 1, 1]] },
	},
];

const mockParseResult: ConversionResult = {
	entries: mockEntries,
	warnings: [
		{
			entryId: "test",
			severity: "warning",
			type: "field-loss",
			message: "Field not supported in target format",
		},
	],
	stats: {
		total: 1,
		successful: 1,
		withWarnings: 1,
		failed: 0,
	},
};

// Create mock parser
const createMockParser = (format: string): Parser => ({
	parse: mock.fn(() => mockParseResult) as any,
	validate: mock.fn(() => []) as any,
	format,
	mock: { calls: [] } as any,
});

// Create mock generator
const createMockGenerator = (format: string): Generator => ({
	generate: mock.fn(() => {
		if (format === "csl-json") return "[{\"id\":\"test\"}]";
		if (format === "ris") return "TY  - JOUR\n...";
		if (format === "endnote") return "<record>...</record>";
		return "@article{test,...}";
	}) as any,
	format,
	mock: { calls: [] } as any,
});

// Track current mocks
let mockBibTeXParser: Parser;
let mockBibLaTeXParser: Parser;
let mockCSLJSONParser: Parser;
let mockRISParser: Parser;
let mockEndNoteXMLParser: Parser;

let mockBibTeXGenerator: Generator;
let mockBibLaTeXGenerator: Generator;
let mockCSLJSONGenerator: Generator;
let mockRISGenerator: Generator;
let mockEndNoteXMLGenerator: Generator;

// Create mock dependencies
const createMockDeps = (): ConverterDependencies => ({
	getParser: mock.fn((format: string) => {
		switch (format) {
		case "bibtex":
			return mockBibTeXParser;
		case "biblatex":
			return mockBibLaTeXParser;
		case "csl-json":
			return mockCSLJSONParser;
		case "ris":
			return mockRISParser;
		case "endnote":
			return mockEndNoteXMLParser;
		default:
			throw new Error(`Unsupported source format: ${format}`);
		}
	}) as any,
	getGenerator: mock.fn((format: string) => {
		switch (format) {
		case "bibtex":
			return mockBibTeXGenerator;
		case "biblatex":
			return mockBibLaTeXGenerator;
		case "csl-json":
			return mockCSLJSONGenerator;
		case "ris":
			return mockRISGenerator;
		case "endnote":
			return mockEndNoteXMLGenerator;
		default:
			throw new Error(`Unsupported target format: ${format}`);
		}
	}) as any,
});

describe("converter.ts", () => {
	let mockDeps: ConverterDependencies;

	beforeEach(() => {
		mock.reset();

		// Create fresh mocks for each test
		mockBibTeXParser = createMockParser("bibtex");
		mockBibLaTeXParser = createMockParser("biblatex");
		mockCSLJSONParser = createMockParser("csl-json");
		mockRISParser = createMockParser("ris");
		mockEndNoteXMLParser = createMockParser("endnote");

		mockBibTeXGenerator = createMockGenerator("bibtex");
		mockBibLaTeXGenerator = createMockGenerator("biblatex");
		mockCSLJSONGenerator = createMockGenerator("csl-json");
		mockRISGenerator = createMockGenerator("ris");
		mockEndNoteXMLGenerator = createMockGenerator("endnote");

		mockDeps = createMockDeps();
	});

	describe("convert", () => {
		it("should convert bibtex to csl-json", () => {
			const content = "@article{test,...}";
			const result = convert(content, "bibtex", "csl-json", undefined, mockDeps);

			assert.strictEqual((mockBibTeXParser.parse as any).mock.calls.length, 1);
			assert.strictEqual((mockBibTeXParser.parse as any).mock.calls[0]?.arguments[0], content);
			assert.strictEqual((mockCSLJSONGenerator.generate as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockCSLJSONGenerator.generate as any).mock.calls[0]?.arguments[0], mockEntries);
			assert.strictEqual(result.output, "[{\"id\":\"test\"}]");
			assert.deepStrictEqual(result.result, mockParseResult);
		});

		it("should convert biblatex to ris", () => {
			const content = "@article{test,...}";
			const result = convert(content, "biblatex", "ris", undefined, mockDeps);

			assert.strictEqual((mockBibLaTeXParser.parse as any).mock.calls.length, 1);
			assert.strictEqual((mockBibLaTeXParser.parse as any).mock.calls[0]?.arguments[0], content);
			assert.strictEqual((mockRISGenerator.generate as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockRISGenerator.generate as any).mock.calls[0]?.arguments[0], mockEntries);
			assert.strictEqual(result.output, "TY  - JOUR\n...");
		});

		it("should convert csl-json to endnote", () => {
			const content = "[{\"id\":\"test\"}]";
			const result = convert(content, "csl-json", "endnote", undefined, mockDeps);

			assert.strictEqual((mockCSLJSONParser.parse as any).mock.calls.length, 1);
			assert.strictEqual((mockCSLJSONParser.parse as any).mock.calls[0]?.arguments[0], content);
			assert.strictEqual((mockEndNoteXMLGenerator.generate as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockEndNoteXMLGenerator.generate as any).mock.calls[0]?.arguments[0], mockEntries);
			assert.strictEqual(result.output, "<record>...</record>");
		});

		it("should pass options to generator", () => {
			const options = { sort: true, format: "html" } as const;
			const content = "@article{test,...}";

			convert(content, "bibtex", "csl-json", options, mockDeps);

			assert.strictEqual((mockCSLJSONGenerator.generate as any).mock.calls[0]?.arguments[1], options);
		});

		it("should throw error for unsupported source format", () => {
			assert.throws(() => convert("content", "invalid" as any, "bibtex", undefined, mockDeps), /Unsupported source format/);
		});

		it("should throw error for unsupported target format", () => {
			assert.throws(() => convert("content", "bibtex", "invalid" as any, undefined, mockDeps), /Unsupported target format/);
		});
	});

	describe("parse", () => {
		it("should parse bibtex content", () => {
			const content = "@article{test,...}";
			const result = parse(content, "bibtex", mockDeps);

			assert.strictEqual((mockBibTeXParser.parse as any).mock.calls.length, 1);
			assert.strictEqual((mockBibTeXParser.parse as any).mock.calls[0]?.arguments[0], content);
			assert.deepStrictEqual(result, mockParseResult);
		});

		it("should parse ris content", () => {
			const content = "TY  - JOUR\n...";
			const result = parse(content, "ris", mockDeps);

			assert.strictEqual((mockRISParser.parse as any).mock.calls.length, 1);
			assert.strictEqual((mockRISParser.parse as any).mock.calls[0]?.arguments[0], content);
			assert.deepStrictEqual(result, mockParseResult);
		});

		it("should throw error for unsupported format", () => {
			assert.throws(() => parse("content", "invalid" as any, mockDeps), /Unsupported source format/);
		});
	});

	describe("generate", () => {
		it("should generate bibtex from entries", () => {
			const output = generate(mockEntries, "bibtex", undefined, mockDeps);

			assert.strictEqual((mockBibTeXGenerator.generate as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockBibTeXGenerator.generate as any).mock.calls[0]?.arguments[0], mockEntries);
			assert.strictEqual(output, "@article{test,...}");
		});

		it("should generate endnote from entries", () => {
			const output = generate(mockEntries, "endnote", undefined, mockDeps);

			assert.strictEqual((mockEndNoteXMLGenerator.generate as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockEndNoteXMLGenerator.generate as any).mock.calls[0]?.arguments[0], mockEntries);
			assert.strictEqual(output, "<record>...</record>");
		});

		it("should pass options to generator", () => {
			const options = { sort: true } as const;
			generate(mockEntries, "csl-json", options, mockDeps);

			assert.strictEqual((mockCSLJSONGenerator.generate as any).mock.calls[0]?.arguments[1], options);
		});

		it("should throw error for unsupported format", () => {
			assert.throws(() => generate(mockEntries, "invalid" as any, undefined, mockDeps), /Unsupported target format/);
		});
	});

	describe("validate", () => {
		it("should validate bibtex content", () => {
			const warnings: ConversionWarning[] = [{ entryId: "test", severity: "error", type: "validation-error", message: "Missing year" }];
			mockBibTeXParser.validate = mock.fn(() => warnings) as any;

			const result = validate("@article{test,...}", "bibtex", mockDeps);

			assert.strictEqual((mockBibTeXParser.validate as any).mock.calls.length, 1);
			assert.strictEqual((mockBibTeXParser.validate as any).mock.calls[0].arguments[0], "@article{test,...}");
			assert.deepStrictEqual(result, warnings);
		});

		it("should validate biblatex content", () => {
			const warnings: ConversionWarning[] = [{ entryId: "test", severity: "error", type: "validation-error", message: "Unknown field" }];
			mockBibLaTeXParser.validate = mock.fn(() => warnings) as any;

			const result = validate("@article{test,...}", "biblatex", mockDeps);

			assert.strictEqual((mockBibLaTeXParser.validate as any).mock.calls.length, 1);
			assert.strictEqual((mockBibLaTeXParser.validate as any).mock.calls[0].arguments[0], "@article{test,...}");
			assert.deepStrictEqual(result, warnings);
		});

		it("should return empty array for parsers without validate", () => {
			mockEndNoteXMLParser.validate = undefined;
			const result = validate("[{\"id\":\"test\"}]", "endnote", mockDeps);

			assert.deepStrictEqual(result, []);
		});

		it("should throw error for unsupported format", () => {
			assert.throws(() => validate("content", "invalid" as any, mockDeps), /Unsupported source format/);
		});
	});

	describe("getSupportedFormats", () => {
		it("should return all supported formats", () => {
			const formats = getSupportedFormats();

			assert.deepStrictEqual(formats, ["bibtex", "biblatex", "csl-json", "ris", "endnote"]);
		});
	});

	describe("detectFormat", () => {
		it("should detect csl-json array format", () => {
			const content = "[{\"id\":\"test\",\"type\":\"article\"}]";
			const format = detectFormat(content);

			assert.strictEqual(format, "csl-json");
		});

		it("should detect csl-json object format", () => {
			const content = "{\"id\":\"test\",\"type\":\"article\"}";
			const format = detectFormat(content);

			assert.strictEqual(format, "csl-json");
		});

		it("should detect biblatex format", () => {
			const content = "@dataset{test,...}";
			const format = detectFormat(content);

			assert.strictEqual(format, "biblatex");
		});

		it("should detect bibtex format", () => {
			const content = "@article{test,...}";
			const format = detectFormat(content);

			assert.strictEqual(format, "bibtex");
		});

		it("should detect ris format", () => {
			const content = "TY  - JOUR\nER  - \n";
			const format = detectFormat(content);

			assert.strictEqual(format, "ris");
		});

		it("should detect endnote XML format", () => {
			const content = "<?xml version=\"1.0\"?>\n<records><record>...</record></records>";
			const format = detectFormat(content);

			assert.strictEqual(format, "endnote");
		});

		it("should return null for unknown format", () => {
			const content = "just random text";
			const format = detectFormat(content);

			assert.strictEqual(format, null);
		});

		it("should return null for invalid JSON", () => {
			const content = "[{invalid json}]";
			const format = detectFormat(content);

			assert.strictEqual(format, null);
		});

		it("should handle whitespace", () => {
			const content = "  \n  @article{test,...}  \n";
			const format = detectFormat(content);

			assert.strictEqual(format, "bibtex");
		});

		it("should detect online type as biblatex", () => {
			const content = "@online{test,...}";
			const format = detectFormat(content);

			assert.strictEqual(format, "biblatex");
		});

		it("should detect patent type as biblatex", () => {
			const content = "@patent{test,...}";
			const format = detectFormat(content);

			assert.strictEqual(format, "biblatex");
		});

		it("should detect software type as biblatex", () => {
			const content = "@software{test,...}";
			const format = detectFormat(content);

			assert.strictEqual(format, "biblatex");
		});
	});
});
