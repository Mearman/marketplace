/**
 * Test helpers for migrating from Vitest to Node.js built-in test runner
 */

import { mock } from "node:test";

/**
 * Converts Node.js mock.fn() calls format (array of objects with 'arguments')
 * to Vitest-compatible format (array of arrays)
 */
export const callsToArray = (mockFn: any): any[][] => {
	if (!mockFn || !mockFn.mock || !mockFn.mock.calls) return [];
	return mockFn.mock.calls.map((call: any) => call.arguments);
};

/**
 * Creates a mock function with Vitest-compatible mockResolvedValue/mockRejectedValue methods
 */
export const createAsyncMock = () => {
	let resolveValue: any = undefined;
	let rejectValue: any = undefined;

	const fn = mock.fn(async (...args: any[]) => {
		if (rejectValue) throw rejectValue;
		return resolveValue;
	});

	fn.mockResolvedValue = (val: any) => {
		resolveValue = val;
		rejectValue = undefined;
	};

	fn.mockRejectedValue = (val: any) => {
		rejectValue = val;
		resolveValue = undefined;
	};

	return fn;
};

/**
 * Creates a mock console with log, error, warn, etc. methods
 */
export const createMockConsole = () => {
	const logCalls: any[][] = [];
	const errorCalls: any[][] = [];

	return {
		log: mock.fn((...args: any[]) => { logCalls.push(args); }),
		error: mock.fn((...args: any[]) => { errorCalls.push(args); }),
		warn: mock.fn(() => {}),
		info: mock.fn(() => {}),
		debug: mock.fn(() => {}),
		trace: mock.fn(() => {}),
		// Helper to get calls as arrays
		getLogCalls: () => logCalls,
		getErrorCalls: () => errorCalls,
	};
};

/**
 * Creates a mock process.exit that throws an error for testing
 */
export const createMockProcess = () => {
	return {
		exit: mock.fn(() => {
			throw new Error("process.exit called");
		}),
	};
};
