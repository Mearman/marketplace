/**
 * Tests for wayback list.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError, fetchScreenshotTimestamps } from "./list";
import { parseArgs } from "./utils";

// Mock fetch
global.fetch = vi.fn();

describe("list.ts", () => {
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
			stdout: {
				write: vi.fn(),
			},
		};

		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful listing", () => {
			it("should list snapshots", async () => {
				mockFetchWithCache.mockResolvedValue([
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["https://example.com", "10"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Fetching last 10 snapshots for: https://example.com"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total:"));
			});

			it("should use --no-raw flag", async () => {
				mockFetchWithCache.mockResolvedValue([
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// Should not contain "id_/" modifier
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				expect(logCalls).not.toContain("id_/");
			});

			it("should use --with-screenshots flag", async () => {
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [["2024010112"], ["2024010113"]],
				} as any);
				mockFetchWithCache.mockResolvedValue([
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--with-screenshots", "https://example.com"]);

				await main(args, deps);

				expect(mockProcess.stdout.write).toHaveBeenCalledWith("Checking for screenshots...");
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache.mockResolvedValue([
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "text/html", "200", "digest", "1000"],
				]);

				const args = parseArgs(["--no-cache", "https://example.com"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx list.ts <url>"));
			});

			it("should handle no snapshots found", async () => {
				mockFetchWithCache.mockResolvedValue([]);

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("No snapshots found");
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));

				const args = parseArgs(["https://example.com"]);

				// main() doesn't have its own try-catch, errors propagate up
				await expect(main(args, deps)).rejects.toThrow("Network error");
			});
		});
	});

	describe("fetchScreenshotTimestamps helper", () => {
		it("should return screenshot timestamps", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [
					["timestamp"],
					["20240101120000"],
					["20240101130000"],
				],
			} as any);

			const result = await fetchScreenshotTimestamps("https://example.com");

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(2);
		});

		it("should return empty set on error", async () => {
			vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

			const result = await fetchScreenshotTimestamps("https://example.com");

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(0);
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("List failed");
			expect(() => handleError(error, "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "List failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
