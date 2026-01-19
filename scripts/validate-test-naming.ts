#!/usr/bin/env npx tsx
/**
 * Validate test file naming convention
 * All test files must end with .unit.test.ts or .integration.test.ts
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const VALID_TEST_PATTERNS = [
	/\.unit\.test\.ts$/,
	/\.unit\.test\.tsx$/,
	/\.integration\.test\.ts$/,
	/\.integration\.test\.tsx$/,
];

const INVALID_TEST_PATTERN = /\.test\.(ts|tsx)$/;
const EXCLUDED_DIRS = ["node_modules", "dist", ".claude", "coverage", ".git"];

let exitCode = 0;

function scanDirectory(dir: string, baseDir: string = dir): string[] {
	const files: string[] = [];
	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			if (!EXCLUDED_DIRS.includes(item)) {
				files.push(...scanDirectory(fullPath, baseDir));
			}
		} else if (stat.isFile()) {
			files.push(fullPath);
		}
	}

	return files;
}

function validateTestFile(filePath: string): boolean {
	const fileName = filePath.split("/").pop() || "";

	// Check if it's a test file
	if (INVALID_TEST_PATTERN.test(fileName)) {
		// Check if it matches valid patterns
		const isValid = VALID_TEST_PATTERNS.some((pattern) => pattern.test(fileName));

		if (!isValid) {
			return false;
		}
	}

	return true;
}

function main(): void {
	const rootDir = process.cwd();
	const allFiles = scanDirectory(rootDir);
	const invalidFiles = allFiles.filter((file) => !validateTestFile(file));

	if (invalidFiles.length > 0) {
		console.error("❌ Invalid test file names found:\n");
		invalidFiles.forEach((file) => {
			const relPath = relative(rootDir, file);
			const fileName = relPath.split("/").pop() || "";
			console.error(`  ${relPath}`);
			console.error("    → Must end with .unit.test.ts, .unit.test.tsx, .integration.test.ts, or .integration.test.tsx");
			console.error(`    → Suggested rename: ${fileName.replace(/\.test\.(ts|tsx)$/, ".unit.test.$1")}\n`);
		});
		console.error(`\nFound ${invalidFiles.length} invalid test file name(s)\n`);
		exitCode = 1;
	} else {
		console.log("✓ All test files follow the naming convention");
	}
}

main();
process.exit(exitCode);
