import { describe, it } from "node:test";
import * as assert from "node:assert";
import { BibTeXParser } from "./bibtex.js";

describe("BibTeXParser", () => {
	const parser = new BibTeXParser();

	describe("basic parsing", () => {
		it("should parse simple article entry", () => {
			const bibtex = `
        @article{smith2024,
          author = {Smith, John},
          title = {Test Article},
          year = {2024}
        }
      `;

			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].id, "smith2024");
			assert.strictEqual(result.entries[0].type, "article-journal");
			assert.strictEqual(result.entries[0].title, "Test Article");
		});

		it("should parse multiple entries", () => {
			const bibtex = `
        @article{entry1,
          title = {First}
        }
        @book{entry2,
          title = {Second}
        }
      `;

			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries.length, 2);
			assert.strictEqual(result.entries[0].id, "entry1");
			assert.strictEqual(result.entries[1].id, "entry2");
		});
	});

	describe("field parsing", () => {
		it("should parse braced field values", () => {
			const bibtex = "@article{test, title = {The Title}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].title, "The Title");
		});

		it("should parse quoted field values", () => {
			const bibtex = "@article{test, title = \"The Title\"}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].title, "The Title");
		});

		it("should handle nested braces", () => {
			const bibtex = "@article{test, title = {The {RNA} World}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].title, "The {RNA} World");
		});
	});

	describe("author parsing", () => {
		it("should parse single author", () => {
			const bibtex = "@article{test, author = {Smith, John}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].author?.length, 1);
			assert.strictEqual(result.entries[0].author?.[0].family, "Smith");
			assert.strictEqual(result.entries[0].author?.[0].given, "John");
		});

		it("should parse multiple authors with 'and'", () => {
			const bibtex = "@article{test, author = {Smith, John and Doe, Jane}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].author?.length, 2);
			assert.strictEqual(result.entries[0].author?.[0].family, "Smith");
			assert.strictEqual(result.entries[0].author?.[1].family, "Doe");
		});
	});

	describe("date parsing", () => {
		it("should parse year field", () => {
			const bibtex = "@article{test, year = {2024}}";
			const result = parser.parse(bibtex);
			assert.deepStrictEqual(result.entries[0].issued?.["date-parts"], [[2024]]);
		});

		it("should parse year and month", () => {
			const bibtex = "@article{test, year = {2024}, month = mar}";
			const result = parser.parse(bibtex);
			assert.deepStrictEqual(result.entries[0].issued?.["date-parts"], [[2024, 3]]);
		});
	});

	describe("special features", () => {
		it("should handle @string macros", () => {
			const bibtex = `
        @string{JOURNAL = "Nature"}
        @article{test, journal = JOURNAL}
      `;
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0]["container-title"], "Nature");
		});

		it("should handle line comments", () => {
			const bibtex = `
        @article{test,
          title = {Title}, % This is a comment
          year = {2024}
        }
      `;
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].title, "Title");
		});

		it("should ignore @comment entries", () => {
			const bibtex = `
        @comment{This is a comment}
        @article{test, title = {Real}}
      `;
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].title, "Real");
		});

		it("should ignore @preamble entries", () => {
			const bibtex = `
        @preamble{"Some preamble"}
        @article{test, title = {Real}}
      `;
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].title, "Real");
		});
	});

	describe("LaTeX decoding", () => {
		it("should decode LaTeX characters in title", () => {
			const bibtex = "@article{test, title = {M\\\"{u}ller}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].title, "Müller");
		});

		it("should decode LaTeX in author names", () => {
			const bibtex = "@article{test, author = {M\\\"{u}ller, Hans}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0].author?.[0].family, "Müller");
		});
	});

	describe("validation", () => {
		it("should detect unmatched braces", () => {
			const bibtex = "@article{test, title = {Unmatched";
			const warnings = parser.validate(bibtex);
			assert.ok(warnings.length > 0);
			assert.strictEqual(warnings[0].type, "parse-error");
		});

		it("should validate correct BibTeX", () => {
			const bibtex = "@article{test, title = {Correct}}";
			const warnings = parser.validate(bibtex);
			assert.strictEqual(warnings.some((w) => w.severity === "error"), false);
		});

		it("should warn on empty file", () => {
			const bibtex = "";
			const warnings = parser.validate(bibtex);
			assert.strictEqual(warnings.some((w) => w.message.includes("No entries")), true);
		});
	});

	describe("error handling", () => {
		it("should handle malformed entries gracefully", () => {
			const bibtex = `
        @article{good, title = {Good}}
        @article{bad title = }
        @article{good2, title = {Good2}}
      `;
			const result = parser.parse(bibtex);
			// Should parse the good entries and report warnings for bad ones
			assert.ok(result.stats.successful + result.stats.failed > 0);
		});
	});

	describe("metadata preservation", () => {
		it("should preserve format metadata", () => {
			const bibtex = "@article{test, title = {Test}}";
			const result = parser.parse(bibtex);
			assert.strictEqual(result.entries[0]._formatMetadata?.source, "bibtex");
			assert.strictEqual(result.entries[0]._formatMetadata?.originalType, "article");
		});
	});
});
