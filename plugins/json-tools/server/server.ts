#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { fromJsonSchema } from "zod/json-schema";

// Simple path accessor utilities
interface PathResult {
  value: any;
  path: string[];
  parent?: any;
  key?: string | number;
}

class PathAccessor {
  // Parse path string into segments
  static parsePath(pathStr: string): string[] {
    // Remove leading $ if present
    pathStr = pathStr.replace(/^\$\.?/, '');
    if (pathStr === '') return [];

    const segments: string[] = [];
    const regex = /([^.\[]+)|\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(pathStr)) !== null) {
      const segment = match[1] || match[2];
      segments.push(segment);
    }

    return segments;
  }

  // Get value at path
  static get(data: any, pathStr: string): PathResult[] {
    const segments = this.parsePath(pathStr);
    if (segments.length === 0) {
      return [{ value: data, path: [] }];
    }

    return this.getValue(data, segments, []);
  }

  private static getValue(data: any, segments: string[], currentPath: string[]): PathResult[] {
    if (segments.length === 0) {
      return [{ value: data, path: currentPath }];
    }

    const [segment, ...rest] = segments;

    // Handle wildcard
    if (segment === '*') {
      const results: PathResult[] = [];
      if (Array.isArray(data)) {
        data.forEach((item, idx) => {
          results.push(...this.getValue(item, rest, [...currentPath, String(idx)]));
        });
      } else if (typeof data === 'object' && data !== null) {
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

    const value = data[segment];
    if (value === undefined) {
      return [];
    }

    return this.getValue(value, rest, [...currentPath, segment]);
  }

  // Set value at path
  static set(data: any, pathStr: string, value: any): { modified: number; data: any } {
    const segments = this.parsePath(pathStr);
    if (segments.length === 0) {
      return { modified: 0, data };
    }

    const dataCopy = JSON.parse(JSON.stringify(data));
    const results = this.getWithParent(dataCopy, segments, []);

    results.forEach(({ parent, key }) => {
      if (parent !== undefined && key !== undefined) {
        parent[key] = value;
      }
    });

    return { modified: results.length, data: dataCopy };
  }

  private static getWithParent(data: any, segments: string[], currentPath: string[]): Array<{ parent: any; key: string | number; path: string[] }> {
    if (segments.length === 1) {
      const segment = segments[0];
      if (segment === '*') {
        const results: Array<{ parent: any; key: string | number; path: string[] }> = [];
        if (Array.isArray(data)) {
          data.forEach((_, idx) => {
            results.push({ parent: data, key: idx, path: [...currentPath, String(idx)] });
          });
        } else if (typeof data === 'object' && data !== null) {
          Object.keys(data).forEach(key => {
            results.push({ parent: data, key, path: [...currentPath, key] });
          });
        }
        return results;
      }
      return [{ parent: data, key: segment, path: [...currentPath, segment] }];
    }

    const [segment, ...rest] = segments;

    if (segment === '*') {
      const results: Array<{ parent: any; key: string | number; path: string[] }> = [];
      if (Array.isArray(data)) {
        data.forEach((item, idx) => {
          results.push(...this.getWithParent(item, rest, [...currentPath, String(idx)]));
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
          results.push(...this.getWithParent(data[key], rest, [...currentPath, key]));
        });
      }
      return results;
    }

    const value = data[segment];
    if (value === undefined) {
      return [];
    }

    return this.getWithParent(value, rest, [...currentPath, segment]);
  }

  // Delete value at path
  static delete(data: any, pathStr: string): { modified: number; data: any } {
    const segments = this.parsePath(pathStr);
    if (segments.length === 0) {
      return { modified: 0, data };
    }

    const dataCopy = JSON.parse(JSON.stringify(data));
    const results = this.getWithParent(dataCopy, segments, []);

    // Delete from end to start to handle array indices correctly
    results.reverse().forEach(({ parent, key }) => {
      if (parent !== undefined && key !== undefined) {
        if (Array.isArray(parent)) {
          parent.splice(Number(key), 1);
        } else {
          delete parent[key];
        }
      }
    });

    return { modified: results.length, data: dataCopy };
  }
}

interface JsonToolResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  backup?: string;
}

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

        let result: JsonToolResult;
        switch (name) {
          case "query":
            result = await this.handleQuery(args);
            break;
          case "set":
            result = await this.handleSet(args);
            break;
          case "delete":
            result = await this.handleDelete(args);
            break;
          case "add":
            result = await this.handleAdd(args);
            break;
          case "merge":
            result = await this.handleMerge(args);
            break;
          case "transform":
            result = await this.handleTransform(args);
            break;
          case "validate":
            result = await this.handleValidate(args);
            break;
          case "format":
            result = await this.handleFormat(args);
            break;
          case "batch_query":
            result = await this.handleBatchQuery(args);
            break;
          case "batch_edit":
            result = await this.handleBatchEdit(args);
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

  private readJsonFile(filePath: string): any {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }

  private writeJsonFile(filePath: string, data: any, indent: number = 2): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, indent) + "\n", "utf-8");
  }

  private createBackup(filePath: string): string {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }

  private async handleQuery(args: any): Promise<JsonToolResult> {
    const { file, path: pathStr } = args;
    const data = this.readJsonFile(file);
    const results = PathAccessor.get(data, pathStr);
    const values = results.map(r => r.value);

    return {
      success: true,
      data: values,
      message: `Found ${values.length} match(es)`,
    };
  }

  private async handleSet(args: any): Promise<JsonToolResult> {
    const { file, path: pathStr, value, backup = true, dryRun = false } = args;
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

  private async handleDelete(args: any): Promise<JsonToolResult> {
    const { file, path: pathStr, backup = true, dryRun = false } = args;
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

  private async handleAdd(args: any): Promise<JsonToolResult> {
    const { file, path: pathStr, value, key, backup = true, dryRun = false } = args;
    const data = this.readJsonFile(file);

    const results = PathAccessor.get(data, pathStr);
    if (results.length === 0) {
      return { success: false, error: "Target not found" };
    }

    // Create a copy for modification
    const dataCopy = JSON.parse(JSON.stringify(data));
    const targetResults = PathAccessor.get(dataCopy, pathStr);
    const target = targetResults[0]?.value;

    if (Array.isArray(target)) {
      target.push(value);
    } else if (typeof target === "object" && target !== null) {
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

  private async handleMerge(args: any): Promise<JsonToolResult> {
    const { files, output, strategy = "deep" } = args;

    const dataArray = files.map((f: string) => this.readJsonFile(f));
    let merged: any;

    if (strategy === "concat" && dataArray.every(Array.isArray)) {
      merged = dataArray.flat();
    } else if (strategy === "shallow") {
      merged = Object.assign({}, ...dataArray);
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

  private deepMerge(...objects: any[]): any {
    const isObject = (obj: any) => obj && typeof obj === "object" && !Array.isArray(obj);

    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach((key) => {
        const pVal = prev[key];
        const oVal = obj[key];

        if (Array.isArray(pVal) && Array.isArray(oVal)) {
          prev[key] = pVal.concat(...oVal);
        } else if (isObject(pVal) && isObject(oVal)) {
          prev[key] = this.deepMerge(pVal, oVal);
        } else {
          prev[key] = oVal;
        }
      });

      return prev;
    }, {});
  }

  private async handleTransform(args: any): Promise<JsonToolResult> {
    const { file, script, output, backup = true, dryRun = false } = args;
    const data = this.readJsonFile(file);

    // Import and execute transform script
    const scriptPath = path.resolve(script);
    const transform = await import(scriptPath);
    const transformFn = transform.default || transform;

    if (typeof transformFn !== "function") {
      return { success: false, error: "Transform script must export a function" };
    }

    const transformed = await transformFn(data);

    if (dryRun) {
      return {
        success: true,
        data: transformed,
        message: "Dry run: Transform result shown",
      };
    }

    const targetFile = output || file;
    let backupPath: string | undefined;

    if (backup && targetFile === file) {
      backupPath = this.createBackup(file);
    }

    this.writeJsonFile(targetFile, transformed);

    return {
      success: true,
      message: `Transformed and saved to ${targetFile}`,
      backup: backupPath,
    };
  }

  private async handleValidate(args: any): Promise<JsonToolResult> {
    const { file, schema: schemaPath } = args;
    const data = this.readJsonFile(file);
    const jsonSchema = this.readJsonFile(schemaPath);

    try {
      // Convert JSON Schema to Zod schema
      const zodSchema = fromJsonSchema(jsonSchema);

      // Validate data
      const result = zodSchema.safeParse(data);

      if (result.success) {
        return {
          success: true,
          message: "Validation passed",
        };
      }

      // Format Zod errors for readability
      const errors = result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));

      return {
        success: false,
        error: "Validation failed",
        data: errors,
      };
    } catch (error) {
      return {
        success: false,
        error: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async handleFormat(args: any): Promise<JsonToolResult> {
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

  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key) => {
          result[key] = this.sortObjectKeys(obj[key]);
          return result;
        }, {});
    }
    return obj;
  }

  private async handleBatchQuery(args: any): Promise<JsonToolResult> {
    const { files, path: pathStr } = args;
    const results: Record<string, any> = {};

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

  private async handleBatchEdit(args: any): Promise<JsonToolResult> {
    const { files, operation, path: jsonPath, value, backup = true, dryRun = false } = args;
    const results: Record<string, any> = {};

    for (const file of files) {
      try {
        let opArgs: any = { file, path: jsonPath, backup, dryRun };
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
