/**
 * Tests for wayback submit.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./submit";
import { parseArgs } from "./utils";

// Mock fetch
global.fetch = vi.fn();

describe("submit.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
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

		deps = {
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful submission", () => {
			it("should submit URL successfully", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
						original_url: "https://example.com",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Submitting: https://example.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Job ID: job123"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Archived"));
			});

			it("should use authenticated API with --key flag", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["--key=access:secret", "https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("  Using authenticated SPN2 API");
			});

			it("should use --no-raw flag", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// Should not contain "id_/" modifier in URL
				const logCalls = mockConsole.log.mock.calls.map((c: any[]) => c[0]).join(" ");
				expect(logCalls).not.toContain("id_/");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx submit.ts <url>"));
			});
		});

		describe("error handling", () => {
			it("should handle API errors", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						message: "Invalid URL",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Failed to archive"));
			});

			it("should handle network errors", async () => {
				vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Network error");
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Submission failed");
			expect(() => handleError(error, "https://example.com", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Submission failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore url parameter", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-url", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error");
		});
	});
});
