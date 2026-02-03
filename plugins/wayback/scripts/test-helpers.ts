/**
 * Test helpers for migrating from Vitest to Node.js built-in test runner
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mock, type Mock } from "node:test";

/**
 * Mock function with setImplementation method
 */
export interface MutableMockFn extends Mock<(...args: unknown[]) => unknown> {
	setImplementation: (impl: (...args: unknown[]) => unknown) => void;
}

/**
 * Creates a mutable mock function whose implementation can be changed.
 * Uses a closure to store the current implementation so the function reference stays stable.
 */
export const createMutableMock = (): MutableMockFn => {
	let impl: (...args: unknown[]) => unknown = () => undefined;

	const baseFn = mock.fn((...args: unknown[]) => impl(...args));

	// Add setImplementation method using Object.assign to avoid type assertions
	return Object.assign(baseFn, {
		setImplementation: (newImpl: (...args: unknown[]) => unknown) => {
			impl = newImpl;
		},
	});
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
