/**
 * Tests for npms-io suggest.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError, type Dependencies } from "./suggest";
import { parseArgs, type NpmsSuggestion } from "./utils";

describe("suggest.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
		};

		// Mock process
		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful search with results", () => {
			it("should display search results for query with <= 15 results", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "react", score: 1000000, searchScore: 0.95 },
					{ name: "react-dom", score: 950000, searchScore: 0.9 },
					{ name: "react-router", score: 850000, searchScore: 0.85 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Searching for: \"react\"");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Suggestions for \"react\""));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(3 results)"));
			});

			it("should display detailed results with score and URL for each package", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "express", score: 980000, searchScore: 0.92 },
					{ name: "express-validator", score: 880000, searchScore: 0.82 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["express"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("1. express");
				expect(mockConsole.log).toHaveBeenCalledWith("   Score: 980,000");
				expect(mockConsole.log).toHaveBeenCalledWith("   URL: https://www.npmjs.com/package/express");
				expect(mockConsole.log).toHaveBeenCalledWith("2. express-validator");
				expect(mockConsole.log).toHaveBeenCalledWith("   Score: 880,000");
				expect(mockConsole.log).toHaveBeenCalledWith("   URL: https://www.npmjs.com/package/express-validator");
			});

			it("should show separator line with correct length", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "lodash", score: 990000, searchScore: 0.93 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				// "Suggestions for \"lodash\" (1 result)" is 33 chars, separator should be 5 + 20 = 25 dashes
				// Actually: query.length (6) + 25 = 31 dashes
				expect(mockConsole.log).toHaveBeenCalledWith("-".repeat(31));
			});

			it("should format score with locale string (commas for thousands)", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "vue", score: 1234567, searchScore: 0.88 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["vue"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("   Score: 1,234,567");
			});

			it("should show detailed + condensed list when results > 15", async () => {
				const mockSuggestions: NpmsSuggestion[] = Array.from({ length: 20 }, (_, i) => ({
					name: `package-${i + 1}`,
					score: 1000000 - i * 10000,
					searchScore: 0.9 - i * 0.01,
				}));
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				// Should show detailed for first 15
				expect(mockConsole.log).toHaveBeenCalledWith("1. package-1");
				expect(mockConsole.log).toHaveBeenCalledWith("15. package-15");

				// Should show condensed list for all 20
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Top 20 suggestions:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("package-1, package-2"));
			});

			it("should limit results to requested size", async () => {
				const mockSuggestions: NpmsSuggestion[] = Array.from({ length: 50 }, (_, i) => ({
					name: `package-${i + 1}`,
					score: 1000000 - i * 10000,
					searchScore: 0.9 - i * 0.01,
				}));
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["--size=10", "test"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(10 results)"));
				expect(mockConsole.log).toHaveBeenCalledWith("1. package-1");
				expect(mockConsole.log).toHaveBeenCalledWith("10. package-10");
				// Should not show package-11
				expect(mockConsole.log).not.toHaveBeenCalledWith("11. package-11");
			});

			it("should use singular 'result' when only 1 result found", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "unique-package", score: 1000000, searchScore: 0.95 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["unique"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(1 result)"));
				expect(mockConsole.log).not.toHaveBeenCalledWith(expect.stringContaining("(1 results)"));
			});

			it("should use plural 'results' when multiple results found", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "pkg1", score: 1000000, searchScore: 0.95 },
					{ name: "pkg2", score: 900000, searchScore: 0.85 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(2 results)"));
			});

			it("should add blank lines between detailed results", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "pkg1", score: 1000000, searchScore: 0.95 },
					{ name: "pkg2", score: 900000, searchScore: 0.85 },
					{ name: "pkg3", score: 800000, searchScore: 0.75 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Find the index of "2. pkg2"
				const pkg2Index = logCalls.findIndex((call: any[]) => call[0] === "2. pkg2");
				// The call before it should be a blank line
				expect(logCalls[pkg2Index - 1]).toEqual([]);
			});

			it("should not add blank line after last detailed result", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "pkg1", score: 1000000, searchScore: 0.95 },
					{ name: "pkg2", score: 900000, searchScore: 0.85 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Find the index of "2. pkg2"
				const pkg2Index = logCalls.findIndex((call: any[]) => call[0] === "2. pkg2");
				// The call after it should NOT be a blank line (it should be the score)
				expect(logCalls[pkg2Index + 1]).not.toEqual([]);
			});
		});

		describe("no results found", () => {
			it("should display message when no suggestions found", async () => {
				mockFetchWithCache.mockResolvedValue([]);
				const args = parseArgs(["nonexistent-query-xyz"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("Searching for: \"nonexistent-query-xyz\"");
				expect(mockConsole.log).toHaveBeenCalledWith("\nNo suggestions found for \"nonexistent-query-xyz\"");
				expect(mockProcess.exit).toHaveBeenCalledWith(0);
			});

			it("should exit with code 0 when no results", async () => {
				mockFetchWithCache.mockResolvedValue([]);
				const args = parseArgs(["xyz"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("No suggestions found"));
				expect(mockProcess.exit).toHaveBeenCalledWith(0);
			});
		});

		describe("query validation", () => {
			it("should show error when query is less than 2 characters", async () => {
				const args = parseArgs(["a"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("Error: Query must be at least 2 characters");
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should show error for single character query", async () => {
				const args = parseArgs(["x"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("Error: Query must be at least 2 characters");
			});

			it("should accept 2 character query", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "ab-package", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["ab"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Searching for: \"ab\"");
				expect(mockConsole.log).not.toHaveBeenCalledWith("Error: Query must be at least 2 characters");
			});

			it("should show usage message when no query provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("Usage:");
				expect(usageOutput).toContain("npx tsx suggest.ts <query>");
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should include all options in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("--size=N");
				expect(usageOutput).toContain("Number of suggestions");
				expect(usageOutput).toContain("--no-cache");
				expect(usageOutput).toContain("Bypass cache");
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("Examples:");
				expect(usageOutput).toContain("npx tsx suggest.ts react");
				expect(usageOutput).toContain("npx tsx suggest.ts --size=10 express");
				expect(usageOutput).toContain("npx tsx suggest.ts @babel/core");
			});
		});

		describe("size option parsing", () => {
			it("should use default size of 25 when not specified", async () => {
				const mockSuggestions: NpmsSuggestion[] = Array.from({ length: 30 }, (_, i) => ({
					name: `pkg${i}`,
					score: 1000000,
					searchScore: 0.9,
				}));
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				// Should limit to 25 (default)
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(25 results)"));
			});

			it("should parse custom size option", async () => {
				const mockSuggestions: NpmsSuggestion[] = Array.from({ length: 20 }, (_, i) => ({
					name: `pkg${i}`,
					score: 1000000,
					searchScore: 0.9,
				}));
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["--size=5", "test"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(5 results)"));
				expect(mockConsole.log).toHaveBeenCalledWith("1. pkg0");
				expect(mockConsole.log).toHaveBeenCalledWith("5. pkg4");
				expect(mockConsole.log).not.toHaveBeenCalledWith("6. pkg5");
			});

			it("should cap size at 250 when larger value is provided", async () => {
				const mockSuggestions: NpmsSuggestion[] = Array.from({ length: 300 }, (_, i) => ({
					name: `pkg${i}`,
					score: 1000000,
					searchScore: 0.9,
				}));
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["--size=500", "test"]);

				await main(args, deps);

				// Should cap at 250
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: expect.stringContaining("-250"),
					})
				);
			});

			it("should use size 1 when explicitly requested", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "solo", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--size=1", "test"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(1 result)"));
			});

			it("should include size in cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--size=50", "react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "suggest-react-50",
					})
				);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "cached", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "fresh", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should include query in cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["express"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "suggest-express-25",
					})
				);
			});

			it("should use correct TTL (1 hour)", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						ttl: 3600,
					})
				);
			});

			it("should build correct API URL from query", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["@babel/core"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: "https://api.npms.io/v2/search/suggestions?q=%40babel%2Fcore",
					})
				);
			});

			it("should handle special characters in query for cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "suggest-@types/node-25",
					})
				);
			});
		});

		describe("output formatting", () => {
			it("should show header before results", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["query"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Searching for: \"query\"");
				// Verify the output contains the expected header elements
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Suggestions for \"query\""));
			});

			it("should show separator line after header", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "pkg", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["query2"]); // Use longer query to avoid validation error

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// "Suggestions for \"query2\" (1 result)" - query2.length=6, so dashes=31
				expect(logCalls.some((call: any[]) => call[0] === "-".repeat(31))).toBe(true);
			});

			it("should add blank line at end of output", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "end", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Last call should be a blank line
				expect(logCalls[logCalls.length - 1]).toEqual([]);
			});

			it("should format large scores with locale string", async () => {
				mockFetchWithCache.mockResolvedValue([
					{ name: "big-score", score: 999999999, searchScore: 0.99 },
				]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("   Score: 999,999,999");
			});

			it("should show npm URL for each package", async () => {
				mockFetchWithCache.mockResolvedValue([
					{ name: "@angular/core", score: 1000000, searchScore: 0.95 },
				]);
				const args = parseArgs(["angular"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("   URL: https://www.npmjs.com/package/@angular/core");
			});
		});

		describe("error handling", () => {
			it("should handle fetch errors and call handleError", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["express"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Request timeout");
			});

			it("should handle API errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("API rate limit exceeded"));
				const args = parseArgs(["test"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "API rate limit exceeded");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message and exit", () => {
			const error = new Error("Test error message");
			expect(() => handleError(error, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error message");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle numeric errors", () => {
			expect(() => handleError(500, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "500");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle object errors without message property", () => {
			const error = { code: "ERR_API", status: 500 };
			expect(() => handleError(error, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "[object Object]");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			expect(() => handleError(error, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore _query parameter (present for interface consistency)", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-query-name", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// The _query parameter is unused in the error handling, just part of the interface
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error");
		});

		it("should handle Error objects with custom message property", () => {
			const customError = new Error("Custom API error");
			expect(() => handleError(customError, "vue", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Custom API error");
		});

		it("should handle boolean errors", () => {
			expect(() => handleError(false, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "false");
		});

		it("should handle array errors", () => {
			const arrayError = ["error1", "error2"];
			expect(() => handleError(arrayError, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "error1,error2");
		});
	});
});
