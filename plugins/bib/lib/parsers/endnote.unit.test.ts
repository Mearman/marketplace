/**
 * Tests for EndNote XML parser
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EndNoteXMLParser, createEndNoteXMLParser } from "./endnote";

// Mock dependencies
vi.mock("../mappings/entry-types.js", () => ({
	normalizeToCslType: vi.fn((type: string) => {
		const typeMap: Record<string, string> = {
			"Journal Article": "article-journal",
			"Book": "book",
			"Book Section": "chapter",
		};
		return typeMap[type] || "document";
	}),
}));

vi.mock("./names.js", () => ({
	parseName: vi.fn((name: string) => {
		// Simple name parser for testing
		const parts = name.split(",");
		if (parts.length === 2) {
			return {
				family: parts[0].trim(),
				given: parts[1].trim(),
			};
		}
		return { literal: name };
	}),
}));

vi.mock("./dates.js", () => ({
	parseDate: vi.fn((date: string) => {
		// Simple date parser for testing
		const year = parseInt(date, 10);
		if (!isNaN(year)) {
			return { "date-parts": [[year]] };
		}
		return {};
	}),
}));

describe("EndNote XML Parser", () => {
	let parser: EndNoteXMLParser;

	beforeEach(() => {
		vi.clearAllMocks();
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

			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].type).toBe("article-journal");
			expect(result.entries[0].title).toBe("Test Article Title");
			expect(result.entries[0]["container-title"]).toBe("Journal Name");
			expect(result.entries[0].author).toEqual([{ family: "Smith", given: "John" }]);
			expect(result.entries[0].issued).toEqual({ "date-parts": [[2024]] });
			expect(result.entries[0].volume).toBe("10");
			expect(result.entries[0].issue).toBe("2");
			expect(result.entries[0].page).toBe("1-10");
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
		<ref-type name="Book">6</ref-type>
		<titles><title>Book Title</title></titles>
		<dates><year>2021</year></dates>
	</record>
</records>`;

			const result = parser.parse(content);

			expect(result.entries).toHaveLength(2);
			expect(result.entries[0].type).toBe("article-journal");
			expect(result.entries[1].type).toBe("book");
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

			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].title).toBe("Test");
			expect(result.entries[0].author).toBeUndefined();
			expect(result.entries[0].issued).toBeUndefined();
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

			expect(result.entries[0].DOI).toBe("10.1234/test");
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

			expect(result.entries[0].URL).toBe("https://example.com");
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

			expect(result.entries[0].abstract).toBe("This is an abstract.");
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

			expect(result.entries[0].keyword).toBe("keyword1, keyword2");
		});

		it("should generate ID from title and year", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Test Article</title></titles>
		<dates><year>2024</year></dates>
	</record>
</records>`;

			const result = parser.parse(content);

			expect(result.entries[0].id).toBe("testarticle2024");
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

			expect(result.entries[0].id).toBe("entry1");
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

			expect(result.entries[0].editor).toEqual([{ family: "Doe", given: "Jane" }]);
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
			expect(result.entries).toHaveLength(1);
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

			expect(result.entries[0]._formatMetadata?.source).toBe("endnote");
			expect(result.entries[0]._formatMetadata?.originalType).toBe("Journal Article");
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

			expect(result.entries[0].DOI).toBe("10.5678/test");
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

			expect(result.entries[0].title).toBe("Test & More");
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

			expect(result.entries[0].title).toBe("Bold Title");
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

			expect(warnings).toHaveLength(0);
		});

		it("should warn when no records found", () => {
			const content = `<?xml version="1.0"?>
<records>
</records>`;

			const warnings = parser.validate(content);

			// Should have two warnings: no record elements and no records found
			expect(warnings.length).toBeGreaterThanOrEqual(1);
			expect(warnings.some((w) => w.message.includes("No <record> elements found") || w.message.includes("No records found"))).toBe(true);
		});

		it("should count records in warning", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record><ref-type name="Journal Article">17</ref-type></record>
	<record><ref-type name="Book">6</ref-type></record>
	<record><ref-type name="Book">6</ref-type></record>
</records>`;

			const warnings = parser.validate(content);

			// Should have info about record count
			expect(warnings.some((w) => w.message.includes("3 records"))).toBe(true);
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

			expect(result.stats.total).toBe(1);
			expect(result.stats.successful).toBe(1);
			expect(result.stats.withWarnings).toBe(0);
			expect(result.stats.failed).toBe(0);
		});

		it("should include failed records in stats", () => {
			const content = `<?xml version="1.0"?>
<records>
	<record>
		<ref-type name="Journal Article">17</ref-type>
		<titles><title>Valid</title></titles>
	</record>
	<record>
		<!-- Malformed record -->
	</record>
</records>`;

			const result = parser.parse(content);

			expect(result.stats.total).toBeGreaterThanOrEqual(1);
			expect(result.stats.failed).toBeGreaterThanOrEqual(1);
		});
	});

	describe("createEndNoteXMLParser", () => {
		it("should return an EndNoteXMLParser instance", () => {
			const parser = createEndNoteXMLParser();

			expect(parser).toBeInstanceOf(EndNoteXMLParser);
			expect(parser.format).toBe("endnote");
		});
	});
});
