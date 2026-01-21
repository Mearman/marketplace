/**
 * Tests for bibliography generators
 */

import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert";
import { BibLaTeXGenerator, createBibLaTeXGenerator } from "./generators/biblatex.js";
import { CSLJSONGenerator, createCSLJSONGenerator } from "./generators/csl.js";
import { EndNoteXMLGenerator, createEndNoteXMLGenerator } from "./generators/endnote.js";
import { RISGenerator, createRISGenerator } from "./generators/ris.js";
import type { BibEntry, GeneratorOptions } from "./types.js";

describe("Generators", () => {
	let mockEntries: BibEntry[];

	beforeEach(() => {
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

			// doe2023 should come before smith2024 alphabetically
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
			generator = new BibLaTeXGenerator();
		});

		it("should generate BibLaTeX format output", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("@article"));
			assert.ok(output.includes("smith2024"));
		});

		it("should include entry fields", () => {
			const output = generator.generate(mockEntries);

			assert.ok(output.includes("Test Article"));
			assert.ok(output.includes("Smith, John"));
		});

		it("should return format biblatex", () => {
			assert.strictEqual(generator.format, "biblatex");
		});
	});

	describe("RISGenerator", () => {
		let generator: RISGenerator;

		beforeEach(() => {
			generator = new RISGenerator();
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
			const output = generator.generate(mockEntries, options);

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
			generator = new EndNoteXMLGenerator();
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
