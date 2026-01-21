/**
 * Tests for wayback cache.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./cache.js";

describe("cache.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockReaddir: any;
	let mockStat: any;
	let mockUnlink: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
		};

		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		// Create mock functions
		mockReaddir = mock.fn();
		mockStat = mock.fn();
		mockUnlink = mock.fn();

		// Mock fs/promises methods
		deps = {
			console: mockConsole,
			process: mockProcess,
			fs: {
				readdir: mockReaddir,
				stat: mockStat,
				unlink: mockUnlink,
			},
		};
	});

	describe("main", () => {
		it("should execute clear command", async () => {
			mockReaddir = mock.fn(async () => []);
			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("already empty")));
		});

		it("should execute status command", async () => {
			mockReaddir = mock.fn(async () => []);
			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Cache directory:")));
		});

		it("should show usage message when no command", async () => {
			const args = { flags: new Set<string>(), positional: [] };

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Usage:")));
		});

		it("should reject unknown command", async () => {
			const args = { flags: new Set<string>(), positional: ["unknown"] };

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "Unknown command: unknown"));
		});

		it("should handle --verbose flag", async () => {
			mockReaddir = mock.fn(async () => []);
			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			// Should not have verbose output for empty cache
			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Cached files: 0")));
		});

		it("should clear cache files", async () => {
			mockReaddir = mock.fn(async () => ["file1.json", "file2.json"]);
			mockStat = mock.fn(async () => ({ size: 1024 }));
			mockUnlink = mock.fn(async () => undefined);

			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Clearing 2 cache file(s)")));
		});

		it("should show status with files", async () => {
			mockReaddir = mock.fn(async () => ["file1.json", "file2.json"]);

			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] === "Cached files: 2"));
		});

		it("should show verbose status with files", async () => {
			const mockDate = new Date("2024-01-15T10:30:00Z");
			mockReaddir = mock.fn(async () => ["file1.json", "file2.json"]);
			mockStat = mock.fn(async () => ({
				size: 2048,
				mtime: mockDate,
			}));

			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Total size:")));
			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("Cache entries")));
		});

		it("should show verbose status with age formatting", async () => {
			const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
			mockReaddir = mock.fn(async () => ["recent.json"]);
			mockStat = mock.fn(async () => ({
				size: 1024,
				mtime: recentDate,
			}));

			const args = { flags: new Set<string>(["--verbose"]), positional: ["status"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("30m ago")));
		});

		it("should handle ENOENT error in status", async () => {
			const error: NodeJS.ErrnoException = new Error("Directory not found");
			error.code = "ENOENT";
			mockReaddir = mock.fn(async () => { throw error; });

			const args = { flags: new Set<string>(), positional: ["status"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("does not exist yet")));
		});

		it("should show verbose clear output", async () => {
			mockReaddir = mock.fn(async () => ["file1.json", "file2.json"]);
			mockStat = mock.fn(async () => ({ size: 1024 }));
			mockUnlink = mock.fn(async () => undefined);

			const args = { flags: new Set<string>(["--verbose"]), positional: ["clear"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("KB)")));
		});

		it("should handle ENOENT error in clear", async () => {
			const error: NodeJS.ErrnoException = new Error("Directory not found");
			error.code = "ENOENT";
			mockReaddir = mock.fn(async () => { throw error; });

			const args = { flags: new Set<string>(), positional: ["clear"] };

			await main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => typeof call[0] === "string" && call[0].includes("not found")));
		});
	});

	describe("handleError", () => {
		it("should log error and exit", () => {
			const error = new Error("Cache error");
			assert.throws(() => handleError(error, "clear", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any[]) => call[0] === "\nError:" && call[1] === "Cache error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0][0], 1);
		});
	});
});
