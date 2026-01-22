/**
 * Tests for schemas/associations.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	BUILT_IN_ASSOCIATIONS,
	findSchemaForFile,
	toLSPAssociations,
} from "./associations.js";

describe("associations.ts", () => {
	describe("BUILT_IN_ASSOCIATIONS", () => {
		it("should have associations for common config files", () => {
			const patterns = BUILT_IN_ASSOCIATIONS.map((a) => a.pattern);

			// Check for key config files
			assert.ok(patterns.includes("package.json"));
			assert.ok(patterns.includes("tsconfig.json"));
			assert.ok(patterns.includes(".eslintrc.json"));
			assert.ok(patterns.includes(".prettierrc.json"));
			assert.ok(patterns.includes("babel.config.json"));
			assert.ok(patterns.includes("jest.config.js"));
			assert.ok(patterns.includes(".vscode/*.json"));
		});

		it("should have valid URIs for all associations", () => {
			for (const assoc of BUILT_IN_ASSOCIATIONS) {
				assert.match(assoc.uri, /^https?:\/\//);
			}
		});

		it("should have at least 30 associations", () => {
			assert.ok(BUILT_IN_ASSOCIATIONS.length >= 30);
		});
	});

	describe("findSchemaForFile", () => {
		it("should find schema for package.json", () => {
			const result = findSchemaForFile("/path/to/package.json");
			assert.equal(result, "https://json.schemastore.org/package.json");
		});

		it("should find schema for tsconfig.json", () => {
			const result = findSchemaForFile("/path/to/tsconfig.json");
			assert.equal(result, "https://json.schemastore.org/tsconfig.json");
		});

		it("should find schema for tsconfig.base.json", () => {
			const result = findSchemaForFile("/path/to/tsconfig.base.json");
			assert.equal(result, "https://json.schemastore.org/tsconfig.json");
		});

		it("should find schema for .eslintrc.json", () => {
			const result = findSchemaForFile("/path/to/.eslintrc.json");
			assert.equal(result, "https://json.schemastore.org/eslintrc.json");
		});

		it("should find schema for .prettierrc", () => {
			const result = findSchemaForFile("/path/to/.prettierrc");
			assert.equal(result, "https://json.schemastore.org/prettierrc.json");
		});

		it("should find schema for prettier.config.json", () => {
			const result = findSchemaForFile("/path/to/prettier.config.json");
			assert.equal(result, "https://json.schemastore.org/prettierrc.json");
		});

		it("should find schema for .vscode/settings.json", () => {
			const result = findSchemaForFile("/path/to/.vscode/settings.json");
			assert.equal(result, "https://json.schemastore.org/vscode.json");
		});

		it("should find schema for babel.config.json", () => {
			const result = findSchemaForFile("/path/to/babel.config.json");
			assert.equal(result, "https://json.schemastore.org/babelrc.json");
		});

		it("should find schema for .babelrc.json", () => {
			const result = findSchemaForFile("/path/to/.babelrc.json");
			assert.equal(result, "https://json.schemastore.org/babelrc.json");
		});

		it("should find schema for webpack.config.js", () => {
			const result = findSchemaForFile("/path/to/webpack.config.js");
			assert.equal(result, "https://json.schemastore.org/webpack-config.json");
		});

		it("should find schema for vite.config.js", () => {
			const result = findSchemaForFile("/path/to/vite.config.js");
			assert.equal(result, "https://json.schemastore.org/vite-config.json");
		});

		it("should find schema for jest.config.js", () => {
			const result = findSchemaForFile("/path/to/jest.config.js");
			assert.equal(result, "https://json.schemastore.org/jest-config.json");
		});

		it("should find schema for ava.config.js", () => {
			const result = findSchemaForFile("/path/to/ava.config.js");
			assert.equal(result, "https://json.schemastore.org/ava-config.json");
		});

		it("should find schema for .mocharc.json", () => {
			const result = findSchemaForFile("/path/to/.mocharc.json");
			assert.equal(result, "https://json.schemastore.org/mocharc.json");
		});

		it("should find schema for swagger.json", () => {
			const result = findSchemaForFile("/path/to/swagger.json");
			assert.equal(result, "https://json.schemastore.org/swagger-2.0.json");
		});

		it("should find schema for openapi.json", () => {
			const result = findSchemaForFile("/path/to/openapi.json");
			assert.equal(result, "https://json.schemastore.org/openapi-3.0.json");
		});

		it("should find schema for schema.json", () => {
			const result = findSchemaForFile("/path/to/schema.json");
			assert.equal(result, "http://json-schema.org/draft-07/schema#");
		});

		it("should find schema for lerna.json", () => {
			const result = findSchemaForFile("/path/to/lerna.json");
			assert.equal(result, "https://json.schemastore.org/lerna.json");
		});

		it("should find schema for typings.json", () => {
			const result = findSchemaForFile("/path/to/typings.json");
			assert.equal(result, "https://json.schemastore.org/typings.json");
		});

		it("should return undefined for unknown files", () => {
			const result = findSchemaForFile("/path/to/unknown.json");
			assert.equal(result, undefined);
		});

		it("should return undefined for .txt files", () => {
			const result = findSchemaForFile("/path/to/file.txt");
			assert.equal(result, undefined);
		});

		it("should handle absolute paths correctly", () => {
			const result = findSchemaForFile("/absolute/path/to/package.json");
			assert.equal(result, "https://json.schemastore.org/package.json");
		});

		it("should handle relative paths correctly", () => {
			const result = findSchemaForFile("relative/path/to/tsconfig.json");
			assert.equal(result, "https://json.schemastore.org/tsconfig.json");
		});

		it("should handle nested paths correctly", () => {
			const result = findSchemaForFile(
				"/deeply/nested/path/to/package.json",
			);
			assert.equal(result, "https://json.schemastore.org/package.json");
		});
	});

	describe("toLSPAssociations", () => {
		it("should convert built-in associations to LSP format", () => {
			const result = toLSPAssociations();

			assert.ok(typeof result === "object");
			assert.ok(Object.keys(result).length > 0);
		});

		it("should have string keys representing file patterns", () => {
			const result = toLSPAssociations();

			for (const pattern of Object.keys(result)) {
				assert.equal(typeof pattern, "string");
			}
		});

		it("should have array values of schema URIs", () => {
			const result = toLSPAssociations();

			for (const uri of Object.values(result)) {
				assert.ok(Array.isArray(uri));
				assert.ok(uri.length > 0);
				assert.equal(typeof uri[0], "string");
			}
		});

		it("should include package.json mapping", () => {
			const result = toLSPAssociations();

			assert.ok(result["package.json"]);
			assert.deepEqual(result["package.json"], [
				"https://json.schemastore.org/package.json",
			]);
		});

		it("should include tsconfig.json mapping", () => {
			const result = toLSPAssociations();

			assert.ok(result["tsconfig.json"]);
			assert.deepEqual(result["tsconfig.json"], [
				"https://json.schemastore.org/tsconfig.json",
			]);
		});

		it("should include glob patterns", () => {
			const result = toLSPAssociations();

			assert.ok(result["tsconfig.*.json"]);
			assert.ok(result[".vscode/*.json"]);
		});
	});
});
