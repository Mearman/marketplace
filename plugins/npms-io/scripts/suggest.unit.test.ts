/**
 * Tests for npms-io suggest.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import * as assert from "node:assert";
import { main, handleError } from "./suggest.js";
import { parseArgs, type NpmsSuggestion } from "./utils.js";

describe("suggest.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		// Mock console
		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
			warn: mock.fn(),
			info: mock.fn(),
			debug: mock.fn(),
			trace: mock.fn(),
		};

		// Mock process
		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = mock.fn();

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

				assert.deepStrictEqual(mockConsole.log.mock.calls[0][0], "Searching for: \"react\"");
				assert.ok(String(mockConsole.log.mock.calls[1][0]).includes("Suggestions for \"react\""));
				assert.ok(String(mockConsole.log.mock.calls[1][0]).includes("(3 results)"));
			});

			it("should display detailed results with score and URL for each package", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "express", score: 980000, searchScore: 0.92 },
					{ name: "express-validator", score: 880000, searchScore: 0.82 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["express"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("1. express"));
				assert.ok(logCalls.includes("   Score: 980,000"));
				assert.ok(logCalls.includes("   URL: https://www.npmjs.com/package/express"));
				assert.ok(logCalls.includes("2. express-validator"));
				assert.ok(logCalls.includes("   Score: 880,000"));
				assert.ok(logCalls.includes("   URL: https://www.npmjs.com/package/express-validator"));
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
				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("-".repeat(31)));
			});

			it("should format score with locale string (commas for thousands)", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "vue", score: 1234567, searchScore: 0.88 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("   Score: 1,234,567"));
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
				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("1. package-1"));
				assert.ok(logCalls.includes("15. package-15"));

				// Should show condensed list for all 20
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Top 20 suggestions:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("package-1, package-2")));
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

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(10 results)")));
				assert.ok(logCalls.includes("1. package-1"));
				assert.ok(logCalls.includes("10. package-10"));
				assert.ok(!logCalls.includes("11. package-11"));
			});

			it("should use singular 'result' when only 1 result found", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "unique-package", score: 1000000, searchScore: 0.95 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["unique"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(1 result)")));
				assert.ok(!logCalls.some((call: string) => typeof call === "string" && call.includes("(1 results)")));
			});

			it("should use plural 'results' when multiple results found", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "pkg1", score: 1000000, searchScore: 0.95 },
					{ name: "pkg2", score: 900000, searchScore: 0.85 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(2 results)")));
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
				assert.deepStrictEqual(logCalls[pkg2Index - 1], []);
			});

			it("should not add blank line after last detailed result", async () => {
				const mockSuggestions: NpmsSuggestion[] = [
					{ name: "pkg1", score: 1000000, searchScore: 0.95 },
					{ name: "pkg2", score: 900000, searchScore: 0.85 },
				];
				mockFetchWithCache.mockResolvedValue(mockSuggestions);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls as string[][];
				// Find the index of "2. pkg2"
				const pkg2Index = logCalls.findIndex((call) => call[0] === "2. pkg2");
				// The call after it should NOT be a blank line (it should be the score)
				assert.ok(logCalls[pkg2Index + 1] && logCalls[pkg2Index + 1].length > 0);
			});
		});

		describe("no results found", () => {
			it("should display message when no suggestions found", async () => {
				mockFetchWithCache.mockResolvedValue([]);
				const args = parseArgs(["nonexistent-query-xyz"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("Searching for: \"nonexistent-query-xyz\""));
				assert.ok(logCalls.includes("\nNo suggestions found for \"nonexistent-query-xyz\""));
				assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [0]);
			});

			it("should exit with code 0 when no results", async () => {
				mockFetchWithCache.mockResolvedValue([]);
				const args = parseArgs(["xyz"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("No suggestions found")));
				assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [0]);
			});
		});

		describe("query validation", () => {
			it("should show error when query is less than 2 characters", async () => {
				const args = parseArgs(["a"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("Error: Query must be at least 2 characters"));
				assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should show error for single character query", async () => {
				const args = parseArgs(["x"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("Error: Query must be at least 2 characters"));
			});

			it("should accept 2 character query", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "ab-package", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["ab"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("Searching for: \"ab\""));
				assert.ok(!logCalls.includes("Error: Query must be at least 2 characters"));
			});

			it("should show usage message when no query provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("Usage:"));
				assert.ok(usageOutput.includes("npx tsx suggest.ts <query>"));
				assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should include all options in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("--size=N"));
				assert.ok(usageOutput.includes("Number of suggestions"));
				assert.ok(usageOutput.includes("--no-cache"));
				assert.ok(usageOutput.includes("Bypass cache"));
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("Examples:"));
				assert.ok(usageOutput.includes("npx tsx suggest.ts react"));
				assert.ok(usageOutput.includes("npx tsx suggest.ts --size=10 express"));
				assert.ok(usageOutput.includes("npx tsx suggest.ts @babel/core"));
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
				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(25 results)")));
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

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(5 results)")));
				assert.ok(logCalls.includes("1. pkg0"));
				assert.ok(logCalls.includes("5. pkg4"));
				assert.ok(!logCalls.includes("6. pkg5"));
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
				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.ok(call.cacheKey.includes("-250"));
			});

			it("should use size 1 when explicitly requested", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "solo", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--size=1", "test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("(1 result)")));
			});

			it("should include size in cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--size=50", "react"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.cacheKey, "suggest-react-50");
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "cached", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["react"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "fresh", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, true);
			});

			it("should include query in cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["express"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.cacheKey, "suggest-express-25");
			});

			it("should use correct TTL (1 hour)", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.ttl, 3600);
			});

			it("should build correct API URL from query", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["@babel/core"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.url, "https://api.npms.io/v2/search/suggestions?q=%40babel%2Fcore");
			});

			it("should handle special characters in query for cache key", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.cacheKey, "suggest-@types/node-25");
			});
		});

		describe("output formatting", () => {
			it("should show header before results", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "test", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["query"]);

				await main(args, deps);

				assert.deepStrictEqual(mockConsole.log.mock.calls[0][0], "Searching for: \"query\"");
				// Verify the output contains the expected header elements
				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Suggestions for \"query\"")));
			});

			it("should show separator line after header", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "pkg", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["query2"]); // Use longer query to avoid validation error

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				// "Suggestions for \"query2\" (1 result)" - query2.length=6, so dashes=31
				assert.ok(logCalls.includes("-".repeat(31)));
			});

			it("should add blank line at end of output", async () => {
				mockFetchWithCache.mockResolvedValue([{ name: "end", score: 1000000, searchScore: 0.9 }]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Last call should be a blank line
				assert.deepStrictEqual(logCalls[logCalls.length - 1], []);
			});

			it("should format large scores with locale string", async () => {
				mockFetchWithCache.mockResolvedValue([
					{ name: "big-score", score: 999999999, searchScore: 0.99 },
				]);
				const args = parseArgs(["test"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("   Score: 999,999,999"));
			});

			it("should show npm URL for each package", async () => {
				mockFetchWithCache.mockResolvedValue([
					{ name: "@angular/core", score: 1000000, searchScore: 0.95 },
				]);
				const args = parseArgs(["angular"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("   URL: https://www.npmjs.com/package/@angular/core"));
			});
		});

		describe("error handling", () => {
			it("should handle fetch errors and call handleError", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Network error"]);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["express"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Request timeout"]);
			});

			it("should handle API errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("API rate limit exceeded"));
				const args = parseArgs(["test"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "API rate limit exceeded"]);
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "string error"]);
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message and exit", () => {
			const error = new Error("Test error message");
			assert.throws(() => handleError(error, "react", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Test error message"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "string error"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "null"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "undefined"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle numeric errors", () => {
			assert.throws(() => handleError(500, "react", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "500"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle object errors without message property", () => {
			const error = { code: "ERR_API", status: 500 };
			assert.throws(() => handleError(error, "express", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "[object Object]"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			assert.throws(() => handleError(error, "test", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should ignore _query parameter (present for interface consistency)", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-query-name", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			// The _query parameter is unused in the error handling, just part of the interface
			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Test error"]);
		});

		it("should handle Error objects with custom message property", () => {
			const customError = new Error("Custom API error");
			assert.throws(() => handleError(customError, "vue", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Custom API error"]);
		});

		it("should handle boolean errors", () => {
			assert.throws(() => handleError(false, "test", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "false"]);
		});

		it("should handle array errors", () => {
			const arrayError = ["error1", "error2"];
			assert.throws(() => handleError(arrayError, "test", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "error1,error2"]);
		});
	});
});
