/**
 * Tests for bibliography generators
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BibLaTeXGenerator, createBibLaTeXGenerator } from "./generators/biblatex";
import { CSLJSONGenerator, createCSLJSONGenerator } from "./generators/csl";
import { EndNoteXMLGenerator, createEndNoteXMLGenerator } from "./generators/endnote";
import { RISGenerator, createRISGenerator } from "./generators/ris";
import type { BibEntry, GeneratorOptions } from "./types";

// Mock dependencies for RIS and EndNote generators
vi.mock("./mappings/entry-types.js", () => ({
	denormalizeFromCslType: vi.fn((type: string, target: string) => {
		if (target === "ris") {
			const risMap: Record<string, string> = {
				"article-journal": "JOUR",
				"book": "BOOK",
				"chapter": "CHAP",
			};
			return { type: risMap[type] || "GEN" };
		}
		return { type: type.toUpperCase() };
	}),
}));

vi.mock("./mappings/fields.js", () => ({
	getRisTag: vi.fn((field: string) => {
		const tagMap: Record<string, string> = {
			author: "AU",
			title: "TI",
			"container-title": "T2",
			issued: "PY",
			volume: "VL",
			issue: "IS",
			page: "SP",
			publisher: "PB",
			DOI: "DO",
			URL: "UR",
			abstract: "AB",
			keyword: "KW",
		};
		return tagMap[field] || field.toUpperCase();
	}),
}));

vi.mock("./parsers/names.js", () => ({
	serializeName: vi.fn((person) => {
		if (person.family && person.given) {
			return `${person.family}, ${person.given}`;
		}
		return person.literal || "";
	}),
}));

vi.mock("./parsers/dates.js", () => ({
	serializeRISDate: vi.fn((date) => {
		if (date["date-parts"]) {
			return String(date["date-parts"][0][0]);
		}
		return "";
	}),
	serializeDate: vi.fn((date) => {
		if (date["date-parts"]) {
			return String(date["date-parts"][0][0]);
		}
		return "";
	}),
}));

vi.mock("./generators/bibtex.js", () => ({
	BibTeXGenerator: class {
		generate = vi.fn((entries: BibEntry[]) => {
			return entries.map((e) => `@${e.type}{${e.id},...}`).join("\n");
		});
	},
}));

const mockEntries: BibEntry[] = [
	{
		id: "smith2024",
		type: "article-journal",
		title: "Test Article",
		author: [{ family: "Smith", given: "John" }],
		"container-title": "Test Journal",
		issued: { "date-parts": [[2024]] },
		volume: "10",
		issue: "2",
		page: "1-10",
		DOI: "10.1234/test",
		abstract: "This is a test abstract.",
		_formatMetadata: {
			source: "csl-json",
		},
	},
	{
		id: "doe2023",
		type: "book",
		title: "Test Book",
		author: [{ family: "Doe", given: "Jane" }],
		publisher: "Test Publisher",
		issued: { "date-parts": [[2023]] },
		_formatMetadata: {
			source: "csl-json",
		},
	},
];

describe("Generators", () => {
	describe("CSLJSONGenerator", () => {
		let generator: CSLJSONGenerator;

		beforeEach(() => {
			vi.clearAllMocks();
			generator = new CSLJSONGenerator();
		});

		it("should generate JSON output", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("smith2024");
			expect(output).toContain("Test Article");
		});

		it("should remove format metadata", () => {
			const output = generator.generate(mockEntries);

			expect(output).not.toContain("_formatMetadata");
		});

		it("should sort entries when requested", () => {
			const options: GeneratorOptions = { sort: true };
			const output = generator.generate(mockEntries, options);

			// doej2023 should come before smith2024 alphabetically
			const doeIndex = output.indexOf("doe2023");
			const smithIndex = output.indexOf("smith2024");
			expect(doeIndex).toBeLessThan(smithIndex);
		});

		it("should use custom indent", () => {
			const options: GeneratorOptions = { indent: "    " };
			const output = generator.generate(mockEntries, options);

			// Check for 4-space indentation in JSON
			const lines = output.split("\n");
			const hasIndent = lines.some((line) => line.match(/^    /));
			expect(hasIndent).toBe(true);
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);
			expect(output).toBe("[]");
		});

		it("should format as valid JSON", () => {
			const output = generator.generate(mockEntries);
			const parsed = JSON.parse(output);
			expect(Array.isArray(parsed)).toBe(true);
		});
	});

	describe("BibLaTeXGenerator", () => {
		let generator: BibLaTeXGenerator;

		beforeEach(() => {
			vi.clearAllMocks();
			generator = new BibLaTeXGenerator();
		});

		it("should delegate to BibTeX generator", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("article-journal");
			expect(output).toContain("smith2024");
		});

		it("should pass options to BibTeX generator", () => {
			const options: GeneratorOptions = { sort: true };
			generator.generate(mockEntries, options);

			// @ts-ignore - accessing private property for testing
			const bibTeXGenerate = generator.bibtexGenerator.generate;
			expect(bibTeXGenerate).toHaveBeenCalledWith(mockEntries, options);
		});

		it("should return format biblatex", () => {
			expect(generator.format).toBe("biblatex");
		});
	});

	describe("RISGenerator", () => {
		let generator: RISGenerator;

		beforeEach(() => {
			vi.clearAllMocks();
			generator = new RISGenerator();
		});

		it("should generate RIS format", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("TY  - JOUR");
			expect(output).toContain("TI  - Test Article");
			expect(output).toContain("ER  - ");
		});

		it("should generate multiple records", () => {
			const output = generator.generate(mockEntries);

			const tyCount = (output.match(/TY  - /g) || []).length;
			expect(tyCount).toBe(2);
		});

		it("should sort entries when requested", () => {
			const options: GeneratorOptions = { sort: true };
			const output = generator.generate(mockEntries, options);

			// RIS format doesn't include IDs, just verify both entries are present
			expect(output).toContain("TY  - JOUR");
			expect(output).toContain("TY  - BOOK");
		});

		it("should include authors", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("AU  - Smith, John");
		});

		it("should include DOI", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("DO  - 10.1234/test");
		});

		it("should include abstract", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("AB  - This is a test abstract.");
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);
			// Empty entries result in just a line ending
			expect(output).toBe("\n");
		});
	});

	describe("EndNoteXMLGenerator", () => {
		let generator: EndNoteXMLGenerator;

		beforeEach(() => {
			vi.clearAllMocks();
			generator = new EndNoteXMLGenerator();
		});

		it("should generate EndNote XML format", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("<record>");
			expect(output).toContain("</record>");
			expect(output).toContain("<titles>");
			expect(output).toContain("<title>Test Article</title>");
		});

		it("should generate multiple records", () => {
			const output = generator.generate(mockEntries);

			const recordCount = (output.match(/<record>/g) || []).length;
			expect(recordCount).toBe(2);
		});

		it("should wrap in XML structure", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("<?xml");
			expect(output).toContain("<records>");
			expect(output).toContain("</records>");
		});

		it("should include authors", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("<authors>");
			expect(output).toContain("<author>");
		});

		it("should include ref-type", () => {
			const output = generator.generate(mockEntries);

			expect(output).toContain("<ref-type");
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);

			expect(output).toContain("<?xml");
			expect(output).toContain("<records>");
			expect(output).toContain("</records>");
		});
	});

	describe("create functions", () => {
		it("should create CSLJSON generator", () => {
			const generator = createCSLJSONGenerator();
			expect(generator).toBeInstanceOf(CSLJSONGenerator);
		});

		it("should create BibLaTeX generator", () => {
			const generator = createBibLaTeXGenerator();
			expect(generator).toBeInstanceOf(BibLaTeXGenerator);
		});

		it("should create RIS generator", () => {
			const generator = createRISGenerator();
			expect(generator).toBeInstanceOf(RISGenerator);
		});

		it("should create EndNote generator", () => {
			const generator = createEndNoteXMLGenerator();
			expect(generator).toBeInstanceOf(EndNoteXMLGenerator);
		});
	});
});
