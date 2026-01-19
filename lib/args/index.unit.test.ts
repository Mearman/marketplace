/**
 * Tests for lib/args utilities
 */

import { describe, it, expect } from "vitest";
import { parseArgs } from "./index";

describe("parseArgs", () => {
	describe("flags", () => {
		it("should parse single flag", () => {
			const result = parseArgs(["--help"]);
			expect(result.flags.has("help")).toBe(true);
			expect(result.flags.size).toBe(1);
		});

		it("should parse multiple flags", () => {
			const result = parseArgs(["--help", "--verbose", "--force"]);
			expect(result.flags.has("help")).toBe(true);
			expect(result.flags.has("verbose")).toBe(true);
			expect(result.flags.has("force")).toBe(true);
			expect(result.flags.size).toBe(3);
		});

		it("should parse no-cache style flags", () => {
			const result = parseArgs(["--no-cache", "--dry-run"]);
			expect(result.flags.has("no-cache")).toBe(true);
			expect(result.flags.has("dry-run")).toBe(true);
		});

		it("should handle empty flags", () => {
			const result = parseArgs([]);
			expect(result.flags.size).toBe(0);
		});
	});

	describe("options", () => {
		it("should parse single option", () => {
			const result = parseArgs(["--format=json"]);
			expect(result.options.get("format")).toBe("json");
			expect(result.options.size).toBe(1);
		});

		it("should parse multiple options", () => {
			const result = parseArgs(["--format=json", "--output=result.txt", "--count=5"]);
			expect(result.options.get("format")).toBe("json");
			expect(result.options.get("output")).toBe("result.txt");
			expect(result.options.get("count")).toBe("5");
			expect(result.options.size).toBe(3);
		});

		it("should parse options with special characters in values", () => {
			const result = parseArgs([
				"--url=https://example.com/api?query=test",
				"--pattern=[a-z]+",
			]);
			expect(result.options.get("url")).toBe("https://example.com/api?query=test");
			expect(result.options.get("pattern")).toBe("[a-z]+");
		});

		it("should handle option with empty value", () => {
			const result = parseArgs(["--key="]);
			expect(result.options.get("key")).toBe("");
		});

		it("should parse option with equals sign in value", () => {
			const result = parseArgs(["--formula=a=b+c"]);
			expect(result.options.get("formula")).toBe("a=b+c");
		});
	});

	describe("positional arguments", () => {
		it("should parse single positional argument", () => {
			const result = parseArgs(["file.txt"]);
			expect(result.positional).toEqual(["file.txt"]);
		});

		it("should parse multiple positional arguments", () => {
			const result = parseArgs(["file1.txt", "file2.txt", "file3.txt"]);
			expect(result.positional).toEqual(["file1.txt", "file2.txt", "file3.txt"]);
		});

		it("should parse positional arguments with flags", () => {
			const result = parseArgs(["--verbose", "file.txt", "--help"]);
			expect(result.flags.has("verbose")).toBe(true);
			expect(result.flags.has("help")).toBe(true);
			expect(result.positional).toEqual(["file.txt"]);
		});

		it("should parse positional arguments with options", () => {
			const result = parseArgs(["--format=json", "input.txt", "output.txt"]);
			expect(result.options.get("format")).toBe("json");
			expect(result.positional).toEqual(["input.txt", "output.txt"]);
		});

		it("should parse mixed flags, options, and positional args", () => {
			const result = parseArgs([
				"--verbose",
				"input.txt",
				"--format=json",
				"output.txt",
				"--force",
			]);
			expect(result.flags.has("verbose")).toBe(true);
			expect(result.flags.has("force")).toBe(true);
			expect(result.options.get("format")).toBe("json");
			expect(result.positional).toEqual(["input.txt", "output.txt"]);
		});

		it("should handle positional args that start with dash but not double dash", () => {
			const result = parseArgs(["-single", "file.txt"]);
			expect(result.positional).toEqual(["-single", "file.txt"]);
		});
	});

	describe("edge cases", () => {
		it("should handle empty array", () => {
			const result = parseArgs([]);
			expect(result.flags.size).toBe(0);
			expect(result.options.size).toBe(0);
			expect(result.positional).toEqual([]);
		});

		it("should handle -- as flag name (just double dash)", () => {
			const result = parseArgs(["--"]);
			expect(result.flags.has("")).toBe(true);
		});

		it("should override duplicate flags", () => {
			const result = parseArgs(["--format=json", "--format=xml"]);
			expect(result.options.get("format")).toBe("xml");
			expect(result.options.size).toBe(1);
		});

		it("should preserve order of positional arguments", () => {
			const result = parseArgs(["a", "b", "c"]);
			expect(result.positional).toEqual(["a", "b", "c"]);
		});

		it("should handle unicode in arguments", () => {
			const result = parseArgs(["--name=José", "文件.txt"]);
			expect(result.options.get("name")).toBe("José");
			expect(result.positional).toEqual(["文件.txt"]);
		});
	});
});
