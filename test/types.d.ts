/**
 * Type augmentations for Node.js test runner mock API
 */

import type { Mock } from "node:test";

// Generic function type for mock declarations
type GenericFunction = (...args: unknown[]) => unknown;

declare module "node:test" {
	interface Mock<T extends GenericFunction> {
		mock: {
			calls: Array<{
				arguments: Parameters<T>;
				this: ThisType<T>;
			}>;
		};
	}
}

// Function type for console methods
type ConsoleFn = (...args: unknown[]) => undefined;

/**
 * Partial types for mock Console and Process
 */
export interface MockConsole {
	log: Mock<ConsoleFn>;
	error: Mock<ConsoleFn>;
	warn?: Mock<ConsoleFn>;
	info?: Mock<ConsoleFn>;
	debug?: Mock<ConsoleFn>;
	trace?: Mock<ConsoleFn>;
}

export interface MockProcess {
	exit: Mock<() => never>;
}
