/**
 * Tests for wayback frequency.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError, fetchCaptures, calculateFrequency, groupByYear, formatCompact, formatFull, parseDateToTimestamp, type FrequencyResult } from "./frequency";
import { parseArgs } from "./utils";

// Mock fetch
global.fetch = vi.fn();

describe("frequency.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(global.fetch).mockReset();

		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		mockFetchWithCache = vi.fn();

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
				mockFetchWithCache.mockResolvedValue(mockData);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("5 captures over"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Average:"));
			});

			it("should analyze frequency with date range", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
					["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
				];
				mockFetchWithCache.mockResolvedValue(mockData);

				const args = parseArgs(["https://example.com", "2020", "2020"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Fetching capture data"));
			});

			it("should output full breakdown with --full flag", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20190101120000", "https://example.com", "text/html", "200", "abc", "1000"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "def", "1000"],
				];
				mockFetchWithCache.mockResolvedValue(mockData);

				const args = parseArgs(["--full", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("📊 CAPTURE FREQUENCY ANALYSIS"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("By year:"));
			});

			it("should output JSON with --json flag", async () => {
				const mockData: any[] = [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
				];
				mockFetchWithCache.mockResolvedValue(mockData);

				const args = parseArgs(["--json", "https://example.com"]);

				await main(args, deps);

				const jsonOutput = mockConsole.log.mock.calls
					.map((c: any[]) => c[0])
					.find((call: string) => call.startsWith("{"));
				expect(jsonOutput).toBeDefined();
				const parsed = JSON.parse(jsonOutput);
				expect(parsed).toHaveProperty("totalCaptures");
				expect(parsed).toHaveProperty("capturesPerDay");
			});

			it("should handle no captures found", async () => {
				mockFetchWithCache.mockResolvedValue([]);

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("No captures found in the specified date range.");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx frequency.ts <url>"));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("Network error");
			});
		});
	});

	describe("parseDateToTimestamp helper", () => {
		it("should parse YYYYMMDD format", () => {
			expect(parseDateToTimestamp("20200101")).toBe("20200101000000");
		});

		it("should parse YYYY-MM format", () => {
			expect(parseDateToTimestamp("2020-01")).toBe("20200100000000");
		});

		it("should parse YYYY format", () => {
			expect(parseDateToTimestamp("2020")).toBe("20200000000000");
		});
	});

	describe("fetchCaptures helper", () => {
		it("should return captures excluding header row", async () => {
			const mockData: any[] = [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20200101120000", "https://example.com", "text/html", "200", "abc", "1000"],
				["com,example)/", "20200201120000", "https://example.com", "text/html", "200", "def", "1000"],
			];
			mockFetchWithCache.mockResolvedValue(mockData);

			const result = await fetchCaptures("https://example.com", "2020", "2021", mockFetchWithCache);

			expect(result).toHaveLength(2);
			expect(result[0][1]).toBe("20200101120000");
		});

		it("should return empty array when only header row", async () => {
			mockFetchWithCache.mockResolvedValue([
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
			]);

			const result = await fetchCaptures("https://example.com", "2020", "2021", mockFetchWithCache);

			expect(result).toHaveLength(0);
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

			expect(result.totalCaptures).toBe(3);
			expect(result.timeSpanDays).toBeGreaterThan(0);
			expect(result.capturesPerDay).toBeGreaterThan(0);
			expect(result.capturesPerMonth).toBeGreaterThan(0);
			expect(result.capturesPerYear).toBeGreaterThan(0);
		});

		it("should handle empty captures array", () => {
			const result = calculateFrequency([], "2020", "2021");

			expect(result.totalCaptures).toBe(0);
			expect(result.timeSpanDays).toBe(0);
			expect(result.capturesPerDay).toBe(0);
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

			expect(result["2019"]).toBe(2);
			expect(result["2020"]).toBe(3);
		});

		it("should handle empty array", () => {
			const result = groupByYear([]);
			expect(Object.keys(result)).toHaveLength(0);
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

			expect(output).toContain("100 captures over 366 days");
			expect(output).toContain("Average:");
			expect(output).toContain("0.27/day");
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

			expect(output).toContain("No captures found");
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

			expect(output).toContain("📊 CAPTURE FREQUENCY ANALYSIS");
			expect(output).toContain("URL: https://example.com");
			expect(output).toContain("Total captures: 100");
			expect(output).not.toContain("By year:");
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

			expect(output).toContain("📊 CAPTURE FREQUENCY ANALYSIS");
			expect(output).toContain("By year:");
			expect(output).toContain("2019: 150 captures");
			expect(output).toContain("2020: 150 captures");
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

			expect(output).toContain("No captures found");
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Analysis failed");
			expect(() => handleError(error, "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Analysis failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error objects", () => {
			expect(() => handleError("String error", "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "String error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
