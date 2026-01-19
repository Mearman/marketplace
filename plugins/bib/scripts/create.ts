#!/usr/bin/env node
/**
 * Create a new bibliography entry
 *
 * Usage:
 *   npx tsx scripts/create.ts output.bib --id=smith2024 --type=article --title="My Article"
 */

import { writeFileSync, existsSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { createEntry } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";
import type { BibEntry, BibFormat, CSLItemType } from "../lib/types.js";

function main() {
	const args = parseArgs(process.argv.slice(2));

	const outputFile = args.positional[0];
	if (!outputFile) {
		console.error("Error: No output file specified");
		process.exit(1);
	}

	// Read existing entries
	let entries: BibEntry[] = [];
	let format: BibFormat = "bibtex";
	if (existsSync(outputFile)) {
		const { content, format: detectedFormat } = readBibFile(outputFile);
		entries = parse(content, detectedFormat).entries;
		format = detectedFormat;
	}

	// Create new entry
	const id = args.options.get("id");

	// Validate type before using
	const typeValue = args.options.get("type") || "article";
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
	if (!validTypes.includes(typeValue)) {
		console.error(`Error: Invalid type "${typeValue}". Valid types: ${validTypes.slice(0, 5).join(", ")}...`);
		process.exit(1);
	}
	const type = typeValue as CSLItemType;

	if (!id) {
		console.error("Error: --id is required");
		process.exit(1);
	}

	const newEntry = createEntry({
		id,
		type,
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
