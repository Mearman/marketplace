#!/usr/bin/env npx tsx
/**
 * Manage Wayback Machine API cache
 * Usage: npx tsx cache.ts <command> [options]
 *
 * Commands:
 *   clear             Clear all cached data
 *   status            Show cache directory and file count
 *
 * Options:
 *   --verbose         Show detailed output including file sizes
 */

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { isErrnoException } from "../../../lib/type-guards";

const CACHE_DIR = path.join(os.tmpdir(), "wayback-cache");

// ============================================================================
// Types
// ============================================================================

export interface Dependencies {
	console: Console;
	process: NodeJS.Process;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	_command: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("\nError:", message);
	deps.process.exit(1);
};

// ============================================================================
// Helper Functions
// ============================================================================

const clearCache = async (verbose: boolean, deps: Dependencies): Promise<void> => {
	try {
		const files = await fs.readdir(CACHE_DIR);
		const cacheFiles = files.filter((f) => f.endsWith(".json"));

		if (cacheFiles.length === 0) {
			deps.console.log("Cache is already empty");
			return;
		}

		if (verbose) {
			let totalSize = 0;
			const fileStats = await Promise.all(
				cacheFiles.map(async (f) => {
					const filePath = path.join(CACHE_DIR, f);
					const stat = await fs.stat(filePath);
					totalSize += stat.size;
					return { file: f, size: stat.size };
				})
			);

			deps.console.log(`Deleting ${cacheFiles.length} file(s) from ${CACHE_DIR}`);
			for (const { file, size } of fileStats) {
				deps.console.log(`  ${file} (${(size / 1024).toFixed(2)} KB)`);
			}
			deps.console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
		} else {
			deps.console.log(`Clearing ${cacheFiles.length} cache file(s) from ${CACHE_DIR}`);
		}

		await Promise.all(
			cacheFiles.map((f) => fs.unlink(path.join(CACHE_DIR, f)))
		);

		deps.console.log("✓ Cache cleared");
	} catch (error) {
		if (isErrnoException(error) && error.code === "ENOENT") {
			deps.console.log("Cache directory not found or already empty");
		} else {
			handleError(error, "clear", deps);
		}
	}
};

const showStatus = async (verbose: boolean, deps: Dependencies): Promise<void> => {
	try {
		const files = await fs.readdir(CACHE_DIR);
		const cacheFiles = files.filter((f) => f.endsWith(".json"));

		deps.console.log(`Cache directory: ${CACHE_DIR}`);
		deps.console.log(`Cached files: ${cacheFiles.length}`);

		if (verbose && cacheFiles.length > 0) {
			let totalSize = 0;
			const fileStats = await Promise.all(
				cacheFiles.map(async (f) => {
					const filePath = path.join(CACHE_DIR, f);
					const stat = await fs.stat(filePath);
					totalSize += stat.size;
					return { file: f, size: stat.size, modified: stat.mtime };
				})
			);

			// Sort by modification time (newest first)
			fileStats.sort((a, b) => b.modified.getTime() - a.modified.getTime());

			deps.console.log(`\nTotal size: ${(totalSize / 1024).toFixed(2)} KB\n`);

			deps.console.log("Cache entries (newest first):");
			for (const { file, size, modified } of fileStats) {
				const age = Math.floor((Date.now() - modified.getTime()) / 1000 / 60);
				const ageStr = age < 60 ? `${age}m` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;
				deps.console.log(`  ${file} (${(size / 1024).toFixed(2)} KB, ${ageStr} ago)`);
			}
		}
	} catch (error) {
		if (isErrnoException(error) && error.code === "ENOENT") {
			deps.console.log(`Cache directory: ${CACHE_DIR}`);
			deps.console.log("Cached files: 0");
			deps.console.log("\nCache directory does not exist yet (no API calls made)");
		} else {
			handleError(error, "status", deps);
		}
	}
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (
	args: { flags: Set<string>; positional: string[] },
	deps: Dependencies
): Promise<void> => {
	const { flags, positional } = args;

	const verbose = flags.has("--verbose");
	const command = positional[0];

	if (!command) {
		deps.console.log(`Usage: npx tsx cache.ts <command> [options]

Commands:
  clear             Clear all cached data
  status            Show cache directory and file count

Options:
  --verbose         Show detailed output including file sizes

Examples:
  npx tsx cache.ts clear
  npx tsx cache.ts status
  npx tsx cache.ts status --verbose`);
		deps.process.exit(1);
	}

	switch (command) {
	case "clear":
		await clearCache(verbose, deps);
		break;
	case "status":
		await showStatus(verbose, deps);
		break;
	default:
		deps.console.error(`Unknown command: ${command}`);
		deps.console.log("Valid commands: clear, status");
		deps.process.exit(1);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	console,
	process,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	const flags = new Set(args.filter((a) => a.startsWith("--")));
	const positional = args.filter((a) => !a.startsWith("--"));

	main({ flags, positional }, defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	});
}
