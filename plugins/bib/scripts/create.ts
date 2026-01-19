#!/usr/bin/env node
/**
 * Create a new bibliography entry
 *
 * Usage:
 *   npx tsx scripts/create.ts output.bib --id=smith2024 --type=article --title="My Article"
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { createEntry } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";

function main() {
	const args = parseArgs(process.argv.slice(2));

	const outputFile = args.positional[0];
	if (!outputFile) {
		console.error("Error: No output file specified");
		process.exit(1);
	}

	// Read existing entries
	let entries: any[] = [];
	let format: any = "bibtex";
	if (existsSync(outputFile)) {
		const { content, format: detectedFormat } = readBibFile(outputFile);
		entries = parse(content, detectedFormat).entries;
		format = detectedFormat;
	}

	// Create new entry
	const id = args.options.get("id");
	const type = args.options.get("type") || "article";

	if (!id) {
		console.error("Error: --id is required");
		process.exit(1);
	}

	const newEntry = createEntry({
		id,
		type: type as any,
		title: args.options.get("title"),
		author: args.options.get("author") ? [{ literal: args.options.get("author")! }] : undefined,
	});

	entries.push(newEntry);

	const output = generate(entries, format);
	writeFileSync(outputFile, output, "utf-8");

	console.log(`Created entry: ${id}`);
	console.log(`Written to: ${outputFile}`);
}

main();
