/**
 * Tests for npms-io plugin utilities
 */

import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
	API,
	formatDate,
	formatAge,
	formatScore,
	formatNumber,
	parseArgs,
} from "./utils.js";

describe("API URLs", () => {
	describe("API.package", () => {
		it("should generate package URL for unscoped package", () => {
			const result = API.package("react");
			assert.strictEqual(result, "https://api.npms.io/v2/package/react");
		});

		it("should encode package name", () => {
			const result = API.package("@babel/core");
			assert.strictEqual(result, "https://api.npms.io/v2/package/%40babel%2Fcore");
		});

		it("should handle special characters", () => {
			const result = API.package("@angular/core");
			assert.strictEqual(result, "https://api.npms.io/v2/package/%40angular%2Fcore");
		});
	});

	describe("API.mget", () => {
		it("should return mget endpoint URL", () => {
			const result = API.mget();
			assert.strictEqual(result, "https://api.npms.io/v2/package/mget");
		});
	});

	describe("API.search", () => {
		it("should generate search URL with default size", () => {
			const result = API.search("react");
			assert.strictEqual(result, "https://api.npms.io/v2/search?q=react&size=25");
		});

		it("should generate search URL with custom size", () => {
			const result = API.search("react", 50);
			assert.strictEqual(result, "https://api.npms.io/v2/search?q=react&size=50");
		});

		it("should encode query parameters", () => {
			const result = API.search("http server");
			assert.strictEqual(result, "https://api.npms.io/v2/search?q=http%20server&size=25");
		});
	});

	describe("API.suggestions", () => {
		it("should generate suggestions URL", () => {
			const result = API.suggestions("react");
			assert.strictEqual(result, "https://api.npms.io/v2/search/suggestions?q=react");
		});

		it("should encode query parameters", () => {
			const result = API.suggestions("@types/node");
			assert.strictEqual(result, "https://api.npms.io/v2/search/suggestions?q=%40types%2Fnode");
		});
	});
});

describe("formatDate", () => {
	it("should format ISO date string", () => {
		const result = formatDate("2023-01-15T10:30:00Z");
		assert.match(result, /Jan \d{1,2}, 2023/);
	});

	it("should format date with different time", () => {
		const result = formatDate("2023-12-25T14:45:30Z");
		assert.match(result, /Dec \d{1,2}, 2023/);
	});

	it("should handle leap year dates", () => {
		const result = formatDate("2024-02-29T00:00:00Z");
		assert.match(result, /Feb \d{1,2}, 2024/);
	});
});

describe("formatAge", () => {
	it("should return 'today' for same day", () => {
		const today = new Date().toISOString();
		const result = formatAge(today);
		assert.strictEqual(result, "today");
	});

	it("should return '1 day ago' for yesterday", () => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(yesterday);
		assert.strictEqual(result, "1 day ago");
	});

	it("should return days ago for recent dates", () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(twoDaysAgo);
		assert.strictEqual(result, "2 days ago");
	});

	it("should return '10 days ago'", () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(tenDaysAgo);
		assert.strictEqual(result, "10 days ago");
	});

	it("should return months ago for older dates", () => {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(thirtyDaysAgo);
		assert.strictEqual(result, "1 month ago");
	});

	it("should return '6 months ago'", () => {
		const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(sixMonthsAgo);
		assert.strictEqual(result, "6 months ago");
	});

	it("should return years ago for very old dates", () => {
		const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(oneYearAgo);
		assert.strictEqual(result, "1 year ago");
	});

	it("should return '2 years ago'", () => {
		const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(twoYearsAgo);
		assert.strictEqual(result, "2 years ago");
	});

	it("should return 'in the future' for future dates", () => {
		const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const result = formatAge(future);
		assert.strictEqual(result, "in the future");
	});
});

describe("formatScore", () => {
	it("should format 0.5 as '50'", () => {
		const result = formatScore(0.5);
		assert.strictEqual(result, "50");
	});

	it("should format 1.0 as '100'", () => {
		const result = formatScore(1.0);
		assert.strictEqual(result, "100");
	});

	it("should format 0.123 as '12'", () => {
		const result = formatScore(0.123);
		assert.strictEqual(result, "12");
	});

	it("should format 0.999 as '100'", () => {
		const result = formatScore(0.999);
		assert.strictEqual(result, "100");
	});

	it("should format 0.0 as '0'", () => {
		const result = formatScore(0.0);
		assert.strictEqual(result, "0");
	});

	it("should round 0.375 to '38'", () => {
		const result = formatScore(0.375);
		assert.strictEqual(result, "38");
	});
});

describe("re-exported utilities", () => {
	describe("formatNumber", () => {
		it("should format large numbers with K suffix", () => {
			assert.strictEqual(formatNumber(1500), "1.5K");
			assert.strictEqual(formatNumber(999000), "999.0K");
		});

		it("should format large numbers with M suffix", () => {
			assert.strictEqual(formatNumber(1500000), "1.5M");
			assert.strictEqual(formatNumber(25000000), "25.0M");
		});

		it("should return string for small numbers", () => {
			assert.strictEqual(formatNumber(999), "999");
			assert.strictEqual(formatNumber(0), "0");
		});
	});

	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			assert.strictEqual(result.flags.has("no-cache"), true);
			assert.strictEqual(result.flags.has("verbose"), true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=50", "--from=100"]);
			assert.strictEqual(result.options.get("size"), "50");
			assert.strictEqual(result.options.get("from"), "100");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["react", "express"]);
			assert.deepStrictEqual(result.positional, ["react", "express"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			assert.strictEqual(result.flags.has("flag"), true);
			assert.strictEqual(result.options.get("opt"), "value");
			assert.deepStrictEqual(result.positional, ["positional"]);
		});
	});
});
