import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeToCslType, denormalizeFromCslType } from "./entry-types.js";

describe("Entry Type Mappings", () => {
	describe("normalizeToCslType", () => {
		it("should normalize BibTeX article to article-journal", () => {
			assert.strictEqual(normalizeToCslType("article", "bibtex"), "article-journal");
		});

		it("should normalize BibTeX book to book", () => {
			assert.strictEqual(normalizeToCslType("book", "bibtex"), "book");
		});

		it("should normalize BibTeX inproceedings to paper-conference", () => {
			assert.strictEqual(normalizeToCslType("inproceedings", "bibtex"), "paper-conference");
		});

		it("should normalize BibTeX phdthesis to thesis", () => {
			assert.strictEqual(normalizeToCslType("phdthesis", "bibtex"), "thesis");
		});

		it("should normalize RIS JOUR to article-journal", () => {
			assert.strictEqual(normalizeToCslType("JOUR", "ris"), "article-journal");
		});

		it("should normalize RIS BOOK to book", () => {
			assert.strictEqual(normalizeToCslType("BOOK", "ris"), "book");
		});

		it("should normalize RIS CONF to paper-conference", () => {
			assert.strictEqual(normalizeToCslType("CONF", "ris"), "paper-conference");
		});

		it("should normalize EndNote Journal Article", () => {
			assert.strictEqual(normalizeToCslType("Journal Article", "endnote"), "article-journal");
		});

		it("should handle unknown types with fallback", () => {
			assert.strictEqual(normalizeToCslType("unknown", "bibtex"), "article");
		});

		it("should be case-insensitive for BibTeX", () => {
			assert.strictEqual(normalizeToCslType("ARTICLE", "bibtex"), "article-journal");
			assert.strictEqual(normalizeToCslType("Article", "bibtex"), "article-journal");
		});
	});

	describe("denormalizeFromCslType", () => {
		it("should denormalize article-journal to BibTeX article", () => {
			const result = denormalizeFromCslType("article-journal", "bibtex");
			assert.strictEqual(result.type, "article");
			assert.strictEqual(result.lossy, false);
		});

		it("should denormalize book to BibTeX book", () => {
			const result = denormalizeFromCslType("book", "bibtex");
			assert.strictEqual(result.type, "book");
			assert.strictEqual(result.lossy, false);
		});

		it("should denormalize paper-conference to BibTeX inproceedings", () => {
			const result = denormalizeFromCslType("paper-conference", "bibtex");
			assert.strictEqual(result.type, "inproceedings");
			assert.strictEqual(result.lossy, false);
		});

		it("should denormalize dataset to BibTeX misc (lossy)", () => {
			const result = denormalizeFromCslType("dataset", "bibtex");
			assert.strictEqual(result.type, "misc");
			assert.strictEqual(result.lossy, true);
		});

		it("should denormalize software to BibTeX misc (lossy)", () => {
			const result = denormalizeFromCslType("software", "bibtex");
			assert.strictEqual(result.type, "misc");
			assert.strictEqual(result.lossy, true);
		});

		it("should denormalize webpage to BibTeX misc (lossy)", () => {
			const result = denormalizeFromCslType("webpage", "bibtex");
			assert.strictEqual(result.type, "misc");
			assert.strictEqual(result.lossy, true);
		});

		it("should denormalize dataset to BibLaTeX dataset (not lossy)", () => {
			const result = denormalizeFromCslType("dataset", "biblatex");
			assert.strictEqual(result.type, "dataset");
			assert.strictEqual(result.lossy, false);
		});

		it("should denormalize software to BibLaTeX software (not lossy)", () => {
			const result = denormalizeFromCslType("software", "biblatex");
			assert.strictEqual(result.type, "software");
			assert.strictEqual(result.lossy, false);
		});

		it("should denormalize to RIS types", () => {
			assert.strictEqual(denormalizeFromCslType("article-journal", "ris").type, "JOUR");
			assert.strictEqual(denormalizeFromCslType("book", "ris").type, "BOOK");
			assert.strictEqual(denormalizeFromCslType("dataset", "ris").type, "DATA");
		});

		it("should denormalize to EndNote types", () => {
			assert.strictEqual(denormalizeFromCslType("article-journal", "endnote").type, "Journal Article");
			assert.strictEqual(denormalizeFromCslType("book", "endnote").type, "Book");
			assert.strictEqual(denormalizeFromCslType("dataset", "endnote").type, "Dataset");
		});

		it("should handle unknown types", () => {
			const result = denormalizeFromCslType("unknown-type" as any, "bibtex");
			assert.strictEqual(result.type, "misc");
			assert.strictEqual(result.lossy, true);
		});
	});

	describe("round-trip conversions", () => {
		it("should round-trip BibTeX types", () => {
			const bibtexTypes = ["article", "book", "inproceedings", "techreport"];

			for (const bibtexType of bibtexTypes) {
				const cslType = normalizeToCslType(bibtexType, "bibtex");
				const result = denormalizeFromCslType(cslType, "bibtex");
				assert.strictEqual(result.lossy, false);
			}
		});

		it("should mark lossy conversions", () => {
			// Modern CSL types that don't exist in BibTeX
			const modernTypes: any[] = ["dataset", "software", "webpage", "patent"];

			for (const cslType of modernTypes) {
				const result = denormalizeFromCslType(cslType, "bibtex");
				assert.strictEqual(result.lossy, true);
				assert.strictEqual(result.type, "misc");
			}
		});

		it("should not mark BibLaTeX conversions as lossy", () => {
			const modernTypes: any[] = ["dataset", "software", "webpage", "patent"];

			for (const cslType of modernTypes) {
				const result = denormalizeFromCslType(cslType, "biblatex");
				assert.strictEqual(result.lossy, false);
			}
		});
	});
});
