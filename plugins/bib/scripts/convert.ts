#!/usr/bin/env node
/**
 * Convert bibliography between formats
 *
 * Usage:
 *   npx tsx scripts/convert.ts input.bib --to=csl-json --output=output.json
 *   npx tsx scripts/convert.ts input.bib --from=bibtex --to=ris
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs, parseFormat, formatWarnings, formatStats } from "./utils.js";
import { convert, detectFormat } from "../lib/converter.js";

function main() {
	const args = parseArgs(process.argv.slice(2));

	// Get input file
	const inputFile = args.positional[0];
	if (!inputFile) {
		console.error("Error: No input file specified");
		console.error("Usage: convert.ts <input-file> --to=<format> [options]");
		process.exit(1);
	}

	// Read input
	const content = readFileSync(inputFile, "utf-8");

	// Determine source format
	let sourceFormat: import("../lib/types.js").BibFormat;
	const fromOpt = args.options.get("from");
	if (!fromOpt) {
		const detected = detectFormat(content);
		if (!detected) {
			console.error("Error: Could not detect input format. Use --from=<format>");
			process.exit(1);
		}
		sourceFormat = detected;
		console.log(`Detected format: ${sourceFormat}`);
	} else {
		sourceFormat = parseFormat(fromOpt);
	}

	// Determine target format
	const toFormat = args.options.get("to");
	if (!toFormat) {
		console.error("Error: No target format specified. Use --to=<format>");
		process.exit(1);
	}
	const targetFormat = parseFormat(toFormat);

	// Convert
	console.log(`Converting ${sourceFormat} → ${targetFormat}...`);
	const { output, result } = convert(content, sourceFormat, targetFormat, {
		indent: args.options.get("indent") || "  ",
		sort: args.flags.has("sort"),
	});

	// Display stats
	console.log(formatStats(result.stats));

	// Display warnings
	if (result.warnings.length > 0) {
		console.log(formatWarnings(result.warnings));
	}

	// Output
	const outputFile = args.options.get("output") || args.options.get("o");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.log(`\nOutput written to: ${outputFile}`);
	} else {
		console.log("\n" + output);
	}
}

main();
