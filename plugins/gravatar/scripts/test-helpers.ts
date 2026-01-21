/**
 * Test helpers for migrating from Vitest to Node.js built-in test runner
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Converts Node.js mock.fn() calls format to array of arrays
 * Node.js: mock.calls[i].arguments -> Vitest: mock.calls[i]
 */
export const callsToArray = (mockFn: any): any[][] => {
	if (!mockFn || !mockFn.mock || !mockFn.mock.calls) return [];
	return mockFn.mock.calls.map((call: any) => call.arguments);
};

/**
 * Gets the first call's arguments
 */
export const firstCall = (mockFn: any): any[] => {
	const calls = callsToArray(mockFn);
	return calls.length > 0 ? calls[0] : [];
};
