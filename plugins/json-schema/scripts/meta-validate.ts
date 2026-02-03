#!/usr/bin/env npx tsx
/**
 * Validate that a JSON Schema is itself a valid schema
 */

import * as fs from "fs/promises";
import * as path from "path";
import Ajv from "ajv";
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
// Type Guards
// ============================================================================

/**
 * Type guard for Record<string, unknown>.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================================
// Ajv Instance Factory
// ============================================================================

const createAjvInstance = (draft: DraftVersion, strict: boolean): Ajv => {
	const options = {
		allErrors: true,
		strict: strict,
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
		// draft-06 and draft-07 use standard Ajv
		ajv = new Ajv(options);
	}

	addFormats(ajv);
	return ajv;
};

// ============================================================================
// Helper Functions
// ============================================================================

const readAndParseSchema = async (
	schemaFile: string,
	deps: Dependencies
): Promise<Record<string, unknown>> => {
	const schemaPath = path.resolve(schemaFile);

	let schemaContent: string;
	try {
		schemaContent = await deps.readFile(schemaPath, "utf-8");
	} catch (error) {
		return handleError(error, `reading ${schemaFile}`, deps);
	}

	try {
		const parsed: unknown = JSON.parse(schemaContent);
		if (!isRecord(parsed)) {
			return handleError(new Error("Schema must be a JSON object"), "parsing JSON", deps);
		}
		return parsed;
	} catch (error) {
		return handleError(error, "parsing JSON", deps);
	}
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { positional, options, flags } = args;

	if (positional.length === 0) {
		deps.console.error("Usage: npx tsx meta-validate.ts <schema-file> [options]");
		deps.console.error("Options:");
		deps.console.error("  --draft=VERSION   JSON Schema draft (draft-04, draft-06, draft-07, 2019-09, 2020-12)");
		deps.console.error("  --strict          Enable strict mode");
		deps.console.error("  --verbose         Show detailed output");
		deps.console.error("  --format=FORMAT   Output format: text (default), json");
		deps.process.exit(1);
		return;
	}

	const schemaFile = positional[0];
	const draftOptionValue = options.get("draft");
	const draftOption: DraftVersion | undefined =
		draftOptionValue === "draft-04" ||
		draftOptionValue === "draft-06" ||
		draftOptionValue === "draft-07" ||
		draftOptionValue === "2019-09" ||
		draftOptionValue === "2020-12"
			? draftOptionValue
			: undefined;
	const strict = flags.has("strict");
	const verbose = flags.has("verbose");
	const outputFormat = options.get("format") || "text";

	// Read and parse schema file
	const schema = await readAndParseSchema(schemaFile, deps);

	// Detect or use specified draft version
	const schemaUriValue = schema.$schema;
	const schemaUri: string | undefined =
		typeof schemaUriValue === "string" ? schemaUriValue : undefined;
	const draft = draftOption || detectDraftVersion(schemaUri);

	if (verbose) {
		deps.console.log(`Validating: ${schemaFile}`);
		deps.console.log(`Draft: ${draft}`);
		if (schemaUri) deps.console.log(`$schema: ${schemaUri}`);
	}

	// Create Ajv instance and validate
	const ajv = createAjvInstance(draft, strict);

	const result: ValidationResult = {
		valid: true,
		errors: [],
		file: schemaFile,
		draft,
	};

	try {
		// Try to compile the schema - this validates it
		ajv.compile(schema);
	} catch (error) {
		result.valid = false;

		// Type guard for AJV error with errors array
		interface AjvErrorWithErrors {
			errors: Array<{
				instancePath?: string;
				message?: string;
				keyword?: string;
				params?: Record<string, unknown>;
			}>;
		}
		function isAjvErrorWithErrors(err: unknown): err is Error & AjvErrorWithErrors {
			if (!(err instanceof Error)) return false;
			if (!("errors" in err)) return false;
			// Use Reflect.get for type-safe property access
			const errorsValue: unknown = Reflect.get(err, "errors");
			return Array.isArray(errorsValue);
		}

		if (isAjvErrorWithErrors(error)) {
			result.errors = error.errors.map((e): ValidationError => ({
				path: e.instancePath || "/",
				message: e.message || "Unknown error",
				keyword: e.keyword || "unknown",
				params: e.params,
			}));
		} else {
			result.errors = [{
				path: "/",
				message: error instanceof Error ? error.message : String(error),
				keyword: "schema",
			}];
		}
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
