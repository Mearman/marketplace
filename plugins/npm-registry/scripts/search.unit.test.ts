/**
 * Tests for npm-registry search.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main, handleError } from "./search.js";
import { parseArgs } from "./utils.js";
import type { NpmSearchResponse } from "./utils.js";
import { callsToArray, createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("search.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockFetchWithCache: ReturnType<typeof createAsyncMock>;
	let deps: any;

	beforeEach(() => {
		mock.reset();
		mockConsole = createMockConsole();
		mockProcess = createMockProcess();
		mockFetchWithCache = createAsyncMock();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		const mockSearchData: NpmSearchResponse = {
			objects: [
				{
					package: {
						name: "express",
						version: "4.18.2",
						description: "Fast, unopinionated, minimalist web framework for Node.js",
						keywords: ["web", "framework", "middleware"],
						links: {
							npm: "https://www.npmjs.com/package/express",
							homepage: "https://expressjs.com",
							repository: "https://github.com/expressjs/express",
							bugs: "https://github.com/expressjs/express/issues",
						},
					},
					score: {
						final: 0.95,
						detail: {
							quality: 0.9,
							popularity: 0.98,
							maintenance: 0.97,
						},
					},
					searchScore: 100,
				},
				{
					package: {
						name: "react",
						version: "18.2.0",
						description: "React is a JavaScript library for building user interfaces",
						keywords: ["ui", "framework", "frontend"],
						links: {
							npm: "https://www.npmjs.com/package/react",
							homepage: "https://reactjs.org",
							repository: "https://github.com/facebook/react",
							bugs: "https://github.com/facebook/react/issues",
						},
					},
					score: {
						final: 0.92,
						detail: {
							quality: 0.95,
							popularity: 0.95,
							maintenance: 0.85,
						},
					},
					searchScore: 95,
				},
			],
			total: 50000,
			time: "2023-01-01T00:00:00Z",
		};

		it("should display search results for basic query", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["express"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Searching: \"express\"");
			assert.ok(calls.some(call => call[0]?.includes("Found 50,000 package(s)")));
			assert.ok(calls.some(call => call[0]?.includes("1. express (4.18.2)")));
			assert.ok(calls.some(call => call[0]?.includes("Fast, unopinionated")));
			assert.ok(calls.some(call => call[0]?.includes("Score: 95%")));
		});

		it("should handle search with no results", async () => {
			const noResultsData: NpmSearchResponse = {
				objects: [],
				total: 0,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(noResultsData);
			const args = parseArgs(["nonexistentpackage12345"]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("No packages found for \"nonexistentpackage12345\"")));
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 0);
		});

		it("should handle pagination with --from flag", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--from=20", "express"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Searching: \"express\"");
			assert.ok(calls.some(call => call[0]?.includes("21. express (4.18.2)")));
			assert.ok(calls.some(call => call[0]?.includes("22. react (18.2.0)")));
		});

		it("should limit results with --size flag", async () => {
			const singleResultData: NpmSearchResponse = {
				objects: [mockSearchData.objects[0]],
				total: 50000,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(singleResultData);
			const args = parseArgs(["--size=1", "express"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Searching: \"express\"");
			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.strictEqual(fetchCalls[0][0].cacheKey, "express-1-0");
		});

		it("should cap size at 250", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--size=500", "express"]);

			await main(args, deps);

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.strictEqual(fetchCalls[0][0].cacheKey, "express-500-0");
			assert.ok(fetchCalls[0][0].url.includes("size=250"));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--no-cache", "express"]);

			await main(args, deps);

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.strictEqual(fetchCalls[0][0].bypassCache, true);
		});

		it("should show pagination hint when more results available", async () => {
			const manyResultsData: NpmSearchResponse = {
				objects: [mockSearchData.objects[0]],
				total: 100,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(manyResultsData);
			const args = parseArgs(["--size=1", "express"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Showing 1-1 of 100 results")));
			assert.ok(calls.some(call => call[0]?.includes("Use --from=1 to see more results")));
		});

		it("should handle package with no description", async () => {
			const noDescData: NpmSearchResponse = {
				objects: [
					{
						...mockSearchData.objects[0],
						package: {
							...mockSearchData.objects[0].package,
							name: "test",
							description: null as any,
						},
					},
				],
				total: 1,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(noDescData);
			const args = parseArgs(["test"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("1. test (4.18.2)")));
			const flatCalls = calls.flat();
			assert.strictEqual(flatCalls.find((call: string) => call.includes("Fast, unopinionated")), undefined);
		});

		it("should handle package with no npm link", async () => {
			const noLinkData: NpmSearchResponse = {
				objects: [
					{
						...mockSearchData.objects[0],
						package: {
							...mockSearchData.objects[0].package,
							name: "test",
							links: { homepage: "https://example.com" } as any,
						},
					},
				],
				total: 1,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(noLinkData);
			const args = parseArgs(["test"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("1. test")));
		});

		it("should show usage and exit when no query provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Usage:")));
			assert.ok(calls.some(call => call[0]?.includes("Options:")));
			assert.ok(calls.some(call => call[0]?.includes("Examples:")));
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Network error"));
			const args = parseArgs(["express"]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "Network error");
		});

		it("should handle multiple results with proper formatting", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["web"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("1. express")));
			assert.ok(calls.some(call => call[0]?.includes("2. react")));
			assert.ok(calls.some(call => call[0]?.includes("quality: 90%")));
			assert.ok(calls.some(call => call[0]?.includes("popularity: 98%")));
			assert.ok(calls.some(call => call[0]?.includes("maintenance: 97%")));
		});

		it("should not show pagination hint when all results shown", async () => {
			const exactMatchData: NpmSearchResponse = {
				objects: mockSearchData.objects,
				total: 2,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(exactMatchData);
			const args = parseArgs(["web"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			const paginationCalls = calls.filter((call: string[]) =>
				call[0]?.includes("Showing") || call[0]?.includes("Use --from=")
			);
			assert.strictEqual(paginationCalls.length, 0);
		});
	});

	describe("handleError", () => {
		it("should log error message and exit", () => {
			const error = new Error("API rate limit exceeded");
			assert.throws(() => handleError(error, "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "API rate limit exceeded");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network timeout");
			assert.throws(() => handleError(error, "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "Network timeout");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle non-Error errors", () => {
			assert.throws(() => handleError("string error", "express", {
				console: mockConsole,
				process: mockProcess,
			}));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "string error");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "null");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "undefined");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});
	});
});
