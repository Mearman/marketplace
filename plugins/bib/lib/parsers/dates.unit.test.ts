import { describe, it, expect } from "vitest";
import { parseDate, parseBibTeXDate, serializeDate, serializeBibTeXDate, serializeRISDate } from "./dates.js";

describe("parseDate", () => {
	it("should parse ISO year only", () => {
		const date = parseDate("2024");
		expect(date["date-parts"]).toEqual([[2024]]);
	});

	it("should parse ISO year-month", () => {
		const date = parseDate("2024-03");
		expect(date["date-parts"]).toEqual([[2024, 3]]);
	});

	it("should parse ISO full date", () => {
		const date = parseDate("2024-03-15");
		expect(date["date-parts"]).toEqual([[2024, 3, 15]]);
	});

	it("should parse natural language date", () => {
		const date = parseDate("March 2024");
		expect(date["date-parts"]).toEqual([[2024, 3]]);
	});

	it("should parse natural language with day", () => {
		const date = parseDate("15 March 2024");
		expect(date["date-parts"]).toEqual([[2024, 3, 15]]);
	});

	it("should handle invalid date as raw", () => {
		const date = parseDate("invalid date");
		expect(date.raw).toBe("invalid date");
		expect(date["date-parts"]).toBeUndefined();
	});

	it("should parse date range", () => {
		const date = parseDate("2024-03-15/2024-03-20");
		expect(date["date-parts"]).toEqual([
			[2024, 3, 15],
			[2024, 3, 20],
		]);
	});
});

describe("parseBibTeXDate", () => {
	it("should parse year only", () => {
		const date = parseBibTeXDate("2024");
		expect(date?.["date-parts"]).toEqual([[2024]]);
	});

	it("should parse year and numeric month", () => {
		const date = parseBibTeXDate("2024", "3");
		expect(date?.["date-parts"]).toEqual([[2024, 3]]);
	});

	it("should parse year and month name", () => {
		const date = parseBibTeXDate("2024", "mar");
		expect(date?.["date-parts"]).toEqual([[2024, 3]]);
	});

	it("should parse full date", () => {
		const date = parseBibTeXDate("2024", "3", "15");
		expect(date?.["date-parts"]).toEqual([[2024, 3, 15]]);
	});

	it("should return undefined for missing year", () => {
		const date = parseBibTeXDate();
		expect(date).toBeUndefined();
	});

	it("should handle month names case-insensitively", () => {
		const date = parseBibTeXDate("2024", "March");
		expect(date?.["date-parts"]).toEqual([[2024, 3]]);
	});
});

describe("serializeDate", () => {
	it("should serialize year only", () => {
		const date = { "date-parts": [[2024]] };
		expect(serializeDate(date)).toBe("2024");
	});

	it("should serialize year-month", () => {
		const date = { "date-parts": [[2024, 3]] };
		expect(serializeDate(date)).toBe("2024-03");
	});

	it("should serialize full date", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		expect(serializeDate(date)).toBe("2024-03-15");
	});

	it("should handle raw date", () => {
		const date = { raw: "circa 2024" };
		expect(serializeDate(date)).toBe("circa 2024");
	});

	it("should pad single-digit months and days", () => {
		const date = { "date-parts": [[2024, 3, 5]] };
		expect(serializeDate(date)).toBe("2024-03-05");
	});
});

describe("serializeBibTeXDate", () => {
	it("should serialize to year field", () => {
		const date = { "date-parts": [[2024]] };
		const result = serializeBibTeXDate(date);
		expect(result.year).toBe("2024");
		expect(result.month).toBeUndefined();
	});

	it("should serialize to year and month macro", () => {
		const date = { "date-parts": [[2024, 3]] };
		const result = serializeBibTeXDate(date);
		expect(result.year).toBe("2024");
		expect(result.month).toBe("mar");
	});

	it("should serialize with day", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		const result = serializeBibTeXDate(date);
		expect(result.year).toBe("2024");
		expect(result.month).toBe("mar");
		expect(result.day).toBe("15");
	});

	it("should handle empty date", () => {
		const date = {};
		const result = serializeBibTeXDate(date);
		expect(result).toEqual({});
	});
});

describe("serializeRISDate", () => {
	it("should serialize to RIS format (YYYY)", () => {
		const date = { "date-parts": [[2024]] };
		expect(serializeRISDate(date)).toBe("2024");
	});

	it("should serialize to RIS format (YYYY/MM)", () => {
		const date = { "date-parts": [[2024, 3]] };
		expect(serializeRISDate(date)).toBe("2024/03");
	});

	it("should serialize to RIS format (YYYY/MM/DD)", () => {
		const date = { "date-parts": [[2024, 3, 15]] };
		expect(serializeRISDate(date)).toBe("2024/03/15");
	});

	it("should pad single digits", () => {
		const date = { "date-parts": [[2024, 3, 5]] };
		expect(serializeRISDate(date)).toBe("2024/03/05");
	});
});
