/**
 * Tests for wayback check.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./check";
import { parseArgs } from "./utils";
import { API } from "./utils";

// Mock fetch
global.fetch = vi.fn();

describe("check.ts", () => {
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
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: https://example.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Archived"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Timestamp:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL:"));
			});

			it("should display not archived when no snapshot", async () => {
				const mockData = {
					archived_snapshots: {
						closest: {
							available: false,
						},
					},
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Not archived"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Use wayback-submit"));
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
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// When --no-raw is used, the URL should NOT contain "id_/" (modifier is empty)
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("https://web.archive.org/web/20240101120000/https://example.com"));
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
				mockFetchWithCache.mockResolvedValue(mockData);
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
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx check.ts <url>"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Network error");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
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
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				expect(logCalls[1]).toEqual([]); // blank line after checking
				expect(logCalls[logCalls.length - 1]).toEqual([]); // blank line at end
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Check failed");
			expect(() => handleError(error, "https://example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Check failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "https://example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
		});

		it("should ignore url parameter", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-url", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error");
		});
	});
});
