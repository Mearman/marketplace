/**
 * Tests for lib/cache utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createCacheManager } from "./index";
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

			expect(key1).toBe(key2);
			expect(key1).toHaveLength(16);
		});

		it("should include sorted parameters in key generation", () => {
			const url = "https://api.example.com/data";
			const key1 = cacheManager.getCacheKey(url, { b: "2", a: "1" });
			const key2 = cacheManager.getCacheKey(url, { a: "1", b: "2" });

			expect(key1).toBe(key2);
		});

		it("should generate different keys for different URLs", () => {
			const key1 = cacheManager.getCacheKey("https://api.example.com/data");
			const key2 = cacheManager.getCacheKey("https://api.example.com/other");

			expect(key1).not.toBe(key2);
		});

		it("should generate different keys for different parameters", () => {
			const url = "https://api.example.com/data";
			const key1 = cacheManager.getCacheKey(url, { foo: "bar" });
			const key2 = cacheManager.getCacheKey(url, { foo: "baz" });

			expect(key1).not.toBe(key2);
		});
	});

	describe("setCached and getCached", () => {
		it("should store and retrieve cached data", async () => {
			const key = "test-key";
			const testData = { message: "Hello, cache!", count: 42 };

			await cacheManager.setCached(key, testData);
			const cached = await cacheManager.getCached<typeof testData>(key, 3600);

			expect(cached).not.toBeNull();
			expect(cached?.data).toEqual(testData);
		});

		it("should return null for non-existent cache entries", async () => {
			const cached = await cacheManager.getCached("nonexistent-key", 3600);

			expect(cached).toBeNull();
		});

		it("should return null for expired cache entries", async () => {
			const key = "test-key";
			const testData = { value: 123 };

			await cacheManager.setCached(key, testData);
			// Use a negative TTL to simulate expiration
			const cached = await cacheManager.getCached(key, -1);

			expect(cached).toBeNull();
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

			expect(cachedString?.data).toBe(stringData);
			expect(cachedArray?.data).toEqual(arrayData);
			expect(cachedObject?.data).toEqual(objectData);
		});

		it("should overwrite existing cache entries", async () => {
			const key = "test-key";
			const data1 = { version: 1 };
			const data2 = { version: 2 };

			await cacheManager.setCached(key, data1);
			await cacheManager.setCached(key, data2);

			const cached = await cacheManager.getCached<typeof data2>(key, 3600);
			expect(cached?.data).toEqual(data2);
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
			expect(cached1).not.toBeNull();

			// Clear cache
			await cacheManager.clearCache();

			// Verify all entries are gone
			cached1 = await cacheManager.getCached("key1", 3600);
			const cached2 = await cacheManager.getCached("key2", 3600);
			const cached3 = await cacheManager.getCached("key3", 3600);

			expect(cached1).toBeNull();
			expect(cached2).toBeNull();
			expect(cached3).toBeNull();
		});
	});

	describe("fetchWithCache", () => {
		it("should fetch and cache data", async () => {
			const mockData = { result: "success" };

			// Mock fetch
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockData),
				} as Response)
			);

			const result = await cacheManager.fetchWithCache({
				url: "https://api.example.com/test",
				ttl: 3600,
			});

			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it("should return cached data on second call", async () => {
			const mockData = { result: "cached" };
			let callCount = 0;

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => {
						callCount++;
						return Promise.resolve(mockData);
					},
				} as Response)
			);

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

			expect(callCount).toBe(1); // Only called once
		});

		it("should bypass cache when bypassCache is true", async () => {
			const mockData = { result: "fresh" };
			let callCount = 0;

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => {
						callCount++;
						return Promise.resolve(mockData);
					},
				} as Response)
			);

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

			expect(callCount).toBe(2); // Called twice
		});

		it("should throw on HTTP errors", async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 404,
					statusText: "Not Found",
				} as Response)
			);

			await expect(
				cacheManager.fetchWithCache({
					url: "https://api.example.com/notfound",
					ttl: 3600,
				})
			).rejects.toThrow("Resource not found");
		});

		it("should retry on retryable status codes", async () => {
			let attemptCount = 0;

			global.fetch = vi.fn(() => {
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

			expect(attemptCount).toBe(3);
			expect(result).toEqual({ success: true });
		});
	});
});
