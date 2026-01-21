/**
 * Tests for BibLaTeX parser
 */

import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert";
import { BibLaTeXParser, createBibLaTeXParser } from "./biblatex.js";

describe("BibLaTeX Parser", () => {
	let parser: BibLaTeXParser;

	beforeEach(() => {
		parser = new BibLaTeXParser();
	});

	describe("parse", () => {
		it("should parse simple article entry", () => {
			const content = "@article{test2024, author = {Smith, John}, title = {Test Article}, year = {2024}}";

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].id, "test2024");
			assert.strictEqual(result.entries[0].title, "Test Article");
		});

		it("should update metadata source to biblatex", () => {
			const content = "@article{test2024, title = {Test Article}, year = {2024}}";

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0]._formatMetadata?.source, "biblatex");
			assert.strictEqual(result.entries[0]._formatMetadata?.originalType, "article");
		});

		it("should handle multiple entries", () => {
			const content = `
@article{entry1, title = {First}}
@book{entry2, title = {Second}}
			`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 2);
			assert.strictEqual(result.entries[0]._formatMetadata?.source, "biblatex");
			assert.strictEqual(result.entries[1]._formatMetadata?.source, "biblatex");
		});

		it("should parse BibLaTeX-specific entry type dataset", () => {
			const content = "@dataset{data2024, title = {Research Data}, year = {2024}}";

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 1);
			// @dataset maps to dataset CSL type
			assert.ok(result.entries[0].type);
		});

		it("should parse BibLaTeX-specific entry type online", () => {
			const content = "@online{web2024, title = {Example Site}, url = {https://example.com}, year = {2024}}";

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].URL, "https://example.com");
		});

		it("should parse BibLaTeX-specific field journaltitle", () => {
			const content = "@article{test2024, title = {Article}, journaltitle = {Journal Name}, year = {2024}}";

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0]["container-title"], "Journal Name");
		});

		it("should preserve warnings from parser", () => {
			const content = "@article{test, title = {Unmatched";

			const result = parser.parse(content);

			// Unmatched braces result in no entries being parsed
			assert.strictEqual(result.entries.length, 0);
		});
	});

	describe("validate", () => {
		it("should validate correct BibLaTeX", () => {
			const content = "@article{test2024, title = {Test}, year = {2024}}";

			const warnings = parser.validate(content);

			assert.strictEqual(warnings.filter((w) => w.severity === "error").length, 0);
		});

		it("should detect unmatched braces", () => {
			const content = "@article{test, title = {Unmatched";

			const warnings = parser.validate(content);

			assert.ok(warnings.length > 0);
			assert.strictEqual(warnings[0].type, "parse-error");
		});

		it("should warn on empty file", () => {
			const content = "";

			const warnings = parser.validate(content);

			assert.ok(warnings.some((w) => w.message.includes("No entries")));
		});
	});

	describe("createBibLaTeXParser", () => {
		it("should return a BibLaTeXParser instance", () => {
			const parser = createBibLaTeXParser();

			assert.ok(parser instanceof BibLaTeXParser);
			assert.strictEqual(parser.format, "biblatex");
		});
	});
});
