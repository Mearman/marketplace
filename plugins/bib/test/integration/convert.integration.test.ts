import { describe, it, expect } from "vitest";
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
			expect(parseResult.entries).toHaveLength(1);

			const entry = parseResult.entries[0];
			expect(entry.id).toBe("smith2024");
			expect(entry.author?.[0].family).toBe("Smith");
			expect(entry.title).toBe("Test Article");

			// Convert back to BibTeX
			const backToBibtex = generate(parseResult.entries, "bibtex");
			expect(backToBibtex).toContain("@article{smith2024,");
			expect(backToBibtex).toContain("Smith, John");
			expect(backToBibtex).toContain("Test Article");
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
			expect(parseResult.entries).toHaveLength(1);

			const entry = parseResult.entries[0];
			expect(entry.author?.[0].family).toBe("Smith");
			expect(entry.title).toBe("Test Article");

			const backToRis = generate(parseResult.entries, "ris");
			expect(backToRis).toContain("TY  - JOUR");
			expect(backToRis).toContain("AU  - Smith, John");
			expect(backToRis).toContain("TI  - Test Article");
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
			expect(output).toContain("TY  - JOUR");
			expect(output).toContain("AU  - Smith, John");
			expect(output).toContain("TI  - Test");
			expect(output).toContain("PY  - 2024");
		});

		it("should convert RIS to BibTeX", () => {
			const ris = `TY  - JOUR
AU  - Smith, John
TI  - Test
PY  - 2024
ER  -`;

			const { output } = convert(ris, "ris", "bibtex");
			expect(output).toContain("@article");
			expect(output).toContain("author = {Smith, John}");
			expect(output).toContain("title = {Test}");
			expect(output).toContain("year = {2024}");
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
			expect(result.entries).toHaveLength(3);
			expect(result.entries[0].title).toBe("First");
			expect(result.entries[1].title).toBe("Second");
			expect(result.entries[2].title).toBe("Third");
		});
	});

	describe("Special characters", () => {
		it("should handle LaTeX encoding in BibTeX", () => {
			const bibtex = `@article{test,
  author = {M\\"{u}ller, Hans},
  title = {Test}
}`;

			const { result } = convert(bibtex, "bibtex", "csl-json");
			expect(result.entries[0].author?.[0].family).toBe("Müller");

			// Convert to RIS (should not have LaTeX encoding)
			const { output: risOutput } = convert(bibtex, "bibtex", "ris");
			expect(risOutput).toContain("Müller");
			expect(risOutput).not.toContain("\\");
		});
	});

	describe("Lossy conversions", () => {
		it("should warn when converting modern types to BibTeX", () => {
			const csl: BibEntry[] = [
				{
					id: "test",
					type: "dataset",
					title: "Test Dataset",
				},
			];

			const output = generate(csl, "bibtex");
			expect(output).toContain("@misc{test,"); // Dataset → misc (lossy)
		});

		it("should not lose data when converting to BibLaTeX", () => {
			const csl: BibEntry[] = [
				{
					id: "test",
					type: "dataset",
					title: "Test Dataset",
				},
			];

			const output = generate(csl, "biblatex");
			expect(output).toContain("@dataset{test,"); // BibLaTeX supports dataset
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

			expect(parsed.author?.[0].family).toBe("Smith");
			expect(parsed.title).toBe("Test");
			expect(parsed["container-title"]).toBe("Journal");
			expect(parsed.volume).toBe("10");
			expect(parsed.page).toBe("1-10");
			expect(parsed.DOI).toBe("10.1234/test");
		});
	});
});
