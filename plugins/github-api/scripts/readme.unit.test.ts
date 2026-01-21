/**
 * Tests for github-api readme.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
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
		mockBase64Decode = mock.fn(() => "# README Content\n\nThis is a test README.");

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
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching README for: facebook/react"));
			assert.ok(mockBase64Decode.mock.calls.some((call: any) => call.arguments?.[0] === "UkVBRE1FIENvbnRlbnQ="));
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("README.md")));
		});

		it("should display README for https URL", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["https://github.com/facebook/react"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching README for: facebook/react"));
		});

		it("should display README for git+https URL", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["git+https://github.com/facebook/react"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching README for: facebook/react"));
		});

		it("should display README for git@github URL", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["git@github.com:facebook/react.git"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Fetching README for: facebook/react"));
		});

		it("should display size in KB", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments?.[0] === "Size: 1.0 KB"));
		});

		it("should display HTML URL", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "URL: https://github.com/facebook/react/blob/main/README.md"
			));
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["--no-cache", "facebook/react"]);

			await main(args, deps);

			assert.ok(mockFetchWithCache.mock.calls.some((call: any) =>
				call.arguments?.[0] !== undefined && typeof call.arguments[0] === "object" && "bypassCache" in call.arguments[0] && call.arguments[0].bypassCache === true
			));
		});

		it("should use token from options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			const args = parseArgs(["--token=ghp_test_token", "facebook/react"]);

			await main(args, deps);

			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_test_token"));
		});

		it("should call getTokenFromEnv when no token in options", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => mockReadmeData);
			mockGetTokenFromEnv.mock.mockImplementation(() => "ghp_env_token");
			const args = parseArgs(["facebook/react"]);

			await main(args, deps);

			assert.ok(mockGetTokenFromEnv.mock.calls.length >= 1);
			assert.ok(mockGetAuthHeaders.mock.calls.some((call: any) => call.arguments?.[0] === "ghp_env_token"));
		});

		it("should show usage and exit when no repository provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Usage:")));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should show error and exit for invalid repository URL", async () => {
			const args = parseArgs(["not-a-valid-url"]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments?.[0] === "string" && call.arguments[0].includes("Could not parse repository URL")));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mock.mockImplementation(async () => {
				throw new Error("Resource not found");
			});
			const args = parseArgs(["facebook/react"]);

			await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "Repository \"facebook/react\" has no README or does not exist"
			));
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			assert.throws(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "Repository \"facebook/react\" has no README or does not exist"
			));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should log rate limit message for 403 error", () => {
			const error = new Error("Authentication/Authorization failed: 403");
			assert.throws(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.log.mock.calls.some((call: any) =>
				call.arguments?.[0] === "API rate limit exceeded. Use a GitHub token to increase your quota."
			));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			assert.throws(() => handleError(error, "facebook", "react", { console: mockConsole, process: mockProcess }), {
				message: "process.exit called"
			});

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments?.[0] === "Error:" && call.arguments?.[1] === "Network error"));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});

		it("should handle non-Error errors", () => {
			assert.throws(() => handleError("string error", "facebook", "react", {
				console: mockConsole,
				process: mockProcess,
			}), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments?.[0] === "Error:" && call.arguments?.[1] === "string error"));
			assert.ok(mockProcess.exit.mock.calls.some((call: any) => call.arguments?.[0] === 1));
		});
	});
});
