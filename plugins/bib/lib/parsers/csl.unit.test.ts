import { describe, it } from "node:test";
import * as assert from "node:assert";
import { CSLJSONParser } from "./csl.js";

describe("CSLJSONParser", () => {
	const parser = new CSLJSONParser();

	describe("basic parsing", () => {
		it("should parse single object", () => {
			const json = "{\"id\": \"test\", \"type\": \"article-journal\", \"title\": \"Test\"}";
			const result = parser.parse(json);
			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].id, "test");
			assert.strictEqual(result.entries[0].type, "article-journal");
			assert.strictEqual(result.entries[0].title, "Test");
		});

		it("should parse array of objects", () => {
			const json = `[
        {"id": "test1", "type": "article", "title": "First"},
        {"id": "test2", "type": "book", "title": "Second"}
      ]`;
			const result = parser.parse(json);
			assert.strictEqual(result.entries.length, 2);
			assert.strictEqual(result.entries[0].id, "test1");
			assert.strictEqual(result.entries[1].id, "test2");
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

			assert.strictEqual(entry.author?.length, 1);
			assert.strictEqual(entry.author?.[0].family, "Smith");
			assert.strictEqual(entry.title, "Test Article");
			assert.strictEqual(entry["container-title"], "Test Journal");
			assert.deepStrictEqual(entry.issued?.["date-parts"], [[2024]]);
			assert.strictEqual(entry.volume, "10");
			assert.strictEqual(entry.page, "1-10");
			assert.strictEqual(entry.DOI, "10.1234/test");
		});
	});

	describe("error handling", () => {
		it("should report error for invalid JSON", () => {
			const json = "{invalid json}";
			const result = parser.parse(json);
			assert.strictEqual(result.warnings.length, 1);
			assert.strictEqual(result.warnings[0].type, "parse-error");
			assert.strictEqual(result.stats.failed, 1);
		});

		it("should report error for missing id", () => {
			const json = "{\"type\": \"article\"}";
			const result = parser.parse(json);
			assert.strictEqual(result.warnings.some((w) => w.message.includes("id")), true);
		});

		it("should report error for missing type", () => {
			const json = "{\"id\": \"test\"}";
			const result = parser.parse(json);
			assert.strictEqual(result.warnings.some((w) => w.message.includes("type")), true);
		});
	});

	describe("validation", () => {
		it("should validate correct CSL JSON", () => {
			const json = "{\"id\": \"test\", \"type\": \"article\"}";
			const warnings = parser.validate(json);
			assert.strictEqual(warnings.filter((w) => w.severity === "error").length, 0);
		});

		it("should detect missing id", () => {
			const json = "{\"type\": \"article\"}";
			const warnings = parser.validate(json);
			assert.strictEqual(warnings.some((w) => w.message.includes("id")), true);
		});

		it("should detect missing type", () => {
			const json = "{\"id\": \"test\"}";
			const warnings = parser.validate(json);
			assert.strictEqual(warnings.some((w) => w.message.includes("type")), true);
		});

		it("should warn on empty array", () => {
			const json = "[]";
			const warnings = parser.validate(json);
			assert.strictEqual(warnings.some((w) => w.message.includes("No entries")), true);
		});

		it("should detect invalid JSON structure", () => {
			const json = "\"not an object\"";
			const warnings = parser.validate(json);
			assert.strictEqual(warnings.some((w) => w.type === "validation-error"), true);
		});
	});

	describe("metadata", () => {
		it("should set format metadata", () => {
			const json = "{\"id\": \"test\", \"type\": \"article\"}";
			const result = parser.parse(json);
			assert.strictEqual(result.entries[0]._formatMetadata?.source, "csl-json");
		});
	});
});
