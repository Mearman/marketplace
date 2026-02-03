#!/usr/bin/env npx tsx
/**
 * Validate JSON data against its embedded $schema reference
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
	fetchWithCache,
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
	fetchSchema: typeof fetchSchemaFromUrl;
}

// ============================================================================
// Schema Fetching
// ============================================================================

const fetchSchemaFromUrl = async (
	url: string,
	bypassCache: boolean
): Promise<Record<string, unknown>> => {
	const result = await fetchWithCache({
		url,
		ttl: 86400, // 24 hours
		bypassCache,
	});
	// Validate the result is a record
	if (typeof result !== "object" || result === null || Array.isArray(result)) {
		throw new Error("Schema must be a JSON object");
	}
	return result as Record<string, unknown>;
};

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

const resolveSchema = async (
	schemaRef: string,
	jsonFilePath: string,
	bypassCache: boolean,
	deps: Dependencies
): Promise<Record<string, unknown>> => {
	// Check if it's a URL
	if (schemaRef.startsWith("http://") || schemaRef.startsWith("https://")) {
		try {
			return await deps.fetchSchema(schemaRef, bypassCache);
		} catch (error) {
			return handleError(error, `fetching schema from ${schemaRef}`, deps);
		}
	}

	// It's a local file path
	const basePath = path.dirname(path.resolve(jsonFilePath));
	const schemaPath = path.resolve(basePath, schemaRef);

	const schema = await readAndParseJson(schemaPath, deps);
	if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
		return handleError(new Error("Schema must be a JSON object"), `reading ${schemaRef}`, deps);
	}
	// Type narrowed: schema is now `object & ~null & ~array` = Record-like
	return schema as Record<string, unknown>;
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { positional, options, flags } = args;

	if (positional.length === 0) {
		deps.console.error("Usage: npx tsx check.ts <json-file> [options]");
		deps.console.error("Options:");
		deps.console.error("  --all-errors      Report all errors, not just the first");
		deps.console.error("  --no-cache        Bypass cache when fetching remote schemas");
		deps.console.error("  --strict          Enable strict mode");
		deps.console.error("  --verbose         Show detailed output");
		deps.console.error("  --format=FORMAT   Output format: text (default), json");
		deps.process.exit(1);
		return;
	}

	const jsonFile = positional[0];
	const allErrors = flags.has("all-errors");
	const bypassCache = flags.has("no-cache");
	const strict = flags.has("strict");
	const verbose = flags.has("verbose");
	const outputFormat = options.get("format") || "text";

	// Read and parse JSON file
	const data = await readAndParseJson(jsonFile, deps);

	// Check for $schema property
	if (typeof data !== "object" || data === null || !("$schema" in data)) {
		deps.console.error(`Error: No $schema property found in ${jsonFile}`);
		deps.console.error("  Hint: Use schema-validate to validate against a specific schema");
		deps.process.exit(1);
		return;
	}

	// Type guard already verified: data is object with $schema property
	const dataRecord: Record<string, unknown> = data;
	const schemaRefValue = dataRecord.$schema;
	if (typeof schemaRefValue !== "string") {
		deps.console.error(`Error: $schema must be a string in ${jsonFile}`);
		deps.process.exit(1);
		return;
	}
	const schemaRef = schemaRefValue;

	if (verbose) {
		deps.console.log(`Validating: ${jsonFile}`);
		deps.console.log(`$schema: ${schemaRef}`);
	}

	// Resolve and fetch schema
	const schema = await resolveSchema(schemaRef, jsonFile, bypassCache, deps);

	// Detect draft version
	const draft = detectDraftVersion(schemaRef);

	if (verbose) {
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
		schema: schemaRef,
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
	fetchSchema: fetchSchemaFromUrl,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		handleError(error, "", defaultDeps);
	});
}
