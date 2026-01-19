import { describe, it, expect } from "vitest";
import { CSLJSONParser } from "./csl.js";

describe("CSLJSONParser", () => {
	const parser = new CSLJSONParser();

	describe("basic parsing", () => {
		it("should parse single object", () => {
			const json = "{\"id\": \"test\", \"type\": \"article-journal\", \"title\": \"Test\"}";
			const result = parser.parse(json);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].id).toBe("test");
			expect(result.entries[0].type).toBe("article-journal");
			expect(result.entries[0].title).toBe("Test");
		});

		it("should parse array of objects", () => {
			const json = `[
        {"id": "test1", "type": "article", "title": "First"},
        {"id": "test2", "type": "book", "title": "Second"}
      ]`;
			const result = parser.parse(json);
			expect(result.entries).toHaveLength(2);
			expect(result.entries[0].id).toBe("test1");
			expect(result.entries[1].id).toBe("test2");
		});
	});

	describe("field preservation", () => {
		it("should preserve all CSL JSON fields", () => {
			const json = `{
        "id": "test",
        "type": "article-journal",
        "author": [{"family": "Smith", "given": "John"}],
        "title": "Test Article",
        "container-title": "Test Journal",
        "issued": {"date-parts": [[2024]]},
        "volume": "10",
        "page": "1-10",
        "DOI": "10.1234/test"
      }`;
			const result = parser.parse(json);
			const entry = result.entries[0];

			expect(entry.author).toHaveLength(1);
			expect(entry.author?.[0].family).toBe("Smith");
			expect(entry.title).toBe("Test Article");
			expect(entry["container-title"]).toBe("Test Journal");
			expect(entry.issued?.["date-parts"]).toEqual([[2024]]);
			expect(entry.volume).toBe("10");
			expect(entry.page).toBe("1-10");
			expect(entry.DOI).toBe("10.1234/test");
		});
	});

	describe("error handling", () => {
		it("should report error for invalid JSON", () => {
			const json = "{invalid json}";
			const result = parser.parse(json);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe("parse-error");
			expect(result.stats.failed).toBe(1);
		});

		it("should report error for missing id", () => {
			const json = "{\"type\": \"article\"}";
			const result = parser.parse(json);
			expect(result.warnings.some((w) => w.message.includes("id"))).toBe(true);
		});

		it("should report error for missing type", () => {
			const json = "{\"id\": \"test\"}";
			const result = parser.parse(json);
			expect(result.warnings.some((w) => w.message.includes("type"))).toBe(true);
		});
	});

	describe("validation", () => {
		it("should validate correct CSL JSON", () => {
			const json = "{\"id\": \"test\", \"type\": \"article\"}";
			const warnings = parser.validate(json);
			expect(warnings.filter((w) => w.severity === "error")).toHaveLength(0);
		});

		it("should detect missing id", () => {
			const json = "{\"type\": \"article\"}";
			const warnings = parser.validate(json);
			expect(warnings.some((w) => w.message.includes("id"))).toBe(true);
		});

		it("should detect missing type", () => {
			const json = "{\"id\": \"test\"}";
			const warnings = parser.validate(json);
			expect(warnings.some((w) => w.message.includes("type"))).toBe(true);
		});

		it("should warn on empty array", () => {
			const json = "[]";
			const warnings = parser.validate(json);
			expect(warnings.some((w) => w.message.includes("No entries"))).toBe(true);
		});

		it("should detect invalid JSON structure", () => {
			const json = "\"not an object\"";
			const warnings = parser.validate(json);
			expect(warnings.some((w) => w.type === "validation-error")).toBe(true);
		});
	});

	describe("metadata", () => {
		it("should set format metadata", () => {
			const json = "{\"id\": \"test\", \"type\": \"article\"}";
			const result = parser.parse(json);
			expect(result.entries[0]._formatMetadata?.source).toBe("csl-json");
		});
	});
});
