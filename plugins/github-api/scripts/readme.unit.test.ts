/**
 * Tests for github-api readme.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./readme";
import type { GitHubReadme } from "./utils";
import { parseArgs } from "./utils";

describe("readme.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let mockGetAuthHeaders: any;
	let mockGetTokenFromEnv: any;
	let mockBase64Decode: any;
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
		mockBase64Decode = vi.fn().mockReturnValue("# README Content\n\nThis is a test README.");

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
			getAuthHeaders: mockGetAuthHeaders,
			getTokenFromEnv: mockGetTokenFromEnv,
			base64Decode: mockBase64Decode,
		};
	});

	describe("main", () => {
		const mockReadmeData: GitHubReadme = {
			name: "README.md",
			path: "README.md",
			sha: "abc123",
			size: 1024,
			url: "https://api.github.com/repos/facebook/react/readme",
			html_url: "https://github.com/facebook/react/blob/main/README.md",
			git_url: "git://github.com/facebook/react/git_blob/main/README.md",
			download_url: "https://raw.githubusercontent.com/facebook/react/main/README.md",
			type: "file",
			content: "UkVBRE1FIENvbnRlbnQ=", // base64 encoded
			encoding: "base64",
		};

		it("should display README for owner/repo format", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching README for: facebook/react");
			expect(mockBase64Decode).toHaveBeenCalledWith("UkVBRE1FIENvbnRlbnQ=");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("README.md"));
		});

		it("should display README for https URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["https://github.com/facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching README for: facebook/react");
		});

		it("should display README for git+https URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["git+https://github.com/facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching README for: facebook/react");
		});

		it("should display README for git@github URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["git@github.com:facebook/react.git"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching README for: facebook/react");
		});

		it("should display size in KB", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Size: 1.0 KB");
		});

		it("should display HTML URL", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(
				"URL: https://github.com/facebook/react/blob/main/README.md"
			);
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["--no-cache", "facebook/react"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
			const args = parseArgs(["--token=ghp_test_token", "facebook/react"]);

			await main(args, deps);

			expect(mockGetAuthHeaders).toHaveBeenCalledWith("ghp_test_token");
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mockResolvedValue(mockReadmeData);
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

			expect(mockConsole.log).toHaveBeenCalledWith(
				"Repository \"facebook/react\" has no README or does not exist"
			);
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			expect(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(
				"Repository \"facebook/react\" has no README or does not exist"
			);
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
	});
});
