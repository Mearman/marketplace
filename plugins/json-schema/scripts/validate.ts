#!/usr/bin/env npx tsx
/**
 * Validate JSON data against a JSON Schema
 */

import * as fs from "fs/promises";
import * as path from "path";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import draft04 from "ajv-draft-04";
import Ajv2019 from "ajv/dist/2019";
import Ajv2020 from "ajv/dist/2020";
import {
	parseArgs,
	detectDraftVersion,
	formatValidationResult,
	formatJsonResult,
	handleError,
	type ParsedArgs,
	type DraftVersion,
	type ValidationResult,
	type ValidationError,
} from "./utils";

// ============================================================================
// Dependencies Interface (for testing)
// ============================================================================

export interface Dependencies {
	console: Console;
	process: NodeJS.Process;
	readFile: typeof fs.readFile;
}

// ============================================================================
// Ajv Instance Factory
// ============================================================================

const createAjvInstance = (draft: DraftVersion, strict: boolean, allErrors: boolean): Ajv => {
	const options = {
		allErrors,
		strict,
		validateFormats: true,
	};

	let ajv: Ajv;

	switch (draft) {
	case "draft-04":
		ajv = new draft04(options);
		break;
	case "2019-09":
		ajv = new Ajv2019(options);
		break;
	case "2020-12":
		ajv = new Ajv2020(options);
		break;
	default:
		ajv = new Ajv(options);
	}

	addFormats(ajv);
	return ajv;
};

// ============================================================================
// Helper Functions
// ============================================================================

const readAndParseJson = async (
	filePath: string,
	deps: Dependencies
): Promise<unknown> => {
	const resolvedPath = path.resolve(filePath);

	let content: string;
	try {
		content = await deps.readFile(resolvedPath, "utf-8");
	} catch (error) {
		return handleError(error, `reading ${filePath}`, deps);
	}

	try {
		return JSON.parse(content);
	} catch (error) {
		return handleError(error, `parsing ${filePath}`, deps);
	}
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { positional, options, flags } = args;

	if (positional.length === 0 || !options.has("schema")) {
		deps.console.error("Usage: npx tsx validate.ts <json-file> --schema=<schema-file> [options]");
		deps.console.error("Options:");
		deps.console.error("  --schema=FILE     Path to JSON Schema file (required)");
		deps.console.error("  --all-errors      Report all errors, not just the first");
		deps.console.error("  --strict          Enable strict mode");
		deps.console.error("  --verbose         Show detailed output");
		deps.console.error("  --format=FORMAT   Output format: text (default), json");
		deps.process.exit(1);
		return;
	}

	const jsonFile = positional[0];
	// We already checked options.has("schema") above
	const schemaFileOption = options.get("schema");
	if (!schemaFileOption) {
		deps.console.error("Error: --schema option is required");
		deps.process.exit(1);
		return;
	}
	const schemaFile = schemaFileOption;
	const allErrors = flags.has("all-errors");
	const strict = flags.has("strict");
	const verbose = flags.has("verbose");
	const outputFormat = options.get("format") || "text";

	// Read and parse both files
	const data = await readAndParseJson(jsonFile, deps);
	const schemaParsed = await readAndParseJson(schemaFile, deps);
	if (typeof schemaParsed !== "object" || schemaParsed === null || Array.isArray(schemaParsed)) {
		deps.console.error("Error: Schema must be a JSON object");
		deps.process.exit(1);
		return;
	}
	const schema = schemaParsed as Record<string, unknown>;

	// Detect draft version from schema
	const schemaUriValue = schema.$schema;
	const schemaUri: string | undefined =
		typeof schemaUriValue === "string" ? schemaUriValue : undefined;
	const draft = detectDraftVersion(schemaUri);

	if (verbose) {
		deps.console.log(`Validating: ${jsonFile}`);
		deps.console.log(`Schema: ${schemaFile}`);
		deps.console.log(`Draft: ${draft}`);
	}

	// Create Ajv instance and validate
	const ajv = createAjvInstance(draft, strict, allErrors);

	let validate;
	try {
		validate = ajv.compile(schema);
	} catch (error) {
		return handleError(error, "compiling schema (schema may be invalid)", deps);
	}

	const valid = validate(data);

	const result: ValidationResult = {
		valid,
		errors: [],
		schema: schemaFile,
		file: jsonFile,
		draft,
	};

	if (!valid && validate.errors) {
		result.errors = validate.errors.map((e: ErrorObject): ValidationError => {
			// e.params is typed as Record<string, unknown> in newer Ajv
			const params: Record<string, unknown> = e.params;
			return {
				path: e.instancePath || "/",
				message: e.message || "Unknown error",
				keyword: e.keyword,
				params,
			};
		});
	}

	// Output result
	if (outputFormat === "json") {
		deps.console.log(formatJsonResult(result));
	} else {
		deps.console.log(formatValidationResult(result, verbose));
	}

	if (!result.valid) {
		deps.process.exit(1);
	}
};

// ============================================================================
// CLI Entry Point
// ============================================================================

const defaultDeps: Dependencies = {
	console,
	process,
	readFile: fs.readFile,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		handleError(error, "", defaultDeps);
	});
}
