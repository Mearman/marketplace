/**
 * Tests for github-api user.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
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
			mockFetchWithCache.mockResolvedValue(mockUserData);
			const args = parseArgs(["torvalds"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching user: torvalds");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("torvalds"));
			expect(mockConsole.log).toHaveBeenCalledWith("Bio: Creator of Linux");
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
			mockFetchWithCache.mockResolvedValue(minimalUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching user: testuser");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("testuser"));
		});

		it("should handle organization type user", async () => {
			const orgUser: GitHubUser = {
				...mockUserData,
				login: "facebook",
				type: "Organization",
				name: "Facebook",
			};
			mockFetchWithCache.mockResolvedValue(orgUser);
			const args = parseArgs(["facebook"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Organization"));
		});

		it("should handle hireable true", async () => {
			const hireableUser: GitHubUser = {
				...mockUserData,
				hireable: true,
			};
			mockFetchWithCache.mockResolvedValue(hireableUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("  Hireable: Yes");
		});

		it("should handle hireable false", async () => {
			const hireableUser: GitHubUser = {
				...mockUserData,
				hireable: false,
			};
			mockFetchWithCache.mockResolvedValue(hireableUser);
			const args = parseArgs(["testuser"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("  Hireable: No");
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockUserData);
			const args = parseArgs(["--no-cache", "torvalds"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mockResolvedValue(mockUserData);
			const args = parseArgs(["--token=ghp_test_token", "torvalds"]);

			await main(args, deps);

			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_test_token");
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mockResolvedValue(mockUserData);
			mockGetTokenFromEnv.mockReturnValue("ghp_env_token");
			const args = parseArgs(["torvalds"]);

			await main(args, deps);

			expect(mockGetTokenFromEnv).toHaveBeenCalled();
			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_env_token");
		});

		it("should show usage and exit when no username provided", async () => {
			const args = parseArgs([]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
			const args = parseArgs(["torvalds"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("User \"torvalds\" not found");
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			expect(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("User \"torvalds\" not found");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log rate limit message for 403 error", () => {
			const error = new Error("Authentication/Authorization failed: 403");
			expect(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(
				"API rate limit exceeded. Use a GitHub token to increase your quota."
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			expect(() => handleError(error, "torvalds", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error errors", () => {
			expect(() => handleError("string error", "torvalds", {
				console: mockConsole,
				process: mockProcess,
			})).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
