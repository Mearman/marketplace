/**
 * Tests for lib/args utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { parseArgs } from "./index.js";

describe("parseArgs", () => {
	describe("flags", () => {
		it("should parse single flag", () => {
			const result = parseArgs(["--help"]);
			assert.strictEqual(result.flags.has("help"), true);
			assert.strictEqual(result.flags.size, 1);
		});

		it("should parse multiple flags", () => {
			const result = parseArgs(["--help", "--verbose", "--force"]);
			assert.strictEqual(result.flags.has("help"), true);
			assert.strictEqual(result.flags.has("verbose"), true);
			assert.strictEqual(result.flags.has("force"), true);
			assert.strictEqual(result.flags.size, 3);
		});

		it("should parse no-cache style flags", () => {
			const result = parseArgs(["--no-cache", "--dry-run"]);
			assert.strictEqual(result.flags.has("no-cache"), true);
			assert.strictEqual(result.flags.has("dry-run"), true);
		});

		it("should handle empty flags", () => {
			const result = parseArgs([]);
			assert.strictEqual(result.flags.size, 0);
		});
	});

	describe("options", () => {
		it("should parse single option", () => {
			const result = parseArgs(["--format=json"]);
			assert.strictEqual(result.options.get("format"), "json");
			assert.strictEqual(result.options.size, 1);
		});

		it("should parse multiple options", () => {
			const result = parseArgs(["--format=json", "--output=result.txt", "--count=5"]);
			assert.strictEqual(result.options.get("format"), "json");
			assert.strictEqual(result.options.get("output"), "result.txt");
			assert.strictEqual(result.options.get("count"), "5");
			assert.strictEqual(result.options.size, 3);
		});

		it("should parse options with special characters in values", () => {
			const result = parseArgs([
				"--url=https://example.com/api?query=test",
				"--pattern=[a-z]+",
			]);
			assert.strictEqual(result.options.get("url"), "https://example.com/api?query=test");
			assert.strictEqual(result.options.get("pattern"), "[a-z]+");
		});

		it("should handle option with empty value", () => {
			const result = parseArgs(["--key="]);
			assert.strictEqual(result.options.get("key"), "");
		});

		it("should parse option with equals sign in value", () => {
			const result = parseArgs(["--formula=a=b+c"]);
			assert.strictEqual(result.options.get("formula"), "a=b+c");
		});
	});

	describe("positional arguments", () => {
		it("should parse single positional argument", () => {
			const result = parseArgs(["file.txt"]);
			assert.deepStrictEqual(result.positional, ["file.txt"]);
		});

		it("should parse multiple positional arguments", () => {
			const result = parseArgs(["file1.txt", "file2.txt", "file3.txt"]);
			assert.deepStrictEqual(result.positional, ["file1.txt", "file2.txt", "file3.txt"]);
		});

		it("should parse positional arguments with flags", () => {
			const result = parseArgs(["--verbose", "file.txt", "--help"]);
			assert.strictEqual(result.flags.has("verbose"), true);
			assert.strictEqual(result.flags.has("help"), true);
			assert.deepStrictEqual(result.positional, ["file.txt"]);
		});

		it("should parse positional arguments with options", () => {
			const result = parseArgs(["--format=json", "input.txt", "output.txt"]);
			assert.strictEqual(result.options.get("format"), "json");
			assert.deepStrictEqual(result.positional, ["input.txt", "output.txt"]);
		});

		it("should parse mixed flags, options, and positional args", () => {
			const result = parseArgs([
				"--verbose",
				"input.txt",
				"--format=json",
				"output.txt",
				"--force",
			]);
			assert.strictEqual(result.flags.has("verbose"), true);
			assert.strictEqual(result.flags.has("force"), true);
			assert.strictEqual(result.options.get("format"), "json");
			assert.deepStrictEqual(result.positional, ["input.txt", "output.txt"]);
		});

		it("should handle positional args that start with dash but not double dash", () => {
			const result = parseArgs(["-single", "file.txt"]);
			assert.deepStrictEqual(result.positional, ["-single", "file.txt"]);
		});
	});

	describe("edge cases", () => {
		it("should handle empty array", () => {
			const result = parseArgs([]);
			assert.strictEqual(result.flags.size, 0);
			assert.strictEqual(result.options.size, 0);
			assert.deepStrictEqual(result.positional, []);
		});

		it("should handle -- as flag name (just double dash)", () => {
			const result = parseArgs(["--"]);
			assert.strictEqual(result.flags.has(""), true);
		});

		it("should override duplicate flags", () => {
			const result = parseArgs(["--format=json", "--format=xml"]);
			assert.strictEqual(result.options.get("format"), "xml");
			assert.strictEqual(result.options.size, 1);
		});

		it("should preserve order of positional arguments", () => {
			const result = parseArgs(["a", "b", "c"]);
			assert.deepStrictEqual(result.positional, ["a", "b", "c"]);
		});

		it("should handle unicode in arguments", () => {
			const result = parseArgs(["--name=José", "文件.txt"]);
			assert.strictEqual(result.options.get("name"), "José");
			assert.deepStrictEqual(result.positional, ["文件.txt"]);
		});
	});
});
