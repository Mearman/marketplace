/**
 * Tests for wayback screenshot.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { writeFile } from "fs/promises";
import { main, handleError, listScreenshots, checkScreenshotAvailable } from "./screenshot";
import { parseArgs } from "./utils";

// Mock fetch and writeFile
global.fetch = vi.fn();
vi.mock("fs/promises", () => ({
	writeFile: vi.fn(),
}));

describe("screenshot.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(global.fetch).mockReset();
		vi.mocked(writeFile).mockReset();

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
		describe("--list mode", () => {
			it("should list screenshots", async () => {
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "https://example.com", "image/png", "200", "digest", "1000"],
					],
				} as any);

				const args = parseArgs(["--list", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Screenshots for: https://example.com"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total:"));
			});

			it("should show message when no screenshots found", async () => {
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [["timestamp"]],
				} as any);

				const args = parseArgs(["--list", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("No screenshots found");
			});
		});

		describe("screenshot retrieval", () => {
			it("should get screenshot", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				} as any);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Fetching most recent screenshot"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL:"));
			});

			it("should handle --timestamp flag", async () => {
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				} as any);

				const args = parseArgs(["--timestamp=20240101120000", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Fetching screenshot from 2024-01-01 12:00"));
			});

			it("should use --no-cache flag", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "web.archive.org/screenshot/https://example.com", "image/png", "200", "digest", "1000"],
					],
				} as any);

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
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx screenshot.ts <url>"));
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Network error");
			});
		});

		describe("screenshot download", () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			it("should download screenshot when --download is provided", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValueOnce({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "url", "image/png", "200", "digest", "1000"],
					],
				} as any);
				vi.mocked(global.fetch).mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => new ArrayBuffer(1024),
				} as any);

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await main(args, deps);

				expect(vi.mocked(writeFile)).toHaveBeenCalled();
				expect(vi.mocked(writeFile).mock.calls[0][0]).toBe("screenshot.png");
				expect(Buffer.isBuffer(vi.mocked(writeFile).mock.calls[0][1])).toBe(true);
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Downloaded to: screenshot.png"));
			});

			it("should handle HTTP error when downloading screenshot", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValueOnce({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "url", "image/png", "200", "digest", "1000"],
					],
				} as any);
				vi.mocked(global.fetch).mockResolvedValueOnce({
					ok: false,
					status: 404,
				} as any);

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Screenshot not available (404)"));
			});

			it("should show message when --download not provided", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "url", "image/png", "200", "digest", "1000"],
					],
				} as any);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Use --download=PATH to save the screenshot"));
			});
		});

		describe("screenshot unavailable scenarios", () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			it("should exit when screenshot not available at specified timestamp", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValue({
					json: async () => [["timestamp"]],
				} as any);

				const args = parseArgs(["--timestamp=20240101120000", "https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ No screenshot found at 2024-01-01 12:00"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Use --list to see available screenshots."));
			});

			it("should exit when no archived version found", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: false,
						},
					},
				});

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ No archived version found"));
			});

			it("should handle write errors when downloading screenshot", async () => {
				mockFetchWithCache.mockResolvedValue({
					archived_snapshots: {
						closest: {
							available: true,
							timestamp: "20240101120000",
						},
					},
				});
				vi.mocked(global.fetch).mockResolvedValueOnce({
					json: async () => [
						["timestamp", "url", "mime", "status", "digest", "length"],
						["20240101120000", "url", "image/png", "200", "digest", "1000"],
					],
				} as any);
				vi.mocked(global.fetch).mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => new ArrayBuffer(1024),
				} as any);
				vi.mocked(writeFile).mockRejectedValue(new Error("Write permission denied"));

				const args = parseArgs(["https://example.com", "--download=screenshot.png"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Write permission denied");
			});
		});
	});

	describe("checkScreenshotAvailable helper", () => {
		it("should return true when screenshot exists", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "url", "image/png", "200", "digest", "1000"],
				],
			} as any);

			const result = await checkScreenshotAvailable("https://example.com", deps);

			expect(result).toBe(true);
		});

		it("should return false when no screenshot", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [["timestamp"]],
			} as any);

			const result = await checkScreenshotAvailable("https://example.com", deps);

			expect(result).toBe(false);
		});

		it("should return false on error", async () => {
			vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

			const result = await checkScreenshotAvailable("https://example.com", deps);

			expect(result).toBe(false);
		});

		it("should check specific timestamp", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "url", "image/png", "200", "digest", "1000"],
				],
			} as any);

			const result = await checkScreenshotAvailable("https://example.com", deps, "20240101120000");

			expect(result).toBe(true);
		});
	});

	describe("listScreenshots helper", () => {
		it("should list screenshots", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [
					["timestamp", "url", "mime", "status", "digest", "length"],
					["20240101120000", "https://example.com", "image/png", "200", "digest", "1000"],
				],
			} as any);

			await listScreenshots("https://example.com", deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Screenshots for: https://example.com"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total:"));
		});

		it("should show message when no screenshots found", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				json: async () => [["timestamp"]],
			} as any);

			await listScreenshots("https://example.com", deps);

			expect(mockConsole.log).toHaveBeenCalledWith("No screenshots found");
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Screenshot error");
			expect(() => handleError(error, "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Screenshot error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
