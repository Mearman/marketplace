/**
 * Tests for schemas/catalog.ts
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
	fetchSchemaStoreCatalog,
	getCatalog,
	catalogToAssociations,
	findSchemaFromCatalog,
	clearCatalogCache,
	getCacheAge,
	type SchemaStoreCatalog,
} from "./catalog.js";

describe("catalog.ts", () => {
	describe("fetchSchemaStoreCatalog", () => {
		it("should fetch and parse the catalog", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test-schema",
					description: "Test schema description",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await fetchSchemaStoreCatalog(mockFetch);

			assert.deepEqual(result, mockData);
		});

		it("should filter out entries without fileMatch", async () => {
			const mockData = [
				{
					name: "valid-schema",
					description: "Valid schema",
					fileMatch: ["valid.json"],
					url: "https://example.com/valid.json",
				},
				{
					name: "invalid-schema",
					description: "Schema without fileMatch",
					fileMatch: [],
					url: "https://example.com/invalid.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await fetchSchemaStoreCatalog(mockFetch);

			assert.equal(result.length, 1);
			assert.equal(result[0].name, "valid-schema");
		});

		it("should throw on HTTP error", async () => {
			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: false,
					status: 404,
					statusText: "Not Found",
					headers: new Headers(),
					json: async () => ({}),
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			await assert.rejects(
				() => fetchSchemaStoreCatalog(mockFetch),
				/Failed to fetch SchemaStore catalog: HTTP 404: Not Found/,
			);
		});

		it("should throw on network error", async () => {
			const mockFetch = mock.fn(() => {
				return Promise.reject(new Error("Network error"));
			}) as unknown as typeof fetch;

			await assert.rejects(
				() => fetchSchemaStoreCatalog(mockFetch),
				/Failed to fetch SchemaStore catalog: Network error/,
			);
		});

		it("should throw on invalid JSON response", async () => {
			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => ({ invalid: "data" }),
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			await assert.rejects(
				() => fetchSchemaStoreCatalog(mockFetch),
				/Invalid SchemaStore catalog response format/,
			);
		});
	});

	describe("getCatalog", () => {
		beforeEach(() => {
			clearCatalogCache();
			mock.reset();
		});

		it("should fetch catalog on first call", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await getCatalog(mockFetch);

			assert.deepEqual(result, mockData);
		});

		it("should cache catalog for subsequent calls", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			let fetchCallCount = 0;
			const mockFetch = mock.fn(() => {
				fetchCallCount++;
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			await getCatalog(mockFetch);
			await getCatalog(mockFetch);
			await getCatalog(mockFetch);

			assert.equal(fetchCallCount, 1);
		});

		it("should refetch after cache expires", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			let fetchCallCount = 0;
			const mockFetch = mock.fn(() => {
				fetchCallCount++;
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			// Mock Date.now to simulate time passing
			const originalDateNow = Date.now;
			let time = Date.now();
			globalThis.Date.now = mock.fn(() => time);

			await getCatalog(mockFetch);
			assert.equal(fetchCallCount, 1);

			// Advance time by less than TTL
			time += 12 * 60 * 60 * 1000; // 12 hours
			await getCatalog(mockFetch);
			assert.equal(fetchCallCount, 1);

			// Advance time past TTL (24 hours)
			time += 13 * 60 * 60 * 1000; // 13 more hours = 25 hours total
			await getCatalog(mockFetch);
			assert.equal(fetchCallCount, 2);

			globalThis.Date.now = originalDateNow;
		});
	});

	describe("catalogToAssociations", () => {
		it("should convert catalog to associations map", () => {
			const catalog: SchemaStoreCatalog[] = [
				{
					name: "package.json",
					description: "NPM package schema",
					fileMatch: ["package.json"],
					url: "https://example.com/package.json",
				},
				{
					name: "tsconfig",
					description: "TypeScript config",
					fileMatch: ["tsconfig.json", "tsconfig.*.json"],
					url: "https://example.com/tsconfig.json",
				},
			];

			const result = catalogToAssociations(catalog);

			assert.deepEqual(result, {
				"package.json": ["https://example.com/package.json"],
				"tsconfig.json": ["https://example.com/tsconfig.json"],
				"tsconfig.*.json": ["https://example.com/tsconfig.json"],
			});
		});

		it("should handle multiple patterns per entry", () => {
			const catalog: SchemaStoreCatalog[] = [
				{
					name: "multi",
					description: "Multiple patterns",
					fileMatch: ["a.json", "b.json", "c.json"],
					url: "https://example.com/multi.json",
				},
			];

			const result = catalogToAssociations(catalog);

			assert.deepEqual(result, {
				"a.json": ["https://example.com/multi.json"],
				"b.json": ["https://example.com/multi.json"],
				"c.json": ["https://example.com/multi.json"],
			});
		});

		it("should handle empty catalog", () => {
			const result = catalogToAssociations([]);
			assert.deepEqual(result, {});
		});

		it("should accumulate URIs for duplicate patterns", () => {
			const catalog: SchemaStoreCatalog[] = [
				{
					name: "schema1",
					description: "First schema",
					fileMatch: ["*.json"],
					url: "https://example.com/schema1.json",
				},
				{
					name: "schema2",
					description: "Second schema",
					fileMatch: ["*.json"],
					url: "https://example.com/schema2.json",
				},
			];

			const result = catalogToAssociations(catalog);

			assert.deepEqual(result["*.json"], [
				"https://example.com/schema1.json",
				"https://example.com/schema2.json",
			]);
		});
	});

	describe("findSchemaFromCatalog", () => {
		beforeEach(() => {
			clearCatalogCache();
			mock.reset();
		});

		it("should find schemas by exact filename match", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "package.json",
					description: "NPM schema",
					fileMatch: ["package.json"],
					url: "https://example.com/package.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog("package.json", mockFetch);

			assert.deepEqual(result, ["https://example.com/package.json"]);
		});

		it("should find schemas by glob pattern", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "tsconfig",
					description: "TypeScript config",
					fileMatch: ["tsconfig.*.json"],
					url: "https://example.com/tsconfig.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog(
				"tsconfig.base.json",
				mockFetch,
			);

			assert.deepEqual(result, ["https://example.com/tsconfig.json"]);
		});

		it("should find schemas by path pattern", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "vscode",
					description: "VS Code settings",
					fileMatch: [".vscode/*.json"],
					url: "https://example.com/vscode.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog(
				".vscode/settings.json",
				mockFetch,
			);

			assert.deepEqual(result, ["https://example.com/vscode.json"]);
		});

		it("should return multiple schemas for multiple matches", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "schema1",
					description: "First",
					fileMatch: ["test.json"],
					url: "https://example.com/schema1.json",
				},
				{
					name: "schema2",
					description: "Second",
					fileMatch: ["test.json"],
					url: "https://example.com/schema2.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog("test.json", mockFetch);

			assert.equal(result.length, 2);
			assert.ok(result.includes("https://example.com/schema1.json"));
			assert.ok(result.includes("https://example.com/schema2.json"));
		});

		it("should return empty array for no matches", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "other",
					description: "Other schema",
					fileMatch: ["other.json"],
					url: "https://example.com/other.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog("unknown.json", mockFetch);

			assert.deepEqual(result, []);
		});

		it("should handle double-star glob patterns", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "k8s",
					description: "Kubernetes",
					fileMatch: ["k8s/**/*.yml"],
					url: "https://example.com/k8s.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog(
				"k8s/deployment/config.yml",
				mockFetch,
			);

			assert.deepEqual(result, ["https://example.com/k8s.json"]);
		});

		it("should handle question mark wildcards", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["file?.json"],
					url: "https://example.com/test.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			const result = await findSchemaFromCatalog("file1.json", mockFetch);

			assert.deepEqual(result, ["https://example.com/test.json"]);
		});
	});

	describe("clearCatalogCache", () => {
		beforeEach(() => {
			clearCatalogCache();
			mock.reset();
		});

		it("should clear the catalog cache", async () => {
			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			let fetchCallCount = 0;
			const mockFetch = mock.fn(() => {
				fetchCallCount++;
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			await getCatalog(mockFetch);
			assert.equal(fetchCallCount, 1);

			clearCatalogCache();

			await getCatalog(mockFetch);
			assert.equal(fetchCallCount, 2);
		});
	});

	describe("getCacheAge", () => {
		beforeEach(() => {
			clearCatalogCache();
			mock.reset();
		});

		it("should return -1 when cache is empty", () => {
			const age = getCacheAge();
			assert.equal(age, -1);
		});

		it("should return age of cached catalog", async () => {
			const originalDateNow = Date.now;
			const startTime = Date.now();
			globalThis.Date.now = mock.fn(() => startTime);

			const mockData: SchemaStoreCatalog[] = [
				{
					name: "test",
					description: "Test",
					fileMatch: ["test.json"],
					url: "https://example.com/test.json",
				},
			];

			const mockFetch = mock.fn(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
					headers: new Headers(),
					json: async () => mockData,
					body: null,
					redirected: false,
					type: "basic" as ResponseType,
					url: "",
					clone: async () => ({} as Response),
					arrayBuffer: async () => new ArrayBuffer(0),
					blob: async () => ({} as Blob),
					formData: async () => new FormData(),
					text: async () => "",
				});
			}) as unknown as typeof fetch;

			await getCatalog(mockFetch);

			// Advance time by 5 seconds
			globalThis.Date.now = mock.fn(() => startTime + 5000);

			const age = getCacheAge();
			assert.equal(age, 5000);

			globalThis.Date.now = originalDateNow;
		});
	});
});
