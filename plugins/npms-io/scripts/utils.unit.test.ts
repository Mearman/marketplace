/**
 * Tests for npms-io plugin utilities
 */

import { describe, it, expect } from "vitest";
import {
	API,
	formatDate,
	formatAge,
	formatScore,
	formatNumber,
	parseArgs,
} from "./utils";

describe("API URLs", () => {
	describe("API.package", () => {
		it("should generate package URL for unscoped package", () => {
			const result = API.package("react");
			expect(result).toBe("https://api.npms.io/v2/package/react");
		});

		it("should encode package name", () => {
			const result = API.package("@babel/core");
			expect(result).toBe("https://api.npms.io/v2/package/%40babel%2Fcore");
		});

		it("should handle special characters", () => {
			const result = API.package("@angular/core");
			expect(result).toBe("https://api.npms.io/v2/package/%40angular%2Fcore");
		});
	});

	describe("API.mget", () => {
		it("should return mget endpoint URL", () => {
			const result = API.mget();
			expect(result).toBe("https://api.npms.io/v2/package/mget");
		});
	});

	describe("API.search", () => {
		it("should generate search URL with default size", () => {
			const result = API.search("react");
			expect(result).toBe("https://api.npms.io/v2/search?q=react&size=25");
		});

		it("should generate search URL with custom size", () => {
			const result = API.search("react", 50);
			expect(result).toBe("https://api.npms.io/v2/search?q=react&size=50");
		});

		it("should encode query parameters", () => {
			const result = API.search("http server");
			expect(result).toBe("https://api.npms.io/v2/search?q=http%20server&size=25");
		});
	});

	describe("API.suggestions", () => {
		it("should generate suggestions URL", () => {
			const result = API.suggestions("react");
			expect(result).toBe("https://api.npms.io/v2/search/suggestions?q=react");
		});

		it("should encode query parameters", () => {
			const result = API.suggestions("@types/node");
			expect(result).toBe("https://api.npms.io/v2/search/suggestions?q=%40types%2Fnode");
		});
	});
});

describe("formatDate", () => {
	it("should format ISO date string", () => {
		const result = formatDate("2023-01-15T10:30:00Z");
		expect(result).toMatch(/Jan \d{1,2}, 2023/);
	});

	it("should format date with different time", () => {
		const result = formatDate("2023-12-25T14:45:30Z");
		expect(result).toMatch(/Dec \d{1,2}, 2023/);
	});

	it("should handle leap year dates", () => {
		const result = formatDate("2024-02-29T00:00:00Z");
		expect(result).toMatch(/Feb \d{1,2}, 2024/);
	});
});

describe("formatAge", () => {
	it("should return 'today' for same day", () => {
		const today = new Date().toISOString();
		const result = formatAge(today);
		expect(result).toBe("today");
	});

	it("should return '1 day ago' for yesterday", () => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(yesterday);
		expect(result).toBe("1 day ago");
	});

	it("should return days ago for recent dates", () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(twoDaysAgo);
		expect(result).toBe("2 days ago");
	});

	it("should return '10 days ago'", () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(tenDaysAgo);
		expect(result).toBe("10 days ago");
	});

	it("should return months ago for older dates", () => {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(thirtyDaysAgo);
		expect(result).toBe("1 month ago");
	});

	it("should return '6 months ago'", () => {
		const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(sixMonthsAgo);
		expect(result).toBe("6 months ago");
	});

	it("should return years ago for very old dates", () => {
		const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(oneYearAgo);
		expect(result).toBe("1 year ago");
	});

	it("should return '2 years ago'", () => {
		const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(twoYearsAgo);
		expect(result).toBe("2 years ago");
	});

	it("should return 'in the future' for future dates", () => {
		const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(future);
		expect(result).toBe("in the future");
	});
});

describe("formatScore", () => {
	it("should format 0.5 as '50'", () => {
		const result = formatScore(0.5);
		expect(result).toBe("50");
	});

	it("should format 1.0 as '100'", () => {
		const result = formatScore(1.0);
		expect(result).toBe("100");
	});

	it("should format 0.123 as '12'", () => {
		const result = formatScore(0.123);
		expect(result).toBe("12");
	});

	it("should format 0.999 as '100'", () => {
		const result = formatScore(0.999);
		expect(result).toBe("100");
	});

	it("should format 0.0 as '0'", () => {
		const result = formatScore(0.0);
		expect(result).toBe("0");
	});

	it("should round 0.375 to '38'", () => {
		const result = formatScore(0.375);
		expect(result).toBe("38");
	});
});

describe("re-exported utilities", () => {
	describe("formatNumber", () => {
		it("should format large numbers with K suffix", () => {
			expect(formatNumber(1500)).toBe("1.5K");
			expect(formatNumber(999000)).toBe("999.0K");
		});

		it("should format large numbers with M suffix", () => {
			expect(formatNumber(1500000)).toBe("1.5M");
			expect(formatNumber(25000000)).toBe("25.0M");
		});

		it("should return string for small numbers", () => {
			expect(formatNumber(999)).toBe("999");
			expect(formatNumber(0)).toBe("0");
		});
	});

	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			expect(result.flags.has("no-cache")).toBe(true);
			expect(result.flags.has("verbose")).toBe(true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=50", "--from=100"]);
			expect(result.options.get("size")).toBe("50");
			expect(result.options.get("from")).toBe("100");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["react", "express"]);
			expect(result.positional).toEqual(["react", "express"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			expect(result.flags.has("flag")).toBe(true);
			expect(result.options.get("opt")).toBe("value");
			expect(result.positional).toEqual(["positional"]);
		});
	});
});
