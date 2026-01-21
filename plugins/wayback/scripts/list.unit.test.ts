/**
 * Tests for wayback list.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError, fetchScreenshotTimestamps } from "./list.js";
import { parseArgs } from "./utils.js";

// Mock fetch
let mockGlobalFetch: any;

describe("list.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
		};

		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
			stdout: {
				write: mock.fn(),
			},
		};

		mockFetchWithCache = mock.fn();

		// Mock global fetch
		mockGlobalFetch = mock.fn();
		globalThis.fetch = mockGlobalFetch;

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful listing", () => {
			it("should list snapshots", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["https://example.com", "10"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Fetching last 10 snapshots for: https://example.com")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Total:")));
			});

			it("should use --no-raw flag", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// Should not contain "id_/" modifier
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				assert.ok(!logCalls.includes("id_/"));
			});

			it("should use --with-screenshots flag", async () => {
				mockGlobalFetch.mock.mockImplementation(async () => ({
					json: async () => [["2024010112"], ["2024010113"]],
				}));
				mockFetchWithCache.mock.mockImplementation(async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--with-screenshots", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockProcess.stdout.write.mock.calls.some((call: any[]) => call[0] === "Checking for screenshots..."));
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-cache", "https://example.com"]);

				await main(args, deps);

				assert.strictEqual(mockFetchWithCache.mock.calls[0][0].bypassCache, true);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Usage:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx list.ts <url>")));
			});

			it("should handle no snapshots found", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => []);

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "No snapshots found"));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("Network error"); });

				const args = parseArgs(["https://example.com"]);

				// main() doesn't have its own try-catch, errors propagate up
				await assert.rejects(() => main(args, deps), { message: "Network error" });
			});
		});
	});

	describe("fetchScreenshotTimestamps helper", () => {
		it("should return screenshot timestamps", async () => {
			mockGlobalFetch.mock.mockImplementation(async () => ({
				json: async () => [
					["timestamp"],
					["20240101120000"],
					["20240101130000"],
				],
			}));

			const result = await fetchScreenshotTimestamps("https://example.com");

			assert.ok(result instanceof Set);
			assert.strictEqual(result.size, 2);
		});

		it("should return empty set on error", async () => {
			mockGlobalFetch.mock.mockImplementation(async () => { throw new Error("Network error"); });

			const result = await fetchScreenshotTimestamps("https://example.com");

			assert.ok(result instanceof Set);
			assert.strictEqual(result.size, 0);
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("List failed");
			assert.throws(() => handleError(error, "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "List failed"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});
	});
});
