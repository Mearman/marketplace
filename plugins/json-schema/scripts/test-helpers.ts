/**
 * Test helpers for json-schema plugin tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mock } from "node:test";

/**
 * Converts Node.js mock.fn() calls format (array of objects with 'arguments')
 * to array format (array of arrays)
 */
export const callsToArray = (mockFn: any): any[][] => {
	if (!mockFn || !mockFn.mock || !mockFn.mock.calls) return [];
	return mockFn.mock.calls.map((call: any) => call.arguments);
};

/**
 * Creates a mock function with mockResolvedValue/mockRejectedValue methods
 */
export const createAsyncMock = (): any => {
	let resolveValue: any = undefined;
	let rejectValue: any = undefined;
	let resolveImpl: ((path: string) => any) | undefined = undefined;

	const fn = mock.fn(async (path?: string) => {
		if (rejectValue) throw rejectValue;
		if (resolveImpl) return resolveImpl(path || "");
		return resolveValue;
	});

	// @ts-expect-error - Adding helper methods
	fn.mockResolvedValue = (val: any) => {
		resolveValue = val;
		rejectValue = undefined;
		resolveImpl = undefined;
	};

	// @ts-expect-error - Adding helper methods
	fn.mockRejectedValue = (val: any) => {
		rejectValue = val;
		resolveValue = undefined;
		resolveImpl = undefined;
	};

	// @ts-expect-error - Adding helper methods for file-based mocking
	fn.mockImplementation = (impl: (path: string) => any) => {
		resolveImpl = impl;
		resolveValue = undefined;
		rejectValue = undefined;
	};

	return fn;
};

/**
 * Creates a mock console with log, error methods that store calls
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
