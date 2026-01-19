/**
 * Tests for npm-registry downloads.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./downloads";
import type { Dependencies } from "./downloads";
import type { NpmDownloadsResponse } from "./utils";
import { parseArgs } from "./utils";

describe("downloads.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		// Mock process
		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = vi.fn();
	});

	describe("handleError", () => {
		it("should handle 'Resource not found' error with friendly message", () => {
			const error = new Error("Resource not found");
			const packageName = "nonexistent-package";

			expect(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			}).toThrow();

			expect(mockConsole.log).toHaveBeenCalledWith(
				`Package "${packageName}" not found or no download data available`
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle generic errors with error message", () => {
			const error = new Error("Network connection failed");
			const packageName = "react";

			expect(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			}).toThrow();

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network connection failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error objects", () => {
			const error = "String error message";
			const packageName = "express";

			expect(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			}).toThrow();

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "String error message");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle error with 'Resource not found' in message", () => {
			const error = new Error("Error: Resource not found for package");
			const packageName = "vue";

			expect(() => {
				handleError(error, packageName, { console: mockConsole, process: mockProcess });
			}).toThrow();

			expect(mockConsole.log).toHaveBeenCalledWith(
				`Package "${packageName}" not found or no download data available`
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
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

			await expect(main(args, deps)).rejects.toThrow();

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Usage: npx tsx downloads.ts <package-name>")
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
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

			expect(mockFetchWithCache).toHaveBeenCalledWith({
				url: "https://api.npmjs.org/downloads/range/last-week/react",
				ttl: 86400,
				cacheKey: "downloads-last-week-react",
				bypassCache: false,
			});
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Downloads for react (last-week)")
			);
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

			expect(mockFetchWithCache).toHaveBeenCalledWith({
				url: "https://api.npmjs.org/downloads/range/last-month/express",
				ttl: 86400,
				cacheKey: "downloads-last-month-express",
				bypassCache: false,
			});
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Downloads for express (last-month)")
			);
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

			expect(mockFetchWithCache).toHaveBeenCalledWith({
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

			expect(mockFetchWithCache).toHaveBeenCalledWith({
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

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total downloads: 6.0K"));
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Average per day: 2.0K")
			);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Peak day: 2023-01-03 (3.0K downloads)")
			);
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

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Daily breakdown:"));
			// Should show all 7 days
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("2023-01-01: 100")
			);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("2023-01-07: 700")
			);
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

			// Should show "First 7 days:" and "Last 7 days:"
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("First 7 days:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Last 7 days:"));
			// Should show "more days" message
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("more days)"));
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

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Period: 2023-01-01 to 2023-01-01 (1 days)")
			);
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Average per day: 500"));
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Peak day: 2023-01-01 (500 downloads)")
			);
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

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total downloads: 0"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Average per day: 0"));
		});

		it("should identify peak day correctly", async () => {
			const mockData: NpmDownloadsResponse = {
				package: "peak-test",
				start: "2023-01-01",
				end: "2023-01-05",
				downloads: [
					{ day: "2023-01-01", downloads: 100 },
					{ day: "2023-01-02", downloads: 5000 }, // peak
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

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Peak day: 2023-01-02 (5.0K downloads)")
			);
		});

		it("should handle fetch errors and call handleError", async () => {
			const error = new Error("Resource not found");
			mockFetchWithCache.mockRejectedValue(error);

			const args = {
				flags: new Set<string>(),
				options: new Map<string, string>(),
				positional: ["nonexistent"],
			};

			await expect(
				main(args, {
					fetchWithCache: mockFetchWithCache,
					console: mockConsole,
					process: mockProcess,
				})
			).rejects.toThrow();

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("Package \"nonexistent\" not found")
			);
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

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining("(7 days)")
			);
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

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://api.npmjs.org/downloads/range/last-month/axios",
				})
			);
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

			expect(mockConsole.log).toHaveBeenCalledWith(
				"Fetching downloads for: typescript (last-month)"
			);
		});
	});
});
