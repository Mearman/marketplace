/**
 * Tests for gravatar url.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./url";
import { parseArgs } from "./utils";

describe("url.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
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

		deps = {
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful URL generation", () => {
			it("should generate URL with default size", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Email: user@example.com");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Hash:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL: https://www.gravatar.com/avatar/"));
			});

			it("should generate URL with custom size", async () => {
				const args = parseArgs(["user@example.com", "--size=200"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL: https://www.gravatar.com/avatar/"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("size=200px"));
			});

			it("should generate URL with default image type", async () => {
				const args = parseArgs(["user@example.com", "--default=identicon"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL: https://www.gravatar.com/avatar/"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("default=identicon"));
			});

			it("should generate URL with rating level", async () => {
				const args = parseArgs(["user@example.com", "--rating=pg"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("URL: https://www.gravatar.com/avatar/"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("rating=pg"));
			});

			it("should display hash", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Hash: b58996c504c5638798eb6b511e6f49af"));
			});
		});

		describe("option validation", () => {
			it("should validate size option (max 2048)", async () => {
				const args = parseArgs(["user@example.com", "--size=2048"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("size=2048px"));
			});

			it("should reject size over 2048", async () => {
				const args = parseArgs(["user@example.com", "--size=2049"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).not.toContain("size=2049");
			});

			it("should reject negative size", async () => {
				const args = parseArgs(["user@example.com", "--size=-100"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).not.toContain("size=-100");
			});

			it("should validate default image types", async () => {
				const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];

				for (const defaultType of validDefaults) {
					vi.clearAllMocks();
					const args = parseArgs([`user@example.com`, `--default=${defaultType}`]);

					await main(args, deps);

					const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
					expect(logCalls).toContain(`default=${defaultType}`);
				}
			});

			it("should reject invalid default image type", async () => {
				const args = parseArgs(["user@example.com", "--default=invalid"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Invalid default type"));
				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("mp, identicon, monsterid, wavatar, retro, robohash, blank"));
			});

			it("should validate rating levels", async () => {
				const validRatings = ["g", "pg", "r", "x"];

				for (const rating of validRatings) {
					vi.clearAllMocks();
					const args = parseArgs([`user@example.com`, `--rating=${rating}`]);

					await main(args, deps);

					const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
					expect(logCalls).toContain(`rating=${rating}`);
				}
			});

			it("should reject invalid rating level", async () => {
				const args = parseArgs(["user@example.com", "--rating=nc17"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Invalid rating level"));
				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("g, pg, r, x"));
			});

			it("should combine multiple options", async () => {
				const args = parseArgs([
					"user@example.com",
					"--size=300",
					"--default=robohash",
					"--rating=pg",
				]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).toContain("size=300px");
				expect(logCalls).toContain("default=robohash");
				expect(logCalls).toContain("rating=pg");
			});

			it("should handle force-default flag", async () => {
				const args = parseArgs(["user@example.com", "--force-default"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).toContain("force-default");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx url.ts <email>"));
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join("\n");
				expect(logCalls).toContain("Examples:");
				expect(logCalls).toContain("npx tsx url.ts user@example.com");
				expect(logCalls).toContain("npx tsx url.ts user@example.com --size=200");
			});

			it("should include all options in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join("\n");
				expect(logCalls).toContain("--size=N");
				expect(logCalls).toContain("--default=TYPE");
				expect(logCalls).toContain("--rating=LEVEL");
				expect(logCalls).toContain("--force-default");
			});
		});

		describe("output formatting", () => {
			it("should display options when provided", async () => {
				const args = parseArgs([
					"user@example.com",
					"--size=400",
					"--default=identicon",
					"--rating=r",
					"--force-default",
				]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).toContain("Options:");
				expect(logCalls).toContain("size=400px");
				expect(logCalls).toContain("default=identicon");
				expect(logCalls).toContain("rating=r");
				expect(logCalls).toContain("force-default");
			});

			it("should display default size when no options provided", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]).join(" ");
				expect(logCalls).toContain("Options:");
				expect(logCalls).toContain("size=80px");
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("URL generation failed");
			expect(() => handleError(error, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "URL generation failed");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "user@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore email parameter in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			expect(() => handleError(error, "any-email@example.com", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// The email is not used in the error handling, just part of the interface
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error");
		});
	});
});
