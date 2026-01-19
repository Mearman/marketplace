import { describe, it, expect } from "vitest";
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
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe("smith2024");
      expect(result.entries[0].type).toBe("article-journal");
      expect(result.entries[0].title).toBe("Test Article");
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
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].id).toBe("entry1");
      expect(result.entries[1].id).toBe("entry2");
    });
  });

  describe("field parsing", () => {
    it("should parse braced field values", () => {
      const bibtex = `@article{test, title = {The Title}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].title).toBe("The Title");
    });

    it("should parse quoted field values", () => {
      const bibtex = `@article{test, title = "The Title"}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].title).toBe("The Title");
    });

    it("should handle nested braces", () => {
      const bibtex = `@article{test, title = {The {RNA} World}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].title).toBe("The {RNA} World");
    });
  });

  describe("author parsing", () => {
    it("should parse single author", () => {
      const bibtex = `@article{test, author = {Smith, John}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].author).toHaveLength(1);
      expect(result.entries[0].author?.[0].family).toBe("Smith");
      expect(result.entries[0].author?.[0].given).toBe("John");
    });

    it("should parse multiple authors with 'and'", () => {
      const bibtex = `@article{test, author = {Smith, John and Doe, Jane}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].author).toHaveLength(2);
      expect(result.entries[0].author?.[0].family).toBe("Smith");
      expect(result.entries[0].author?.[1].family).toBe("Doe");
    });
  });

  describe("date parsing", () => {
    it("should parse year field", () => {
      const bibtex = `@article{test, year = {2024}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].issued?.["date-parts"]).toEqual([[2024]]);
    });

    it("should parse year and month", () => {
      const bibtex = `@article{test, year = {2024}, month = mar}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].issued?.["date-parts"]).toEqual([[2024, 3]]);
    });
  });

  describe("special features", () => {
    it("should handle @string macros", () => {
      const bibtex = `
        @string{JOURNAL = "Nature"}
        @article{test, journal = JOURNAL}
      `;
      const result = parser.parse(bibtex);
      expect(result.entries[0]["container-title"]).toBe("Nature");
    });

    it("should handle line comments", () => {
      const bibtex = `
        @article{test,
          title = {Title}, % This is a comment
          year = {2024}
        }
      `;
      const result = parser.parse(bibtex);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe("Title");
    });

    it("should ignore @comment entries", () => {
      const bibtex = `
        @comment{This is a comment}
        @article{test, title = {Real}}
      `;
      const result = parser.parse(bibtex);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe("Real");
    });

    it("should ignore @preamble entries", () => {
      const bibtex = `
        @preamble{"Some preamble"}
        @article{test, title = {Real}}
      `;
      const result = parser.parse(bibtex);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe("LaTeX decoding", () => {
    it("should decode LaTeX characters in title", () => {
      const bibtex = `@article{test, title = {M\\"{u}ller}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].title).toBe("Müller");
    });

    it("should decode LaTeX in author names", () => {
      const bibtex = `@article{test, author = {M\\"{u}ller, Hans}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0].author?.[0].family).toBe("Müller");
    });
  });

  describe("validation", () => {
    it("should detect unmatched braces", () => {
      const bibtex = `@article{test, title = {Unmatched`;
      const warnings = parser.validate(bibtex);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe("parse-error");
    });

    it("should validate correct BibTeX", () => {
      const bibtex = `@article{test, title = {Correct}}`;
      const warnings = parser.validate(bibtex);
      expect(warnings.some((w) => w.severity === "error")).toBe(false);
    });

    it("should warn on empty file", () => {
      const bibtex = "";
      const warnings = parser.validate(bibtex);
      expect(warnings.some((w) => w.message.includes("No entries"))).toBe(true);
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
      expect(result.stats.successful + result.stats.failed).toBeGreaterThan(0);
    });
  });

  describe("metadata preservation", () => {
    it("should preserve format metadata", () => {
      const bibtex = `@article{test, title = {Test}}`;
      const result = parser.parse(bibtex);
      expect(result.entries[0]._formatMetadata?.source).toBe("bibtex");
      expect(result.entries[0]._formatMetadata?.originalType).toBe("article");
    });
  });
});
