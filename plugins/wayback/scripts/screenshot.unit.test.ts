/**
 * Tests for wayback screenshot.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError, listScreenshots, checkScreenshotAvailable } from "./screenshot.js";
import { parseArgs } from "./utils.js";

// Mock fetch and writeFile
let mockGlobalFetch: any;
let mockWriteFile: any;

describe("screenshot.ts", () => {
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

		// Mock global fetch
		mockGlobalFetch = mock.fn();
		globalThis.fetch = mockGlobalFetch;

		// Mock writeFile
		mockWriteFile = mock.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
			fs: {
				writeFile: mockWriteFile,
			},
		};
	});

	describe("main", () => {
		describe("--list mode", () => {
			it("should list screenshots", async () => {
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "https://example.com", "image/png", "200", "digest", "1000"],
					],
				}));

				const args = parseArgs(["--list", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Screenshots for: https://example.com")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Total:")));
			});

			it("should show message when no screenshots found", async () => {
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [["timestamp"]],
				}));

				const args = parseArgs(["--list", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "No screenshots found"));
			});
		});

		describe("screenshot retrieval", () => {
			it("should get screenshot", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				}));

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Fetching most recent screenshot")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("URL:")));
			});

			it("should handle --timestamp flag", async () => {
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				}));

				const args = parseArgs(["--timestamp=20240101120000", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Fetching screenshot from 2024-01-01 12:00")));
			});

			it("should use --no-cache flag", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				}));

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
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx screenshot.ts <url>")));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => { throw new Error("Network error"); });

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Network error"));
			});
		});

		describe("screenshot download", () => {
			beforeEach(() => {
				mock.reset();
			});

			it("should download screenshot when --download is provided", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async (url: string) => {
					if (url.includes("cdx/search")) {
						return {
							json: async () => [
								["timestamp", "url", "mime", "status", "digest", "length"],
								["20240101120000", "url", "image/png", "200", "digest", "1000"],
							],
						};
					}
					return {
						ok: true,
						arrayBuffer: async () => new ArrayBuffer(1024),
					};
				});

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await main(args, deps);

				assert.strictEqual(mockWriteFile.mock.calls.length, 1);
				assert.strictEqual(mockWriteFile.mock.calls[0][0], "screenshot.png");
				assert.strictEqual(Buffer.isBuffer(mockWriteFile.mock.calls[0][1]), true);
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✓ Downloaded to: screenshot.png")));
			});

			it("should handle HTTP error when downloading screenshot", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async (url: string) => {
					if (url.includes("cdx/search")) {
						return {
							json: async () => [
								["timestamp", "url", "mime", "status", "digest", "length"],
								["20240101120000", "url", "image/png", "200", "digest", "1000"],
							],
						};
					}
					return {
						ok: false,
						status: 404,
					};
				});

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ Screenshot not available (404)")));
			});

			it("should show message when --download not provided", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "url", "image/png", "200", "digest", "1000"],
					],
				}));

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Use --download=PATH to save the screenshot")));
			});
		});

		describe("screenshot unavailable scenarios", () => {
			beforeEach(() => {
				mock.reset();
			});

			it("should exit when screenshot not available at specified timestamp", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async () => ({
					json: async () => [["timestamp"]],
				}));

				const args = parseArgs(["--timestamp=20240101120000", "https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ No screenshot found at 2024-01-01 12:00")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Use --list to see available screenshots.")));
			});

			it("should exit when no archived version found", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: false,
						},
					},
				}));

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ No archived version found")));
			});

			it("should handle write errors when downloading screenshot", async () => {
				mockFetchWithCache = mock.fn(async () => ({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				}));
				mockGlobalFetch = mock.fn(async (url: string) => {
					if (url.includes("cdx/search")) {
						return {
							json: async () => [
								["timestamp", "url", "mime", "status", "digest", "length"],
								["20240101120000", "url", "image/png", "200", "digest", "1000"],
							],
						};
					}
					return {
						ok: true,
						arrayBuffer: async () => new ArrayBuffer(1024),
					};
				});
				mockWriteFile = mock.fn(async () => { throw new Error("Write permission denied"); });

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Write permission denied"));
			});
		});
	});

	describe("checkScreenshotAvailable helper", () => {
		it("should return true when screenshot exists", async () => {
			mockGlobalFetch = mock.fn(async () => ({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "url", "image/png", "200", "digest", "1000"],
				],
			}));

			const result = await checkScreenshotAvailable("https://example.com", deps);

			assert.strictEqual(result, true);
		});

		it("should return false when no screenshot", async () => {
			mockGlobalFetch = mock.fn(async () => ({
				json: async () => [["timestamp"]],
			}));

			const result = await checkScreenshotAvailable("https://example.com", deps);

			assert.strictEqual(result, false);
		});

		it("should return false on error", async () => {
			mockGlobalFetch = mock.fn(async () => { throw new Error("Network error"); });

			const result = await checkScreenshotAvailable("https://example.com", deps);

			assert.strictEqual(result, false);
		});

		it("should check specific timestamp", async () => {
			mockGlobalFetch = mock.fn(async () => ({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "url", "image/png", "200", "digest", "1000"],
				],
			}));

			const result = await checkScreenshotAvailable("https://example.com", deps, "20240101120000");

			assert.strictEqual(result, true);
		});
	});

	describe("listScreenshots helper", () => {
		it("should list screenshots", async () => {
			mockGlobalFetch = mock.fn(async () => ({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "image/png", "200", "digest", "1000"],
				],
			}));

			await listScreenshots("https://example.com", deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Screenshots for: https://example.com")));
			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Total:")));
		});

		it("should show message when no screenshots found", async () => {
			mockGlobalFetch = mock.fn(async () => ({
				json: async () => [["timestamp"]],
			}));

			await listScreenshots("https://example.com", deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "No screenshots found"));
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Screenshot error");
			assert.throws(() => handleError(error, "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Screenshot error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});
	});
});
