/**
 * Tests for json-schema meta-validate.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main } from "./meta-validate.js";
import { parseArgs } from "./utils.js";
import { createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("meta-validate.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockReadFile: ReturnType<typeof createAsyncMock>;
	let deps: any;

	beforeEach(() => {
		mock.reset();
		mockConsole = createMockConsole();
		mockProcess = createMockProcess();
		mockReadFile = createAsyncMock();

		deps = {
			console: mockConsole,
			process: mockProcess,
			readFile: mockReadFile,
		};
	});

	describe("usage", () => {
		it("should show usage when no arguments provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCallsTyped<[string, ...unknown[]]>();
			assert.ok(errorCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("Usage:")
			));
		});

		it("should show --draft option in usage", async () => {
			const args = parseArgs([]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCallsTyped<[string, ...unknown[]]>();
			assert.ok(errorCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("--draft")
			));
		});
	});

	describe("valid schema", () => {
		it("should validate a simple valid schema", async () => {
			const validSchema = JSON.stringify({
				"$schema": "https://json-schema.org/draft/2020-12/schema",
				"type": "object",
				"properties": {
					"name": { "type": "string" },
				},
			});
			mockReadFile.mockResolvedValue(validSchema);

			const args = parseArgs(["schema.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("\u2713 Valid")
			));
		});

		it("should detect draft version from schema", async () => {
			const validSchema = JSON.stringify({
				"$schema": "http://json-schema.org/draft-07/schema#",
				"type": "string",
			});
			mockReadFile.mockResolvedValue(validSchema);

			const args = parseArgs(["schema.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("draft-07")
			));
		});

		it("should use specified draft version with --draft option", async () => {
			const validSchema = JSON.stringify({
				"type": "object",
			});
			mockReadFile.mockResolvedValue(validSchema);

			const args = parseArgs(["schema.json", "--draft=draft-04"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("draft-04")
			));
		});
	});

	describe("invalid schema", () => {
		it("should report invalid type value", async () => {
			const invalidSchema = JSON.stringify({
				"$schema": "https://json-schema.org/draft/2020-12/schema",
				"type": 123, // invalid - should be string or array
			});
			mockReadFile.mockResolvedValue(invalidSchema);

			const args = parseArgs(["schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("\u2717 Invalid")
			));
		});

		it("should exit with code 1 for invalid schema", async () => {
			const invalidSchema = JSON.stringify({
				"type": ["invalid-type"],
			});
			mockReadFile.mockResolvedValue(invalidSchema);

			const args = parseArgs(["schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			// Process exit was called
			assert.ok(mockProcess.exit.mock.calls.length > 0);
		});
	});

	describe("file errors", () => {
		it("should handle file not found", async () => {
			mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));

			const args = parseArgs(["nonexistent.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCallsTyped<[string, ...unknown[]]>();
			assert.ok(errorCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle invalid JSON", async () => {
			mockReadFile.mockResolvedValue("{ invalid json }");

			const args = parseArgs(["schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCallsTyped<[string, ...unknown[]]>();
			assert.ok(errorCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});
	});

	describe("output formats", () => {
		it("should output JSON format with --format=json", async () => {
			const validSchema = JSON.stringify({
				"type": "object",
			});
			mockReadFile.mockResolvedValue(validSchema);

			const args = parseArgs(["schema.json", "--format=json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			const jsonOutput = logCalls[logCalls.length - 1][0];
			const parsed = JSON.parse(jsonOutput);
			assert.strictEqual(parsed.valid, true);
		});

		it("should include verbose info with --verbose flag", async () => {
			const validSchema = JSON.stringify({
				"$schema": "https://json-schema.org/draft/2020-12/schema",
				"type": "object",
			});
			mockReadFile.mockResolvedValue(validSchema);

			const args = parseArgs(["schema.json", "--verbose"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("Validating:")
			));
			assert.ok(logCalls.some((call) =>
				typeof call[0] === "string" && call[0].includes("Draft:")
			));
		});
	});

	describe("draft versions", () => {
		const drafts = ["draft-04", "draft-06", "draft-07", "2019-09", "2020-12"];

		for (const draft of drafts) {
			it(`should support ${draft}`, async () => {
				const validSchema = JSON.stringify({
					"type": "string",
				});
				mockReadFile.mockResolvedValue(validSchema);

				const args = parseArgs(["schema.json", `--draft=${draft}`]);
				await main(args, deps);

				const logCalls = mockConsole.getLogCallsTyped<[string, ...unknown[]]>();
				assert.ok(logCalls.some((call) =>
					typeof call[0] === "string" && call[0].includes("\u2713 Valid")
				));
			});
		}
	});
});
