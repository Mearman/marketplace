/**
 * Tests for wayback oldest-newest.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError, fetchOldest, fetchNewest, formatCompact, formatFull, type OldestNewestResult } from "./oldest-newest.js";
import { parseArgs } from "./utils.js";

describe("oldest-newest.ts", () => {
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
		describe("successful queries", () => {
			it("should fetch both oldest and newest captures by default (compact output)", async () => {
				mockFetchWithCache = mock.fn(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return [
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						];
					}
					return [
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					];
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				// Should use compact format (no emoji, no URLs)
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				assert.ok(logCalls.includes("1998-12-01"));
				assert.ok(logCalls.includes("2024-01-15"));
				assert.ok(!logCalls.includes("📜"));
				assert.ok(!logCalls.includes("🆕"));
				assert.ok(!logCalls.includes("web.archive.org"));
			});

			it("should output full data with --full flag", async () => {
				mockFetchWithCache = mock.fn(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return [
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						];
					}
					return [
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					];
				});

				const args = parseArgs(["--full", "https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("📜 OLDEST:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("🆕 NEWEST:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("web.archive.org")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Archive span:")));
			});

			it("should output JSON with --json flag", async () => {
				mockFetchWithCache = mock.fn(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return [
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						];
					}
					return [
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					];
				});

				const args = parseArgs(["--json", "https://example.com"]);

				await main(args, deps);

				const jsonOutput = mockConsole.log.mock.calls
					.map((c: any[]) => c[0])
					.find((call: string) => call.startsWith("{"));
				assert.ok(jsonOutput !== undefined);
				const parsed = JSON.parse(jsonOutput);
				assert.ok(parsed.hasOwnProperty("url", "https://example.com"));
				assert.ok(parsed.hasOwnProperty("oldest"));
				assert.ok(parsed.hasOwnProperty("newest"));
			});

			it("should fetch only oldest with --oldest-only", async () => {
				mockFetchWithCache = mock.fn(async () => [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--oldest-only", "https://example.com"]);

				await main(args, deps);

				// Should only call fetch once (for oldest)
				assert.strictEqual(mockFetchWithCache.mock.calls.length, 1);
				assert.ok(!mockFetchWithCache.mock.calls[0][0].url.includes("fastLatest"));
			});

			it("should fetch only newest with --newest-only", async () => {
				mockFetchWithCache = mock.fn(async () => [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--newest-only", "https://example.com"]);

				await main(args, deps);

				// Should only call fetch once (for newest)
				assert.strictEqual(mockFetchWithCache.mock.calls.length, 1);
				assert.ok(mockFetchWithCache.mock.calls[0][0].url.includes("fastLatest=true"));
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache = mock.fn(async () => [
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-cache", "https://example.com"]);

				await main(args, deps);

				// Both oldest and newest should be called with bypassCache: true
				const calls = mockFetchWithCache.mock.calls;
				assert.ok(calls.length > 0);
				assert.ok(calls.every((call: any[]) => call[0]?.bypassCache === true));
			});

			it("should handle no captures found", async () => {
				mockFetchWithCache = mock.fn(async () => []);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("No captures found")));
			});

			it("should handle only oldest found (newest missing)", async () => {
				mockFetchWithCache = mock.fn(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return [];
					}
					return [
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					];
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]);
				assert.ok(logCalls.some((call: string) => call.includes("1998-12-01")));
				assert.ok(logCalls.some((call: string) => call.includes("No captures found")));
			});

			it("should handle only newest found (oldest missing)", async () => {
				mockFetchWithCache = mock.fn(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return [
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						];
					}
					return [];
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]);
				assert.ok(logCalls.some((call: string) => call.includes("2024-01-15")));
				assert.ok(logCalls.some((call: string) => call.includes("No captures found")));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Usage:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx oldest-newest.ts <url>")));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache = mock.fn(async () => { throw new Error("Network error"); });

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "Network error" });
			});
		});
	});

	describe("fetchOldest helper", () => {
		it("should return oldest capture entry", async () => {
			mockFetchWithCache = mock.fn(async () => [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			assert.ok(result?.timestamp === "19981201080000");
			assert.ok(result?.url === "https://web.archive.org/web/19981201080000id_/https://example.com");
			assert.ok(result?.original === "https://example.com");
			assert.strictEqual(typeof result?.age, "string");
			assert.strictEqual(result?.formattedDate, "1998-12-01 08:00");
		});

		it("should return null when no captures found", async () => {
			mockFetchWithCache = mock.fn(async () => []);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			assert.strictEqual(result, null);
		});

		it("should return null when only header row", async () => {
			mockFetchWithCache = mock.fn(async () => [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
			]);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			assert.strictEqual(result, null);
		});
	});

	describe("fetchNewest helper", () => {
		it("should return newest capture entry", async () => {
			mockFetchWithCache = mock.fn(async () => [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			const result = await fetchNewest("https://example.com", mockFetchWithCache);

			assert.ok(result?.timestamp === "20240115143000");
			assert.ok(result?.url === "https://web.archive.org/web/20240115143000id_/https://example.com");
			assert.ok(result?.original === "https://example.com");
			assert.strictEqual(typeof result?.age, "string");
			assert.strictEqual(result?.formattedDate, "2024-01-15 14:30");
		});

		it("should return null when no captures found", async () => {
			mockFetchWithCache = mock.fn(async () => []);

			const result = await fetchNewest("https://example.com", mockFetchWithCache);

			assert.strictEqual(result, null);
		});

		it("should use fastLatest parameter", async () => {
			mockFetchWithCache = mock.fn(async () => [
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			await fetchNewest("https://example.com", mockFetchWithCache);

			assert.ok(mockFetchWithCache.mock.calls[0][0].url.includes("fastLatest=true"));
			assert.strictEqual(mockFetchWithCache.mock.calls[0][0].ttl, 3600);
		});
	});

	describe("formatCompact helper", () => {
		it("should format compact output with both oldest and newest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: {
					timestamp: "19981201080000",
					url: "https://web.archive.org/web/19981201080000id_/https://example.com",
					original: "https://example.com",
					age: "9200 days ago",
					formattedDate: "1998-12-01 08:00",
				},
				newest: {
					timestamp: "20240115143000",
					url: "https://web.archive.org/web/20240115143000id_/https://example.com",
					original: "https://example.com",
					age: "2 days ago",
					formattedDate: "2024-01-15 14:30",
				},
			};

			const output = formatCompact(result, true, true);

			assert.ok(output.includes("1998-12-01 08:00"));
			assert.ok(output.includes("9200 days ago"));
			assert.ok(output.includes("2024-01-15 14:30"));
			assert.ok(output.includes("2 days ago"));
			// No emojis or URLs in compact
			assert.ok(!output.includes("📜"));
			assert.ok(!output.includes("🆕"));
			assert.ok(!output.includes("web.archive.org"));
		});

		it("should format compact output with only oldest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: {
					timestamp: "19981201080000",
					url: "https://web.archive.org/web/19981201080000id_/https://example.com",
					original: "https://example.com",
					age: "9200 days ago",
					formattedDate: "1998-12-01 08:00",
				},
				newest: null,
			};

			const output = formatCompact(result, true, false);

			assert.ok(output.includes("1998-12-01 08:00"));
			assert.ok(!output.includes("2024-01-15"));
		});

		it("should format compact output with only newest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: {
					timestamp: "20240115143000",
					url: "https://web.archive.org/web/20240115143000id_/https://example.com",
					original: "https://example.com",
					age: "2 days ago",
					formattedDate: "2024-01-15 14:30",
				},
			};

			const output = formatCompact(result, false, true);

			assert.ok(output.includes("2024-01-15 14:30"));
			assert.ok(!output.includes("1998-12-01"));
		});

		it("should format compact output with neither", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: null,
			};

			const output = formatCompact(result, true, true);

			assert.ok(output.includes("No captures found"));
		});
	});

	describe("formatFull helper", () => {
		it("should format full output with both oldest and newest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: {
					timestamp: "19981201080000",
					url: "https://web.archive.org/web/19981201080000id_/https://example.com",
					original: "https://example.com",
					age: "9200 days ago",
					formattedDate: "1998-12-01 08:00",
				},
				newest: {
					timestamp: "20240115143000",
					url: "https://web.archive.org/web/20240115143000id_/https://example.com",
					original: "https://example.com",
					age: "2 days ago",
					formattedDate: "2024-01-15 14:30",
				},
			};

			const output = formatFull(result, true, true);

			assert.ok(output.includes("📜 OLDEST:"));
			assert.ok(output.includes("1998-12-01 08:00"));
			assert.ok(output.includes("web.archive.org/web/19981201080000id_"));
			assert.ok(output.includes("🆕 NEWEST:"));
			assert.ok(output.includes("2024-01-15 14:30"));
			assert.ok(output.includes("web.archive.org/web/20240115143000id_"));
			assert.ok(output.includes("Archive span:"));
		});

		it("should format full output with only oldest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: {
					timestamp: "19981201080000",
					url: "https://web.archive.org/web/19981201080000id_/https://example.com",
					original: "https://example.com",
					age: "9200 days ago",
					formattedDate: "1998-12-01 08:00",
				},
				newest: null,
			};

			const output = formatFull(result, true, false);

			assert.ok(output.includes("📜 OLDEST:"));
			assert.ok(output.includes("1998-12-01 08:00"));
			assert.ok(!output.includes("🆕"));
		});

		it("should format full output with only newest", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: {
					timestamp: "20240115143000",
					url: "https://web.archive.org/web/20240115143000id_/https://example.com",
					original: "https://example.com",
					age: "2 days ago",
					formattedDate: "2024-01-15 14:30",
				},
			};

			const output = formatFull(result, false, true);

			assert.ok(output.includes("🆕 NEWEST:"));
			assert.ok(output.includes("2024-01-15 14:30"));
			assert.ok(!output.includes("📜"));
		});

		it("should format full output with neither", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: null,
			};

			const output = formatFull(result, true, true);

			assert.ok(output.includes("📜 OLDEST: No captures found"));
			assert.ok(output.includes("🆕 NEWEST: No captures found"));
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Query failed");
			assert.throws(() => handleError(error, "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Query failed"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});

		it("should handle non-Error objects", () => {
			assert.throws(() => handleError("String error", "https://example.com", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "String error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});
	});
});
