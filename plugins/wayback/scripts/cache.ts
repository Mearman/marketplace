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

const CACHE_DIR = path.join(os.tmpdir(), "wayback-cache");

const clearCache = async (verbose: boolean): Promise<void> => {
	try {
		const files = await fs.readdir(CACHE_DIR);
		const cacheFiles = files.filter((f) => f.endsWith(".json"));

		if (cacheFiles.length === 0) {
			console.log("Cache is already empty");
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

			console.log(`Deleting ${cacheFiles.length} file(s) from ${CACHE_DIR}`);
			for (const { file, size } of fileStats) {
				console.log(`  ${file} (${(size / 1024).toFixed(2)} KB)`);
			}
			console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
		} else {
			console.log(`Clearing ${cacheFiles.length} cache file(s) from ${CACHE_DIR}`);
		}

		await Promise.all(
			cacheFiles.map((f) => fs.unlink(path.join(CACHE_DIR, f)))
		);

		console.log("✓ Cache cleared");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.log("Cache directory not found or already empty");
		} else {
			console.error("Error clearing cache:", error);
			process.exit(1);
		}
	}
};

const showStatus = async (verbose: boolean): Promise<void> => {
	try {
		const files = await fs.readdir(CACHE_DIR);
		const cacheFiles = files.filter((f) => f.endsWith(".json"));

		console.log(`Cache directory: ${CACHE_DIR}`);
		console.log(`Cached files: ${cacheFiles.length}`);

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

			console.log(`\nTotal size: ${(totalSize / 1024).toFixed(2)} KB\n`);

			console.log("Cache entries (newest first):");
			for (const { file, size, modified } of fileStats) {
				const age = Math.floor((Date.now() - modified.getTime()) / 1000 / 60);
				const ageStr = age < 60 ? `${age}m` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;
				console.log(`  ${file} (${(size / 1024).toFixed(2)} KB, ${ageStr} ago)`);
			}
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.log(`Cache directory: ${CACHE_DIR}`);
			console.log("Cached files: 0");
			console.log("\nCache directory does not exist yet (no API calls made)");
		} else {
			console.error("Error reading cache:", error);
			process.exit(1);
		}
	}
};

const main = async () => {
	const args = process.argv.slice(2);
	const flags = new Set(args.filter((a) => a.startsWith("--")));
	const positional = args.filter((a) => !a.startsWith("--"));

	const verbose = flags.has("--verbose");
	const command = positional[0];

	if (!command) {
		console.log(`Usage: npx tsx cache.ts <command> [options]

Commands:
  clear             Clear all cached data
  status            Show cache directory and file count

Options:
  --verbose         Show detailed output including file sizes

Examples:
  npx tsx cache.ts clear
  npx tsx cache.ts status
  npx tsx cache.ts status --verbose`);
		process.exit(1);
	}

	switch (command) {
	case "clear":
		await clearCache(verbose);
		break;
	case "status":
		await showStatus(verbose);
		break;
	default:
		console.error(`Unknown command: ${command}`);
		console.log("Valid commands: clear, status");
		process.exit(1);
	}
};

main();
