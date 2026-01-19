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

			it("should include capture-outlinks in form data", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["--capture-outlinks", "https://example.com"]);

				await main(args, deps);

				expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
					expect.stringContaining("/save"),
					expect.objectContaining({
						body: expect.stringContaining("capture_outlinks=1"),
					})
				);
			});

			it("should include capture-screenshot in form data", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
						screenshot: "https://example.com/screenshot.png",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["--capture-screenshot", "https://example.com"]);

				await main(args, deps);

				expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						body: expect.stringContaining("capture_screenshot=1"),
					})
				);
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Screenshot:"));
			});

			it("should include skip-if-recent in form data", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["--skip-if-recent=30d", "https://example.com"]);

				await main(args, deps);

				expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						body: expect.stringContaining("if_not_archived_within=30d"),
					})
				);
			});

			it("should poll for job completion when status is pending", async () => {
				let callCount = 0;
				vi.mocked(global.fetch).mockImplementation(() => {
					callCount++;
					// First call is to submit, second is status check (success immediately)
					if (callCount === 1) {
						return Promise.resolve({
							ok: true,
							json: vi.fn().mockResolvedValue({
								job_id: "job123",
								status: "success",
								timestamp: "20240101120000",
								original_url: "https://example.com",
							}),
						} as any);
					}
					return Promise.resolve({
						ok: true,
						json: vi.fn().mockResolvedValue({
							job_id: "job123",
							status: "success",
							timestamp: "20240101120000",
							original_url: "https://example.com",
						}),
					} as any);
				});

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Archived"));
			}, 10000);

			it("should handle job that completes with error status", async () => {
				let callCount = 0;
				vi.mocked(global.fetch).mockImplementation(() => {
					callCount++;
					if (callCount === 1) {
						return Promise.resolve({
							ok: true,
							json: vi.fn().mockResolvedValue({
								job_id: "job123",
								status: "error",
								status_ext: "Blocked by robots.txt",
							}),
						} as any);
					}
					return Promise.resolve({
						ok: true,
						json: vi.fn().mockResolvedValue({
							job_id: "job123",
							status: "error",
							status_ext: "Blocked by robots.txt",
						}),
					} as any);
				});

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Failed to archive"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Blocked by robots.txt"));
			}, 10000);

			it("should handle unexpected API response", async () => {
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue({
						unknown_field: "unexpected",
					}),
				} as any;
				vi.mocked(global.fetch).mockResolvedValue(mockResponse);

				const args = parseArgs(["https://example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Unexpected response"));
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
