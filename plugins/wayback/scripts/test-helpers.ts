/**
 * Test helpers for migrating from Vitest to Node.js built-in test runner
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mock } from "node:test";

/**
 * Creates a mutable mock function whose implementation can be changed.
 * Uses a closure to store the current implementation so the function reference stays stable.
 */
export const createMutableMock = (): any => {
	let impl: any = () => undefined;

	const fn = mock.fn((...args: any[]) => impl(args));

	// @ts-expect-error - Adding custom method
	fn.setImplementation = (newImpl: any) => {
		impl = newImpl;
	};

	return fn;
};

/**
 * Creates a mock console with log, error methods
 */
export const createMockConsole = (): any => ({
	log: mock.fn(),
	error: mock.fn(),
});

/**
 * Creates a mock process.exit that throws for testing
 */
export const createMockProcess = (): any => ({
	exit: mock.fn(() => {
		throw new Error("process.exit called");
	}),
});
