/**
 * Test helpers for json-schema plugin tests
 */

import { mock } from "node:test";

// Type definitions for mock functions
interface MockCall {
	arguments: unknown[];
}

interface MockContext {
	calls: MockCall[];
}

interface MockFn {
	mock?: MockContext;
}

interface AsyncMockFn {
	(path?: string): Promise<unknown>;
	mock?: MockContext;
	mockResolvedValue: (val: unknown) => void;
	mockRejectedValue: (val: Error) => void;
	mockImplementation: (impl: (path: string) => unknown) => void;
}

interface MockConsole {
	log: ReturnType<typeof mock.fn>;
	error: ReturnType<typeof mock.fn>;
	warn: ReturnType<typeof mock.fn>;
	info: ReturnType<typeof mock.fn>;
	debug: ReturnType<typeof mock.fn>;
	getLogCalls: () => unknown[][];
	getErrorCalls: () => unknown[][];
	/** Typed version for tests - returns string[][] for console calls */
	getLogCallsTyped: <T extends unknown[] = string[]>() => T[];
	/** Typed version for tests - returns string[][] for console calls */
	getErrorCallsTyped: <T extends unknown[] = string[]>() => T[];
}

interface MockProcess {
	exit: ReturnType<typeof mock.fn>;
}

/**
 * Converts Node.js mock.fn() calls format (array of objects with 'arguments')
 * to array format (array of arrays)
 */
export const callsToArray = (mockFn: MockFn | null | undefined): unknown[][] => {
	if (mockFn === null || mockFn === undefined) return [];
	const mockContext = mockFn.mock;
	if (mockContext === undefined) return [];
	const calls = mockContext.calls;
	return calls.map((call: MockCall) => call.arguments);
};

/**
 * Typed version of callsToArray for use in tests where the argument types are known.
 * Tests are exempt from ESLint's no-assertion rule.
 */
export const callsToArrayTyped = <T extends unknown[]>(mockFn: MockFn | null | undefined): T[] => {
	return callsToArray(mockFn) as T[];
};

/**
 * Creates a mock function with mockResolvedValue/mockRejectedValue methods
 */
export const createAsyncMock = (): AsyncMockFn => {
	let resolveValue: unknown = undefined;
	let rejectValue: Error | undefined = undefined;
	let resolveImpl: ((path: string) => unknown) | undefined = undefined;

	const fn = mock.fn(async (path?: string): Promise<unknown> => {
		if (rejectValue !== undefined) throw rejectValue;
		if (resolveImpl !== undefined) return resolveImpl(path ?? "");
		return resolveValue;
	});

	// Create an extended version with helper methods
	// We need to preserve the mock.fn behavior while adding our methods
	const asyncMock: AsyncMockFn = Object.assign(
		(p?: string) => fn(p),
		{
			get mock() {
				return fn.mock;
			},
			mockResolvedValue: (val: unknown): void => {
				resolveValue = val;
				rejectValue = undefined;
				resolveImpl = undefined;
			},
			mockRejectedValue: (val: Error): void => {
				rejectValue = val;
				resolveValue = undefined;
				resolveImpl = undefined;
			},
			mockImplementation: (impl: (path: string) => unknown): void => {
				resolveImpl = impl;
				resolveValue = undefined;
				rejectValue = undefined;
			},
		}
	);

	return asyncMock;
};

/**
 * Creates a mock console with log, error methods that store calls
 */
export const createMockConsole = (): MockConsole => {
	const logCalls: unknown[][] = [];
	const errorCalls: unknown[][] = [];

	return {
		log: mock.fn((...args: unknown[]) => { logCalls.push(args); }),
		error: mock.fn((...args: unknown[]) => { errorCalls.push(args); }),
		warn: mock.fn(() => { /* intentionally empty */ }),
		info: mock.fn(() => { /* intentionally empty */ }),
		debug: mock.fn(() => { /* intentionally empty */ }),
		// Helper to get calls as arrays
		getLogCalls: () => logCalls,
		getErrorCalls: () => errorCalls,
		// Typed versions for tests (tests are exempt from ESLint's no-assertion rule)
		getLogCallsTyped: <T extends unknown[] = string[]>() => logCalls as T[],
		getErrorCallsTyped: <T extends unknown[] = string[]>() => errorCalls as T[],
	};
};

/**
 * Creates a mock process.exit that throws an error for testing
 */
export const createMockProcess = (): MockProcess => {
	return {
		exit: mock.fn(() => {
			throw new Error("process.exit called");
		}),
	};
};
