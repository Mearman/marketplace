/**
 * Tests for github-api repo.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError, type Dependencies } from "./repo";
import type { GitHubRepository } from "./utils";
import { parseArgs } from "./utils";

describe("repo.ts", () => {
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
		const mockRepoData: GitHubRepository = {
			id: 1,
			name: "react",
			full_name: "facebook/react",
			owner: {
				login: "facebook",
				id: 2,
				node_id: "node123",
				avatar_url: "https://github.com/avatar.png",
				gravatar_id: "",
				url: "https://api.github.com/users/facebook",
				html_url: "https://github.com/facebook",
				type: "Organization",
				site_admin: false,
				name: "Facebook",
				company: "Facebook",
				blog: "https://facebook.com",
				location: "Menlo Park, CA",
				email: "noreply@github.com",
				hireable: false,
				bio: "React is a JavaScript library for building user interfaces.",
				public_repos: 100,
				public_gists: 50,
				followers: 10000,
				following: 0,
				created_at: "2013-05-24T15:19:19Z",
				updated_at: "2023-01-01T00:00:00Z",
			},
			private: false,
			description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
			fork: false,
			created_at: "2013-05-24T15:19:19Z",
			updated_at: "2023-01-01T00:00:00Z",
			pushed_at: "2023-01-15T00:00:00Z",
			homepage: "https://reactjs.org",
			size: 100000,
			stargazers_count: 200000,
			watchers_count: 200000,
			language: "JavaScript",
			languages_url: "https://api.github.com/repos/facebook/react/languages",
			has_issues: true,
			has_projects: true,
			has_downloads: true,
			has_wiki: true,
			has_pages: true,
			forks_count: 45000,
			open_issues_count: 500,
			license: {
				key: "mit",
				name: "MIT License",
				url: "https://api.github.com/licenses/mit",
				spdx_id: "MIT",
				node_id: "MDc6TGljZW5zZTEz",
			},
			topics: ["javascript", "library", "ui", "frontend", "react", "virtual-dom", "framework"],
			default_branch: "main",
		};

		it("should display repository info for owner/repo format", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: facebook/react");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("facebook/react"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("200.0K"));
		});

		it("should display repository info for https URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["https://github.com/facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: facebook/react");
		});

		it("should display repository info for git+https URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["git+https://github.com/facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: facebook/react");
		});

		it("should display repository info for git@github URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["git@github.com:facebook/react.git"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: facebook/react");
		});

		it("should handle repository with no description", async () => {
			const repoWithoutDescription = { ...mockRepoData, description: null };
			mockFetchWithCache.mockResolvedValue(repoWithoutDescription);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("facebook/react"));
		});

		it("should handle repository with no language", async () => {
			const repoWithoutLanguage = { ...mockRepoData, language: null };
			mockFetchWithCache.mockResolvedValue(repoWithoutLanguage);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Details:"));
		});

		it("should handle repository with no license", async () => {
			const repoWithoutLicense = { ...mockRepoData, license: null };
			mockFetchWithCache.mockResolvedValue(repoWithoutLicense);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Details:"));
		});

		it("should handle repository with no homepage", async () => {
			const repoWithoutHomepage = { ...mockRepoData, homepage: null };
			mockFetchWithCache.mockResolvedValue(repoWithoutHomepage);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Repository:"));
		});

		it("should handle repository with no topics", async () => {
			const repoWithoutTopics = { ...mockRepoData, topics: [] };
			mockFetchWithCache.mockResolvedValue(repoWithoutTopics);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Features:"));
		});

		it("should handle repository with more than 10 topics", async () => {
			const manyTopics = [
				"topic1",
				"topic2",
				"topic3",
				"topic4",
				"topic5",
				"topic6",
				"topic7",
				"topic8",
				"topic9",
				"topic10",
				"topic11",
				"topic12",
			];
			const repoWithManyTopics = { ...mockRepoData, topics: manyTopics };
			mockFetchWithCache.mockResolvedValue(repoWithManyTopics);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Topics:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("and 2 more"));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["--no-cache", "facebook/react"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			const args = parseArgs(["--token=ghp_test_token", "facebook/react"]);

			await main(args, deps);

			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_test_token");
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mockResolvedValue(mockRepoData);
			mockGetTokenFromEnv.mockReturnValue("ghp_env_token");
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockGetTokenFromEnv).toHaveBeenCalled();
			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_env_token");
		});

		it("should show usage and exit when no repository provided", async () => {
			const args = parseArgs([]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should show error and exit for invalid repository URL", async () => {
			const args = parseArgs(["not-a-valid-url"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining("Could not parse repository URL")
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
			const args = parseArgs(["facebook/react"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("Repository \"facebook/react\" not found");
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			expect(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("Repository \"facebook/react\" not found");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log rate limit message for 403 error", () => {
			const error = new Error("Authentication/Authorization failed: 403");
			expect(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(
				"API rate limit exceeded. Use a GitHub token to increase your quota."
			);
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			expect(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error errors", () => {
			expect(() => handleError("string error", "facebook", "react", {
				console: mockConsole,
				process: mockProcess,
			})).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "facebook", "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
