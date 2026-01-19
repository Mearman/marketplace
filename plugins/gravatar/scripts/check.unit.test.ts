/**
 * Tests for gravatar check.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./check";
import { parseArgs } from "./utils";

describe("check.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();

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
		describe("gravatar exists scenarios", () => {
			it("should display success message when gravatar exists", async () => {
				mockFetchWithCache.mockResolvedValue(true);
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: user@example.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Gravatar exists"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Hash:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Profile: https://www.gravatar.com/"));
			});

			it("should handle scoped email addresses", async () => {
				mockFetchWithCache.mockResolvedValue(true);
				const args = parseArgs(["user@domain.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: user@domain.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Gravatar exists"));
			});
		});

		describe("gravatar does not exist scenarios", () => {
			it("should display not found message when gravatar does not exist", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["newuser@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: newuser@example.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ No Gravatar found"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("This email does not have a Gravatar image"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("A default image will be shown"));
			});

			it("should handle 404 error message variations", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("404 Resource not found"));
				const args = parseArgs(["test@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ No Gravatar found"));
			});

			it("should show hash even when gravatar not found", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["no-avatar@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Hash:"));
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue(true);
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue(true);
				const args = parseArgs(["--no-cache", "user@example.com"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should use HEAD method for fetch", async () => {
				mockFetchWithCache.mockResolvedValue(true);
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						fetchOptions: expect.objectContaining({
							method: "HEAD",
						}),
					})
				);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx check.ts <email>"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join("\n");
				expect(logCalls).toContain("Examples:");
				expect(logCalls).toContain("npx tsx check.ts user@example.com");
				expect(logCalls).toContain("npx tsx check.ts beau@dentedreality.com.au");
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join("\n");
				expect(logCalls).toContain("--no-cache");
				expect(logCalls).toContain("Bypass cache and fetch fresh data");
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Network error");
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Request timeout");
			});

			it("should handle non-404 errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Internal Server Error: 500"));
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Internal Server Error: 500");
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Too Many Requests: 429"));
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Too Many Requests: 429");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
			});
		});
	});

	describe("output formatting", () => {
		it("should include blank lines before and after result", async () => {
			mockFetchWithCache.mockResolvedValue(true);
			const args = parseArgs(["user@example.com"]);

			await main(args, deps);

			const logCalls = mockConsole.log.mock.calls;
			// Check the structure of calls
			expect(logCalls[0]).toEqual(["Checking: user@example.com"]);
			expect(logCalls[1]).toEqual([]); // blank line
			expect(logCalls[2][0]).toEqual(expect.stringContaining("✓ Gravatar"));
			expect(logCalls[logCalls.length - 1]).toEqual([]); // blank line at end
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			expect(() => handleError(error, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error message");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore email parameter in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-email@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// The email is not used in the error handling, just part of the interface
			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error");
		});
	});
});
