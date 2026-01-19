/**
 * Tests for wayback cache.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs/promises";
import { main, handleError } from "./cache";

// Mock fs
vi.mock("fs/promises", () => ({
	readdir: vi.fn(),
	stat: vi.fn(),
	unlink: vi.fn(),
}));

describe("cache.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fs.readdir).mockReset();
		vi.mocked(fs.stat).mockReset();
		vi.mocked(fs.unlink).mockReset();

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
		it("should execute clear command", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([]);
			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("already empty"));
		});

		it("should execute status command", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([]);
			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Cache directory:"));
		});

		it("should show usage message when no command", async () => {
			const args = { flags: new Set<string>(), positional: [] };

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
		});

		it("should reject unknown command", async () => {
			const args = { flags: new Set<string>(), positional: ["unknown"] };

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Unknown command: unknown");
		});

		it("should handle --verbose flag", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([]);
			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			// Should not have verbose output for empty cache
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Cached files: 0"));
		});

		it("should clear cache files", async () => {
			vi.mocked(fs.readdir).mockResolvedValue(["file1.json", "file2.json"] as any);
			vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
			vi.mocked(fs.unlink).mockResolvedValue(undefined);

			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Clearing 2 cache file(s)"));
		});

		it("should show status with files", async () => {
			vi.mocked(fs.readdir).mockResolvedValue(["file1.json", "file2.json"] as any);

			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Cached files: 2");
		});

		it("should show verbose status with files", async () => {
			const mockDate = new Date("2024-01-15T10:30:00Z");
			vi.mocked(fs.readdir).mockResolvedValue(["file1.json", "file2.json"] as any);
			vi.mocked(fs.stat).mockResolvedValue({
				size: 2048,
				mtime: mockDate,
			} as any);

			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Total size:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Cache entries"));
		});

		it("should show verbose status with age formatting", async () => {
			const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
			vi.mocked(fs.readdir).mockResolvedValue(["recent.json"] as any);
			vi.mocked(fs.stat).mockResolvedValue({
				size: 1024,
				mtime: recentDate,
			} as any);

			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("30m ago"));
		});

		it("should handle ENOENT error in status", async () => {
			const error: NodeJS.ErrnoException = new Error("Directory not found");
			error.code = "ENOENT";
			vi.mocked(fs.readdir).mockRejectedValue(error);

			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("does not exist yet"));
		});

		it("should show verbose clear output", async () => {
			vi.mocked(fs.readdir).mockResolvedValue(["file1.json", "file2.json"] as any);
			vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
			vi.mocked(fs.unlink).mockResolvedValue(undefined);

			const args = { flags: new Set<string>(["--verbose"]), positional: ["clear"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("KB)"));
		});

		it("should handle ENOENT error in clear", async () => {
			const error: NodeJS.ErrnoException = new Error("Directory not found");
			error.code = "ENOENT";
			vi.mocked(fs.readdir).mockRejectedValue(error);

			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("not found"));
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Cache error");
			expect(() => handleError(error, "clear", deps))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("\nError:", "Cache error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
