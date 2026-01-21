import { describe, it } from "node:test";
import assert from "node:assert";
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
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].type, "article-journal");
			assert.strictEqual(result.entries[0].title, "Test Article");
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
			assert.strictEqual(result.entries.length, 2);
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
			assert.strictEqual(result.entries[0].author?.length, 2);
			assert.strictEqual(result.entries[0].author?.[0].family, "Smith");
			assert.strictEqual(result.entries[0].author?.[1].family, "Doe");
		});

		it("should parse editors", () => {
			const ris = `
TY  - BOOK
ED  - Smith, John
TI  - Test
ER  -
      `;
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0].editor?.length, 1);
			assert.strictEqual(result.entries[0].editor?.[0].family, "Smith");
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
			assert.strictEqual(result.entries[0].volume, "10");
			assert.strictEqual(result.entries[0].issue, "3");
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
			assert.strictEqual(result.entries[0].page, "100-110");
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
			assert.strictEqual(result.entries[0].keyword, "machine learning; AI");
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
			assert.deepStrictEqual(result.entries[0].issued?.["date-parts"], [[2024]]);
		});

		it("should parse full date", () => {
			const ris = `
TY  - JOUR
PY  - 2024/03/15
ER  -
      `;
			const result = parser.parse(ris);
			assert.deepStrictEqual(result.entries[0].issued?.["date-parts"], [[2024, 3, 15]]);
		});

		it("should parse access date", () => {
			const ris = `
TY  - ELEC
Y2  - 2024/03/15
ER  -
      `;
			const result = parser.parse(ris);
			assert.deepStrictEqual(result.entries[0].accessed?.["date-parts"], [[2024, 3, 15]]);
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
			assert.strictEqual(result.entries[0].id, "smith2024");
		});

		it("should use index as fallback ID", () => {
			const ris = `
TY  - JOUR
TI  - No Author
ER  -
      `;
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0].id, "entry1");
		});
	});

	describe("validation", () => {
		it("should validate correct RIS", () => {
			const ris = `
TY  - JOUR
ER  -
      `;
			const warnings = parser.validate(ris);
			assert.strictEqual(warnings.filter((w) => w.severity === "error").length, 0);
		});

		it("should detect missing ER tag", () => {
			const ris = `
TY  - JOUR
TI  - Test
      `;
			const warnings = parser.validate(ris);
			assert.strictEqual(warnings.some((w) => w.message.includes("Unclosed entry")), true);
		});

		it("should detect ER without TY", () => {
			const ris = `
ER  -
      `;
			const warnings = parser.validate(ris);
			assert.strictEqual(warnings.some((w) => w.message.includes("without matching TY")), true);
		});

		it("should warn on empty file", () => {
			const ris = "";
			const warnings = parser.validate(ris);
			assert.strictEqual(warnings.some((w) => w.message.includes("No entries")), true);
		});
	});

	describe("entry type normalization", () => {
		it("should normalize JOUR to article-journal", () => {
			const ris = "TY  - JOUR\nER  -";
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0].type, "article-journal");
		});

		it("should normalize BOOK to book", () => {
			const ris = "TY  - BOOK\nER  -";
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0].type, "book");
		});

		it("should normalize CONF to paper-conference", () => {
			const ris = "TY  - CONF\nER  -";
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0].type, "paper-conference");
		});
	});

	describe("metadata", () => {
		it("should set format metadata", () => {
			const ris = "TY  - JOUR\nER  -";
			const result = parser.parse(ris);
			assert.strictEqual(result.entries[0]._formatMetadata?.source, "ris");
			assert.strictEqual(result.entries[0]._formatMetadata?.originalType, "JOUR");
		});
	});
});
