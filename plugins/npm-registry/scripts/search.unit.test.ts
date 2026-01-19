/**
 * Tests for npm-registry search.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./search";
import { parseArgs } from "./utils";
import type { NpmSearchResponse } from "./utils";

describe("search.ts", () => {
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

		// Mock dependencies
		mockFetchWithCache = vi.fn();

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

			expect(mockConsole.log).toHaveBeenCalledWith("Searching: \"express\"");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Found 50,000 package(s)"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("1. express (4.18.2)"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Fast, unopinionated"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Score: 95%"));
		});

		it("should handle search with no results", async () => {
			const noResultsData: NpmSearchResponse = {
				objects: [],
				total: 0,
				time: "2023-01-01T00:00:00Z",
			};
			mockFetchWithCache.mockResolvedValue(noResultsData);
			const args = parseArgs(["nonexistentpackage12345"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("No packages found for \"nonexistentpackage12345\""));
			expect(mockProcess.exit).toHaveBeenCalledWith(0);
		});

		it("should handle pagination with --from flag", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--from=20", "express"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Searching: \"express\"");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("21. express (4.18.2)"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("22. react (18.2.0)"));
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

			expect(mockConsole.log).toHaveBeenCalledWith("Searching: \"express\"");
			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					cacheKey: "express-1-0",
				})
			);
		});

		it("should cap size at 250", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--size=500", "express"]);

			await main(args, deps);

			// The cacheKey uses the original size (500), but the URL uses the capped value (250)
			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					cacheKey: "express-500-0",
				})
			);
			// Verify the URL has size=250 (capped)
			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("size=250"),
				})
			);
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["--no-cache", "express"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
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

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Showing 1-1 of 100 results"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Use --from=1 to see more results"));
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

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("1. test (4.18.2)"));
			// Should not crash or show description line
			const calls = mockConsole.log.mock.calls.flat();
			const descLine = calls.find((call: string) => call.includes("Fast, unopinionated"));
			expect(descLine).toBeUndefined();
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

			// Should not crash when links.npm is missing
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("1. test"));
		});

		it("should show usage and exit when no query provided", async () => {
			const args = parseArgs([]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Options:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Examples:"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Network error"));
			const args = parseArgs(["express"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
		});

		it("should handle multiple results with proper formatting", async () => {
			mockFetchWithCache.mockResolvedValue(mockSearchData);
			const args = parseArgs(["web"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("1. express"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("2. react"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("quality: 90%"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("popularity: 98%"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("maintenance: 97%"));
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

			// Should not contain pagination hint
			const calls = mockConsole.log.mock.calls;
			const paginationCalls = calls.filter((call: string[]) =>
				call[0]?.includes("Showing") || call[0]?.includes("Use --from=")
			);
			expect(paginationCalls.length).toBe(0);
		});
	});

	describe("handleError", () => {
		it("should log error message and exit", () => {
			const error = new Error("API rate limit exceeded");
			expect(() => handleError(error, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "API rate limit exceeded");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network timeout");
			expect(() => handleError(error, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network timeout");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error errors", () => {
			expect(() => handleError("string error", "express", {
				console: mockConsole,
				process: mockProcess,
			})).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
