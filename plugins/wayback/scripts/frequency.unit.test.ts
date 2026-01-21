/**
 * Tests for wayback frequency.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError, fetchCaptures, calculateFrequency, groupByYear, formatCompact, formatFull, parseDateToTimestamp, type FrequencyResult } from "./frequency.js";
import { parseArgs } from "./utils.js";

describe("frequency.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
		};

		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		mockFetchWithCache = mock.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful analysis", () => {
			it("should analyze frequency with defaults (oldest to newest)", async () => {
				// Mock multiple captures over time
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
					["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
					["com,example)/", "20200301120000", "https://example.com", "text/html", "200", "ghi", "1000"],
					["com,example)/", "20200401120000", "https://example.com", "text/html", "200", "jkl", "1000"],
					["com,example)/", "20200501120000", "https://example.com", "text/html", "200", "mno", "1000"],
				];
				mockFetchWithCache = mock.fn(async () => mockData);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("5 captures over")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Average:")));
			});

			it("should analyze frequency with date range", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
					["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
				];
				mockFetchWithCache = mock.fn(async () => mockData);

				const args = parseArgs(["https://example.com", "2020", "2020"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Fetching capture data")));
			});

			it("should output full breakdown with --full flag", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20190101120000", "https://example.com", "text/html", "200", "abc", "1000"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "def", "1000"],
				];
				mockFetchWithCache = mock.fn(async () => mockData);

				const args = parseArgs(["--full", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("📊 CAPTURE FREQUENCY ANALYSIS")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("By year:")));
			});

			it("should output JSON with --json flag", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
				];
				mockFetchWithCache = mock.fn(async () => mockData);

				const args = parseArgs(["--json", "https://example.com"]);

				await main(args, deps);

				const jsonOutput = mockConsole.log.mock.calls
					.map((c: any[]) => c[0])
					.find((call: string) => call.startsWith("{"));
				assert.ok(jsonOutput !== undefined);
				const parsed = JSON.parse(jsonOutput);
				assert.ok(parsed.hasOwnProperty("totalCaptures"));
				assert.ok(parsed.hasOwnProperty("capturesPerDay"));
			});

			it("should handle no captures found", async () => {
				mockFetchWithCache = mock.fn(async () => []);

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "No captures found in the specified date range."));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Usage:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx frequency.ts <url>")));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => { throw new Error("Network error"); });

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "Network error" });
			});
		});
	});

	describe("parseDateToTimestamp helper", () => {
		it("should parse YYYYMMDD format", () => {
			assert.strictEqual(parseDateToTimestamp("20200101"), "20200101000000");
		});

		it("should parse YYYY-MM format", () => {
			assert.strictEqual(parseDateToTimestamp("2020-01"), "20200100000000");
		});

		it("should parse YYYY format", () => {
			assert.strictEqual(parseDateToTimestamp("2020"), "20200000000000");
		});
	});

	describe("fetchCaptures helper", () => {
		it("should return captures excluding header row", async () => {
			const mockData: any[] = [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
				["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
			];
			mockFetchWithCache = mock.fn(async () => mockData);

			const result = await fetchCaptures("https://example.com", "2020", "2021", mockFetchWithCache);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0][1], "20200101120000");
		});

		it("should return empty array when only header row", async () => {
			mockFetchWithCache = mock.fn(async () => [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
			]);

			const result = await fetchCaptures("https://example.com", "2020", "2021", mockFetchWithCache);

			assert.strictEqual(result.length, 0);
		});
	});

	describe("calculateFrequency helper", () => {
		const mockCaptures: any[] = [
			["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
			["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
			["com,example)/", "20200301120000", "https://example.com", "text/html", "200", "ghi", "1000"],
		];

		it("should calculate frequency statistics", () => {
			const result = calculateFrequency(mockCaptures, "2020", "2021");

			assert.strictEqual(result.totalCaptures, 3);
			assert.ok(result.timeSpanDays > 0);
			assert.ok(result.capturesPerDay > 0);
			assert.ok(result.capturesPerMonth > 0);
			assert.ok(result.capturesPerYear > 0);
		});

		it("should handle empty captures array", () => {
			const result = calculateFrequency([], "2020", "2021");

			assert.strictEqual(result.totalCaptures, 0);
			assert.strictEqual(result.timeSpanDays, 0);
			assert.strictEqual(result.capturesPerDay, 0);
		});
	});

	describe("groupByYear helper", () => {
		it("should group captures by year", () => {
			const mockCaptures: any[] = [
				["com,example)/", "20190101120000", "https://example.com", "text/html", "200", "abc", "1000"],
				["com,example)/", "20190201120000", "https://example.com", "text/html", "200", "def", "1000"],
				["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "ghi", "1000"],
				["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "jkl", "1000"],
				["com,example)/", "20200301120000", "https://example.com", "text/html", "200", "mno", "1000"],
			];

			const result = groupByYear(mockCaptures);

			assert.strictEqual(result["2019"], 2);
			assert.strictEqual(result["2020"], 3);
		});

		it("should handle empty array", () => {
			const result = groupByYear([]);
			assert.strictEqual(Object.keys(result).length, 0);
		});
	});

	describe("formatCompact helper", () => {
		it("should format compact output", () => {
			const result: FrequencyResult = {
				url: "https://example.com",
				from: "2020-01-01 12:00",
				to: "2020-12-31 12:00",
				totalCaptures: 100,
				timeSpanDays: 366,
				capturesPerDay: 0.27,
				capturesPerMonth: 8.33,
				capturesPerYear: 100,
			};

			const output = formatCompact(result);

			assert.ok(output.includes("100 captures over 366 days"));
			assert.ok(output.includes("Average:"));
			assert.ok(output.includes("0.27/day"));
		});

		it("should handle zero captures", () => {
			const result: FrequencyResult = {
				url: "https://example.com",
				from: "",
				to: "",
				totalCaptures: 0,
				timeSpanDays: 0,
				capturesPerDay: 0,
				capturesPerMonth: 0,
				capturesPerYear: 0,
			};

			const output = formatCompact(result);

			assert.ok(output.includes("No captures found"));
		});
	});

	describe("formatFull helper", () => {
		it("should format full output without year breakdown", () => {
			const result: FrequencyResult = {
				url: "https://example.com",
				from: "2020-01-01 12:00",
				to: "2020-12-31 12:00",
				totalCaptures: 100,
				timeSpanDays: 366,
				capturesPerDay: 0.27,
				capturesPerMonth: 8.33,
				capturesPerYear: 100,
			};

			const output = formatFull(result);

			assert.ok(output.includes("📊 CAPTURE FREQUENCY ANALYSIS"));
			assert.ok(output.includes("URL: https://example.com"));
			assert.ok(output.includes("Total captures: 100"));
			assert.ok(!output.includes("By year:"));
		});

		it("should format full output with year breakdown", () => {
			const result: FrequencyResult = {
				url: "https://example.com",
				from: "2019-01-01 12:00",
				to: "2020-12-31 12:00",
				totalCaptures: 300,
				timeSpanDays: 730,
				capturesPerDay: 0.41,
				capturesPerMonth: 12.5,
				capturesPerYear: 150,
				byYear: {
					"2019": 150,
					"2020": 150,
				},
			};

			const output = formatFull(result);

			assert.ok(output.includes("📊 CAPTURE FREQUENCY ANALYSIS"));
			assert.ok(output.includes("By year:"));
			assert.ok(output.includes("2019: 150 captures"));
			assert.ok(output.includes("2020: 150 captures"));
		});

		it("should handle zero captures", () => {
			const result: FrequencyResult = {
				url: "https://example.com",
				from: "",
				to: "",
				totalCaptures: 0,
				timeSpanDays: 0,
				capturesPerDay: 0,
				capturesPerMonth: 0,
				capturesPerYear: 0,
			};

			const output = formatFull(result);

			assert.ok(output.includes("No captures found"));
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Analysis failed");
			assert.throws(() => handleError(error, "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Analysis failed"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});

		it("should handle non-Error objects", () => {
			assert.throws(() => handleError("String error", "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "String error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});
	});
});
