/**
 * Tests for npm-registry exists.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./exists";
import { parseArgs } from "./utils";

describe("exists.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
		};

		// Mock process
		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("package exists scenarios", () => {
			it("should display success message when package exists", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: react");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Package \"react\" exists"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("https://www.npmjs.com/package/react"));
				expect(mockConsole.log).toHaveBeenCalledWith("  Published: Yes");
			});

			it("should handle scoped package names", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["@babel/core"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: @babel/core");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Package \"@babel/core\" exists"));
			});

			it("should handle package with hyphens", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["my-awesome-package"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: my-awesome-package");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Package \"my-awesome-package\" exists"));
			});
		});

		describe("package does not exist scenarios", () => {
			it("should display not found message when package does not exist", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["my-new-package"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Checking: my-new-package");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Package \"my-new-package\" does not exist"));
				expect(mockConsole.log).toHaveBeenCalledWith("  The name is available for use");
			});

			it("should handle 404 error message variations", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("404 Resource not found"));
				const args = parseArgs(["nonexistent-package"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✗ Package"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("does not exist"));
			});

			it("should handle not found error with different casing", async () => {
				// Note: The actual check is case-sensitive, looking for "Resource not found"
				// So "resource not found" won't be caught and will re-throw
				mockFetchWithCache.mockRejectedValue(new Error("resource not found"));
				const args = parseArgs(["test-package"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				// Should be handled by handleError since it doesn't match "Resource not found"
				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "resource not found");
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should use correct cache key based on package name", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "exists-@types/node",
					})
				);
			});

			it("should use correct TTL", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["express"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						ttl: 3600, // 1 hour
					})
				);
			});

			it("should use HEAD method for fetch", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["lodash"]);

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
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx exists.ts <package-name>"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("Examples:");
				expect(usageOutput).toContain("npx tsx exists.ts react");
				expect(usageOutput).toContain("npx tsx exists.ts @babel/core");
				expect(usageOutput).toContain("npx tsx exists.ts my-new-package");
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("--no-cache");
				expect(usageOutput).toContain("Bypass cache and fetch fresh data");
			});
		});

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["express"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Request timeout");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			});

			it("should re-throw non-404 errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Authentication failed"));
				const args = parseArgs(["private-package"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Authentication failed");
			});

			it("should handle 500 errors from registry", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Internal Server Error: 500"));
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Internal Server Error: 500");
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Too Many Requests: 429"));
				const args = parseArgs(["axios"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Too Many Requests: 429");
			});
		});

		describe("output formatting", () => {
			it("should include blank lines before and after result", async () => {
				mockFetchWithCache.mockResolvedValue({
					exists: true,
					timestamp: Date.now(),
				});
				const args = parseArgs(["react"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Check the structure of calls
				expect(logCalls[0]).toEqual(["Checking: react"]);
				expect(logCalls[1]).toEqual([]); // blank line (empty array = console.log())
				expect(logCalls[2]).toEqual([expect.stringContaining("✓ Package")]);
				expect(logCalls[logCalls.length - 1]).toEqual([]); // blank line at end
			});

			it("should format output correctly for non-existent package", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["new-package"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				// Check the structure of calls
				expect(logCalls[0]).toEqual(["Checking: new-package"]);
				expect(logCalls[1]).toEqual([]); // blank line (empty array = console.log())
				expect(logCalls[2]).toEqual([expect.stringContaining("✗ Package")]);
				expect(logCalls[3]).toEqual(["  The name is available for use"]);
				expect(logCalls[logCalls.length - 1]).toEqual([]); // blank line at end
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			expect(() => handleError(error, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error message");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle numeric errors", () => {
			expect(() => handleError(404, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "404");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle object errors without message property", () => {
			const error = { code: 500, status: "error" };
			expect(() => handleError(error, "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// String(error) converts objects to "[object Object]"
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "[object Object]");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			expect(() => handleError(error, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore packageName parameter (present for interface consistency)", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-package-name", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// The packageName is not used in the error handling, just part of the interface
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error");
		});
	});
});
