/**
 * Tests for wayback plugin utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
	API,
	buildArchiveUrl,
	buildScreenshotUrl,
	formatTimestamp,
	parseTimestamp,
	getAuthHeaders,
	type UrlModifier,
} from "./utils.js";

describe("API URLs", () => {
	describe("availability", () => {
		it("should generate availability URL without timestamp", () => {
			const url = "https://example.com";
			const result = API.availability(url);
			assert.strictEqual(result, "https://archive.org/wayback/available?url=https%3A%2F%2Fexample.com");
		});

		it("should generate availability URL with timestamp", () => {
			const url = "https://example.com";
			const timestamp = "20230101120000";
			const result = API.availability(url, timestamp);
			assert.ok(result.includes("timestamp=20230101120000"));
		});

		it("should encode URL parameters", () => {
			const url = "https://example.com/path?query=value&other=123";
			const result = API.availability(url);
			assert.ok(result.includes(encodeURIComponent(url)));
		});
	});

	describe("cdx", () => {
		it("should generate CDX search URL", () => {
			const url = "https://example.com";
			const result = API.cdx(url);
			assert.strictEqual(result, "https://web.archive.org/cdx/search/cdx?url=https%3A%2F%2Fexample.com&output=json");
		});

		it("should include additional parameters", () => {
			const url = "https://example.com";
			const result = API.cdx(url, { limit: 10, matchType: "exact" });
			assert.ok(result.includes("limit=10"));
			assert.ok(result.includes("matchType=exact"));
		});
	});

	describe("save and saveStatus", () => {
		it("should have save endpoint URL", () => {
			assert.strictEqual(API.save, "https://web.archive.org/save");
		});

		it("should generate save status URL", () => {
			const jobId = "job-123";
			const result = API.saveStatus(jobId);
			assert.strictEqual(result, "https://web.archive.org/save/status/job-123");
		});
	});
});

describe("buildArchiveUrl", () => {
	const timestamp = "20230101120000";
	const url = "https://example.com/page";

	it("should build archive URL with default modifier", () => {
		const result = buildArchiveUrl(timestamp, url);
		assert.strictEqual(result, "https://web.archive.org/web/20230101120000id_/https://example.com/page");
	});

	it("should build archive URL with custom modifier", () => {
		const modifiers: UrlModifier[] = ["id_", "im_", "js_", "cs_", ""];
		const expected = [
			"https://web.archive.org/web/20230101120000id_/https://example.com/page",
			"https://web.archive.org/web/20230101120000im_/https://example.com/page",
			"https://web.archive.org/web/20230101120000js_/https://example.com/page",
			"https://web.archive.org/web/20230101120000cs_/https://example.com/page",
			"https://web.archive.org/web/20230101120000/https://example.com/page",
		];

		modifiers.forEach((modifier, i) => {
			const result = buildArchiveUrl(timestamp, url, modifier);
			assert.strictEqual(result, expected[i]);
		});
	});
});

describe("buildScreenshotUrl", () => {
	it("should build screenshot URL", () => {
		const timestamp = "20230101120000";
		const url = "https://example.com";
		const result = buildScreenshotUrl(timestamp, url);
		assert.strictEqual(result, "https://web.archive.org/web/20230101120000im_/https://example.com");
	});
});

describe("formatTimestamp", () => {
	it("should format full timestamp", () => {
		const ts = "20230101123045";
		const result = formatTimestamp(ts);
		assert.strictEqual(result, "2023-01-01 12:30");
	});

	it("should format timestamp with only date", () => {
		const ts = "20230101";
		const result = formatTimestamp(ts);
		assert.strictEqual(result, "2023-01-01 00:00");
	});

	it("should format timestamp with date and hour", () => {
		const ts = "2023010112";
		const result = formatTimestamp(ts);
		assert.strictEqual(result, "2023-01-01 12:00");
	});
});

describe("parseTimestamp", () => {
	it("should parse full timestamp to Date", () => {
		const ts = "20230101123045";
		const result = parseTimestamp(ts);

		assert.strictEqual(result.getFullYear(), 2023);
		assert.strictEqual(result.getMonth(), 0); // January
		assert.strictEqual(result.getDate(), 1);
		assert.strictEqual(result.getHours(), 12);
		assert.strictEqual(result.getMinutes(), 30);
		assert.strictEqual(result.getSeconds(), 45);
	});

	it("should parse date-only timestamp", () => {
		const ts = "20231225";
		const result = parseTimestamp(ts);

		assert.strictEqual(result.getFullYear(), 2023);
		assert.strictEqual(result.getMonth(), 11); // December
		assert.strictEqual(result.getDate(), 25);
	});
});

describe("getAuthHeaders", () => {
	it("should return headers without API key", () => {
		const result = getAuthHeaders();
		assert.deepStrictEqual(result, {
			Accept: "application/json",
		});
	});

	it("should return headers with API key", () => {
		const apiKey = "test-api-key-12345";
		const result = getAuthHeaders(apiKey);

		assert.deepStrictEqual(result, {
			Accept: "application/json",
			Authorization: `LOW ${apiKey}`,
		});
	});

	it("should handle empty string API key", () => {
		const result = getAuthHeaders("");
		assert.deepStrictEqual(result, {
			Accept: "application/json",
		});
		assert.ok(!result.hasOwnProperty("Authorization"));
	});
});
