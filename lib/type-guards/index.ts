/**
 * Shared type guards for runtime type validation
 *
 * These guards eliminate the need for `as` type assertions by providing
 * proper runtime type narrowing that TypeScript understands.
 *
 * @example
 * import { isRecord, isErrnoException, isString } from "../../../lib/type-guards";
 *
 * const parsed: unknown = JSON.parse(content);
 * if (isRecord(parsed)) {
 *   // parsed is now Record<string, unknown>
 * }
 *
 * if (isErrnoException(error) && error.code === "ENOENT") {
 *   // TypeScript knows error has .code
 * }
 */

// ============================================================================
// Primitive Type Guards
// ============================================================================

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Check if value is a number (and not NaN)
 */
export function isNumber(value: unknown): value is number {
	return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

/**
 * Check if value is not null and not undefined
 */
export function isNonNullish<T>(value: T): value is NonNullable<T> {
	return value !== null && value !== undefined;
}

// ============================================================================
// Object Type Guards
// ============================================================================

/**
 * Check if value is a plain object (not null, array, or other special types)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Check if value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Check if value is an array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.every((item) => typeof item === "number" && !Number.isNaN(item));
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === "function";
}

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Check if value is an Error instance
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Check if value is a NodeJS ErrnoException (has code property)
 */
export function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
	return value instanceof Error && "code" in value;
}

/**
 * Check if error has a specific code
 */
export function hasErrorCode<T extends string>(value: unknown, code: T): value is NodeJS.ErrnoException & { code: T } {
	return isErrnoException(value) && value.code === code;
}

// ============================================================================
// Property Type Guards (for checking object properties)
// ============================================================================

/**
 * Check if object has a specific property
 */
export function hasProperty<K extends PropertyKey>(
	obj: unknown,
	key: K
): obj is Record<K, unknown> {
	return isRecord(obj) && key in obj;
}

/**
 * Check if object has a string property
 */
export function hasStringProperty<K extends string>(
	obj: unknown,
	key: K
): obj is Record<K, string> {
	return hasProperty(obj, key) && typeof obj[key] === "string";
}

/**
 * Check if object has a number property
 */
export function hasNumberProperty<K extends string>(
	obj: unknown,
	key: K
): obj is Record<K, number> {
	return hasProperty(obj, key) && typeof obj[key] === "number";
}

/**
 * Check if object has a boolean property
 */
export function hasBooleanProperty<K extends string>(
	obj: unknown,
	key: K
): obj is Record<K, boolean> {
	return hasProperty(obj, key) && typeof obj[key] === "boolean";
}

/**
 * Check if object has an array property
 */
export function hasArrayProperty<K extends string>(
	obj: unknown,
	key: K
): obj is Record<K, unknown[]> {
	return hasProperty(obj, key) && Array.isArray(obj[key]);
}

/**
 * Check if object has an object property (non-array)
 */
export function hasObjectProperty<K extends string>(
	obj: unknown,
	key: K
): obj is Record<K, Record<string, unknown>> {
	return hasProperty(obj, key) && isRecord(obj[key]);
}

// ============================================================================
// JSON Parsing Helpers
// ============================================================================

/**
 * Parse JSON safely and validate it's an object
 * @throws Error if JSON is invalid or not an object
 */
export function parseJsonObject(content: string): Record<string, unknown> {
	const parsed: unknown = JSON.parse(content);
	if (!isRecord(parsed)) {
		throw new Error("Expected JSON object");
	}
	return parsed;
}

/**
 * Parse JSON safely and validate it's an array
 * @throws Error if JSON is invalid or not an array
 */
export function parseJsonArray(content: string): unknown[] {
	const parsed: unknown = JSON.parse(content);
	if (!isArray(parsed)) {
		throw new Error("Expected JSON array");
	}
	return parsed;
}

/**
 * Parse JSON safely, returning null on failure
 */
export function tryParseJson(content: string): unknown {
	try {
		const result: unknown = JSON.parse(content);
		return result;
	} catch {
		return null;
	}
}

// ============================================================================
// Cache Entry Type Guard
// ============================================================================

/**
 * Validate cache entry structure
 */
export interface CacheEntryLike<T = unknown> {
	data: T;
	localCacheTimestamp: number;
}

/**
 * Check if value is a valid cache entry
 */
export function isCacheEntry(value: unknown): value is CacheEntryLike {
	return (
		isRecord(value) &&
		"data" in value &&
		"localCacheTimestamp" in value &&
		typeof value.localCacheTimestamp === "number"
	);
}

// ============================================================================
// Response Type Guards
// ============================================================================

/**
 * Check if object has required HTTP response properties
 */
export function hasResponseLikeProperties(value: unknown): value is { status: number; statusText: string } {
	return (
		isRecord(value) &&
		typeof value.status === "number" &&
		typeof value.statusText === "string"
	);
}

// ============================================================================
// Type Narrowing Utilities
// ============================================================================

/**
 * Assert that a condition is true, narrowing types
 * Use this for cases where you have verified a condition but TypeScript doesn't know
 */
export function assertDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
	if (value === null || value === undefined) {
		throw new Error(message ?? "Expected value to be defined");
	}
}

/**
 * Narrow type after validation (alternative to `as` assertion)
 * Only use when you've done runtime validation
 */
export function narrow<T>(value: unknown, validate: (v: unknown) => v is T, message?: string): T {
	if (!validate(value)) {
		throw new Error(message ?? "Type validation failed");
	}
	return value;
}

/**
 * Create a type predicate function that checks multiple properties
 */
export function hasRequiredProperties<T extends Record<string, string>>(
	schema: T
): (value: unknown) => value is Record<keyof T, unknown> {
	return (value: unknown): value is Record<keyof T, unknown> => {
		if (!isRecord(value)) return false;
		for (const key of Object.keys(schema)) {
			if (!(key in value)) return false;
			const expectedType = schema[key];
			const actualValue = value[key];
			switch (expectedType) {
			case "string":
				if (typeof actualValue !== "string") return false;
				break;
			case "number":
				if (typeof actualValue !== "number") return false;
				break;
			case "boolean":
				if (typeof actualValue !== "boolean") return false;
				break;
			case "object":
				if (!isRecord(actualValue)) return false;
				break;
			case "array":
				if (!Array.isArray(actualValue)) return false;
				break;
			}
		}
		return true;
	};
}
