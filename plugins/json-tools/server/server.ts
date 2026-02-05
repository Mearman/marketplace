#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { z, fromJSONSchema } from "zod";

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

// Schema for JSON-serializable data (recursive)
const JsonDataSchema: z.ZodType = z.lazy(() =>
	z.union([
		z.null(),
		z.boolean(),
		z.number(),
		z.string(),
		z.array(JsonDataSchema),
		z.record(z.string(), JsonDataSchema),
	])
);

type JsonData = z.infer<typeof JsonDataSchema>;

// Helper to check if value is an object (not array, not null)
function isJsonObject(value: JsonData): value is Record<string, JsonData> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Schema for JSON Schema (simplified validation - fromJSONSchema will do full validation)
const JsonSchemaSchema: z.ZodType = z.lazy(() =>
	z.union([
		z.boolean(),
		z.object({
			type: z.union([
				z.literal("null"),
				z.literal("boolean"),
				z.literal("object"),
				z.literal("array"),
				z.literal("number"),
				z.literal("string"),
				z.array(z.string()),
			]).optional(),
			properties: z.record(z.string(), JsonSchemaSchema).optional(),
			required: z.array(z.string()).optional(),
			items: z.union([JsonSchemaSchema, z.array(JsonSchemaSchema)]).optional(),
			additionalProperties: z.union([JsonSchemaSchema, z.boolean()]).optional(),
			// JSON Schema has many more optional fields, we accept any additional properties
		}).loose(),
	])
);

// Type guard for JSON Schema - checks if value looks like a JSON Schema
function isJsonSchema(value: unknown): value is Record<string, unknown> {
	if (value === true || value === false) return true;
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	// Value is an object at this point - check for properties using 'in' operator
	return "type" in value || "$ref" in value;
}

// Schema for ToolArgs with proper validation
const ToolArgsSchema = z.object({
	file: z.string(),
	path: z.string().optional(),
	value: JsonDataSchema.optional(),
	key: z.string().optional(),
	backup: z.boolean().optional(),
	dryRun: z.boolean().optional(),
	files: z.array(z.string()).optional(),
	output: z.string().optional(),
	script: z.string().optional(),
	strategy: z.string().optional(),
	schema: z.string().optional(),
	indent: z.number().optional(),
	sortKeys: z.boolean().optional(),
	operation: z.string().optional(),
});

type ToolArgs = z.infer<typeof ToolArgsSchema>;

// ============================================================================
// Path Accessor Utilities
// ============================================================================

interface PathResult {
  value: JsonData;
  path: string[];
  parent?: Record<string, JsonData> | JsonData[];
  key?: string | number;
}

interface SetResult {
	modified: number;
	data: JsonData;
}

interface ParentResult {
	parent: Record<string, JsonData> | JsonData[];
	key: string | number;
	path: string[];
}

