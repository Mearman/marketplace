/**
 * Tests for lib/cache utilities
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import { createCacheManager } from "./index.js";
import { rimraf } from "rimraf";

describe("createCacheManager", () => {
	const testNamespace = "test-cache";
	let cacheManager: ReturnType<typeof createCacheManager>;
	let cacheDir: string;

	beforeEach(async () => {
		cacheManager = createCacheManager(testNamespace);
		cacheDir = cacheManager.CACHE_DIR;
		// Ensure clean state
		await rimraf(cacheDir);
	});

	afterEach(async () => {
		await rimraf(cacheDir);
	});

	describe("getCacheKey", () => {
		it("should generate consistent keys for the same URL", () => {
			const url = "https://api.example.com/data";
			const key1 = cacheManager.getCacheKey(url);
			const key2 = cacheManager.getCacheKey(url);

			assert.strictEqual(key1, key2);
			assert.strictEqual(key1.length, 16);
		});

		it("should include sorted parameters in key generation", () => {
			const url = "https://api.example.com/data";
			const key1 = cacheManager.getCacheKey(url, { b: "2", a: "1" });
			const key2 = cacheManager.getCacheKey(url, { a: "1", b: "2" });

			assert.strictEqual(key1, key2);
		});

		it("should generate different keys for different URLs", () => {
			const key1 = cacheManager.getCacheKey("https://api.example.com/data");
			const key2 = cacheManager.getCacheKey("https://api.example.com/other");

			assert.notStrictEqual(key1, key2);
		});

		it("should generate different keys for different parameters", () => {
			const url = "https://api.example.com/data";
			const key1 = cacheManager.getCacheKey(url, { foo: "bar" });
			const key2 = cacheManager.getCacheKey(url, { foo: "baz" });

			assert.notStrictEqual(key1, key2);
		});
	});

	describe("setCached and getCached", () => {
		it("should store and retrieve cached data", async () => {
			const key = "test-key";
			const testData = { message: "Hello, cache!", count: 42 };

			await cacheManager.setCached(key, testData);
			const cached = await cacheManager.getCached<typeof testData>(key, 3600);

			assert.notStrictEqual(cached, null);
			assert.deepStrictEqual(cached?.data, testData);
		});

		it("should return null for non-existent cache entries", async () => {
			const cached = await cacheManager.getCached("nonexistent-key", 3600);

			assert.strictEqual(cached, null);
		});

		it("should return null for expired cache entries", async () => {
			const key = "test-key";
			const testData = { value: 123 };

			await cacheManager.setCached(key, testData);
			// Use a negative TTL to simulate expiration
			const cached = await cacheManager.getCached(key, -1);

			assert.strictEqual(cached, null);
		});

		it("should handle different data types", async () => {
			const key = "type-test";
			const stringData = "test string";
			const arrayData = [1, 2, 3, 4, 5];
			const objectData = { nested: { value: 42 } };

			await cacheManager.setCached(key + "-string", stringData);
			await cacheManager.setCached(key + "-array", arrayData);
			await cacheManager.setCached(key + "-object", objectData);

			const cachedString = await cacheManager.getCached<string>(key + "-string", 3600);
			const cachedArray = await cacheManager.getCached<number[]>(key + "-array", 3600);
			const cachedObject = await cacheManager.getCached<typeof objectData>(key + "-object", 3600);

			assert.strictEqual(cachedString?.data, stringData);
			assert.deepStrictEqual(cachedArray?.data, arrayData);
			assert.deepStrictEqual(cachedObject?.data, objectData);
		});

		it("should overwrite existing cache entries", async () => {
			const key = "test-key";
			const data1 = { version: 1 };
			const data2 = { version: 2 };

			await cacheManager.setCached(key, data1);
			await cacheManager.setCached(key, data2);

			const cached = await cacheManager.getCached<typeof data2>(key, 3600);
			assert.deepStrictEqual(cached?.data, data2);
		});
	});

	describe("clearCache", () => {
		it("should clear all cache files", async () => {
			// Create multiple cache entries
			await cacheManager.setCached("key1", { data: 1 });
			await cacheManager.setCached("key2", { data: 2 });
			await cacheManager.setCached("key3", { data: 3 });

			// Verify cache exists
			let cached1 = await cacheManager.getCached("key1", 3600);
			assert.notStrictEqual(cached1, null);

			// Clear cache
			await cacheManager.clearCache();

			// Verify all entries are gone
			cached1 = await cacheManager.getCached("key1", 3600);
			const cached2 = await cacheManager.getCached("key2", 3600);
			const cached3 = await cacheManager.getCached("key3", 3600);

			assert.strictEqual(cached1, null);
			assert.strictEqual(cached2, null);
			assert.strictEqual(cached3, null);
		});
	});

	describe("fetchWithCache", () => {
		it("should fetch and cache data", async () => {
			const mockData = { result: "success" };
			const mockFetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockData),
				} as Response)
			);
			globalThis.fetch = mockFetch as any;

			const result = await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
			});

			assert.deepStrictEqual(result, mockData);
			assert.strictEqual(mockFetch.mock.calls.length, 1);
		});

		it("should return cached data on second call", async () => {
			const mockData = { result: "cached" };
			let callCount = 0;

			const mockFetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => {
						callCount++;
						return Promise.resolve(mockData);
					},
				} as Response)
			);
			globalThis.fetch = mockFetch as any;

			// First call
			await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
			});

			// Second call should use cache
			await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
			});

			assert.strictEqual(callCount, 1); // Only called once
		});

		it("should bypass cache when bypassCache is true", async () => {
			const mockData = { result: "fresh" };
			let callCount = 0;

			const mockFetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => {
						callCount++;
						return Promise.resolve(mockData);
					},
				} as Response)
			);
			globalThis.fetch = mockFetch as any;

			// First call
			await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
			});

			// Second call with bypassCache
			await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
				bypassCache: true,
			});

			assert.strictEqual(callCount, 2); // Called twice
		});

		it("should throw on HTTP errors", async () => {
			const mockFetch = mock.fn(() =>
				Promise.resolve({
					ok: false,
					status: 404,
					statusText: "Not Found",
				} as Response)
			);
			globalThis.fetch = mockFetch as any;

			await assert.rejects(
				async () =>
					cacheManager.fetchWithCache({
						url: "https://api.example.com/notfound",
						ttl: 3600,
					}),
				{ message: "Resource not found: https://api.example.com/notfound" }
			);
		});

		it("should retry on retryable status codes", async () => {
			let attemptCount = 0;

			const mockFetch = mock.fn(() => {
				attemptCount++;
				if (attemptCount < 3) {
					return Promise.resolve({
						ok: false,
						status: 429,
						statusText: "Too Many Requests",
					} as Response);
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true }),
				} as Response);
			});
			globalThis.fetch = mockFetch as any;

			const result = await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
				retryOptions: {
					maxRetries: 3,
					initialDelay: 10,
					backoffMultiplier: 1,
					jitter: false,
				},
			});

			assert.strictEqual(attemptCount, 3);
			assert.deepStrictEqual(result, { success: true });
		});
	});
});
