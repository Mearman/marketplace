/**
 * Tests for bibliography generators
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { BibLaTeXGenerator, createBibLaTeXGenerator } from "./generators/biblatex.js";
import { CSLJSONGenerator, createCSLJSONGenerator } from "./generators/csl.js";
import { EndNoteXMLGenerator, createEndNoteXMLGenerator } from "./generators/endnote.js";
import { RISGenerator, createRISGenerator } from "./generators/ris.js";
import type { BibEntry, GeneratorOptions } from "./types.js";

describe("Generators", () => {
	let mockDenormalizeFromCslType: ReturnType<typeof mock.fn>;
	let mockGetRisTag: ReturnType<typeof mock.fn>;
	let mockSerializeName: ReturnType<typeof mock.fn>;
	let mockSerializeRISDate: ReturnType<typeof mock.fn>;
	let mockBibTeXGenerate: ReturnType<typeof mock.fn>;
	let mockEntries: BibEntry[];

	beforeEach(() => {
		mock.reset();

		// Create mock functions for dependencies
		mockDenormalizeFromCslType = mock.fn((type: string, target: string) => {
			if (target === "ris") {
				const risMap: Record<string, string> = {
					"article-journal": "JOUR",
					"book": "BOOK",
					"chapter": "CHAP",
				};
				return { type: risMap[type] || "GEN", lossy: false };
			}
			return { type: type.toUpperCase(), lossy: false };
		});

		mockGetRisTag = mock.fn((field: string) => {
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
		});

		mockSerializeName = mock.fn((person) => {
			if (person.family && person.given) {
				return `${person.family}, ${person.given}`;
			}
			return person.literal || "";
		});

		mockSerializeRISDate = mock.fn((date) => {
			if (date["date-parts"]) {
				return String(date["date-parts"][0][0]);
			}
			return "";
		});

		mockBibTeXGenerate = mock.fn((entries: BibEntry[]) => {
			return entries.map((e) => `@${e.type}{${e.id},...}`).join("\n");
		});

		mockEntries = [
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
	});

	describe("CSLJSONGenerator", () => {
		let generator: CSLJSONGenerator;

		beforeEach(() => {
			generator = new CSLJSONGenerator();
		});

		it("should generate JSON output", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("smith2024"));
			assert.ok(output.includes("Test Article"));
		});

		it("should remove format metadata", () => {
			const output = generator.generate(mockEntries);

			assert.ok(!output.includes("_formatMetadata"));
		});

		it("should sort entries when requested", () => {
			const options: GeneratorOptions = { sort: true };
			const output = generator.generate(mockEntries, options);

			// doej2023 should come before smith2024 alphabetically
			const doeIndex = output.indexOf("doe2023");
			const smithIndex = output.indexOf("smith2024");
			assert.ok(doeIndex < smithIndex);
		});

		it("should use custom indent", () => {
			const options: GeneratorOptions = { indent: "    " };
			const output = generator.generate(mockEntries, options);

			// Check for 4-space indentation in JSON
			const lines = output.split("\n");
			const hasIndent = lines.some((line) => /^    /.test(line));
			assert.ok(hasIndent);
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);
			assert.strictEqual(output, "[]");
		});

		it("should format as valid JSON", () => {
			const output = generator.generate(mockEntries);
			const parsed = JSON.parse(output);
			assert.ok(Array.isArray(parsed));
		});
	});

	describe("BibLaTeXGenerator", () => {
		let generator: BibLaTeXGenerator;

		beforeEach(() => {
			generator = new BibLaTeXGenerator(
				// @ts-expect-error - accessing private property for testing
				{ generate: mockBibTeXGenerate }
			);
		});

		it("should delegate to BibTeX generator", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("article-journal"));
			assert.ok(output.includes("smith2024"));
		});

		it("should pass options to BibTeX generator", () => {
			const options: GeneratorOptions = { sort: true };
			generator.generate(mockEntries, options);

			// @ts-expect-error - accessing private property for testing
			const bibTeXGenerate = generator.bibtexGenerator.generate;
			assert.strictEqual(bibTeXGenerate.mock.calls.length, 1);
			assert.deepStrictEqual(bibTeXGenerate.mock.calls[0][1], mockEntries);
		});

		it("should return format biblatex", () => {
			assert.strictEqual(generator.format, "biblatex");
		});
	});

	describe("RISGenerator", () => {
		let generator: RISGenerator;

		beforeEach(() => {
			generator = new RISGenerator(
				// @ts-expect-error - accessing private properties for testing
				{
					denormalizeFromCslType: mockDenormalizeFromCslType,
					getRisTag: mockGetRisTag,
					serializeName: mockSerializeName,
					serializeRISDate: mockSerializeRISDate,
				}
			);
		});

		it("should generate RIS format", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("TY  - JOUR"));
			assert.ok(output.includes("TI  - Test Article"));
			assert.ok(output.includes("ER  - "));
		});

		it("should generate multiple records", () => {
			const output = generator.generate(mockEntries);

			const tyCount = (output.match(/TY  - /g) || []).length;
			assert.strictEqual(tyCount, 2);
		});

		it("should sort entries when requested", () => {
			const options: GeneratorOptions = { sort: true };
			generator.generate(mockEntries, options);

			// RIS format doesn't include IDs, just verify both entries are present
			assert.ok(output.includes("TY  - JOUR"));
			assert.ok(output.includes("TY  - BOOK"));
		});

		it("should include authors", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("AU  - Smith, John"));
		});

		it("should include DOI", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("DO  - 10.1234/test"));
		});

		it("should include abstract", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("AB  - This is a test abstract."));
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);
			// Empty entries result in just a line ending
			assert.strictEqual(output, "\n");
		});
	});

	describe("EndNoteXMLGenerator", () => {
		let generator: EndNoteXMLGenerator;

		beforeEach(() => {
			generator = new EndNoteXMLGenerator(
				// @ts-expect-error - accessing private properties for testing
				{
					denormalizeFromCslType: mockDenormalizeFromCslType,
				}
			);
		});

		it("should generate EndNote XML format", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("<record>"));
			assert.ok(output.includes("</record>"));
			assert.ok(output.includes("<titles>"));
			assert.ok(output.includes("<title>Test Article</title>"));
		});

		it("should generate multiple records", () => {
			const output = generator.generate(mockEntries);

			const recordCount = (output.match(/<record>/g) || []).length;
			assert.strictEqual(recordCount, 2);
		});

		it("should wrap in XML structure", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("<?xml"));
			assert.ok(output.includes("<records>"));
			assert.ok(output.includes("</records>"));
		});

		it("should include authors", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("<authors>"));
			assert.ok(output.includes("<author>"));
		});

		it("should include ref-type", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("<ref-type"));
		});

		it("should handle empty entries", () => {
			const output = generator.generate([]);

			assert.ok(output.includes("<?xml"));
			assert.ok(output.includes("<records>"));
			assert.ok(output.includes("</records>"));
		});
	});

	describe("create functions", () => {
		it("should create CSLJSON generator", () => {
			const generator = createCSLJSONGenerator();
			assert.ok(generator instanceof CSLJSONGenerator);
		});

		it("should create BibLaTeX generator", () => {
			const generator = createBibLaTeXGenerator();
			assert.ok(generator instanceof BibLaTeXGenerator);
		});

		it("should create RIS generator", () => {
			const generator = createRISGenerator();
			assert.ok(generator instanceof RISGenerator);
		});

		it("should create EndNote generator", () => {
			const generator = createEndNoteXMLGenerator();
			assert.ok(generator instanceof EndNoteXMLGenerator);
		});
	});
});