// Path accessor namespace (functions instead of class with only static methods)
const PathAccessor = {
	// Parse path string into segments
	parsePath(pathStr: string): string[] {
		// Remove leading $ if present
		pathStr = pathStr.replace(/^\$\.?/, "");
		if (pathStr === "") return [];

		const segments: string[] = [];
		const regex = /([^.\[]+)|\[([^\]]+)\]/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(pathStr)) !== null) {
			const segment = match[1] || match[2];
			segments.push(segment);
		}

		return segments;
	},

	// Get value at path
	get(data: JsonData, pathStr: string): PathResult[] {
		const segments = this.parsePath(pathStr);
		if (segments.length === 0) {
			return [{ value: data, path: [] }];
		}

		return this.getValue(data, segments, []);
	},

	getValue(data: JsonData, segments: string[], currentPath: string[]): PathResult[] {
		if (segments.length === 0) {
			return [{ value: data, path: currentPath }];
		}

		const [segment, ...rest] = segments;

		// Handle wildcard
		if (segment === "*") {
			const results: PathResult[] = [];
			if (Array.isArray(data)) {
				data.forEach((item, idx) => {
					results.push(...this.getValue(item, rest, [...currentPath, String(idx)]));
				});
			} else if (isJsonObject(data)) {
				Object.keys(data).forEach(key => {
					results.push(...this.getValue(data[key], rest, [...currentPath, key]));
				});
			}
			return results;
		}

		// Handle array index or object key
		if (data === null || data === undefined) {
			return [];
		}

		// We know data is an object here because we checked for null/undefined and we're accessing a property
		if (!isJsonObject(data)) {
			return [];
		}

		const value = data[segment];
		if (value === undefined) {
			return [];
		}

		return this.getValue(value, rest, [...currentPath, segment]);
	},

	// Set value at path
	set(data: JsonData, pathStr: string, value: JsonData): SetResult {
		const segments = this.parsePath(pathStr);
		if (segments.length === 0) {
			return { modified: 0, data };
		}

		// JSON.parse returns unknown, validate with schema
		const parsed = JsonDataSchema.safeParse(JSON.parse(JSON.stringify(data)));
		if (!parsed.success) {
			return { modified: 0, data };
		}
		const dataCopy = parsed.data;
		const results = this.getWithParent(dataCopy, segments, []);

		results.forEach(({ parent, key }) => {
			// parent is JsonObject | JsonArray, key is string | number
			if (Array.isArray(parent)) {
				parent[Number(key)] = value;
			} else {
				parent[key] = value;
			}
		});

		return { modified: results.length, data: dataCopy };
	},

	getWithParent(data: JsonData, segments: string[], currentPath: string[]): ParentResult[] {
		if (segments.length === 1) {
			const segment = segments[0];
			if (segment === "*") {
				const results: ParentResult[] = [];
				if (Array.isArray(data)) {
					data.forEach((_, idx) => {
						results.push({ parent: data, key: idx, path: [...currentPath, String(idx)] });
					});
				} else if (isJsonObject(data)) {
					Object.keys(data).forEach(key => {
						results.push({ parent: data, key, path: [...currentPath, key] });
					});
				}
				return results;
			}
			if (Array.isArray(data)) {
				return [{ parent: data, key: Number(segment), path: [...currentPath, segment] }];
			}
			if (isJsonObject(data)) {
				return [{ parent: data, key: segment, path: [...currentPath, segment] }];
			}
			// This shouldn't happen but handle the case
			return [];
		}

		const [segment, ...rest] = segments;

		if (segment === "*") {
			const results: ParentResult[] = [];
			if (Array.isArray(data)) {
				data.forEach((item, idx) => {
					results.push(...this.getWithParent(item, rest, [...currentPath, String(idx)]));
				});
			} else if (isJsonObject(data)) {
				Object.keys(data).forEach(key => {
					results.push(...this.getWithParent(data[key], rest, [...currentPath, key]));
				});
			}
			return results;
		}

		// We know data is an object here because we checked for null/undefined and we're accessing a property
		if (!isJsonObject(data)) {
			return [];
		}

		const value = data[segment];
		if (value === undefined) {
			return [];
		}

		return this.getWithParent(value, rest, [...currentPath, segment]);
	},

	// Delete value at path
	delete(data: JsonData, pathStr: string): SetResult {
		const segments = this.parsePath(pathStr);
		if (segments.length === 0) {
			return { modified: 0, data };
		}

		// JSON.parse returns unknown, validate with schema
		const parsed = JsonDataSchema.safeParse(JSON.parse(JSON.stringify(data)));
		if (!parsed.success) {
			return { modified: 0, data };
		}
		const dataCopy = parsed.data;

		const results = this.getWithParent(dataCopy, segments, []);

		// Delete from end to start to handle array indices correctly
		results.reverse().forEach(({ parent, key }) => {
			// parent is JsonObject | JsonArray, key is string | number
			if (Array.isArray(parent)) {
				parent.splice(Number(key), 1);
			} else {
				// Set to undefined instead of delete for better type safety
				parent[key] = undefined;
			}
		});

		return { modified: results.length, data: dataCopy };
	},

	// Type guard for objects (also exported for use in other functions)
	isObject(value: JsonData): value is Record<string, JsonData> {
		return isJsonObject(value);
	}
};

// ============================================================================
// Tool Result Types
// ============================================================================

interface JsonToolResult {
  success: boolean;
  data?: JsonData;
  message?: string;
  error?: string;
  backup?: string;
}

// ============================================================================
// MCP Server
// ============================================================================

class JsonToolsServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: "json-tools-server",
				version: "0.1.0",
			},
			{
				capabilities: {
					tools: {},
				},
			}
		);

		this.setupHandlers();
	}

	private setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "query",
					description: "Query JSON file using simple path syntax (dot notation, array indices, wildcards)",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							path: { type: "string", description: "Path expression (e.g., 'users[0].name', 'items[*].id', 'data.*.value')" },
						},
						required: ["file", "path"],
					},
				},
				{
					name: "set",
					description: "Set a value at a specific path",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							path: { type: "string", description: "Path expression (e.g., 'user.name', 'items[0].price')" },
							value: { description: "Value to set (any JSON type)" },
							backup: { type: "boolean", description: "Create backup before editing (default: true)" },
							dryRun: { type: "boolean", description: "Show changes without applying (default: false)" },
						},
						required: ["file", "path", "value"],
					},
				},
				{
					name: "delete",
					description: "Delete values at a specific path",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							path: { type: "string", description: "Path expression (e.g., 'deprecated', 'users[0]')" },
							backup: { type: "boolean", description: "Create backup before editing (default: true)" },
							dryRun: { type: "boolean", description: "Show changes without applying (default: false)" },
						},
						required: ["file", "path"],
					},
				},
				{
					name: "add",
					description: "Add item to array or property to object",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							path: { type: "string", description: "Path to array or object (e.g., 'users', 'config')" },
							value: { description: "Value to add" },
							key: { type: "string", description: "Property key (for objects)" },
							backup: { type: "boolean", description: "Create backup before editing (default: true)" },
							dryRun: { type: "boolean", description: "Show changes without applying (default: false)" },
						},
						required: ["file", "path", "value"],
					},
				},
				{
					name: "merge",
					description: "Merge multiple JSON files",
					inputSchema: {
						type: "object",
						properties: {
							files: { type: "array", items: { type: "string" }, description: "Files to merge" },
							output: { type: "string", description: "Output file path (optional)" },
							strategy: {
								type: "string",
								enum: ["deep", "shallow", "concat"],
								description: "Merge strategy (default: deep)"
							},
						},
						required: ["files"],
					},
				},
				{
					name: "transform",
					description: "Transform JSON using a TypeScript function",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							script: { type: "string", description: "Path to TypeScript transform script" },
							output: { type: "string", description: "Output file (optional, defaults to input)" },
							backup: { type: "boolean", description: "Create backup before editing (default: true)" },
							dryRun: { type: "boolean", description: "Show result without writing (default: false)" },
						},
						required: ["file", "script"],
					},
				},
				{
					name: "validate",
					description: "Validate JSON against a schema",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							schema: { type: "string", description: "Path to JSON Schema file" },
						},
						required: ["file", "schema"],
					},
				},
				{
					name: "format",
					description: "Format/prettify JSON file",
					inputSchema: {
						type: "object",
						properties: {
							file: { type: "string", description: "Path to JSON file" },
							indent: { type: "number", description: "Indentation spaces (default: 2)" },
							sortKeys: { type: "boolean", description: "Sort object keys (default: false)" },
							backup: { type: "boolean", description: "Create backup before formatting (default: true)" },
						},
						required: ["file"],
					},
				},
				{
					name: "batch_query",
					description: "Query multiple JSON files with the same path expression",
					inputSchema: {
						type: "object",
						properties: {
							files: { type: "array", items: { type: "string" }, description: "Files to query" },
							path: { type: "string", description: "Path expression (e.g., 'version', 'users[*].email')" },
						},
						required: ["files", "path"],
					},
				},
				{
					name: "batch_edit",
					description: "Apply same edit to multiple JSON files",
					inputSchema: {
						type: "object",
						properties: {
							files: { type: "array", items: { type: "string" }, description: "Files to edit" },
							operation: { type: "string", enum: ["set", "delete", "add"], description: "Edit operation" },
							path: { type: "string", description: "Path expression" },
							value: { description: "Value (for set/add operations)" },
							backup: { type: "boolean", description: "Create backups (default: true)" },
							dryRun: { type: "boolean", description: "Show changes without applying (default: false)" },
						},
						required: ["files", "operation", "path"],
					},
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			try {
				const { name, arguments: args } = request.params;

				// Validate arguments using Zod schema
				const parsedArgs = ToolArgsSchema.safeParse(args);
				if (!parsedArgs.success) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									success: false,
									error: `Invalid arguments: ${parsedArgs.error.issues.map(e => e.message).join(", ")}`,
								}, null, 2),
							},
						],
						isError: true,
					};
				}

				let result: JsonToolResult;
				switch (name) {
				case "query":
					result = await this.handleQuery(parsedArgs.data);
					break;
				case "set":
					result = await this.handleSet(parsedArgs.data);
					break;
				case "delete":
					result = await this.handleDelete(parsedArgs.data);
					break;
				case "add":
					result = await this.handleAdd(parsedArgs.data);
					break;
				case "merge":
					result = await this.handleMerge(parsedArgs.data);
					break;
				case "transform":
					result = await this.handleTransform(parsedArgs.data);
					break;
				case "validate":
					result = await this.handleValidate(parsedArgs.data);
					break;
				case "format":
					result = await this.handleFormat(parsedArgs.data);
					break;
				case "batch_query":
					result = await this.handleBatchQuery(parsedArgs.data);
					break;
				case "batch_edit":
					result = await this.handleBatchEdit(parsedArgs.data);
					break;
				default:
					throw new Error(`Unknown tool: ${name}`);
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: false,
								error: error instanceof Error ? error.message : String(error),
							}, null, 2),
						},
					],
					isError: true,
				};
			}
		});
	}

	// Helper to read and validate JSON file
	private readJsonFile(filePath: string): JsonData {
		const content = fs.readFileSync(filePath, "utf-8");
		const parsed = JsonDataSchema.safeParse(JSON.parse(content));
		if (!parsed.success) {
			throw new Error(`Invalid JSON in file ${filePath}: ${parsed.error.issues.map(e => e.message).join(", ")}`);
		}
		return parsed.data;
	}

	private writeJsonFile(filePath: string, data: JsonData, indent: number = 2): void {
		fs.writeFileSync(filePath, JSON.stringify(data, null, indent) + "\n", "utf-8");
	}

	private createBackup(filePath: string): string {
		const backupPath = `${filePath}.bak`;
		fs.copyFileSync(filePath, backupPath);
		return backupPath;
	}

	private async handleQuery(args: ToolArgs): Promise<JsonToolResult> {
		const { file, path: pathStr } = args;
		if (!pathStr) {
			return { success: false, error: "Path is required" };
		}
		const data = this.readJsonFile(file);
		const results = PathAccessor.get(data, pathStr);
		const values = results.map(r => r.value);

		return {
			success: true,
			data: values,
			message: `Found ${values.length} match(es)`,
		};
	}

	private async handleSet(args: ToolArgs): Promise<JsonToolResult> {
		const { file, path: pathStr, value, backup = true, dryRun = false } = args;
		if (!pathStr) {
			return { success: false, error: "Path is required" };
		}
		const data = this.readJsonFile(file);

		const result = PathAccessor.set(data, pathStr, value);
		if (result.modified === 0) {
			return { success: false, error: "No matches found for path" };
		}

		if (dryRun) {
			return {
				success: true,
				data: result.data,
				message: `Dry run: Would modify ${result.modified} location(s)`,
			};
		}

		let backupPath: string | undefined;
		if (backup) {
			backupPath = this.createBackup(file);
		}

		this.writeJsonFile(file, result.data);

		return {
			success: true,
			message: `Modified ${result.modified} location(s)`,
			backup: backupPath,
		};
	}

	private async handleDelete(args: ToolArgs): Promise<JsonToolResult> {
		const { file, path: pathStr, backup = true, dryRun = false } = args;
		if (!pathStr) {
			return { success: false, error: "Path is required" };
		}
		const data = this.readJsonFile(file);

		const result = PathAccessor.delete(data, pathStr);
		if (result.modified === 0) {
			return { success: false, error: "No matches found for path" };
		}

		if (dryRun) {
			return {
				success: true,
				data: result.data,
				message: `Dry run: Would delete ${result.modified} location(s)`,
			};
		}

		let backupPath: string | undefined;
		if (backup) {
			backupPath = this.createBackup(file);
		}

		this.writeJsonFile(file, result.data);

		return {
			success: true,
			message: `Deleted ${result.modified} location(s)`,
			backup: backupPath,
		};
	}

	private async handleAdd(args: ToolArgs): Promise<JsonToolResult> {
		const { file, path: pathStr, value, key, backup = true, dryRun = false } = args;
		if (!pathStr) {
			return { success: false, error: "Path is required" };
		}
		const data = this.readJsonFile(file);

		const results = PathAccessor.get(data, pathStr);
		if (results.length === 0) {
			return { success: false, error: "Target not found" };
		}

		// Create a copy for modification
		const parsed = JsonDataSchema.safeParse(JSON.parse(JSON.stringify(data)));
		if (!parsed.success) {
			return { success: false, error: "Failed to parse data" };
		}
		const dataCopy = parsed.data;
		const targetResults = PathAccessor.get(dataCopy, pathStr);
		const target = targetResults[0]?.value;

		if (Array.isArray(target)) {
			target.push(value);
		} else if (PathAccessor.isObject(target)) {
			if (!key) {
				return { success: false, error: "Key required for adding to object" };
			}
			target[key] = value;
		} else {
			return { success: false, error: "Target must be array or object" };
		}

		if (dryRun) {
			return {
				success: true,
				data: dataCopy,
				message: "Dry run: Would add value",
			};
		}

		let backupPath: string | undefined;
		if (backup) {
			backupPath = this.createBackup(file);
		}

		this.writeJsonFile(file, dataCopy);

		return {
			success: true,
			message: "Value added successfully",
			backup: backupPath,
		};
	}

	private async handleMerge(args: ToolArgs): Promise<JsonToolResult> {
		const { files, output, strategy = "deep" } = args;

		if (!files || files.length === 0) {
			return { success: false, error: "Files array is required" };
		}

		const dataArray = files.map((f) => this.readJsonFile(f));
		let merged: JsonData;

		if (strategy === "concat" && dataArray.every(Array.isArray)) {
			// All elements are arrays - flatten them
			const arrayData: JsonData[][] = [];
			for (const item of dataArray) {
				if (Array.isArray(item)) {
					arrayData.push(item);
				}
			}
			merged = arrayData.flat();
		} else if (strategy === "shallow") {
			merged = Object.assign({}, ...dataArray.filter(isJsonObject));
		} else {
			// Deep merge
			merged = this.deepMerge(...dataArray);
		}

		if (output) {
			this.writeJsonFile(output, merged);
			return {
				success: true,
				message: `Merged ${files.length} files to ${output}`,
			};
		}

		return {
			success: true,
			data: merged,
			message: `Merged ${files.length} files`,
		};
	}

	private deepMerge(...objects: JsonData[]): Record<string, JsonData> {
		const isObject = (obj: JsonData): obj is Record<string, JsonData> => {
			return obj !== null && typeof obj === "object" && !Array.isArray(obj);
		};

		const mergeArray = (a: JsonData, b: JsonData): JsonData => {
			if (Array.isArray(a) && Array.isArray(b)) {
				return [...a, ...b];
			}
			return b;
		};

		return objects.reduce<Record<string, JsonData>>((prev, obj) => {
			if (!isObject(obj)) return prev;

			Object.keys(obj).forEach((key) => {
				const pVal = prev[key];
				const oVal = obj[key];

				if (Array.isArray(pVal) && Array.isArray(oVal)) {
					prev[key] = mergeArray(pVal, oVal);
				} else if (isObject(pVal) && isObject(oVal)) {
					const merged = this.deepMerge(pVal, oVal);
					prev[key] = merged;
				} else {
					prev[key] = oVal;
				}
			});

			return prev;
		}, {});
	}

	private async handleTransform(args: ToolArgs): Promise<JsonToolResult> {
		const { file, script, output, backup = true, dryRun = false } = args;
		if (!script) {
			return { success: false, error: "Script path is required" };
		}
		const data = this.readJsonFile(file);

		// Import and execute transform script
		const scriptPath = path.resolve(script);
		const transform = await import(scriptPath);

		// Type guard for transform function
		const isTransformFunction = (fn: unknown): fn is (data: JsonData) => JsonData | Promise<JsonData> => {
			return typeof fn === "function";
		};

		// Check default export first, then module export
		let transformFn: ((data: JsonData) => JsonData | Promise<JsonData>) | null = null;
		if (isTransformFunction(transform.default)) {
			transformFn = transform.default;
		} else if (isTransformFunction(transform)) {
			transformFn = transform;
		}

		if (transformFn === null) {
			return { success: false, error: "Transform script must export a function" };
		}

		// Call the transform function with proper typing
		const transformed = await Promise.resolve(transformFn(data));

		// Validate transformed data
		const parsed = JsonDataSchema.safeParse(transformed);
		if (!parsed.success) {
			return { success: false, error: `Transform produced invalid JSON: ${parsed.error.issues.map(e => e.message).join(", ")}` };
		}

		if (dryRun) {
			return {
				success: true,
				data: parsed.data,
				message: "Dry run: Transform result shown",
			};
		}

		const targetFile = output || file;
		let backupPath: string | undefined;

		if (backup && targetFile === file) {
			backupPath = this.createBackup(file);
		}

		this.writeJsonFile(targetFile, parsed.data);

		return {
			success: true,
			message: `Transformed and saved to ${targetFile}`,
			backup: backupPath,
		};
	}

	private async handleValidate(args: ToolArgs): Promise<JsonToolResult> {
		const { file, schema: schemaPath } = args;
		if (!schemaPath) {
			return { success: false, error: "Schema path is required" };
		}
		const data = this.readJsonFile(file);
		const jsonSchema = this.readJsonFile(schemaPath);

		// Validate that jsonSchema is a valid JSON Schema structure
		if (!isJsonSchema(jsonSchema)) {
			return {
				success: false,
				error: "Invalid JSON Schema file. Must contain a valid JSON Schema (object with 'type' property).",
			};
		}

		// Convert JSON Schema to Zod schema
		// jsonSchema is now narrowed to JSONSchemaInput
		const zodSchema = fromJSONSchema(jsonSchema);

		// Validate data
		const result = zodSchema.safeParse(data);

		if (result.success) {
			return {
				success: true,
				message: "Validation passed",
			};
		}

		// Format Zod errors for readability
		const errors = result.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code
		}));

		return {
			success: false,
			error: "Validation failed",
			data: errors,
		};
	}

	private async handleFormat(args: ToolArgs): Promise<JsonToolResult> {
		const { file, indent = 2, sortKeys = false, backup = true } = args;
		let data = this.readJsonFile(file);

		if (sortKeys) {
			data = this.sortObjectKeys(data);
		}

		let backupPath: string | undefined;
		if (backup) {
			backupPath = this.createBackup(file);
		}

		this.writeJsonFile(file, data, indent);

		return {
			success: true,
			message: "File formatted successfully",
			backup: backupPath,
		};
	}

	private sortObjectKeys(obj: JsonData): JsonData {
		if (Array.isArray(obj)) {
			return obj.map((item) => this.sortObjectKeys(item));
		} else if (PathAccessor.isObject(obj)) {
			return Object.keys(obj)
				.sort()
				.reduce<Record<string, JsonData>>((result, key) => {
					result[key] = this.sortObjectKeys(obj[key]);
					return result;
				}, {});
		}
		return obj;
	}

	private async handleBatchQuery(args: ToolArgs): Promise<JsonToolResult> {
		const { files, path: pathStr } = args;
		if (!pathStr) {
			return { success: false, error: "Path is required" };
		}
		if (!files || files.length === 0) {
			return { success: false, error: "Files array is required" };
		}

		const results: Record<string, JsonData> = {};

		for (const file of files) {
			try {
				const data = this.readJsonFile(file);
				const pathResults = PathAccessor.get(data, pathStr);
				results[file] = pathResults.map(r => r.value);
			} catch (error) {
				results[file] = { error: error instanceof Error ? error.message : String(error) };
			}
		}

		return {
			success: true,
			data: results,
			message: `Queried ${files.length} file(s)`,
		};
	}

	private async handleBatchEdit(args: ToolArgs): Promise<JsonToolResult> {
		const { files, operation, path: jsonPath, value, backup = true, dryRun = false } = args;
		if (!files || files.length === 0) {
			return { success: false, error: "Files array is required" };
		}
		if (!operation) {
			return { success: false, error: "Operation is required" };
		}
		if (!jsonPath) {
			return { success: false, error: "Path is required" };
		}

		const results: Record<string, JsonData> = {};

		for (const file of files) {
			try {
				const opArgs: ToolArgs = { file, path: jsonPath, backup, dryRun };
				if (operation === "set" || operation === "add") {
					opArgs.value = value;
				}

				let result: JsonToolResult;
				switch (operation) {
				case "set":
					result = await this.handleSet(opArgs);
					break;
				case "delete":
					result = await this.handleDelete(opArgs);
					break;
				case "add":
					result = await this.handleAdd(opArgs);
					break;
				default:
					throw new Error(`Unknown operation: ${operation}`);
				}

				results[file] = result;
			} catch (error) {
				results[file] = {
					success: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}

		return {
			success: true,
			data: results,
			message: `Batch operation completed on ${files.length} file(s)`,
		};
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("JSON Tools MCP server running on stdio");
	}
}

const server = new JsonToolsServer();
server.run().catch(console.error);
