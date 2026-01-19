/**
 * Tests for bibliography converter
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	convert,
	parse,
	generate,
	validate,
	getSupportedFormats,
	detectFormat,
} from "./converter";
import type { BibEntry, ConversionResult } from "./types";

// Mock the parsers and generators
vi.mock("./parsers/index.js", () => ({
	createBibTeXParser: () => mockBibTeXParser,
	createBibLaTeXParser: () => mockBibLaTeXParser,
	createCSLJSONParser: () => mockCSLJSONParser,
	createRISParser: () => mockRISParser,
	createEndNoteXMLParser: () => mockEndNoteXMLParser,
}));

vi.mock("./generators/index.js", () => ({
	createBibTeXGenerator: () => mockBibTeXGenerator,
	createBibLaTeXGenerator: () => mockBibLaTeXGenerator,
	createCSLJSONGenerator: () => mockCSLJSONGenerator,
	createRISGenerator: () => mockRISGenerator,
	createEndNoteXMLGenerator: () => mockEndNoteXMLGenerator,
}));

// Mock parser implementations
const mockBibTeXParser = {
	parse: vi.fn(),
	validate: vi.fn(),
};

const mockBibLaTeXParser = {
	parse: vi.fn(),
	validate: vi.fn(),
};

const mockCSLJSONParser = {
	parse: vi.fn(),
};

const mockRISParser = {
	parse: vi.fn(),
	validate: vi.fn(),
};

const mockEndNoteXMLParser = {
	parse: vi.fn(),
};

// Mock generator implementations
const mockBibTeXGenerator = {
	generate: vi.fn(),
};

const mockBibLaTeXGenerator = {
	generate: vi.fn(),
};

const mockCSLJSONGenerator = {
	generate: vi.fn(),
};

const mockRISGenerator = {
	generate: vi.fn(),
};

const mockEndNoteXMLGenerator = {
	generate: vi.fn(),
};

describe("converter.ts", () => {
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

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default parser behavior
		mockBibTeXParser.parse.mockReturnValue(mockParseResult);
		mockBibLaTeXParser.parse.mockReturnValue(mockParseResult);
		mockCSLJSONParser.parse.mockReturnValue(mockParseResult);
		mockRISParser.parse.mockReturnValue(mockParseResult);
		mockEndNoteXMLParser.parse.mockReturnValue(mockParseResult);

		// Setup default generator behavior
		mockBibTeXGenerator.generate.mockReturnValue("@article{test,...}");
		mockBibLaTeXGenerator.generate.mockReturnValue("@article{test,...}");
		mockCSLJSONGenerator.generate.mockReturnValue("[{\"id\":\"test\"}]");
		mockRISGenerator.generate.mockReturnValue("TY  - JOUR\n...");
		mockEndNoteXMLGenerator.generate.mockReturnValue("<record>...</record>");
	});

	describe("convert", () => {
		it("should convert bibtex to csl-json", () => {
			const content = "@article{test,...}";
			const result = convert(content, "bibtex", "csl-json");

			expect(mockBibTeXParser.parse).toHaveBeenCalledWith(content);
			expect(mockCSLJSONGenerator.generate).toHaveBeenCalledWith(mockEntries, undefined);
			expect(result.output).toBe("[{\"id\":\"test\"}]");
			expect(result.result).toEqual(mockParseResult);
		});

		it("should convert biblatex to ris", () => {
			const content = "@article{test,...}";
			const result = convert(content, "biblatex", "ris");

			expect(mockBibLaTeXParser.parse).toHaveBeenCalledWith(content);
			expect(mockRISGenerator.generate).toHaveBeenCalledWith(mockEntries, undefined);
			expect(result.output).toBe("TY  - JOUR\n...");
		});

		it("should convert csl-json to endnote", () => {
			const content = "[{\"id\":\"test\"}]";
			const result = convert(content, "csl-json", "endnote");

			expect(mockCSLJSONParser.parse).toHaveBeenCalledWith(content);
			expect(mockEndNoteXMLGenerator.generate).toHaveBeenCalledWith(mockEntries, undefined);
			expect(result.output).toBe("<record>...</record>");
		});

		it("should pass options to generator", () => {
			const options = { sort: true, format: "html" };
			const content = "@article{test,...}";

			convert(content, "bibtex", "csl-json", options);

			expect(mockCSLJSONGenerator.generate).toHaveBeenCalledWith(mockEntries, options);
		});

		it("should throw error for unsupported source format", () => {
			expect(() => convert("content", "invalid" as any, "bibtex")).toThrow(
				"Unsupported source format: invalid"
			);
		});

		it("should throw error for unsupported target format", () => {
			mockBibTeXParser.parse.mockReturnValue(mockParseResult);

			expect(() => convert("content", "bibtex", "invalid" as any)).toThrow(
				"Unsupported target format: invalid"
			);
		});
	});

	describe("parse", () => {
		it("should parse bibtex content", () => {
			const content = "@article{test,...}";
			const result = parse(content, "bibtex");

			expect(mockBibTeXParser.parse).toHaveBeenCalledWith(content);
			expect(result).toEqual(mockParseResult);
		});

		it("should parse ris content", () => {
			const content = "TY  - JOUR\n...";
			const result = parse(content, "ris");

			expect(mockRISParser.parse).toHaveBeenCalledWith(content);
			expect(result).toEqual(mockParseResult);
		});

		it("should throw error for unsupported format", () => {
			expect(() => parse("content", "invalid" as any)).toThrow("Unsupported source format: invalid");
		});
	});

	describe("generate", () => {
		it("should generate bibtex from entries", () => {
			const output = generate(mockEntries, "bibtex");

			expect(mockBibTeXGenerator.generate).toHaveBeenCalledWith(mockEntries, undefined);
			expect(output).toBe("@article{test,...}");
		});

		it("should generate endnote from entries", () => {
			const output = generate(mockEntries, "endnote");

			expect(mockEndNoteXMLGenerator.generate).toHaveBeenCalledWith(mockEntries, undefined);
			expect(output).toBe("<record>...</record>");
		});

		it("should pass options to generator", () => {
			const options = { sort: true };
			generate(mockEntries, "csl-json", options);

			expect(mockCSLJSONGenerator.generate).toHaveBeenCalledWith(mockEntries, options);
		});

		it("should throw error for unsupported format", () => {
			expect(() => generate(mockEntries, "invalid" as any)).toThrow("Unsupported target format: invalid");
		});
	});

	describe("validate", () => {
		it("should validate bibtex content", () => {
			const warnings = ["Missing year"];
			mockBibTeXParser.validate.mockReturnValue(warnings as any);

			const result = validate("@article{test,...}", "bibtex");

			expect(mockBibTeXParser.validate).toHaveBeenCalledWith("@article{test,...}");
			expect(result).toEqual(warnings);
		});

		it("should validate biblatex content", () => {
			const warnings = ["Unknown field"];
			mockBibLaTeXParser.validate.mockReturnValue(warnings as any);

			const result = validate("@article{test,...}", "biblatex");

			expect(mockBibLaTeXParser.validate).toHaveBeenCalledWith("@article{test,...}");
			expect(result).toEqual(warnings);
		});

		it("should return empty array for parsers without validate", () => {
			const result = validate("[{\"id\":\"test\"}]", "endnote");

			expect(result).toEqual([]);
		});

		it("should throw error for unsupported format", () => {
			expect(() => validate("content", "invalid" as any)).toThrow("Unsupported source format: invalid");
		});
	});

	describe("getSupportedFormats", () => {
		it("should return all supported formats", () => {
			const formats = getSupportedFormats();

			expect(formats).toEqual(["bibtex", "biblatex", "csl-json", "ris", "endnote"]);
		});
	});

	describe("detectFormat", () => {
		it("should detect csl-json array format", () => {
			const content = "[{\"id\":\"test\",\"type\":\"article\"}]";
			const format = detectFormat(content);

			expect(format).toBe("csl-json");
		});

		it("should detect csl-json object format", () => {
			const content = "{\"id\":\"test\",\"type\":\"article\"}";
			const format = detectFormat(content);

			expect(format).toBe("csl-json");
		});

		it("should detect biblatex format", () => {
			const content = "@dataset{test,...}";
			const format = detectFormat(content);

			expect(format).toBe("biblatex");
		});

		it("should detect bibtex format", () => {
			const content = "@article{test,...}";
			const format = detectFormat(content);

			expect(format).toBe("bibtex");
		});

		it("should detect ris format", () => {
			const content = "TY  - JOUR\nER  - \n";
			const format = detectFormat(content);

			expect(format).toBe("ris");
		});

		it("should detect endnote XML format", () => {
			const content = "<?xml version=\"1.0\"?>\n<records><record>...</record></records>";
			const format = detectFormat(content);

			expect(format).toBe("endnote");
		});

		it("should return null for unknown format", () => {
			const content = "just random text";
			const format = detectFormat(content);

			expect(format).toBeNull();
		});

		it("should return null for invalid JSON", () => {
			const content = "[{invalid json}]";
			const format = detectFormat(content);

			expect(format).toBeNull();
		});

		it("should handle whitespace", () => {
			const content = "  \n  @article{test,...}  \n";
			const format = detectFormat(content);

			expect(format).toBe("bibtex");
		});

		it("should detect online type as biblatex", () => {
			const content = "@online{test,...}";
			const format = detectFormat(content);

			expect(format).toBe("biblatex");
		});

		it("should detect patent type as biblatex", () => {
			const content = "@patent{test,...}";
			const format = detectFormat(content);

			expect(format).toBe("biblatex");
		});

		it("should detect software type as biblatex", () => {
			const content = "@software{test,...}";
			const format = detectFormat(content);

			expect(format).toBe("biblatex");
		});
	});
});
