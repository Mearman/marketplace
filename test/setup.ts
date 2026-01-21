/**
 * Global test setup and utilities for Node.js built-in test runner
 *
 * This file provides common test utilities that replace Vitest functionality.
 * Import specific utilities from this file in your tests.
 */

import { mock } from "node:test";

/**
 * Creates mock console object for testing CLI scripts
 */
export const createMockConsole = () => ({
	log: mock.fn(),
	error: mock.fn(),
	warn: mock.fn(),
	info: mock.fn(),
});

/**
 * Creates mock process object for testing CLI scripts
 * The exit mock throws to allow testing error handling
 */
export const createMockProcess = () => ({
	exit: mock.fn(() => {
		throw new Error("process.exit called");
	}),
});

/**
 * Creates complete mock dependencies for CLI scripts
 * Use this pattern for dependency injection in script tests
 */
export const createMockDeps = () => ({
	console: createMockConsole(),
	process: createMockProcess(),
});

/**
 * Creates a mock fetch with caching capability
 * @param data - The data to return from the mock
 * @param options - Optional configuration for the mock
 */
export const createMockFetchWithCache = <T>(
	data: T,
	options: { delay?: number; shouldFail?: boolean; error?: Error } = {}
) => {
	const { delay, shouldFail, error } = options;

	return mock.fn(async () => {
		if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
		if (shouldFail) throw error || new Error("Mock fetch failed");
		return data;
	});
};

/**
 * Creates a mock that returns a specific value
 * @param value - The value to return
 */
export const createMockReturnValue = <T>(value: T) => mock.fn(() => value);

/**
 * Creates a mock that resolves to a specific value
 * @param value - The value to resolve with
 */
export const createMockResolvedValue = <T>(value: T) =>
	mock.fn(async () => value);

/**
 * Creates a mock that rejects with a specific error
 * @param error - The error to reject with
 */
export const createMockRejectedValue = (error: Error) =>
	mock.fn(async () => {
		throw error;
	});

/**
 * Mock timer utilities for time-based tests
 *
 * Note: Node.js mock.timers API is experimental. Enable once per test suite.
 * Use mock.timers.enable() directly in your tests for more control.
 */
export const mockTimers = {
	/**
	 * Enable mock timers with a fixed current time
	 * @param time - The time to set as "now"
	 */
	enable: (time: Date | string) => {
		mock.timers.enable({ apis: ["Date"], now: new Date(time) });
	},

	/** Advance time by a specific duration */
	tick: (ms: number) => {
		mock.timers.tick(ms);
	},
};

/**
 * Mock fetch response helper
 * @param options - Response configuration
 * @returns A mock Response object
 */
export const createMockFetchResponse = (options: {
	ok: boolean;
	status?: number;
	statusText?: string;
	data?: unknown;
}): Response => {
	const { ok, status = 200, statusText = "OK", data } = options;
	const response = {
		ok,
		status,
		statusText,
		json: mock.fn(async () => data),
		text: mock.fn(async () => JSON.stringify(data)),
	};
	return response as unknown as Response;
};

/**
 * Reset all mocks - call this in beforeEach if needed
 * Note: Node's test runner resets mocks between tests automatically
 */
export const resetAllMocks = () => {
	mock.reset();
};

/**
 * Restore all mocks to their original implementations
 */
export const restoreAllMocks = () => {
	mock.restoreAll();
};

/**
 * Spy on an object's method
 * @param object - The object containing the method
 * @param methodName - The name of the method to spy on
 *
 * Note: The method must exist on the object at runtime.
 */
export const spyOn = (object: object, methodName: string) => {
	return mock.method(object as any, methodName as any);
};

/**
 * Type for dependencies in script tests
 */
export type MockDeps = ReturnType<typeof createMockDeps>;

/**
 * Type for mock console
 */
export type MockConsole = ReturnType<typeof createMockConsole>;

/**
 * Type for mock process
 */
export type MockProcess = ReturnType<typeof createMockProcess>;
