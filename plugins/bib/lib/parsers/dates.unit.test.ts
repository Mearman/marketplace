import { describe, it } from "node:test";
import * as assert from "node:assert";
import { parseDate, parseBibTeXDate, serializeDate, serializeBibTeXDate, serializeRISDate } from "./dates.js";

describe("parseDate", () => {
	it("should parse ISO year only", () => {
		const date = parseDate("2024");
		assert.deepStrictEqual(date["date-parts"], [[2024]]);
	});

	it("should parse ISO year-month", () => {
		const date = parseDate("2024-03");
		assert.deepStrictEqual(date["date-parts"], [[2024, 3]]);
	});

	it("should parse ISO full date", () => {
		const date = parseDate("2024-03-15");
		assert.deepStrictEqual(date["date-parts"], [[2024, 3, 15]]);
	});

	it("should parse natural language date", () => {
		const date = parseDate("March 2024");
		assert.deepStrictEqual(date["date-parts"], [[2024, 3]]);
	});

	it("should parse natural language with day", () => {
		const date = parseDate("15 March 2024");
		assert.deepStrictEqual(date["date-parts"], [[2024, 3, 15]]);
	});

	it("should handle invalid date as raw", () => {
		const date = parseDate("invalid date");
		assert.strictEqual(date.raw, "invalid date");
		assert.strictEqual(date["date-parts"], undefined);
	});

	it("should parse date range", () => {
		const date = parseDate("2024-03-15/2024-03-20");
		assert.deepStrictEqual(date["date-parts"], [
			[2024, 3, 15],
			[2024, 3, 20],
		]);
	});
});

describe("parseBibTeXDate", () => {
	it("should parse year only", () => {
		const date = parseBibTeXDate("2024");
		assert.deepStrictEqual(date?.["date-parts"], [[2024]]);
	});

	it("should parse year and numeric month", () => {
		const date = parseBibTeXDate("2024", "3");
		assert.deepStrictEqual(date?.["date-parts"], [[2024, 3]]);
	});

	it("should parse year and month name", () => {
		const date = parseBibTeXDate("2024", "mar");
		assert.deepStrictEqual(date?.["date-parts"], [[2024, 3]]);
	});

	it("should parse full date", () => {
		const date = parseBibTeXDate("2024", "3", "15");
		assert.deepStrictEqual(date?.["date-parts"], [[2024, 3, 15]]);
	});

	it("should return undefined for missing year", () => {
		const date = parseBibTeXDate();
		assert.strictEqual(date, undefined);
	});

	it("should handle month names case-insensitively", () => {
		const date = parseBibTeXDate("2024", "March");
		assert.deepStrictEqual(date?.["date-parts"], [[2024, 3]]);
	});
});

describe("serializeDate", () => {
	it("should serialize year only", () => {
		const date = { "date-parts": [[2024]] };
		assert.strictEqual(serializeDate(date), "2024");
	});

	it("should serialize year-month", () => {
		const date = { "date-parts": [[2024, 3]] };
		assert.strictEqual(serializeDate(date), "2024-03");
	});

	it("should serialize full date", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		assert.strictEqual(serializeDate(date), "2024-03-15");
	});

	it("should handle raw date", () => {
		const date = { raw: "circa 2024" };
		assert.strictEqual(serializeDate(date), "circa 2024");
	});

	it("should pad single-digit months and days", () => {
		const date = { "date-parts": [[2024, 3, 5]] };
		assert.strictEqual(serializeDate(date), "2024-03-05");
	});
});

describe("serializeBibTeXDate", () => {
	it("should serialize to year field", () => {
		const date = { "date-parts": [[2024]] };
		const result = serializeBibTeXDate(date);
		assert.strictEqual(result.year, "2024");
		assert.strictEqual(result.month, undefined);
	});

	it("should serialize to year and month macro", () => {
		const date = { "date-parts": [[2024, 3]] };
		const result = serializeBibTeXDate(date);
		assert.strictEqual(result.year, "2024");
		assert.strictEqual(result.month, "mar");
	});

	it("should serialize with day", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		const result = serializeBibTeXDate(date);
		assert.strictEqual(result.year, "2024");
		assert.strictEqual(result.month, "mar");
		assert.strictEqual(result.day, "15");
	});

	it("should handle empty date", () => {
		const date = {};
		const result = serializeBibTeXDate(date);
		assert.deepStrictEqual(result, {});
	});
});

describe("serializeRISDate", () => {
	it("should serialize to RIS format (YYYY)", () => {
		const date = { "date-parts": [[2024]] };
		assert.strictEqual(serializeRISDate(date), "2024");
	});

	it("should serialize to RIS format (YYYY/MM)", () => {
		const date = { "date-parts": [[2024, 3]] };
		assert.strictEqual(serializeRISDate(date), "2024/03");
	});

	it("should serialize to RIS format (YYYY/MM/DD)", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		assert.strictEqual(serializeRISDate(date), "2024/03/15");
	});

	it("should pad single digits", () => {
		const date = { "date-parts": [[2024, 3, 5]] };
		assert.strictEqual(serializeRISDate(date), "2024/03/05");
	});
});
