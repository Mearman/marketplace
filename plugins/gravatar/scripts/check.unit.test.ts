/**
 * Tests for gravatar check.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./check.js";
import { parseArgs } from "./utils.js";
import { callsToArray } from "./test-helpers.js";

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

		mockFetchWithCache = mock.fn(async () => true);

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("gravatar exists scenarios", () => {
			it("should display success message when gravatar exists", async () => {
				mockFetchWithCache = mock.fn(async () => true);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				assert.strictEqual(callsToArray(mockConsole.log)[0][0], "Checking: user@example.com");
				assert.match(callsToArray(mockConsole.log)[2][0], /✓ Gravatar exists/);
				assert.match(callsToArray(mockConsole.log)[3][0], /Hash:/);
				assert.match(callsToArray(mockConsole.log)[4][0], /URL:/);
				assert.match(callsToArray(mockConsole.log)[5][0], /Profile: https:\/\/www\.gravatar\.com\//);
			});

			it("should handle scoped email addresses", async () => {
				mockFetchWithCache = mock.fn(async () => true);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@domain.com"]);

				await main(args, deps);

				assert.strictEqual(callsToArray(mockConsole.log)[0][0], "Checking: user@domain.com");
				assert.match(callsToArray(mockConsole.log)[2][0], /✓ Gravatar exists/);
			});
		});

		describe("gravatar does not exist scenarios", () => {
			it("should display not found message when gravatar does not exist", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Resource not found");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["newuser@example.com"]);

				await main(args, deps);

				assert.strictEqual(callsToArray(mockConsole.log)[0][0], "Checking: newuser@example.com");
				assert.match(callsToArray(mockConsole.log)[2][0], /✗ No Gravatar found/);
				assert.match(callsToArray(mockConsole.log)[3][0], /Hash:/);
				assert.match(callsToArray(mockConsole.log)[4][0], /This email does not have a Gravatar image/);
				assert.match(callsToArray(mockConsole.log)[5][0], /A default image will be shown/);
			});

			it("should handle 404 error message variations", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("404 Resource not found");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["test@example.com"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[2][0], /✗ No Gravatar found/);
			});

			it("should show hash even when gravatar not found", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Resource not found");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["no-avatar@example.com"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[3][0], /Hash:/);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache = mock.fn(async () => true);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				const callArgs = callsToArray(mockFetchWithCache)[0][0];
				assert.strictEqual(callArgs.bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache = mock.fn(async () => true);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["--no-cache", "user@example.com"]);

				await main(args, deps);

				const callArgs = callsToArray(mockFetchWithCache)[0][0];
				assert.strictEqual(callArgs.bypassCache, true);
			});

			it("should use HEAD method for fetch", async () => {
				mockFetchWithCache = mock.fn(async () => true);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				const callArgs = callsToArray(mockFetchWithCache)[0][0];
				assert.strictEqual(callArgs.fetchOptions.method, "HEAD");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /Usage:/);
				assert.match(callsToArray(mockConsole.log)[0][0], /npx tsx check\.ts <email>/);
				assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /Usage:/);
				assert.match(callsToArray(mockConsole.log)[0][0], /Examples:/);
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /--no-cache/);
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Network error");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Network error"]);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Request timeout");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Request timeout"]);
			});

			it("should handle non-404 errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Internal Server Error: 500");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Internal Server Error: 500"]);
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Too Many Requests: 429");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Too Many Requests: 429"]);
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("string error");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "string error"]);
			});
		});
	});

	describe("output formatting", () => {
		it("should include blank lines before and after result", async () => {
			mockFetchWithCache = mock.fn(async () => true);
			deps.fetchWithCache = mockFetchWithCache;
			const args = parseArgs(["user@example.com"]);

			await main(args, deps);

			const logCalls = callsToArray(mockConsole.log);
			assert.deepStrictEqual(logCalls[0], ["Checking: user@example.com"]);
			assert.deepStrictEqual(logCalls[1], []); // blank line
			assert.match(logCalls[2][0], /✓ Gravatar/);
			assert.deepStrictEqual(logCalls[logCalls.length - 1], []); // blank line at end
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			assert.throws(() => handleError(error, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Test error message"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "string error"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "null"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "undefined"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should ignore email parameter in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-email@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Test error"]);
		});
	});
});
