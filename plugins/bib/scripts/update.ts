#!/usr/bin/env node
/**
 * Update an existing bibliography entry
 *
 * Usage:
 *   npx tsx scripts/update.ts input.bib --id=smith2024 --title="Updated Title" --output=updated.bib
 */

import { writeFileSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { updateEntry } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";
import type { BibEntry, CSLItemType } from "../lib/types.js";

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
		// Type guard: check if typeValue is a valid CSLItemType
		const validTypes: Array<string> = [
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
		if (validTypes.includes(typeValue)) {
			updates.type = typeValue as CSLItemType;
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
