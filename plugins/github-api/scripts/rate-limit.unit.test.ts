/**
 * Tests for github-api rate-limit.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
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
		mock.reset();

		// Mock console
		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
		};

		// Mock process
		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock Date - default to current timestamp
		mockDate = {
			now: mock.fn(() => Date.now()),
		};

		// Mock dependencies
		mockFetchWithCache = mock.fn();
		mockGetAuthHeaders = mock.fn(() => ({
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
		}));
		mockGetTokenFromEnv = mock.fn(() => undefined);

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
			assert.strictEqual(formatResetTime(pastTimestamp, currentDate), "Now");
		});

		it("should format seconds", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 30;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "30 seconds");
		});

		it("should format minutes", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 1800;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "30 minutes");
		});

		it("should format hours", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 7200;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "2 hours");
		});

		it("should use singular form for 1 second", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 1;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "1 second");
		});

		it("should use singular form for 1 minute", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 60;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "1 minute");
		});

		it("should use singular form for 1 hour", () => {
			const currentTimestamp = 1000000000;
			const futureTimestamp = currentTimestamp + 3600;
			const currentDate = new Date(currentTimestamp * 1000);
			assert.strictEqual(formatResetTime(futureTimestamp, currentDate), "1 hour");
		});
	});

	describe("formatNumber", () => {
		it("should format numbers with locale string", () => {
			assert.strictEqual(formatNumber(1000), "1,000");
			assert.strictEqual(formatNumber(1000000), "1,000,000");
			assert.strictEqual(formatNumber(5000), "5,000");
		});

		it("should format small numbers", () => {
			assert.strictEqual(formatNumber(0), "0");
			assert.strictEqual(formatNumber(1), "1");
			assert.strictEqual(formatNumber(999), "999");
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
			mockFetchWithCache.mock.mockImplementation(async () => mockRateLimitData);
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching GitHub API rate limit status..."));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Core API:")));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Search API:")));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Authentication: None (unauthenticated)"));
		});

		it("should display rate limit status for authenticated user", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockRateLimitData);
			mockGetTokenFromEnv.mock.mockImplementation(() => "ghp_test_token_12345");
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Authenticated")));
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
			mockFetchWithCache.mock.mockImplementation(async () => highUsageData);
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Warning: Core API quota nearly exhausted")));
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
			mockFetchWithCache.mock.mockImplementation(async () => lowQuotaData);
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Notice: Core API quota below 25%")));
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
			mockFetchWithCache.mock.mockImplementation(async () => highUsageData);
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Warning: Search API quota nearly exhausted")));
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
			mockFetchWithCache.mock.mockImplementation(async () => lowQuotaData);
			const args = parseArgs([]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Notice: Search API quota below 25%")));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockRateLimitData);
			const args = parseArgs(["--no-cache"]);

			await main(args, deps);

			assert.ok(mockFetchWithCache.mock.calls.some((call: any) =>
				call.arguments?.[0] !== undefined && typeof call.arguments[0] === "object" && "bypassCache" in call.arguments[0] && call.arguments[0].bypassCache === true
			));
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockRateLimitData);
			const args = parseArgs(["--token=ghp_test_token"]);

			await main(args, deps);

			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_test_token"));
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockRateLimitData);
			mockGetTokenFromEnv.mock.mockImplementation(() => "ghp_env_token");
			const args = parseArgs([]);

			await main(args, deps);

			assert.strictEqual(mockGetTokenFromEnv.mock.calls.length, 1);
			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_env_token"));
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => {
				throw new Error("Network error");
			});
			const args = parseArgs([]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments?.[0] === "Error:" && call.arguments?.[1] === "Network error"));
		});
	});
});
