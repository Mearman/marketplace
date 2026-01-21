/**
 * Tests for lib/helpers utilities
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { formatNumber, formatAge, formatDate } from "./index.js";

describe("formatNumber", () => {
	it("should format millions with M suffix", () => {
		assert.strictEqual(formatNumber(123456789), "123.5M");
		assert.strictEqual(formatNumber(10000000), "10.0M");
	});

	it("should format thousands with K suffix", () => {
		assert.strictEqual(formatNumber(12345), "12.3K");
		assert.strictEqual(formatNumber(9999), "10.0K");
	});

	it("should return small numbers as-is", () => {
		assert.strictEqual(formatNumber(999), "999");
		assert.strictEqual(formatNumber(42), "42");
	});
});

describe("formatAge", () => {
	// Mock current time to be 2026-01-15 12:00:00 UTC for consistent testing
	mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-15T12:00:00Z") });

	it("should return 'in the future' for future timestamps", () => {
		assert.strictEqual(formatAge("20260120120000"), "in the future");
	});

	it("should return 'today' for current day", () => {
		assert.strictEqual(formatAge("20260115120000"), "today");
	});

	it("should return '1 day ago' for yesterday", () => {
		assert.strictEqual(formatAge("20260114120000"), "1 day ago");
	});

	it("should return days ago for recent dates", () => {
		assert.strictEqual(formatAge("20260113120000"), "2 days ago");
		assert.strictEqual(formatAge("20260101120000"), "14 days ago");
	});

	it("should return '1 month ago' for last month", () => {
		assert.strictEqual(formatAge("20251215120000"), "1 month ago");
	});

	it("should return months ago for this year", () => {
		assert.strictEqual(formatAge("20251115120000"), "2 months ago");
		assert.strictEqual(formatAge("20250215120000"), "11 months ago");
	});

	it("should return years ago for previous years", () => {
		assert.strictEqual(formatAge("20250115120000"), "1 year ago");
		assert.strictEqual(formatAge("20240115120000"), "2 years ago");
	});
});

describe("formatDate", () => {
	it("should format date as YYYY-MM-DD HH:MM", () => {
		const date = new Date("2026-01-15T14:30:45");
		assert.strictEqual(formatDate(date), "2026-01-15 14:30");
	});

	it("should handle date with single digit month/day/hour/minute", () => {
		const date = new Date("2026-01-05T09:08:07");
		assert.strictEqual(formatDate(date), "2026-01-05 09:08");
	});

	it("should handle edge of month boundaries", () => {
		const date1 = new Date("2026-01-31T23:59:59");
		assert.strictEqual(formatDate(date1), "2026-01-31 23:59");

		const date2 = new Date("2026-02-01T00:00:01");
		assert.strictEqual(formatDate(date2), "2026-02-01 00:00");
	});

	it("should handle leap year dates", () => {
		const date = new Date("2024-02-29T14:30:00");
		assert.strictEqual(formatDate(date), "2024-02-29 14:30");
	});
});
