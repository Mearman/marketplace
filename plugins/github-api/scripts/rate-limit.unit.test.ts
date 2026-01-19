/**
 * Tests for github-api rate-limit.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, formatResetTime, formatNumber } from "./rate-limit";
import type { GitHubRateLimit } from "./utils";
import { parseArgs } from "./utils";

describe("rate-limit.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let mockGetAuthHeaders: any;
	let mockGetTokenFromEnv: any;
	let mockDate: any;
	let deps: any;

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

		// Mock Date - default to current timestamp
		mockDate = {
			now: vi.fn().mockReturnValue(Date.now()),
		};

		// Mock dependencies
		mockFetchWithCache = vi.fn();
		mockGetAuthHeaders = vi.fn().mockReturnValue({
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
		});
		mockGetTokenFromEnv = vi.fn().mockReturnValue(undefined);

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
			getAuthHeaders: mockGetAuthHeaders,
			getTokenFromEnv: mockGetTokenFromEnv,
			Date: mockDate,
		};
	});

	describe("formatResetTime", () => {
		it("should return 'Now' for past timestamp", () => {
			const currentTimestamp = 1000000000;
			const pastTimestamp = currentTimestamp - 1000;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(pastTimestamp, currentDate)).toBe("Now");
		});

		it("should format seconds", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 30;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("30 seconds");
		});

		it("should format minutes", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 1800;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("30 minutes");
		});

		it("should format hours", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 7200;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("2 hours");
		});

		it("should use singular form for 1 second", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 1;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("1 second");
		});

		it("should use singular form for 1 minute", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 60;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("1 minute");
		});

		it("should use singular form for 1 hour", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 3600;
			const currentDate = new Date(currentTimestamp * 1000);
			expect(formatResetTime(futureTimestamp, currentDate)).toBe("1 hour");
		});
	});

	describe("formatNumber", () => {
		it("should format numbers with locale string", () => {
			expect(formatNumber(1000)).toBe("1,000");
			expect(formatNumber(1000000)).toBe("1,000,000");
			expect(formatNumber(5000)).toBe("5,000");
		});

		it("should format small numbers", () => {
			expect(formatNumber(0)).toBe("0");
			expect(formatNumber(1)).toBe("1");
			expect(formatNumber(999)).toBe("999");
		});
	});

	describe("main", () => {
		const mockRateLimitData: GitHubRateLimit = {
			resources: {
				core: {
					limit: 5000,
					used: 100,
					remaining: 4900,
					reset: Math.floor(Date.now() / 1000) + 3600,
				},
				search: {
					limit: 30,
					used: 5,
					remaining: 25,
					reset: Math.floor(Date.now() / 1000) + 60,
				},
			},
			rate: {
				limit: 5000,
				used: 100,
				remaining: 4900,
				reset: Math.floor(Date.now() / 1000) + 3600,
			},
		};

		it("should display rate limit status for unauthenticated user", async () => {
			mockFetchWithCache.mockResolvedValue(mockRateLimitData);
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching GitHub API rate limit status...");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Core API:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Search API:"));
			expect(mockConsole.log).toHaveBeenCalledWith("Authentication: None (unauthenticated)");
		});

		it("should display rate limit status for authenticated user", async () => {
			mockFetchWithCache.mockResolvedValue(mockRateLimitData);
			mockGetTokenFromEnv.mockReturnValue("ghp_test_token_12345");
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Authenticated"));
		});

		it("should show warning when core API quota nearly exhausted (>90%)", async () => {
			const highUsageData: GitHubRateLimit = {
				...mockRateLimitData,
				resources: {
					...mockRateLimitData.resources,
					core: {
						limit: 5000,
						used: 4600,
						remaining: 400,
						reset: Math.floor(Date.now() / 1000) + 3600,
					},
				},
			};
			mockFetchWithCache.mockResolvedValue(highUsageData);
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Warning: Core API quota nearly exhausted"));
		});

		it("should show notice when core API quota below 25%", async () => {
			const lowQuotaData: GitHubRateLimit = {
				...mockRateLimitData,
				resources: {
					...mockRateLimitData.resources,
					core: {
						limit: 5000,
						used: 3800,
						remaining: 1200,
						reset: Math.floor(Date.now() / 1000) + 3600,
					},
				},
			};
			mockFetchWithCache.mockResolvedValue(lowQuotaData);
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Notice: Core API quota below 25%"));
		});

		it("should show warning when search API quota nearly exhausted (>90%)", async () => {
			const highUsageData: GitHubRateLimit = {
				...mockRateLimitData,
				resources: {
					...mockRateLimitData.resources,
					search: {
						limit: 30,
						used: 28,
						remaining: 2,
						reset: Math.floor(Date.now() / 1000) + 60,
					},
				},
			};
			mockFetchWithCache.mockResolvedValue(highUsageData);
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Warning: Search API quota nearly exhausted"));
		});

		it("should show notice when search API quota below 25%", async () => {
			const lowQuotaData: GitHubRateLimit = {
				...mockRateLimitData,
				resources: {
					...mockRateLimitData.resources,
					search: {
						limit: 30,
						used: 23,
						remaining: 7,
						reset: Math.floor(Date.now() / 1000) + 60,
					},
				},
			};
			mockFetchWithCache.mockResolvedValue(lowQuotaData);
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Notice: Search API quota below 25%"));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockRateLimitData);
			const args = parseArgs(["--no-cache"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mockResolvedValue(mockRateLimitData);
			const args = parseArgs(["--token=ghp_test_token"]);

			await main(args, deps);

			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_test_token");
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mockResolvedValue(mockRateLimitData);
			mockGetTokenFromEnv.mockReturnValue("ghp_env_token");
			const args = parseArgs([]);

			await main(args, deps);

			expect(mockGetTokenFromEnv).toHaveBeenCalled();
			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_env_token");
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Network error"));
			const args = parseArgs([]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
		});
	});
});
