/**
 * Tests for wayback plugin utilities
 */

import { describe, it, expect } from "vitest";
import {
	API,
	buildArchiveUrl,
	buildScreenshotUrl,
	formatTimestamp,
	parseTimestamp,
	getAuthHeaders,
	type UrlModifier,
} from "./utils";

describe("API URLs", () => {
	describe("availability", () => {
		it("should generate availability URL without timestamp", () => {
			const url = "https://example.com";
			const result = API.availability(url);
			expect(result).toBe("https://archive.org/wayback/available?url=https%3A%2F%2Fexample.com");
		});

		it("should generate availability URL with timestamp", () => {
			const url = "https://example.com";
			const timestamp = "20230101120000";
			const result = API.availability(url, timestamp);
			expect(result).toContain("timestamp=20230101120000");
		});

		it("should encode URL parameters", () => {
			const url = "https://example.com/path?query=value&other=123";
			const result = API.availability(url);
			expect(result).toContain(encodeURIComponent(url));
		});
	});

	describe("cdx", () => {
		it("should generate CDX search URL", () => {
			const url = "https://example.com";
			const result = API.cdx(url);
			expect(result).toBe("https://web.archive.org/cdx/search/cdx?url=https%3A%2F%2Fexample.com&output=json");
		});

		it("should include additional parameters", () => {
			const url = "https://example.com";
			const result = API.cdx(url, { limit: 10, matchType: "exact" });
			expect(result).toContain("limit=10");
			expect(result).toContain("matchType=exact");
		});
	});

	describe("save and saveStatus", () => {
		it("should have save endpoint URL", () => {
			expect(API.save).toBe("https://web.archive.org/save");
		});

		it("should generate save status URL", () => {
			const jobId = "job-123";
			const result = API.saveStatus(jobId);
			expect(result).toBe("https://web.archive.org/save/status/job-123");
		});
	});
});

describe("buildArchiveUrl", () => {
	const timestamp = "20230101120000";
	const url = "https://example.com/page";

	it("should build archive URL with default modifier", () => {
		const result = buildArchiveUrl(timestamp, url);
		expect(result).toBe("https://web.archive.org/web/20230101120000id_/https://example.com/page");
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
			expect(result).toBe(expected[i]);
		});
	});
});

describe("buildScreenshotUrl", () => {
	it("should build screenshot URL", () => {
		const timestamp = "20230101120000";
		const url = "https://example.com";
		const result = buildScreenshotUrl(timestamp, url);
		expect(result).toBe("https://web.archive.org/web/20230101120000im_/https://example.com");
	});
});

describe("formatTimestamp", () => {
	it("should format full timestamp", () => {
		const ts = "20230101123045";
		const result = formatTimestamp(ts);
		expect(result).toBe("2023-01-01 12:30");
	});

	it("should format timestamp with only date", () => {
		const ts = "20230101";
		const result = formatTimestamp(ts);
		expect(result).toBe("2023-01-01 00:00");
	});

	it("should format timestamp with date and hour", () => {
		const ts = "2023010112";
		const result = formatTimestamp(ts);
		expect(result).toBe("2023-01-01 12:00");
	});
});

describe("parseTimestamp", () => {
	it("should parse full timestamp to Date", () => {
		const ts = "20230101123045";
		const result = parseTimestamp(ts);

		expect(result.getFullYear()).toBe(2023);
		expect(result.getMonth()).toBe(0); // January
		expect(result.getDate()).toBe(1);
		expect(result.getHours()).toBe(12);
		expect(result.getMinutes()).toBe(30);
		expect(result.getSeconds()).toBe(45);
	});

	it("should parse date-only timestamp", () => {
		const ts = "20231225";
		const result = parseTimestamp(ts);

		expect(result.getFullYear()).toBe(2023);
		expect(result.getMonth()).toBe(11); // December
		expect(result.getDate()).toBe(25);
	});
});

describe("getAuthHeaders", () => {
	it("should return headers without API key", () => {
		const result = getAuthHeaders();
		expect(result).toEqual({
			Accept: "application/json",
		});
	});

	it("should return headers with API key", () => {
		const apiKey = "test-api-key-12345";
		const result = getAuthHeaders(apiKey);

		expect(result).toEqual({
			Accept: "application/json",
			Authorization: `LOW ${apiKey}`,
		});
	});

	it("should handle empty string API key", () => {
		const result = getAuthHeaders("");
		expect(result).toEqual({
			Accept: "application/json",
		});
		expect(result).not.toHaveProperty("Authorization");
	});
});
