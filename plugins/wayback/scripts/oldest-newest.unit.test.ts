/**
 * Tests for wayback oldest-newest.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError, fetchOldest, fetchNewest, formatCompact, formatFull, type OldestNewestResult } from "./oldest-newest";
import { parseArgs } from "./utils";

// Mock fetch
global.fetch = vi.fn();

describe("oldest-newest.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(global.fetch).mockReset();

		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful queries", () => {
			it("should fetch both oldest and newest captures by default (compact output)", async () => {
				mockFetchWithCache.mockImplementation(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return Promise.resolve([
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						]);
					}
					return Promise.resolve([
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					]);
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				// Should use compact format (no emoji, no URLs)
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				expect(logCalls).toContain("1998-12-01");
				expect(logCalls).toContain("2024-01-15");
				expect(logCalls).not.toContain("📜");
				expect(logCalls).not.toContain("🆕");
				expect(logCalls).not.toContain("web.archive.org");
			});

			it("should output full data with --full flag", async () => {
				mockFetchWithCache.mockImplementation(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return Promise.resolve([
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						]);
					}
					return Promise.resolve([
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					]);
				});

				const args = parseArgs(["--full", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("📜 OLDEST:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("🆕 NEWEST:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("web.archive.org"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Archive span:"));
			});

			it("should output JSON with --json flag", async () => {
				mockFetchWithCache.mockImplementation(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return Promise.resolve([
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						]);
					}
					return Promise.resolve([
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					]);
				});

				const args = parseArgs(["--json", "https://example.com"]);

				await main(args, deps);

				const jsonOutput = mockConsole.log.mock.calls
					.map((c: any[]) => c[0])
					.find((call: string) => call.startsWith("{"));
				expect(jsonOutput).toBeDefined();
				const parsed = JSON.parse(jsonOutput);
				expect(parsed).toHaveProperty("url", "https://example.com");
				expect(parsed).toHaveProperty("oldest");
				expect(parsed).toHaveProperty("newest");
			});

			it("should fetch only oldest with --oldest-only", async () => {
				mockFetchWithCache.mockResolvedValue([
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--oldest-only", "https://example.com"]);

				await main(args, deps);

				// Should only call fetch once (for oldest)
				expect(mockFetchWithCache).toHaveBeenCalledTimes(1);
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.not.stringContaining("fastLatest")
				);
			});

			it("should fetch only newest with --newest-only", async () => {
				mockFetchWithCache.mockResolvedValue([
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--newest-only", "https://example.com"]);

				await main(args, deps);

				// Should only call fetch once (for newest)
				expect(mockFetchWithCache).toHaveBeenCalledTimes(1);
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("fastLatest"),
					})
				);
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache.mockResolvedValue([
					["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
					["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-cache", "https://example.com"]);

				await main(args, deps);

				// Both oldest and newest should be called with bypassCache: true
				const calls = mockFetchWithCache.mock.calls;
				expect(calls.length).toBeGreaterThan(0);
				expect(calls.every((call: any[]) => call[0]?.bypassCache === true)).toBe(true);
			});

			it("should handle no captures found", async () => {
				mockFetchWithCache.mockResolvedValue([]);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("No captures found"));
			});

			it("should handle only oldest found (newest missing)", async () => {
				mockFetchWithCache.mockImplementation(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return Promise.resolve([]);
					}
					return Promise.resolve([
						["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
						["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
					]);
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]);
				expect(logCalls.some((call: string) => call.includes("1998-12-01"))).toBe(true);
				expect(logCalls.some((call: string) => call.includes("No captures found"))).toBe(true);
			});

			it("should handle only newest found (oldest missing)", async () => {
				mockFetchWithCache.mockImplementation(({ url }: { url: string }) => {
					if (url.includes("fastLatest")) {
						return Promise.resolve([
							["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
							["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
						]);
					}
					return Promise.resolve([]);
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]);
				expect(logCalls.some((call: string) => call.includes("2024-01-15"))).toBe(true);
				expect(logCalls.some((call: string) => call.includes("No captures found"))).toBe(true);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx oldest-newest.ts <url>"));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("Network error");
			});
		});
	});

	describe("fetchOldest helper", () => {
		it("should return oldest capture entry", async () => {
			mockFetchWithCache.mockResolvedValue([
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "19981201080000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			expect(result).toEqual({
				timestamp: "19981201080000",
				url: "https://web.archive.org/web/19981201080000id_/https://example.com",
				original: "https://example.com",
				age: expect.any(String),
				formattedDate: "1998-12-01 08:00",
			});
		});

		it("should return null when no captures found", async () => {
			mockFetchWithCache.mockResolvedValue([]);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			expect(result).toBeNull();
		});

		it("should return null when only header row", async () => {
			mockFetchWithCache.mockResolvedValue([
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
			]);

			const result = await fetchOldest("https://example.com", mockFetchWithCache);

			expect(result).toBeNull();
		});
	});

	describe("fetchNewest helper", () => {
		it("should return newest capture entry", async () => {
			mockFetchWithCache.mockResolvedValue([
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			const result = await fetchNewest("https://example.com", mockFetchWithCache);

			expect(result).toEqual({
				timestamp: "20240115143000",
				url: "https://web.archive.org/web/20240115143000id_/https://example.com",
				original: "https://example.com",
				age: expect.any(String),
				formattedDate: "2024-01-15 14:30",
			});
		});

		it("should return null when no captures found", async () => {
			mockFetchWithCache.mockResolvedValue([]);

			const result = await fetchNewest("https://example.com", mockFetchWithCache);

			expect(result).toBeNull();
		});

		it("should use fastLatest parameter", async () => {
			mockFetchWithCache.mockResolvedValue([
				["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
				["com,example)/", "20240115143000", "https://example.com", "text/html", "200", "digest", "1000"],
			]);

			await fetchNewest("https://example.com", mockFetchWithCache);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("fastLatest=true"),
					ttl: 3600,
				})
			);
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

			expect(output).toContain("1998-12-01 08:00");
			expect(output).toContain("9200 days ago");
			expect(output).toContain("2024-01-15 14:30");
			expect(output).toContain("2 days ago");
			// No emojis or URLs in compact
			expect(output).not.toContain("📜");
			expect(output).not.toContain("🆕");
			expect(output).not.toContain("web.archive.org");
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

			expect(output).toContain("1998-12-01 08:00");
			expect(output).not.toContain("2024-01-15");
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

			expect(output).toContain("2024-01-15 14:30");
			expect(output).not.toContain("1998-12-01");
		});

		it("should format compact output with neither", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: null,
			};

			const output = formatCompact(result, true, true);

			expect(output).toContain("No captures found");
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

			expect(output).toContain("📜 OLDEST:");
			expect(output).toContain("1998-12-01 08:00");
			expect(output).toContain("web.archive.org/web/19981201080000id_");
			expect(output).toContain("🆕 NEWEST:");
			expect(output).toContain("2024-01-15 14:30");
			expect(output).toContain("web.archive.org/web/20240115143000id_");
			expect(output).toContain("Archive span:");
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

			expect(output).toContain("📜 OLDEST:");
			expect(output).toContain("1998-12-01 08:00");
			expect(output).not.toContain("🆕");
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

			expect(output).toContain("🆕 NEWEST:");
			expect(output).toContain("2024-01-15 14:30");
			expect(output).not.toContain("📜");
		});

		it("should format full output with neither", () => {
			const result: OldestNewestResult = {
				url: "https://example.com",
				oldest: null,
				newest: null,
			};

			const output = formatFull(result, true, true);

			expect(output).toContain("📜 OLDEST: No captures found");
			expect(output).toContain("🆕 NEWEST: No captures found");
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Query failed");
			expect(() => handleError(error, "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Query failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error objects", () => {
			expect(() => handleError("String error", "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "String error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
