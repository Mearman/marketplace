/**
 * Tests for npm-registry downloads.ts
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main, handleError } from "./downloads.js";
import type { NpmDownloadsResponse } from "./utils.js";
import { parseArgs } from "./utils.js";
import { callsToArray, createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("downloads.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockFetchWithCache: ReturnType<typeof createAsyncMock>;

	beforeEach(() => {
		mock.reset();
		mockConsole = createMockConsole();
		mockProcess = createMockProcess();
		mockFetchWithCache = createAsyncMock();
	});

	describe("handleError", () => {
		it("should handle 'Resource not found' error with friendly message", () => {
			const error = new Error("Resource not found");
			const packageName = "nonexistent-package";

			assert.throws(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			});

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(
				calls[0][0],
				`Package "${packageName}" not found or no download data available`
			);
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle generic errors with error message", () => {
			const error = new Error("Network connection failed");
			const packageName = "react";

			assert.throws(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			});

			const calls = callsToArray(mockConsole.error);
			assert.strictEqual(calls[0][0], "Error:");
			assert.strictEqual(calls[0][1], "Network connection failed");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle non-Error objects", () => {
			const error = "String error message";
			const packageName = "express";

			assert.throws(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			});

			const calls = callsToArray(mockConsole.error);
			assert.strictEqual(calls[0][0], "Error:");
			assert.strictEqual(calls[0][1], "String error message");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle error with 'Resource not found' in message", () => {
			const error = new Error("Error: Resource not found for package");
			const packageName = "vue";

			assert.throws(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			});

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(
				calls[0][0],
				`Package "${packageName}" not found or no download data available`
			);
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});
	});

	describe("main", () => {
		const createMockDownloadsData = (
			packageName: string,
			days: number
		): NpmDownloadsResponse => {
			const downloads = [];
			const today = new Date();

			for (let i = days - 1; i >= 0; i--) {
				const date = new Date(today);
				date.setDate(date.getDate() - i);
				downloads.push({
					day: date.toISOString().split("T")[0],
					downloads: Math.floor(Math.random() * 10000) + 1000,
				});
			}

			return {
				package: packageName,
				start: downloads[0].day,
				end: downloads[downloads.length - 1].day,
				downloads,
			};
		};

		it("should show usage message when no package name provided", async () => {
			const args = parseArgs([]);
			const deps = {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			};

			await assert.rejects(() => main(args, deps));

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Usage: npx tsx downloads.ts <package-name>")));
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should fetch and display downloads for last-week period", async () => {
			const mockData = createMockDownloadsData("react", 7);
			mockFetchWithCache.mockResolvedValue(mockData);
			const args = parseArgs(["--period=last-week", "react"]);
			const deps = {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			};

			await main(args, deps);

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.deepStrictEqual(fetchCalls[0][0], {
				url: "https://api.npmjs.org/downloads/range/last-week/react",
				ttl: 86400,
				cacheKey: "downloads-last-week-react",
				bypassCache: false,
			});
			const logCalls = callsToArray(mockConsole.log);
			assert.ok(logCalls.some(call => call[0]?.includes("Downloads for react (last-week)")));
		});

		it("should fetch and display downloads for last-month period (default)", async () => {
			const mockData = createMockDownloadsData("express", 30);
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["express"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.deepStrictEqual(fetchCalls[0][0], {
				url: "https://api.npmjs.org/downloads/range/last-month/express",
				ttl: 86400,
				cacheKey: "downloads-last-month-express",
				bypassCache: false,
			});
			const logCalls = callsToArray(mockConsole.log);
			assert.ok(logCalls.some(call => call[0]?.includes("Downloads for express (last-month)")));
		});

		it("should fetch and display downloads for last-year period", async () => {
			const mockData = createMockDownloadsData("vue", 365);
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map([["period", "last-year"]]),
				positional: ["vue"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.deepStrictEqual(fetchCalls[0][0], {
				url: "https://api.npmjs.org/downloads/range/last-year/vue",
				ttl: 86400,
				cacheKey: "downloads-last-year-vue",
				bypassCache: false,
			});
		});

		it("should bypass cache when --no-cache flag is provided", async () => {
			const mockData = createMockDownloadsData("lodash", 30);
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(["no-cache"]),
				options: new Map<string, string>(),
				positional: ["lodash"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.deepStrictEqual(fetchCalls[0][0], {
				url: "https://api.npmjs.org/downloads/range/last-month/lodash",
				ttl: 86400,
				cacheKey: "downloads-last-month-lodash",
				bypassCache: true,
			});
		});

		it("should calculate and display statistics correctly", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "test-package",
				start: "2023-01-01",
				end: "2023-01-03",
				downloads: [
					{ day: "2023-01-01", downloads: 1000 },
					{ day: "2023-01-02", downloads: 2000 },
					{ day: "2023-01-03", downloads: 3000 },
				],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["test-package"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Total downloads: 6.0K")));
			assert.ok(calls.some(call => call[0]?.includes("Average per day: 2.0K")));
			assert.ok(calls.some(call => call[0]?.includes("Peak day: 2023-01-03 (3.0K downloads)")));
		});

		it("should display full daily breakdown for short periods (< 14 days)", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "small-package",
				start: "2023-01-01",
				end: "2023-01-07",
				downloads: [
					{ day: "2023-01-01", downloads: 100 },
					{ day: "2023-01-02", downloads: 200 },
					{ day: "2023-01-03", downloads: 300 },
					{ day: "2023-01-04", downloads: 400 },
					{ day: "2023-01-05", downloads: 500 },
					{ day: "2023-01-06", downloads: 600 },
					{ day: "2023-01-07", downloads: 700 },
				],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["small-package"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Daily breakdown:")));
			assert.ok(calls.some(call => call[0]?.includes("2023-01-01: 100")));
			assert.ok(calls.some(call => call[0]?.includes("2023-01-07: 700")));
		});

		it("should display truncated view for long periods (> 14 days)", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "popular-package",
				start: "2023-01-01",
				end: "2023-01-15",
				downloads: Array.from({ length: 15 }, (_: unknown, i: number) => ({
					day: `2023-01-${String(i + 1).padStart(2, "0")}`,
					downloads: (i + 1) * 100,
				})),
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["popular-package"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("First 7 days:")));
			assert.ok(calls.some(call => call[0]?.includes("Last 7 days:")));
			assert.ok(calls.some(call => call[0]?.includes("more days)")));
		});

		it("should handle single day of data correctly", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "single-day",
				start: "2023-01-01",
				end: "2023-01-01",
				downloads: [{ day: "2023-01-01", downloads: 500 }],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["single-day"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Period: 2023-01-01 to 2023-01-01 (1 days)")));
			assert.ok(calls.some(call => call[0]?.includes("Average per day: 500")));
			assert.ok(calls.some(call => call[0]?.includes("Peak day: 2023-01-01 (500 downloads)")));
		});

		it("should handle zero downloads correctly", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "no-downloads",
				start: "2023-01-01",
				end: "2023-01-03",
				downloads: [
					{ day: "2023-01-01", downloads: 0 },
					{ day: "2023-01-02", downloads: 0 },
					{ day: "2023-01-03", downloads: 0 },
				],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["no-downloads"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Total downloads: 0")));
			assert.ok(calls.some(call => call[0]?.includes("Average per day: 0")));
		});

		it("should identify peak day correctly", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "peak-test",
				start: "2023-01-01",
				end: "2023-01-05",
				downloads: [
					{ day: "2023-01-01", downloads: 100 },
					{ day: "2023-01-02", downloads: 5000 },
					{ day: "2023-01-03", downloads: 200 },
					{ day: "2023-01-04", downloads: 300 },
					{ day: "2023-01-05", downloads: 400 },
				],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["peak-test"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Peak day: 2023-01-02 (5.0K downloads)")));
		});

		it("should handle fetch errors and call handleError", async () => {
			const error = new Error("Resource not found");
			mockFetchWithCache.mockRejectedValue(error);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["nonexistent"],
			};

			await assert.rejects(() =>
				main(args, {
					fetchWithCache: mockFetchWithCache,
					console: mockConsole,
					process: mockProcess,
				})
			);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Package \"nonexistent\" not found")));
		});

		it("should calculate correct day count across month boundaries", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "month-boundary",
				start: "2023-01-30",
				end: "2023-02-05",
				downloads: [
					{ day: "2023-01-30", downloads: 100 },
					{ day: "2023-01-31", downloads: 200 },
					{ day: "2023-02-01", downloads: 300 },
					{ day: "2023-02-02", downloads: 400 },
					{ day: "2023-02-03", downloads: 500 },
					{ day: "2023-02-04", downloads: 600 },
					{ day: "2023-02-05", downloads: 700 },
				],
			};
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["month-boundary"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("(7 days)")));
		});

		it("should handle custom period option", async () => {
			const mockData = createMockDownloadsData("axios", 30);
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map([["period", "last-month"]]),
				positional: ["axios"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const fetchCalls = callsToArray(mockFetchWithCache);
			assert.strictEqual(fetchCalls[0][0].url, "https://api.npmjs.org/downloads/range/last-month/axios");
		});

		it("should display fetching message", async () => {
			const mockData = createMockDownloadsData("typescript", 30);
			mockFetchWithCache.mockResolvedValue(mockData);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["typescript"],
			};

			await main(args, {
				fetchWithCache: mockFetchWithCache,
				console: mockConsole,
				process: mockProcess,
			});

			const calls = callsToArray(mockConsole.log);
			assert.ok(
				calls.some(
					call => call[0] === "Fetching downloads for: typescript (last-month)"
				)
			);
		});
	});
});
