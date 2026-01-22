/**
 * Tests for json-schema plugin utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
	detectDraftVersion,
	META_SCHEMAS,
	formatValidationResult,
	formatJsonResult,
	handleError,
	type DraftVersion,
	type ValidationResult,
} from "./utils.js";

describe("detectDraftVersion", () => {
	it("should detect draft-04 from URI", () => {
		const uri = "http://json-schema.org/draft-04/schema#";
		assert.strictEqual(detectDraftVersion(uri), "draft-04");
	});

	it("should detect draft-06 from URI", () => {
		const uri = "http://json-schema.org/draft-06/schema#";
		assert.strictEqual(detectDraftVersion(uri), "draft-06");
	});

	it("should detect draft-07 from URI", () => {
		const uri = "http://json-schema.org/draft-07/schema#";
		assert.strictEqual(detectDraftVersion(uri), "draft-07");
	});

	it("should detect 2019-09 from URI", () => {
		const uri = "https://json-schema.org/draft/2019-09/schema";
		assert.strictEqual(detectDraftVersion(uri), "2019-09");
	});

	it("should detect 2020-12 from URI", () => {
		const uri = "https://json-schema.org/draft/2020-12/schema";
		assert.strictEqual(detectDraftVersion(uri), "2020-12");
	});

	it("should default to 2020-12 for undefined URI", () => {
		assert.strictEqual(detectDraftVersion(undefined), "2020-12");
	});

	it("should default to 2020-12 for unknown URI", () => {
		assert.strictEqual(detectDraftVersion("https://example.com/schema"), "2020-12");
	});

	it("should handle partial draft patterns", () => {
		assert.strictEqual(detectDraftVersion("some-draft-07-schema"), "draft-07");
		assert.strictEqual(detectDraftVersion("includes-2019-09-in-path"), "2019-09");
	});
});

describe("META_SCHEMAS", () => {
	it("should have all draft versions", () => {
		const drafts: DraftVersion[] = ["draft-04", "draft-06", "draft-07", "2019-09", "2020-12"];
		drafts.forEach((draft) => {
			assert.ok(META_SCHEMAS[draft], `Missing META_SCHEMA for ${draft}`);
		});
	});

	it("should have correct draft-04 URI", () => {
		assert.strictEqual(META_SCHEMAS["draft-04"], "http://json-schema.org/draft-04/schema#");
	});

	it("should have correct draft-07 URI", () => {
		assert.strictEqual(META_SCHEMAS["draft-07"], "http://json-schema.org/draft-07/schema#");
	});

	it("should have correct 2020-12 URI", () => {
		assert.strictEqual(META_SCHEMAS["2020-12"], "https://json-schema.org/draft/2020-12/schema");
	});
});

describe("formatValidationResult", () => {
	describe("valid results", () => {
		it("should format valid result without draft", () => {
			const result: ValidationResult = {
				valid: true,
				errors: [],
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("\u2713 Valid"));
		});

		it("should format valid result with draft", () => {
			const result: ValidationResult = {
				valid: true,
				errors: [],
				draft: "2020-12",
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("\u2713 Valid (2020-12)"));
		});

		it("should include schema path when provided", () => {
			const result: ValidationResult = {
				valid: true,
				errors: [],
				schema: "test-schema.json",
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("Schema: test-schema.json"));
		});

		it("should include file path when provided", () => {
			const result: ValidationResult = {
				valid: true,
				errors: [],
				file: "test-data.json",
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("File: test-data.json"));
		});
	});

	describe("invalid results", () => {
		it("should format invalid result with single error", () => {
			const result: ValidationResult = {
				valid: false,
				errors: [
					{ path: "/name", message: "must be string", keyword: "type" },
				],
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("\u2717 Invalid (1 error)"));
			assert.ok(output.includes("/name: must be string"));
		});

		it("should format invalid result with multiple errors", () => {
			const result: ValidationResult = {
				valid: false,
				errors: [
					{ path: "/name", message: "must be string", keyword: "type" },
					{ path: "/age", message: "must be >= 0", keyword: "minimum" },
				],
			};
			const output = formatValidationResult(result);
			assert.ok(output.includes("\u2717 Invalid (2 errors)"));
			assert.ok(output.includes("1. /name: must be string"));
			assert.ok(output.includes("2. /age: must be >= 0"));
		});

		it("should include params in verbose mode", () => {
			const result: ValidationResult = {
				valid: false,
				errors: [
					{ path: "/age", message: "must be >= 0", keyword: "minimum", params: { limit: 0 } },
				],
			};
			const output = formatValidationResult(result, true);
			assert.ok(output.includes("{\"limit\":0}"));
		});

		it("should not include params in non-verbose mode", () => {
			const result: ValidationResult = {
				valid: false,
				errors: [
					{ path: "/age", message: "must be >= 0", keyword: "minimum", params: { limit: 0 } },
				],
			};
			const output = formatValidationResult(result, false);
			assert.ok(!output.includes("{\"limit\":0}"));
		});
	});
});

describe("formatJsonResult", () => {
	it("should format result as JSON", () => {
		const result: ValidationResult = {
			valid: true,
			errors: [],
			schema: "schema.json",
			file: "data.json",
		};
		const output = formatJsonResult(result);
		const parsed = JSON.parse(output);
		assert.strictEqual(parsed.valid, true);
		assert.deepStrictEqual(parsed.errors, []);
		assert.strictEqual(parsed.schema, "schema.json");
		assert.strictEqual(parsed.file, "data.json");
	});

	it("should format errors in JSON output", () => {
		const result: ValidationResult = {
			valid: false,
			errors: [
				{ path: "/name", message: "must be string", keyword: "type" },
			],
		};
		const output = formatJsonResult(result);
		const parsed = JSON.parse(output);
		assert.strictEqual(parsed.valid, false);
		assert.strictEqual(parsed.errors.length, 1);
		assert.strictEqual(parsed.errors[0].path, "/name");
	});

	it("should pretty-print JSON", () => {
		const result: ValidationResult = {
			valid: true,
			errors: [],
		};
		const output = formatJsonResult(result);
		assert.ok(output.includes("\n")); // Pretty-printed includes newlines
	});
});

describe("handleError", () => {
	it("should log Error instance message and exit", () => {
		const mockConsole = {
			log: () => {},
			error: (msg: string) => {
				assert.ok(msg.includes("Test error"));
			},
		} as Console;
		const mockProcess = {
			exit: (code: number) => {
				assert.strictEqual(code, 1);
				throw new Error("process.exit called");
			},
		} as unknown as NodeJS.Process;

		const error = new Error("Test error");
		assert.throws(
			() => handleError(error, "", { console: mockConsole, process: mockProcess }),
			{ message: "process.exit called" }
		);
	});

	it("should include context in error message", () => {
		let loggedMessage = "";
		const mockConsole = {
			log: () => {},
			error: (msg: string) => {
				loggedMessage = msg;
			},
		} as Console;
		const mockProcess = {
			exit: () => {
				throw new Error("process.exit called");
			},
		} as unknown as NodeJS.Process;

		const error = new Error("File not found");
		assert.throws(
			() => handleError(error, "reading config.json", { console: mockConsole, process: mockProcess }),
			{ message: "process.exit called" }
		);
		assert.ok(loggedMessage.includes("reading config.json"));
	});

	it("should handle non-Error values", () => {
		let loggedMessage = "";
		const mockConsole = {
			log: () => {},
			error: (msg: string) => {
				loggedMessage = msg;
			},
		} as Console;
		const mockProcess = {
			exit: () => {
				throw new Error("process.exit called");
			},
		} as unknown as NodeJS.Process;

		assert.throws(
			() => handleError("string error", "", { console: mockConsole, process: mockProcess }),
			{ message: "process.exit called" }
		);
		assert.ok(loggedMessage.includes("string error"));
	});
});
