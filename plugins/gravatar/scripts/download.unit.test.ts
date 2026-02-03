/**
 * Tests for gravatar download.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import * as assert from "node:assert";
import { main, handleError } from "./download.js";
import { parseArgs } from "./utils.js";
import { callsToArray, firstCall } from "./test-helpers.js";

describe("download.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let mockWriteFile: any;
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

		mockFetchWithCache = mock.fn(async () => new ArrayBuffer(5000));
		mockWriteFile = mock.fn(async () => {});

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
			writeFile: mockWriteFile,
		};
	});

	describe("main", () => {
		describe("successful download scenarios", () => {
			it("should download gravatar with default size", async () => {
				const mockBuffer = new ArrayBuffer(10240);
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				assert.strictEqual(callsToArray(mockConsole.log)[0][0], "Email: user@example.com");
				assert.strictEqual(callsToArray(mockConsole.log)[1][0], "Output: avatar.jpg");
				assert.match(callsToArray(mockConsole.log)[2][0], /Hash:/);
				assert.match(callsToArray(mockConsole.log)[4][0], /✓ Downloaded successfully/);
				assert.match(callsToArray(mockConsole.log)[5][0], /Size: 10\.0 KB/);
				assert.strictEqual(callsToArray(mockConsole.log)[6][0], "  File: avatar.jpg");
				assert.deepStrictEqual(callsToArray(mockWriteFile)[0], ["avatar.jpg", Buffer.from(mockBuffer)]);
			});

			it("should download gravatar with custom size", async () => {
				const mockBuffer = new ArrayBuffer(20480);
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.png", "--size=400"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.match(callArgs.url, /size=400/);
				assert.match(callsToArray(mockConsole.log)[5][0], /Size: 20\.0 KB/);
			});

			it("should download gravatar with default image type", async () => {
				const mockBuffer = new ArrayBuffer(5120);
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg", "--default=identicon"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.match(callArgs.url, /d=identicon/);
			});

			it("should download gravatar with rating level", async () => {
				const mockBuffer = new ArrayBuffer(8192);
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg", "--rating=pg"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.match(callArgs.url, /r=pg/);
			});

			it("should handle different image sizes in KB formatting", async () => {
				const mockBuffer = new ArrayBuffer(1048576); // 1 MB
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "large.jpg"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[5][0], /Size: 1024\.0 KB/);
			});
		});

		describe("option validation", () => {
			it("should validate size option (max 2048)", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(1000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=2048"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.match(callArgs.url, /size=2048/);
			});

			it("should reject size over 2048", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(1000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=2049"]);

				await main(args, deps);

				// Size > 2048 should be ignored (not set in URL)
				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.doesNotMatch(callArgs.url, /size=2049/);
			});

			it("should reject negative size", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(1000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=-100"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.doesNotMatch(callArgs.url, /size=-100/);
			});

			it("should validate default image types", async () => {
				const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];
				const mockBuffer = new ArrayBuffer(1000);

				for (const defaultType of validDefaults) {
					mock.reset();

					mockConsole = { log: mock.fn(), error: mock.fn() };
					mockProcess = {
						exit: mock.fn(() => {
							throw new Error("process.exit called");
						}),
					};
					mockFetchWithCache = mock.fn(async () => mockBuffer);
					mockWriteFile = mock.fn(async () => {});
					deps = {
						fetchWithCache: mockFetchWithCache,
						console: mockConsole,
						process: mockProcess,
						writeFile: mockWriteFile,
					};

					const args = parseArgs(["user@example.com", "avatar.jpg", `--default=${defaultType}`]);
					await main(args, deps);

					const callArgs = firstCall(mockFetchWithCache)[0];
					assert.match(callArgs.url, new RegExp(`d=${defaultType}`));
				}
			});

			it("should reject invalid default image type", async () => {
				const args = parseArgs(["user@example.com", "avatar.jpg", "--default=invalid"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.error)[0][0], /Invalid default type/);
				assert.match(callsToArray(mockConsole.error)[0][0], /mp, identicon, monsterid, wavatar, retro, robohash, blank/);
			});

			it("should validate rating levels", async () => {
				const validRatings = ["g", "pg", "r", "x"];
				const mockBuffer = new ArrayBuffer(1000);

				for (const rating of validRatings) {
					mock.reset();

					mockConsole = { log: mock.fn(), error: mock.fn() };
					mockProcess = {
						exit: mock.fn(() => {
							throw new Error("process.exit called");
						}),
					};
					mockFetchWithCache = mock.fn(async () => mockBuffer);
					mockWriteFile = mock.fn(async () => {});
					deps = {
						fetchWithCache: mockFetchWithCache,
						console: mockConsole,
						process: mockProcess,
						writeFile: mockWriteFile,
					};

					const args = parseArgs(["user@example.com", "avatar.jpg", `--rating=${rating}`]);
					await main(args, deps);

					const callArgs = firstCall(mockFetchWithCache)[0];
					assert.match(callArgs.url, new RegExp(`r=${rating}`));
				}
			});

			it("should reject invalid rating level", async () => {
				const args = parseArgs(["user@example.com", "avatar.jpg", "--rating=nc17"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.error)[0][0], /Invalid rating level/);
				assert.match(callsToArray(mockConsole.error)[0][0], /g, pg, r, x/);
			});

			it("should combine multiple options", async () => {
				const mockBuffer = new ArrayBuffer(15000);
				mockFetchWithCache = mock.fn(async () => mockBuffer);
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs([
					"user@example.com",
					"avatar.jpg",
					"--size=300",
					"--default=robohash",
					"--rating=pg",
				]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.match(callArgs.url, /size=300/);
				assert.match(callArgs.url, /d=robohash/);
				assert.match(callArgs.url, /r=pg/);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(5000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.strictEqual(callArgs.bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(5000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["--no-cache", "user@example.com", "avatar.jpg"]);

				await main(args, deps);

				const callArgs = firstCall(mockFetchWithCache)[0];
				assert.strictEqual(callArgs.bypassCache, true);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /Usage:/);
			});

			it("should show usage message when no output file provided", async () => {
				const args = parseArgs(["user@example.com"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /Usage:/);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join("\n");
				assert.match(logCalls, /Examples:/);
				assert.match(logCalls, /npx tsx download\.ts user@example\.com avatar\.jpg/);
				assert.match(logCalls, /npx tsx download\.ts user@example\.com avatar\.png --size=400/);
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join("\n");
				assert.match(logCalls, /--no-cache/);
				assert.match(logCalls, /Bypass cache and fetch fresh data/);
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Network error");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Network error"]);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Request timeout");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Request timeout"]);
			});

			it("should handle 404 errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("Resource not found");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Resource not found"]);
			});

			it("should handle file write errors", async () => {
				mockWriteFile = mock.fn(async () => {
					throw new Error("Permission denied");
				});
				deps.writeFile = mockWriteFile;
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(1000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Permission denied"]);
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache = mock.fn(async () => {
					throw new Error("string error");
				});
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "string error"]);
			});
		});

		describe("output formatting", () => {
			it("should include blank line before success message", async () => {
				mockFetchWithCache = mock.fn(async () => new ArrayBuffer(5000));
				deps.fetchWithCache = mockFetchWithCache;
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log);
				assert.deepStrictEqual(logCalls[0], ["Email: user@example.com"]);
				assert.deepStrictEqual(logCalls[1], ["Output: avatar.jpg"]);
				assert.match(logCalls[2][0], /Hash:/);
				assert.deepStrictEqual(logCalls[3], []); // blank line
				assert.deepStrictEqual(logCalls[4], ["✓ Downloaded successfully"]);
				assert.match(logCalls[5][0], /Size:/);
				assert.strictEqual(logCalls[6][0], "  File: avatar.jpg");
				assert.deepStrictEqual(logCalls[7], []); // blank line at end
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Download failed");
			assert.throws(() => handleError(error, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Download failed"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "string error"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "null"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "undefined"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should include blank line before error message", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Test error"]);
		});

		it("should ignore parameters in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-email@example.com", "any-file.jpg", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["\nError:", "Test error"]);
		});
	});
});
