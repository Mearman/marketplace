import { describe, it, expect } from "vitest";
import { normalizeToCslType, denormalizeFromCslType } from "./entry-types.js";

describe("Entry Type Mappings", () => {
  describe("normalizeToCslType", () => {
    it("should normalize BibTeX article to article-journal", () => {
      expect(normalizeToCslType("article", "bibtex")).toBe("article-journal");
    });

    it("should normalize BibTeX book to book", () => {
      expect(normalizeToCslType("book", "bibtex")).toBe("book");
    });

    it("should normalize BibTeX inproceedings to paper-conference", () => {
      expect(normalizeToCslType("inproceedings", "bibtex")).toBe("paper-conference");
    });

    it("should normalize BibTeX phdthesis to thesis", () => {
      expect(normalizeToCslType("phdthesis", "bibtex")).toBe("thesis");
    });

    it("should normalize RIS JOUR to article-journal", () => {
      expect(normalizeToCslType("JOUR", "ris")).toBe("article-journal");
    });

    it("should normalize RIS BOOK to book", () => {
      expect(normalizeToCslType("BOOK", "ris")).toBe("book");
    });

    it("should normalize RIS CONF to paper-conference", () => {
      expect(normalizeToCslType("CONF", "ris")).toBe("paper-conference");
    });

    it("should normalize EndNote Journal Article", () => {
      expect(normalizeToCslType("Journal Article", "endnote")).toBe("article-journal");
    });

    it("should handle unknown types with fallback", () => {
      expect(normalizeToCslType("unknown", "bibtex")).toBe("article");
    });

    it("should be case-insensitive for BibTeX", () => {
      expect(normalizeToCslType("ARTICLE", "bibtex")).toBe("article-journal");
      expect(normalizeToCslType("Article", "bibtex")).toBe("article-journal");
    });
  });

  describe("denormalizeFromCslType", () => {
    it("should denormalize article-journal to BibTeX article", () => {
      const result = denormalizeFromCslType("article-journal", "bibtex");
      expect(result.type).toBe("article");
      expect(result.lossy).toBe(false);
    });

    it("should denormalize book to BibTeX book", () => {
      const result = denormalizeFromCslType("book", "bibtex");
      expect(result.type).toBe("book");
      expect(result.lossy).toBe(false);
    });

    it("should denormalize paper-conference to BibTeX inproceedings", () => {
      const result = denormalizeFromCslType("paper-conference", "bibtex");
      expect(result.type).toBe("inproceedings");
      expect(result.lossy).toBe(false);
    });

    it("should denormalize dataset to BibTeX misc (lossy)", () => {
      const result = denormalizeFromCslType("dataset", "bibtex");
      expect(result.type).toBe("misc");
      expect(result.lossy).toBe(true);
    });

    it("should denormalize software to BibTeX misc (lossy)", () => {
      const result = denormalizeFromCslType("software", "bibtex");
      expect(result.type).toBe("misc");
      expect(result.lossy).toBe(true);
    });

    it("should denormalize webpage to BibTeX misc (lossy)", () => {
      const result = denormalizeFromCslType("webpage", "bibtex");
      expect(result.type).toBe("misc");
      expect(result.lossy).toBe(true);
    });

    it("should denormalize dataset to BibLaTeX dataset (not lossy)", () => {
      const result = denormalizeFromCslType("dataset", "biblatex");
      expect(result.type).toBe("dataset");
      expect(result.lossy).toBe(false);
    });

    it("should denormalize software to BibLaTeX software (not lossy)", () => {
      const result = denormalizeFromCslType("software", "biblatex");
      expect(result.type).toBe("software");
      expect(result.lossy).toBe(false);
    });

    it("should denormalize to RIS types", () => {
      expect(denormalizeFromCslType("article-journal", "ris").type).toBe("JOUR");
      expect(denormalizeFromCslType("book", "ris").type).toBe("BOOK");
      expect(denormalizeFromCslType("dataset", "ris").type).toBe("DATA");
    });

    it("should denormalize to EndNote types", () => {
      expect(denormalizeFromCslType("article-journal", "endnote").type).toBe("Journal Article");
      expect(denormalizeFromCslType("book", "endnote").type).toBe("Book");
      expect(denormalizeFromCslType("dataset", "endnote").type).toBe("Dataset");
    });

    it("should handle unknown types", () => {
      const result = denormalizeFromCslType("unknown-type" as any, "bibtex");
      expect(result.type).toBe("misc");
      expect(result.lossy).toBe(true);
    });
  });

  describe("round-trip conversions", () => {
    it("should round-trip BibTeX types", () => {
      const bibtexTypes = ["article", "book", "inproceedings", "techreport"];

      for (const bibtexType of bibtexTypes) {
        const cslType = normalizeToCslType(bibtexType, "bibtex");
        const result = denormalizeFromCslType(cslType, "bibtex");
        expect(result.lossy).toBe(false);
      }
    });

    it("should mark lossy conversions", () => {
      // Modern CSL types that don't exist in BibTeX
      const modernTypes: any[] = ["dataset", "software", "webpage", "patent"];

      for (const cslType of modernTypes) {
        const result = denormalizeFromCslType(cslType, "bibtex");
        expect(result.lossy).toBe(true);
        expect(result.type).toBe("misc");
      }
    });

    it("should not mark BibLaTeX conversions as lossy", () => {
      const modernTypes: any[] = ["dataset", "software", "webpage", "patent"];

      for (const cslType of modernTypes) {
        const result = denormalizeFromCslType(cslType, "biblatex");
        expect(result.lossy).toBe(false);
      }
    });
  });
});
