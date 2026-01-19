/**
 * Tests for gravatar download.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { writeFile } from "fs/promises";
import { main, handleError } from "./download";
import { parseArgs } from "./utils";

// Mock writeFile
vi.mock("fs/promises", () => ({
	writeFile: vi.fn(),
}));

describe("download.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(writeFile).mockResolvedValue(undefined);

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
		describe("successful download scenarios", () => {
			it("should download gravatar with default size", async () => {
				const mockBuffer = new ArrayBuffer(10240);
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Email: user@example.com");
				expect(mockConsole.log).toHaveBeenCalledWith("Output: avatar.jpg");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Hash:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("✓ Downloaded successfully"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Size: 10.0 KB"));
				expect(mockConsole.log).toHaveBeenCalledWith("  File: avatar.jpg");
				expect(writeFile).toHaveBeenCalledWith("avatar.jpg", Buffer.from(mockBuffer));
			});

			it("should download gravatar with custom size", async () => {
				const mockBuffer = new ArrayBuffer(20480);
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs(["user@example.com", "avatar.png", "--size=400"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("size=400"),
					})
				);
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Size: 20.0 KB"));
			});

			it("should download gravatar with default image type", async () => {
				const mockBuffer = new ArrayBuffer(5120);
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs(["user@example.com", "avatar.jpg", "--default=identicon"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("d=identicon"),
					})
				);
			});

			it("should download gravatar with rating level", async () => {
				const mockBuffer = new ArrayBuffer(8192);
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs(["user@example.com", "avatar.jpg", "--rating=pg"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("r=pg"),
					})
				);
			});

			it("should handle different image sizes in KB formatting", async () => {
				const mockBuffer = new ArrayBuffer(1048576); // 1 MB
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs(["user@example.com", "large.jpg"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Size: 1024.0 KB"));
			});
		});

		describe("option validation", () => {
			it("should validate size option (max 2048)", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(1000));
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=2048"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("size=2048"),
					})
				);
			});

			it("should reject size over 2048", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(1000));
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=2049"]);

				await main(args, deps);

				// Size > 2048 should be ignored (not set in URL)
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.not.stringContaining("size=2049"),
					})
				);
			});

			it("should reject negative size", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(1000));
				const args = parseArgs(["user@example.com", "avatar.jpg", "--size=-100"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.not.stringContaining("size=-100"),
					})
				);
			});

			it("should validate default image types", async () => {
				const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];
				const mockBuffer = new ArrayBuffer(1000);
				mockFetchWithCache.mockResolvedValue(mockBuffer);

				for (const defaultType of validDefaults) {
					vi.clearAllMocks();
					const args = parseArgs(["user@example.com", "avatar.jpg", `--default=${defaultType}`]);

					await main(args, deps);

					expect(mockFetchWithCache).toHaveBeenCalledWith(
						expect.objectContaining({
							url: expect.stringContaining(`d=${defaultType}`),
						})
					);
				}
			});

			it("should reject invalid default image type", async () => {
				const args = parseArgs(["user@example.com", "avatar.jpg", "--default=invalid"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Invalid default type"));
				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("mp, identicon, monsterid, wavatar, retro, robohash, blank"));
			});

			it("should validate rating levels", async () => {
				const validRatings = ["g", "pg", "r", "x"];
				const mockBuffer = new ArrayBuffer(1000);
				mockFetchWithCache.mockResolvedValue(mockBuffer);

				for (const rating of validRatings) {
					vi.clearAllMocks();
					const args = parseArgs(["user@example.com", "avatar.jpg", `--rating=${rating}`]);

					await main(args, deps);

					expect(mockFetchWithCache).toHaveBeenCalledWith(
						expect.objectContaining({
							url: expect.stringContaining(`r=${rating}`),
						})
					);
				}
			});

			it("should reject invalid rating level", async () => {
				const args = parseArgs(["user@example.com", "avatar.jpg", "--rating=nc17"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Invalid rating level"));
				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("g, pg, r, x"));
			});

			it("should combine multiple options", async () => {
				const mockBuffer = new ArrayBuffer(15000);
				mockFetchWithCache.mockResolvedValue(mockBuffer);
				const args = parseArgs([
					"user@example.com",
					"avatar.jpg",
					"--size=300",
					"--default=robohash",
					"--rating=pg",
				]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("size=300"),
					})
				);
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("d=robohash"),
					})
				);
				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("r=pg"),
					})
				);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(5000));
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(5000));
				const args = parseArgs(["--no-cache", "user@example.com", "avatar.jpg"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx download.ts <email> <output-file>"));
			});

			it("should show usage message when no output file provided", async () => {
				const args = parseArgs(["user@example.com"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join("\n");
				expect(logCalls).toContain("Examples:");
				expect(logCalls).toContain("npx tsx download.ts user@example.com avatar.jpg");
				expect(logCalls).toContain("npx tsx download.ts user@example.com avatar.png --size=400");
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
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Network error");
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Request timeout");
			});

			it("should handle 404 errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Resource not found");
			});

			it("should handle file write errors", async () => {
				vi.mocked(writeFile).mockRejectedValue(new Error("Permission denied"));
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(1000));
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Permission denied");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
			});
		});

		describe("output formatting", () => {
			it("should include blank line before success message", async () => {
				mockFetchWithCache.mockResolvedValue(new ArrayBuffer(5000));
				const args = parseArgs(["user@example.com", "avatar.jpg"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				expect(logCalls[0]).toEqual(["Email: user@example.com"]);
				expect(logCalls[1]).toEqual(["Output: avatar.jpg"]);
				expect(logCalls[2][0]).toEqual(expect.stringContaining("Hash:"));
				expect(logCalls[3]).toEqual([]); // blank line
				expect(logCalls[4]).toEqual(["✓ Downloaded successfully"]);
				expect(logCalls[5]).toEqual(expect.arrayContaining([expect.stringContaining("Size:")]));
				expect(logCalls[6]).toEqual(expect.arrayContaining([expect.stringContaining("File:")]));
				expect(logCalls[7]).toEqual([]); // blank line at end
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Download failed");
			expect(() => handleError(error, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Download failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should include blank line before error message", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "user@example.com", "avatar.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error");
		});

		it("should ignore parameters in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-email@example.com", "any-file.jpg", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// The email and outputFile are not used in the error handling
			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Test error");
		});
	});
});
