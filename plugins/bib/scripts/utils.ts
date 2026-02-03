/**
 * Utility functions for bibliography plugin scripts
 *
 * Re-exports shared utilities from /lib and provides plugin-specific helpers.
 */

// Re-export from shared libraries
export { parseArgs } from "../../../lib/args/index.js";
export { formatNumber, formatDate } from "../../../lib/helpers/index.js";

// Plugin-specific utilities
import type { BibFormat, CSLItemType } from "../lib/types.js";
import type { ConversionWarning } from "../lib/types.js";
import type { ConversionStats } from "../lib/types.js";
import { detectFormat } from "../lib/converter.js";
import { readFileSync } from "fs";

/**
 * Valid bibliography formats
 */
const VALID_BIB_FORMATS: readonly string[] = ["bibtex", "biblatex", "csl-json", "ris", "endnote"];

/**
 * Type guard for BibFormat
 */
export function isBibFormat(value: string): value is BibFormat {
	return VALID_BIB_FORMATS.includes(value);
}

/**
 * Valid CSL item types
 */
const VALID_CSL_ITEM_TYPES: readonly string[] = [
	"article",
	"article-journal",
	"article-magazine",
	"article-newspaper",
	"bill",
	"book",
	"broadcast",
	"chapter",
	"dataset",
	"entry",
	"entry-dictionary",
	"entry-encyclopedia",
	"figure",
	"graphic",
	"interview",
	"legal_case",
	"legislation",
	"manuscript",
	"map",
	"motion_picture",
	"musical_score",
	"paper-conference",
	"patent",
	"personal_communication",
	"post",
	"post-weblog",
	"report",
	"review",
	"review-book",
	"song",
	"speech",
	"thesis",
	"treaty",
	"webpage",
	"software",
];

/**
 * Type guard for CSLItemType
 */
export function isCSLItemType(value: string): value is CSLItemType {
	return VALID_CSL_ITEM_TYPES.includes(value);
}

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

	if (isBibFormat(normalized)) {
		return normalized;
	}

	throw new Error(
		`Invalid format: ${formatStr}. Supported formats: ${VALID_BIB_FORMATS.join(", ")}`
	);
}

/**
 * Format warnings for display
 */
export function formatWarnings(warnings: ConversionWarning[]): string {
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
export function formatStats(stats: ConversionStats): string {
	const lines: string[] = [];
	lines.push("\nConversion Statistics:");
	lines.push(`  Total entries: ${stats.total}`);
	lines.push(`  Successful: ${stats.successful}`);
	lines.push(`  With warnings: ${stats.withWarnings}`);
	lines.push(`  Failed: ${stats.failed}`);
	return lines.join("\n");
}
