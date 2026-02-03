/**
 * Test helpers for migrating from Vitest to Node.js built-in test runner
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

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
export const createAsyncMock = (): any => {
	let resolveValue: any = undefined;
	let rejectValue: any = undefined;

	const fn = mock.fn(async () => {
		if (rejectValue) throw rejectValue;
		return resolveValue;
	});

	// @ts-expect-error - Adding Vitest-compatible methods
	fn.mockResolvedValue = (val: any) => {
		resolveValue = val;
		rejectValue = undefined;
	};

	// @ts-expect-error - Adding Vitest-compatible methods
	fn.mockRejectedValue = (val: any) => {
		rejectValue = val;
		resolveValue = undefined;
	};

	return fn;
};

/**
 * Creates a mock console with log, error, warn, etc. methods
 */
export const createMockConsole = (): any => {
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
export const createMockProcess = (): any => {
	return {
		exit: mock.fn(() => {
			throw new Error("process.exit called");
		}),
	};
};
