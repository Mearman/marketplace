/**
 * Tests for github-api user.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./user";
import type { GitHubUser } from "./utils";
import { parseArgs } from "./utils";

describe("user.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let mockGetAuthHeaders: any;
	let mockGetTokenFromEnv: any;
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
		};
	});

	describe("main", () => {
		const mockUserData: GitHubUser = {
			login: "torvalds",
			id: 1,
			node_id: "node123",
			avatar_url: "https://github.com/avatar.png",
			gravatar_id: "",
			url: "https://api.github.com/users/torvalds",
			html_url: "https://github.com/torvalds",
			type: "User",
			site_admin: false,
			name: "Linus Torvalds",
			company: "Linux Foundation",
			blog: "https://kernel.org",
			location: "Portland, OR",
			email: "torvalds@linux-foundation.org",
			hireable: false,
			bio: "Creator of Linux",
			public_repos: 10,
			public_gists: 5,
			followers: 150000,
			following: 0,
			created_at: "2011-01-01T00:00:00Z",
			updated_at: "2023-01-01T00:00:00Z",
		};

		it("should display user info with all fields", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockUserData);
			const args = parseArgs(["torvalds"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching user: torvalds"));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("torvalds")));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Bio: Creator of Linux"));
		});

		it("should display user info without optional fields", async () => {
			const minimalUser: GitHubUser = {
				...mockUserData,
				name: null,
				bio: null,
				location: null,
				company: null,
				blog: null,
				email: null,
				hireable: null,
			};
			mockFetchWithCache.mock.mockImplementation(async () => minimalUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching user: testuser"));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("testuser")));
		});

		it("should handle organization type user", async () => {
			const orgUser: GitHubUser = {
				...mockUserData,
				login: "facebook",
				type: "Organization",
				name: "Facebook",
			};
			mockFetchWithCache.mock.mockImplementation(async () => orgUser);
			const args = parseArgs(["facebook"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Organization")));
		});

		it("should handle hireable true", async () => {
			const hireableUser: GitHubUser = {
				...mockUserData,
				hireable: true,
			};
			mockFetchWithCache.mock.mockImplementation(async () => hireableUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "  Hireable: Yes"));
		});

		it("should handle hireable false", async () => {
			const hireableUser: GitHubUser = {
				...mockUserData,
				hireable: false,
			};
			mockFetchWithCache.mock.mockImplementation(async () => hireableUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "  Hireable: No"));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockUserData);
			const args = parseArgs(["--no-cache", "torvalds"]);

			await main(args, deps);

			assert.ok(mockFetchWithCache.mock.calls.some((call: any) =>
				call.arguments?.[0] !== undefined && typeof call.arguments[0] === "object" && "bypassCache" in call.arguments[0] && call.arguments[0].bypassCache === true
			));
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockUserData);
			const args = parseArgs(["--token=ghp_test_token", "torvalds"]);

			await main(args, deps);

			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_test_token"));
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockUserData);
			mockGetTokenFromEnv.mock.mockImplementation(() => "ghp_env_token");
			const args = parseArgs(["torvalds"]);

			await main(args, deps);

			assert.ok(mockGetTokenFromEnv.mock.calls.length >= 1);
			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_env_token"));
		});

		it("should show usage and exit when no username provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Usage:")));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => {
				throw new Error("Resource not found");
			});
			const args = parseArgs(["torvalds"]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "User \"torvalds\" not found"
			));
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			assert.throws(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "User \"torvalds\" not found"
			));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should log rate limit message for 403 error", () => {
			const error = new Error("Authentication/Authorization failed: 403");
			assert.throws(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "API rate limit exceeded. Use a GitHub token to increase your quota."
			));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			assert.throws(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments?.[0] === "Error:" && call.arguments?.[1] === "Network error"));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should handle non-Error errors", () => {
			assert.throws(() => handleError("string error", "torvalds", {
				console: mockConsole,
				process: mockProcess,
			}), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments?.[0] === "Error:" && call.arguments?.[1] === "string error"));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});
	});
});
