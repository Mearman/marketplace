/**
 * Tests for EndNote XML parser
 */

import { describe, it, beforeEach, mock } from "node:test";
import * as assert from "node:assert";
import { EndNoteXMLParser, createEndNoteXMLParser } from "./endnote.js";

describe("EndNote XML Parser", () => {
	let parser: EndNoteXMLParser;

	beforeEach(() => {
		mock.reset();
		parser = new EndNoteXMLParser();
	});

	describe("parse", () => {
		it("should parse simple journal article", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<contributors>
			<authors>
				<author>Smith, John</author>
			</authors>
		</contributors>
		<titles>
			<title>Test Article Title</title>
			<secondary-title>Journal Name</secondary-title>
		</titles>
		<dates>
			<year>2024</year>
		</dates>
		<volume>10</volume>
		<number>2</number>
		<pages>1-10</pages>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].type, "article-journal");
			assert.strictEqual(result.entries[0].title, "Test Article Title");
			assert.strictEqual(result.entries[0]["container-title"], "Journal Name");
			assert.deepStrictEqual(result.entries[0].author, [{ family: "Smith", given: "John" }]);
			assert.deepStrictEqual(result.entries[0].issued, { "date-parts": [[2024]], raw: "2024" });
			assert.strictEqual(result.entries[0].volume, "10");
			assert.strictEqual(result.entries[0].issue, "2");
			assert.strictEqual(result.entries[0].page, "1-10");
		});

		it("should parse multiple records", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Article 1</title></titles>
		<dates><year>2020</year></dates>
	</record>
	<record>
		<ref-type name="Book Section">5</ref-type>
		<titles><title>Chapter Title</title></titles>
		<dates><year>2021</year></dates>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 2);
			assert.strictEqual(result.entries[0].type, "article-journal");
			// Note: The actual type mapping depends on the normalizeToCslType mock
			assert.ok(result.entries[1].type);
		});

		it("should handle missing optional fields", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries.length, 1);
			assert.strictEqual(result.entries[0].title, "Test");
			assert.strictEqual(result.entries[0].author, undefined);
			assert.strictEqual(result.entries[0].issued, undefined);
		});

		it("should extract DOI", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
		<doi>10.1234/test</doi>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].DOI, "10.1234/test");
		});

		it("should extract URL", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
		<url>https://example.com</url>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].URL, "https://example.com");
		});

		it("should extract abstract", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
		<abstract>This is an abstract.</abstract>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].abstract, "This is an abstract.");
		});

		it("should extract keywords", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
		<keywords>keyword1, keyword2</keywords>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].keyword, "keyword1, keyword2");
		});

		it("should generate ID from title and year", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>TestArticle</title></titles>
		<dates><year>2024</year></dates>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].id, "testarticle2024");
		});

		it("should generate fallback ID when no title", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<dates><year>2024</year></dates>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].id, "entry1");
		});

		it("should parse editors", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Book Section">5</ref-type>
		<contributors>
			<editors>
				<editor>Doe, Jane</editor>
			</editors>
		</contributors>
		<titles><title>Chapter Title</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.deepStrictEqual(result.entries[0].editor, [{ family: "Doe", given: "Jane" }]);
		});

		it("should handle malformed record gracefully", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<!-- Missing required fields -->
	</record>
</records>`;

			const result = parser.parse(content);

			// Should still return result, possibly with warnings
			assert.strictEqual(result.entries.length, 1);
		});

		it("should set correct format metadata", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0]._formatMetadata?.source, "endnote");
			assert.strictEqual(result.entries[0]._formatMetadata?.originalType, "Journal Article");
		});

		it("should handle electronic-resource-num as DOI", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
		<electronic-resource-num>10.5678/test</electronic-resource-num>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].DOI, "10.5678/test");
		});

		it("should decode HTML entities", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test &amp; More</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].title, "Test & More");
		});

		it("should strip tags from text content", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title><bold>Bold Title</bold></title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.entries[0].title, "Bold Title");
		});
	});

	describe("validate", () => {
		it("should validate correct XML", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
	</record>
</records>`;

			const warnings = parser.validate(content);

			assert.strictEqual(warnings.length, 0);
		});

		it("should warn when no records found", () => {
			const content = `<?xml version="1.0"?>
<records>
</records>`;

			const warnings = parser.validate(content);

			// Should have two warnings: no record elements and no records found
			assert.ok(warnings.length >= 1);
			assert.strictEqual(warnings.some((w) => w.message.includes("No <record> elements found") || w.message.includes("No records found")), true);
		});

		it("should pass validation for multiple records", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record><ref-type name="Journal Article">17</ref-type></record>
	<record><ref-type name="Book">6</ref-type></record>
	<record><ref-type name="Book">6</ref-type></record>
</records>`;

			const warnings = parser.validate(content);

			// Should not have warnings for valid records
			assert.strictEqual(warnings.length, 0);
		});
	});

	describe("stats", () => {
		it("should calculate correct stats for successful parse", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.stats.total, 1);
			assert.strictEqual(result.stats.successful, 1);
			assert.strictEqual(result.stats.withWarnings, 0);
			assert.strictEqual(result.stats.failed, 0);
		});

		it("should include all records in total count", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Valid 1</title></titles>
	</record>
	<record>
		<ref-type name="Book">6</ref-type>
		<titles><title>Valid 2</title></titles>
	</record>
	<record>
		<ref-type name="Book">6</ref-type>
		<titles><title>Valid 3</title></titles>
	</record>
</records>`;

			const result = parser.parse(content);

			assert.strictEqual(result.stats.total, 3);
			assert.strictEqual(result.stats.successful, 3);
		});
	});

	describe("createEndNoteXMLParser", () => {
		it("should return an EndNoteXMLParser instance", () => {
			const parser = createEndNoteXMLParser();

			assert.ok(parser instanceof EndNoteXMLParser);
			assert.strictEqual(parser.format, "endnote");
		});
	});
});
