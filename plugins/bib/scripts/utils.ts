/**
 * Utility functions for bibliography plugin scripts
 *
 * Re-exports shared utilities from /lib and provides plugin-specific helpers.
 */

// Re-export from shared libraries
export { parseArgs } from "../../../lib/args/index.js";
export { formatNumber, formatDate } from "../../../lib/helpers/index.js";

// Plugin-specific utilities
import type { BibFormat } from "../lib/types.js";
import { detectFormat } from "../lib/converter.js";
import { readFileSync } from "fs";

/**
 * Read and detect format of a bibliography file
 */
export function readBibFile(filePath: string): { content: string; format: BibFormat } {
	const content = readFileSync(filePath, "utf-8");
	const detected = detectFormat(content);

	if (!detected) {
		throw new Error(
			`Could not detect format of ${filePath}. Supported formats: bibtex, biblatex, csl-json, ris, endnote`
		);
	}

	return { content, format: detected };
}

/**
 * Parse format string to BibFormat
 */
export function parseFormat(formatStr: string): BibFormat {
	const normalized = formatStr.toLowerCase().trim();

	const validFormats: BibFormat[] = ["bibtex", "biblatex", "csl-json", "ris", "endnote"];

	if (validFormats.includes(normalized as BibFormat)) {
		return normalized as BibFormat;
	}

	throw new Error(
		`Invalid format: ${formatStr}. Supported formats: ${validFormats.join(", ")}`
	);
}

/**
 * Format warnings for display
 */
export function formatWarnings(warnings: any[]): string {
	if (warnings.length === 0) {
		return "";
	}

	const lines: string[] = [];
	lines.push("\nWarnings:");

	for (const warning of warnings) {
		const prefix = warning.severity === "error" ? "ERROR" : "WARNING";
		lines.push(`  [${prefix}] ${warning.entryId}: ${warning.message}`);
	}

	return lines.join("\n");
}

/**
 * Format conversion stats for display
 */
export function formatStats(stats: any): string {
	const lines: string[] = [];
	lines.push("\nConversion Statistics:");
	lines.push(`  Total entries: ${stats.total}`);
	lines.push(`  Successful: ${stats.successful}`);
	lines.push(`  With warnings: ${stats.withWarnings}`);
	lines.push(`  Failed: ${stats.failed}`);
	return lines.join("\n");
}
