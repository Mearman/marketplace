#!/usr/bin/env node
/**
 * Update an existing bibliography entry
 *
 * Usage:
 *   npx tsx scripts/update.ts input.bib --id=smith2024 --title="Updated Title" --output=updated.bib
 */

import { writeFileSync } from "fs";
import { parseArgs, readBibFile, isCSLItemType } from "./utils.js";
import { updateEntry } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";
import type { BibEntry } from "../lib/types.js";

function main() {
	const args = parseArgs(process.argv.slice(2));

	const inputFile = args.positional[0];
	if (!inputFile) {
		console.error("Error: No input file specified");
		process.exit(1);
	}

	const id = args.options.get("id");
	if (!id) {
		console.error("Error: --id is required");
		process.exit(1);
	}

	const { content, format } = readBibFile(inputFile);
	const entries = parse(content, format).entries;

	const entryIndex = entries.findIndex((e) => e.id === id);
	if (entryIndex === -1) {
		console.error(`Error: Entry '${id}' not found`);
		process.exit(1);
	}

	const updates: Partial<BibEntry> = {};
	if (args.options.get("title")) updates.title = args.options.get("title");

	// Validate type before assigning
	const typeValue = args.options.get("type");
	if (typeValue) {
		if (isCSLItemType(typeValue)) {
			updates.type = typeValue;
		} else {
			console.warn(`Warning: "${typeValue}" is not a valid CSL type, skipping`);
		}
	}

	entries[entryIndex] = updateEntry(entries[entryIndex], updates);

	const output = generate(entries, format);

	const outputFile = args.options.get("output") || inputFile;
	writeFileSync(outputFile, output, "utf-8");

	console.log(`Updated entry: ${id}`);
	console.log(`Written to: ${outputFile}`);
}

main();
