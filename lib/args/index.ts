/**
 * Shared argument parsing utilities
 *
 * Simple command-line argument parser that handles:
 * - Flags: --flag
 * - Options: --key=value
 * - Positional arguments
 *
 * @example
 * import { parseArgs } from "../../../lib/args";
 *
 * const args = parseArgs(process.argv.slice(2));
 * if (args.flags.has("help")) { ... }
 * const format = args.options.get("format") ?? "json";
 * const url = args.positional[0];
 */

export interface ParsedArgs {
	/**
	 * Boolean flags (e.g., --help, --no-cache)
	 */
	flags: Set<string>;

	/**
	 * Key-value options (e.g., --format=json)
	 */
	options: Map<string, string>;

	/**
	 * Positional arguments (non-flag arguments)
	 */
	positional: string[];
}

/**
 * Parse command-line arguments
 * @param argv - Arguments array (typically process.argv.slice(2))
 * @returns Parsed arguments with flags, options, and positional args
 */
export function parseArgs(argv: string[]): ParsedArgs {
	const flags = new Set<string>();
	const options = new Map<string, string>();
	const positional: string[] = [];

	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				const key = arg.slice(2, eqIndex);
				const value = arg.slice(eqIndex + 1);
				options.set(key, value);
			} else {
				flags.add(arg.slice(2));
			}
		} else {
			positional.push(arg);
		}
	}

	return { flags, options, positional };
}
