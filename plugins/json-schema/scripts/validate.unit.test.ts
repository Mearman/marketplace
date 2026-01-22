/**
 * Tests for json-schema validate.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { main } from "./validate.js";
import { parseArgs } from "./utils.js";
import { createAsyncMock, createMockConsole, createMockProcess } from "./test-helpers.js";

describe("validate.ts", () => {
	let mockConsole: ReturnType<typeof createMockConsole>;
	let mockProcess: ReturnType<typeof createMockProcess>;
	let mockReadFile: ReturnType<typeof createAsyncMock>;
	let deps: any;

	const validSchema = JSON.stringify({
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type": "object",
		"properties": {
			"name": { "type": "string" },
			"age": { "type": "integer", "minimum": 0 },
		},
		"required": ["name"],
	});

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

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Usage:")
			));
		});

		it("should show usage when --schema is missing", async () => {
			const args = parseArgs(["data.json"]);

			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("--schema")
			));
		});
	});

	describe("valid JSON", () => {
		it("should validate JSON that conforms to schema", async () => {
			const validJson = JSON.stringify({ "name": "Alice", "age": 30 });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("\u2713 Valid")
			));
		});

		it("should include schema and file paths in output", async () => {
			const validJson = JSON.stringify({ "name": "Bob" });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Schema:")
			));
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("File:")
			));
		});
	});

	describe("invalid JSON", () => {
		it("should report missing required property", async () => {
			const invalidJson = JSON.stringify({ "age": 25 });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return invalidJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("\u2717 Invalid")
			));
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("name")
			));
		});

		it("should report type mismatch", async () => {
			const invalidJson = JSON.stringify({ "name": 123 });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return invalidJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("must be string")
			));
		});

		it("should report minimum violation", async () => {
			const invalidJson = JSON.stringify({ "name": "Test", "age": -5 });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return invalidJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes(">= 0")
			));
		});
	});

	describe("--all-errors flag", () => {
		it("should report all errors with --all-errors", async () => {
			const invalidJson = JSON.stringify({ "age": -5 }); // Missing name + negative age
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return invalidJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json", "--all-errors"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("2 errors")
			));
		});
	});

	describe("output formats", () => {
		it("should output JSON format with --format=json", async () => {
			const validJson = JSON.stringify({ "name": "Alice" });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json", "--format=json"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			const jsonOutput = logCalls[logCalls.length - 1][0];
			const parsed = JSON.parse(jsonOutput);
			assert.strictEqual(parsed.valid, true);
		});

		it("should include errors in JSON output", async () => {
			const invalidJson = JSON.stringify({ "age": 25 });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return invalidJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json", "--format=json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const logCalls = mockConsole.getLogCalls();
			const jsonOutput = logCalls.find((call: string[]) => {
				try {
					JSON.parse(call[0]);
					return true;
				} catch {
					return false;
				}
			});
			assert.ok(jsonOutput, "Should have JSON output");
			const parsed = JSON.parse(jsonOutput[0]);
			assert.strictEqual(parsed.valid, false);
			assert.ok(parsed.errors.length > 0);
		});
	});

	describe("file errors", () => {
		it("should handle JSON file not found", async () => {
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) {
					throw new Error("ENOENT: no such file or directory");
				}
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle schema file not found", async () => {
			const validJson = JSON.stringify({ "name": "Test" });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				throw new Error("ENOENT: no such file or directory");
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle invalid JSON in data file", async () => {
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return "{ invalid }";
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});

		it("should handle invalid schema", async () => {
			const validJson = JSON.stringify({ "name": "Test" });
			const invalidSchema = JSON.stringify({
				"type": ["not-a-valid-type"],
			});
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				return invalidSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json"]);
			await assert.rejects(() => main(args, deps), { message: "process.exit called" });

			const errorCalls = mockConsole.getErrorCalls();
			assert.ok(errorCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Error")
			));
		});
	});

	describe("verbose output", () => {
		it("should show file and schema info with --verbose", async () => {
			const validJson = JSON.stringify({ "name": "Alice" });
			mockReadFile.mockImplementation((path: string) => {
				if (path.includes("data.json")) return validJson;
				return validSchema;
			});

			const args = parseArgs(["data.json", "--schema=schema.json", "--verbose"]);
			await main(args, deps);

			const logCalls = mockConsole.getLogCalls();
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Validating:")
			));
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Schema:")
			));
			assert.ok(logCalls.some((call: string[]) =>
				typeof call[0] === "string" && call[0].includes("Draft:")
			));
		});
	});
});
