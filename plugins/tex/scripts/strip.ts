#!/usr/bin/env node
/**
 * Strip all LaTeX commands and extract plain text
 */

import { readFileSync, writeFileSync } from "fs";
import { stripLatex } from "../../../lib/latex/index.js";
import { parseArgs } from "../../../lib/args/index.js";

function main() {
	const args = parseArgs(process.argv.slice(2));

	// Get input
	let input: string;
	if (args.flags.has("file")) {
		const filePath = args.positional[0];
		if (!filePath) {
			console.error("Error: No input file specified");
			process.exit(1);
		}
		input = readFileSync(filePath, "utf-8");
	} else {
		input = args.positional.join(" ");
		if (!input) {
			console.error("Error: No input text specified");
			console.error("Usage: strip.ts <text> or strip.ts --file <file>");
			process.exit(1);
		}
	}

	// Strip LaTeX commands
	const output = stripLatex(input);

	// Write output
	const outputFile = args.options.get("output");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.log(`Stripped text written to ${outputFile}`);
	} else {
		console.log(output);
	}
}

main();
