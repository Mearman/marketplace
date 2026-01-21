/**
 * Tests for npm-registry exists.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main, handleError } from "./exists.js";
import { parseArgs } from "./utils.js";
import { callsToArray, createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("exists.ts", () => {
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
		describe("package exists scenarios", () => {
			it("should display success message when package exists", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.strictEqual(calls[0][0], "Checking: react");
				assert.ok(calls.some(call => call[0]?.includes('✓ Package "react" exists')));
				assert.ok(calls.some(call => call[0]?.includes("https://www.npmjs.com/package/react")));
				assert.ok(calls.some(call => call[0] === "  Published: Yes"));
			});

			it("should handle scoped package names", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["@babel/core"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.strictEqual(calls[0][0], "Checking: @babel/core");
				assert.ok(calls.some(call => call[0]?.includes('✓ Package "@babel/core" exists')));
			});

			it("should handle package with hyphens", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["my-awesome-package"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.strictEqual(calls[0][0], "Checking: my-awesome-package");
				assert.ok(calls.some(call => call[0]?.includes('✓ Package "my-awesome-package" exists')));
			});
		});

		describe("package does not exist scenarios", () => {
			it("should display not found message when package does not exist", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["my-new-package"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.strictEqual(calls[0][0], "Checking: my-new-package");
				assert.ok(calls.some(call => call[0]?.includes('✗ Package "my-new-package" does not exist')));
				assert.ok(calls.some(call => call[0] === "  The name is available for use"));
			});

			it("should handle 404 error message variations", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("404 Resource not found"));
				const args = parseArgs(["nonexistent-package"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.ok(calls.some(call => call[0]?.includes("✗ Package")));
				assert.ok(calls.some(call => call[0]?.includes("does not exist")));
			});

			it("should handle not found error with different casing", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("resource not found"));
				const args = parseArgs(["test-package"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "resource not found");
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				const fetchCalls = callsToArray(mockFetchWithCache);
				assert.strictEqual(fetchCalls[0][0].bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				const fetchCalls = callsToArray(mockFetchWithCache);
				assert.strictEqual(fetchCalls[0][0].bypassCache, true);
			});

			it("should use correct cache key based on package name", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				const fetchCalls = callsToArray(mockFetchWithCache);
				assert.strictEqual(fetchCalls[0][0].cacheKey, "exists-@types/node");
			});

			it("should use correct TTL", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["express"]);

				await main(args, deps);

				const fetchCalls = callsToArray(mockFetchWithCache);
				assert.strictEqual(fetchCalls[0][0].ttl, 3600);
			});

			it("should use HEAD method for fetch", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				const fetchCalls = callsToArray(mockFetchWithCache);
				assert.strictEqual(fetchCalls[0][0].fetchOptions.method, "HEAD");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const calls = callsToArray(mockConsole.log);
				assert.ok(calls.some(call => call[0]?.includes("Usage:")));
				assert.ok(calls.some(call => call[0]?.includes("npx tsx exists.ts <package-name>")));
				const exitCalls = callsToArray(mockProcess.exit);
				assert.strictEqual(exitCalls[0][0], 1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const calls = callsToArray(mockConsole.log);
				const usageOutput = calls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("Examples:"));
				assert.ok(usageOutput.includes("npx tsx exists.ts react"));
				assert.ok(usageOutput.includes("npx tsx exists.ts @babel/core"));
				assert.ok(usageOutput.includes("npx tsx exists.ts my-new-package"));
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const calls = callsToArray(mockConsole.log);
				const usageOutput = calls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("--no-cache"));
				assert.ok(usageOutput.includes("Bypass cache and fetch fresh data"));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "Network error");
				const exitCalls = callsToArray(mockProcess.exit);
				assert.strictEqual(exitCalls[0][0], 1);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["express"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "Request timeout");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "string error");
			});

			it("should re-throw non-404 errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Authentication failed"));
				const args = parseArgs(["private-package"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "Authentication failed");
			});

			it("should handle 500 errors from registry", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Internal Server Error: 500"));
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "Internal Server Error: 500");
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Too Many Requests: 429"));
				const args = parseArgs(["axios"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const errorCalls = callsToArray(mockConsole.error);
				assert.strictEqual(errorCalls[0][0], "Error:");
				assert.strictEqual(errorCalls[0][1], "Too Many Requests: 429");
			});
		});

		describe("output formatting", () => {
			it("should include blank lines before and after result", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.deepStrictEqual(calls[0], ["Checking: react"]);
				assert.deepStrictEqual(calls[1], []);
				assert.ok(calls[2][0]?.includes("✓ Package"));
				assert.deepStrictEqual(calls[calls.length - 1], []);
			});

			it("should format output correctly for non-existent package", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["new-package"]);

				await main(args, deps);

				const calls = callsToArray(mockConsole.log);
				assert.deepStrictEqual(calls[0], ["Checking: new-package"]);
				assert.deepStrictEqual(calls[1], []);
				assert.ok(calls[2][0]?.includes("✗ Package"));
				assert.deepStrictEqual(calls[3], ["  The name is available for use"]);
				assert.deepStrictEqual(calls[calls.length - 1], []);
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			assert.throws(() => handleError(error, "react", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "Test error message");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "string error");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "null");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "undefined");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle numeric errors", () => {
			assert.throws(() => handleError(404, "react", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "404");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should handle object errors without message property", () => {
			const error = { code: 500, status: "error" };
			assert.throws(() => handleError(error, "express", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][0], "Error:");
			assert.strictEqual(errorCalls[0][1], "[object Object]");
			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			assert.throws(() => handleError(error, "test", { console: mockConsole, process: mockProcess }));

			const exitCalls = callsToArray(mockProcess.exit);
			assert.strictEqual(exitCalls[0][0], 1);
		});

		it("should ignore packageName parameter (present for interface consistency)", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-package-name", { console: mockConsole, process: mockProcess }));

			const errorCalls = callsToArray(mockConsole.error);
			assert.strictEqual(errorCalls[0][1], "Test error");
		});
	});
});
