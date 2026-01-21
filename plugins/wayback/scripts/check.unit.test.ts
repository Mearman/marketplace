/**
 * Tests for wayback check.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./check.js";
import { parseArgs } from "./utils.js";

describe("check.ts", () => {
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
		};

		mockFetchWithCache = mock.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful check scenarios", () => {
			it("should display archived snapshot", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: true,
							url: "https://example.com",
							timestamp: "20240101120000",
							status: "200",
						},
					},
				};
				mockFetchWithCache = mock.fn(async () => mockData);
				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "Checking: https://example.com"));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✓ Archived")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Timestamp:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("URL:")));
			});

			it("should display not archived when no snapshot", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: false,
						},
					},
				};
				mockFetchWithCache = mock.fn(async () => mockData);
				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ Not archived")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Use wayback-submit")));
			});

			it("should use --no-raw flag", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
							status: "200",
						},
					},
				};
				mockFetchWithCache = mock.fn(async () => mockData);
				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// When --no-raw is used, the URL should NOT contain "id_/" (modifier is empty)
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				assert.ok(!logCalls.includes("id_/"));
			});

			it("should bypass cache with --no-cache flag", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
							status: "200",
						},
					},
				};
				mockFetchWithCache = mock.fn(async () => mockData);
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
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx check.ts <url>")));
				assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => { throw new Error("Network error"); });
				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Network error"));
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache = mock.fn(async () => { throw "string error"; });
				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "string error"));
			});
		});

		describe("output formatting", () => {
			it("should include blank lines", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
							status: "200",
						},
					},
				};
				mockFetchWithCache = mock.fn(async () => mockData);
				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				assert.deepStrictEqual(logCalls[1], []); // blank line after checking
				assert.deepStrictEqual(logCalls[logCalls.length - 1], []); // blank line at end
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Check failed");
			assert.throws(() => handleError(error, "https://example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Check failed"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "https://example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "string error"));
		});

		it("should ignore url parameter", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-url", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Test error"));
		});
	});
});
