/**
 * Tests for lib/helpers utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatNumber, formatAge, formatDate } from "./index";

describe("formatNumber", () => {
	it("should format millions with M suffix", () => {
		expect(formatNumber(123456789)).toBe("123.5M");
		expect(formatNumber(10000000)).toBe("10.0M");
	});

	it("should format thousands with K suffix", () => {
		expect(formatNumber(12345)).toBe("12.3K");
		expect(formatNumber(9999)).toBe("10.0K");
	});

	it("should return small numbers as-is", () => {
		expect(formatNumber(999)).toBe("999");
		expect(formatNumber(42)).toBe("42");
	});
});

describe("formatAge", () => {
	// Mock current time to be 2026-01-15 12:00:00 UTC for consistent testing
	beforeEach(() => {
		vi.setSystemTime(new Date("2026-01-15T12:00:00Z").getTime());
	});

	it("should return 'in the future' for future timestamps", () => {
		expect(formatAge("20260120120000")).toBe("in the future");
	});

	it("should return 'today' for current day", () => {
		expect(formatAge("20260115120000")).toBe("today");
	});

	it("should return '1 day ago' for yesterday", () => {
		expect(formatAge("20260114120000")).toBe("1 day ago");
	});

	it("should return days ago for recent dates", () => {
		expect(formatAge("20260113120000")).toBe("2 days ago");
		expect(formatAge("20260101120000")).toBe("14 days ago");
	});

	it("should return '1 month ago' for last month", () => {
		expect(formatAge("20251215120000")).toBe("1 month ago");
	});

	it("should return months ago for this year", () => {
		expect(formatAge("20251115120000")).toBe("2 months ago");
		expect(formatAge("20250215120000")).toBe("11 months ago");
	});

	it("should return years ago for previous years", () => {
		expect(formatAge("20250115120000")).toBe("1 year ago");
		expect(formatAge("20240115120000")).toBe("2 years ago");
	});
});

describe("formatDate", () => {
	it("should format date as YYYY-MM-DD HH:MM", () => {
		const date = new Date("2026-01-15T14:30:45");
		expect(formatDate(date)).toBe("2026-01-15 14:30");
	});

	it("should handle date with single digit month/day/hour/minute", () => {
		const date = new Date("2026-01-05T09:08:07");
		expect(formatDate(date)).toBe("2026-01-05 09:08");
	});

	it("should handle edge of month boundaries", () => {
		const date1 = new Date("2026-01-31T23:59:59");
		expect(formatDate(date1)).toBe("2026-01-31 23:59");

		const date2 = new Date("2026-02-01T00:00:01");
		expect(formatDate(date2)).toBe("2026-02-01 00:00");
	});

	it("should handle leap year dates", () => {
		const date = new Date("2024-02-29T14:30:00");
		expect(formatDate(date)).toBe("2024-02-29 14:30");
	});
});

