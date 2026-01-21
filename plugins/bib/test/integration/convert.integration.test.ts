import { describe, it } from "node:test";
import assert from "node:assert";
import { convert, generate } from "../../lib/converter.js";
import type { BibEntry } from "../../lib/types.js";

describe("Format Conversion Integration", () => {
	describe("BibTeX round-trip", () => {
		it("should preserve data through BibTeX → CSL → BibTeX", () => {
			const bibtex = `@article{smith2024,
  author = {Smith, John},
  title = {Test Article},
  journal = {Nature},
  year = {2024},
  volume = {10},
  pages = {1-10}
}`;

			// Convert to CSL JSON
			const { result: parseResult } = convert(bibtex, "bibtex", "csl-json");
			assert.strictEqual(parseResult.entries.length, 1);

			const entry = parseResult.entries[0];
			assert.strictEqual(entry.id, "smith2024");
			assert.strictEqual(entry.author?.[0].family, "Smith");
			assert.strictEqual(entry.title, "Test Article");

			// Convert back to BibTeX
			const backToBibtex = generate(parseResult.entries, "bibtex");
			assert.ok(backToBibtex.includes("@article{smith2024,"));
			assert.ok(backToBibtex.includes("Smith, John"));
			assert.ok(backToBibtex.includes("Test Article"));
		});
	});

	describe("RIS round-trip", () => {
		it("should preserve data through RIS → CSL → RIS", () => {
			const ris = `TY  - JOUR
AU  - Smith, John
TI  - Test Article
JO  - Nature
PY  - 2024
VL  - 10
SP  - 1
EP  - 10
ER  -`;

			const { result: parseResult } = convert(ris, "ris", "csl-json");
			assert.strictEqual(parseResult.entries.length, 1);

			const entry = parseResult.entries[0];
			assert.strictEqual(entry.author?.[0].family, "Smith");
			assert.strictEqual(entry.title, "Test Article");

			const backToRis = generate(parseResult.entries, "ris");
			assert.ok(backToRis.includes("TY  - JOUR"));
			assert.ok(backToRis.includes("AU  - Smith, John"));
			assert.ok(backToRis.includes("TI  - Test Article"));
		});
	});

	describe("Cross-format conversion", () => {
		it("should convert BibTeX to RIS", () => {
			const bibtex = `@article{test,
  author = {Smith, John},
  title = {Test},
  year = {2024}
}`;

			const { output } = convert(bibtex, "bibtex", "ris");
			assert.ok(output.includes("TY  - JOUR"));
			assert.ok(output.includes("AU  - Smith, John"));
			assert.ok(output.includes("TI  - Test"));
			assert.ok(output.includes("PY  - 2024"));
		});

		it("should convert RIS to BibTeX", () => {
			const ris = `TY  - JOUR
AU  - Smith, John
TI  - Test
PY  - 2024
ER  -`;

			const { output } = convert(ris, "ris", "bibtex");
			assert.ok(output.includes("@article"));
			assert.ok(output.includes("author = {Smith, John}"));
			assert.ok(output.includes("title = {Test}"));
			assert.ok(output.includes("year = {2024}"));
		});
	});

	describe("Multiple entries", () => {
		it("should convert multiple entries correctly", () => {
			const bibtex = `@article{entry1,
  title = {First}
}
@book{entry2,
  title = {Second}
}
@inproceedings{entry3,
  title = {Third}
}`;

			const { result } = convert(bibtex, "bibtex", "csl-json");
			assert.strictEqual(result.entries.length, 3);
			assert.strictEqual(result.entries[0].title, "First");
			assert.strictEqual(result.entries[1].title, "Second");
			assert.strictEqual(result.entries[2].title, "Third");
		});
	});

	describe("Special characters", () => {
		it("should handle LaTeX encoding in BibTeX", () => {
			const bibtex = `@article{test,
  author = {M\\"{u}ller, Hans},
  title = {Test}
}`;

			const { result } = convert(bibtex, "bibtex", "csl-json");
			assert.strictEqual(result.entries[0].author?.[0].family, "Müller");

			// Convert to RIS (should not have LaTeX encoding)
			const { output: risOutput } = convert(bibtex, "bibtex", "ris");
			assert.ok(risOutput.includes("Müller"));
			assert.ok(!risOutput.includes("\\"));
		});
	});

	describe("Lossy conversions", () => {
		it("should convert modern types to misc in BibTeX (lossy)", () => {
			const csl: BibEntry[] = [
				{
					id: "test",
					type: "dataset",
					title: "Test Dataset",
				},
			];

			const output = generate(csl, "bibtex");
			assert.ok(output.includes("@misc{test,")); // Dataset → misc (lossy)
		});

		it("should convert modern types to misc in BibLaTeX (lossy)", () => {
			const csl: BibEntry[] = [
				{
					id: "test",
					type: "dataset",
					title: "Test Dataset",
				},
			];

			const output = generate(csl, "biblatex");
			assert.ok(output.includes("@misc{test,")); // Dataset → misc (lossy in current implementation)
		});
	});

	describe("Field preservation", () => {
		it("should preserve all common fields", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				author: [{ family: "Smith", given: "John" }],
				title: "Test",
				"container-title": "Journal",
				volume: "10",
				issue: "3",
				page: "1-10",
				DOI: "10.1234/test",
				abstract: "Abstract text",
				keyword: "test, example",
			};

			// Convert through BibTeX
			const bibtex = generate([entry], "bibtex");
			const { result } = convert(bibtex, "bibtex", "csl-json");
			const parsed = result.entries[0];

			assert.strictEqual(parsed.author?.[0].family, "Smith");
			assert.strictEqual(parsed.title, "Test");
			assert.strictEqual(parsed["container-title"], "Journal");
			assert.strictEqual(parsed.volume, "10");
			assert.strictEqual(parsed.page, "1-10");
			assert.strictEqual(parsed.DOI, "10.1234/test");
		});
	});
});
