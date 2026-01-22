/**
 * Tests for json-schema check.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main } from "./check.js";
import { parseArgs } from "./utils.js";
import { createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("check.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockReadFile: ReturnType<typeof createAsyncMock>;
	let mockFetchSchema: ReturnType<typeof createAsyncMock>;
	let deps: any;

	const localSchema = JSON.parse(JSON.stringify({
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type": "object",
		"properties": {
			"name": { "type": "string" },
			"age": { "type": "integer", "minimum": 0 },
		},
		"required": ["name"],
	}));

	beforeEach(() => {
		mock.reset();
		mockConsole = createMockConsole();
		mockProcess = createMockProcess();
		mockReadFile = createAsyncMock();
		mockFetchSchema = createAsyncMock();

		deps = {
			console: mockConsole,
			process: mockProcess,
			readFile: mockReadFile,
			fetchSchema: mockFetchSchema,
		};
	});

	describe("usage", () => {
		it("should show usage when no arguments provided", async () => {
			const args = parseArgs([]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Usage:")
			));
		});
	});

	describe("missing $schema", () => {
		it("should error when JSON has no $schema property", async () => {
			const jsonWithoutSchema = JSON.stringify({ "name": "Alice" });
			mockReadFile.mockResolvedValue(jsonWithoutSchema);

			const args = parseArgs(["data.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("No $schema property")
			));
		});

		it("should suggest using schema-validate skill", async () => {
			const jsonWithoutSchema = JSON.stringify({ "name": "Alice" });
			mockReadFile.mockResolvedValue(jsonWithoutSchema);

			const args = parseArgs(["data.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("schema-validate")
			));
		});
	});

	describe("local schema reference", () => {
		it("should validate against local schema file", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./schema.json",
				"name": "Alice",
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				return JSON.stringify(localSchema);
			});

			const args = parseArgs(["data.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("\u2713 Valid")
			));
		});

		it("should report validation errors from local schema", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./schema.json",
				"age": -5, // Missing name + negative age
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				return JSON.stringify(localSchema);
			});

			const args = parseArgs(["data.json", "--all-errors"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("\u2717 Invalid")
			));
		});
	});

	describe("remote schema reference", () => {
		it("should fetch and validate against remote schema", async () => {
			const jsonWithRemoteSchema = JSON.stringify({
				"$schema": "https://example.com/schema.json",
				"name": "Bob",
			});
			mockReadFile.mockResolvedValue(jsonWithRemoteSchema);
			mockFetchSchema.mockResolvedValue(localSchema);

			const args = parseArgs(["data.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("\u2713 Valid")
			));
		});

		it("should handle remote schema fetch errors", async () => {
			const jsonWithRemoteSchema = JSON.stringify({
				"$schema": "https://example.com/schema.json",
				"name": "Dave",
			});
			mockReadFile.mockResolvedValue(jsonWithRemoteSchema);
			mockFetchSchema.mockRejectedValue(new Error("Network error"));

			const args = parseArgs(["data.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});
	});

	describe("output formats", () => {
		it("should output JSON format with --format=json", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./schema.json",
				"name": "Eve",
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				return JSON.stringify(localSchema);
			});

			const args = parseArgs(["data.json", "--format=json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			const jsonOutput = logCalls[logCalls.length - 1][0];
			const parsed = JSON.parse(jsonOutput);
			assert.strictEqual(parsed.valid, true);
		});
	});

	describe("verbose output", () => {
		it("should show schema URI with --verbose", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./schema.json",
				"name": "Frank",
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				return JSON.stringify(localSchema);
			});

			const args = parseArgs(["data.json", "--verbose"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("$schema:")
			));
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Draft:")
			));
		});
	});

	describe("file errors", () => {
		it("should handle JSON file not found", async () => {
			mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));

			const args = parseArgs(["nonexistent.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle invalid JSON", async () => {
			mockReadFile.mockResolvedValue("{ invalid }");

			const args = parseArgs(["data.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle local schema file not found", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./missing-schema.json",
				"name": "Test",
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				throw new Error("ENOENT: no such file or directory");
			});

			const args = parseArgs(["data.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});
	});

	describe("--all-errors flag", () => {
		it("should report multiple errors with --all-errors", async () => {
			const jsonWithLocalSchema = JSON.stringify({
				"$schema": "./schema.json",
				"name": 123, // Wrong type
				"age": -5, // Below minimum
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return jsonWithLocalSchema;
				return JSON.stringify(localSchema);
			});

			const args = parseArgs(["data.json", "--all-errors"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("2 errors")
			));
		});
	});
});
