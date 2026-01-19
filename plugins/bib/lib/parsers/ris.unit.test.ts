import { describe, it, expect } from "vitest";
import { RISParser } from "./ris.js";

describe("RISParser", () => {
	const parser = new RISParser();

	describe("basic parsing", () => {
		it("should parse simple journal article", () => {
			const ris = `
TY  - JOUR
AU  - Smith, John
TI  - Test Article
PY  - 2024
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].type).toBe("article-journal");
			expect(result.entries[0].title).toBe("Test Article");
		});

		it("should parse multiple entries", () => {
			const ris = `
TY  - JOUR
TI  - First
ER  -

TY  - BOOK
TI  - Second
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries).toHaveLength(2);
		});
	});

	describe("author parsing", () => {
		it("should parse multiple authors", () => {
			const ris = `
TY  - JOUR
AU  - Smith, John
AU  - Doe, Jane
TI  - Test
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].author).toHaveLength(2);
			expect(result.entries[0].author?.[0].family).toBe("Smith");
			expect(result.entries[0].author?.[1].family).toBe("Doe");
		});

		it("should parse editors", () => {
			const ris = `
TY  - BOOK
ED  - Smith, John
TI  - Test
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].editor).toHaveLength(1);
			expect(result.entries[0].editor?.[0].family).toBe("Smith");
		});
	});

	describe("field parsing", () => {
		it("should parse volume and issue", () => {
			const ris = `
TY  - JOUR
TI  - Test
VL  - 10
IS  - 3
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].volume).toBe("10");
			expect(result.entries[0].issue).toBe("3");
		});

		it("should parse page range", () => {
			const ris = `
TY  - JOUR
TI  - Test
SP  - 100
EP  - 110
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].page).toBe("100-110");
		});

		it("should parse keywords", () => {
			const ris = `
TY  - JOUR
TI  - Test
KW  - machine learning
KW  - AI
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].keyword).toBe("machine learning; AI");
		});
	});

	describe("date parsing", () => {
		it("should parse year only", () => {
			const ris = `
TY  - JOUR
PY  - 2024
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].issued?.["date-parts"]).toEqual([[2024]]);
		});

		it("should parse full date", () => {
			const ris = `
TY  - JOUR
PY  - 2024/03/15
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].issued?.["date-parts"]).toEqual([[2024, 3, 15]]);
		});

		it("should parse access date", () => {
			const ris = `
TY  - ELEC
Y2  - 2024/03/15
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].accessed?.["date-parts"]).toEqual([[2024, 3, 15]]);
		});
	});

	describe("ID generation", () => {
		it("should generate ID from author and year", () => {
			const ris = `
TY  - JOUR
AU  - Smith, John
PY  - 2024
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].id).toBe("smith2024");
		});

		it("should use index as fallback ID", () => {
			const ris = `
TY  - JOUR
TI  - No Author
ER  -
      `;
			const result = parser.parse(ris);
			expect(result.entries[0].id).toBe("entry1");
		});
	});

	describe("validation", () => {
		it("should validate correct RIS", () => {
			const ris = `
TY  - JOUR
ER  -
      `;
			const warnings = parser.validate(ris);
			expect(warnings.filter((w) => w.severity === "error")).toHaveLength(0);
		});

		it("should detect missing ER tag", () => {
			const ris = `
TY  - JOUR
TI  - Test
      `;
			const warnings = parser.validate(ris);
			expect(warnings.some((w) => w.message.includes("Unclosed entry"))).toBe(true);
		});

		it("should detect ER without TY", () => {
			const ris = `
ER  -
      `;
			const warnings = parser.validate(ris);
			expect(warnings.some((w) => w.message.includes("without matching TY"))).toBe(true);
		});

		it("should warn on empty file", () => {
			const ris = "";
			const warnings = parser.validate(ris);
			expect(warnings.some((w) => w.message.includes("No entries"))).toBe(true);
		});
	});

	describe("entry type normalization", () => {
		it("should normalize JOUR to article-journal", () => {
			const ris = "TY  - JOUR\nER  -";
			const result = parser.parse(ris);
			expect(result.entries[0].type).toBe("article-journal");
		});

		it("should normalize BOOK to book", () => {
			const ris = "TY  - BOOK\nER  -";
			const result = parser.parse(ris);
			expect(result.entries[0].type).toBe("book");
		});

		it("should normalize CONF to paper-conference", () => {
			const ris = "TY  - CONF\nER  -";
			const result = parser.parse(ris);
			expect(result.entries[0].type).toBe("paper-conference");
		});
	});

	describe("metadata", () => {
		it("should set format metadata", () => {
			const ris = "TY  - JOUR\nER  -";
			const result = parser.parse(ris);
			expect(result.entries[0]._formatMetadata?.source).toBe("ris");
			expect(result.entries[0]._formatMetadata?.originalType).toBe("JOUR");
		});
	});
});
