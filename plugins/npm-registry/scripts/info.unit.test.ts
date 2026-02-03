/**
 * Tests for npm-registry info.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main, handleError } from "./info.js";
import type { NpmPackage } from "./utils.js";
import { parseArgs } from "./utils.js";
import { callsToArray, createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("info.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockFetchWithCache: ReturnType<typeof createAsyncMock>;
	let deps: any;

	beforeEach(() => {
		mock.reset();
		mockConsole = createMockConsole();
		mockProcess = createMockProcess();
		mockFetchWithCache = createAsyncMock();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		const mockPackageData: NpmPackage = {
			id: "react",
			name: "react",
			description: "A JavaScript library for building user interfaces",
			version: "18.2.0",
			"dist-tags": { latest: "18.2.0", next: "18.3.0" },
			versions: {
				"18.2.0": { dependencies: { loose: "1.0.0" } } as any,
				"18.1.0": {} as any,
			},
			license: "MIT",
			homepage: "https://reactjs.org",
			repository: { type: "git", url: "git+https://github.com/facebook/react.git" },
			bugs: { url: "https://github.com/facebook/react/issues" },
			author: { name: "Facebook" },
			keywords: ["react", "framework", "ui", "frontend", "javascript"],
			maintainers: [
				{ name: "User 1", email: "user1@example.com" },
				{ name: "User 2", email: "user2@example.com" },
			],
			time: {
				created: "2013-05-24T15:19:19Z",
				modified: "2023-01-01T00:00:00Z",
				"18.2.0": "2023-01-01T00:00:00Z",
				"18.1.0": "2022-12-01T00:00:00Z",
			},
		} as NpmPackage;

		it("should display package info", async () => {
			mockFetchWithCache.mockResolvedValue(mockPackageData);
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Fetching: react");
			assert.ok(calls.some(call => call[0]?.includes("react")));
		});

		it("should display scoped package info", async () => {
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, name: "@babel/core" });
			const args = parseArgs(["@babel/core"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Fetching: @babel/core");
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockPackageData);
			const args = parseArgs(["--no-cache", "react"]);

			await main(args, deps);

			const calls = callsToArray(mockFetchWithCache);
			assert.strictEqual(calls[0][0].bypassCache, true);
		});

		it("should handle package with no description", async () => {
			const noDesc = { ...mockPackageData, description: undefined };
			mockFetchWithCache.mockResolvedValue(noDesc);
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("react")));
		});

		it("should handle package with no license", async () => {
			const noLicense = { ...mockPackageData, license: undefined };
			mockFetchWithCache.mockResolvedValue(noLicense);
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Latest:")));
		});

		it("should handle package with no keywords", async () => {
			const noKeywords = { ...mockPackageData, keywords: undefined };
			mockFetchWithCache.mockResolvedValue(noKeywords);
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("react")));
		});

		it("should handle package with >10 keywords", async () => {
			const manyKeywords = [
				"kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8", "kw9", "kw10", "kw11", "kw12"
			];
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, keywords: manyKeywords });
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Keywords:")));
			assert.ok(calls.some(call => call[0]?.includes("(and 2 more)")));
		});

		it("should handle package with >5 maintainers", async () => {
			const manyMaintainers = Array(7).fill({ name: "User", email: "user@example.com" });
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, maintainers: manyMaintainers });
			const args = parseArgs(["react"]);

			await main(args, deps);

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Maintainers:")));
			assert.ok(calls.some(call => call[0]?.includes("(and 2 more)")));
		});

		it("should show usage and exit when no package provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0]?.includes("Usage:")));
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
			const args = parseArgs(["react"]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const calls = callsToArray(mockConsole.log);
			assert.ok(calls.some(call => call[0] === "Package \"react\" not found"));
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			assert.throws(() => handleError(error, "react", { console: mockConsole, process: mockProcess }));

			const calls = callsToArray(mockConsole.log);
			assert.strictEqual(calls[0][0], "Package \"react\" not found");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			assert.throws(() => handleError(error, "react", { console: mockConsole, process: mockProcess }));

			const calls = callsToArray(mockConsole.error);
			assert.strictEqual(calls[0][0], "Error:");
			assert.strictEqual(calls[0][1], "Network error");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});
	});
});
