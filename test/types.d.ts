/**
 * Type augmentations for Node.js test runner mock API
 */

import type { Mock } from "node:test";

declare module "node:test" {
	interface Mock<T extends Function> {
		mock: {
			calls: Array<{
				arguments: Parameters<T>;
				this: ThisType<T>;
			}>;
		};
	}
}

/**
 * Partial types for mock Console and Process
 */
export interface MockConsole {
	log: Mock<(...args: any[]) => undefined>;
	error: Mock<(...args: any[]) => undefined>;
	warn?: Mock<(...args: any[]) => undefined>;
	info?: Mock<(...args: any[]) => undefined>;
	debug?: Mock<(...args: any[]) => undefined>;
	trace?: Mock<(...args: any[]) => undefined>;
}

export interface MockProcess {
	exit: Mock<() => never>;
}
