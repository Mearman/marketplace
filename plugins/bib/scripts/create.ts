#!/usr/bin/env node
/**
 * Create a new bibliography entry
 *
 * Usage:
 *   npx tsx scripts/create.ts output.bib --id=smith2024 --type=article --title="My Article"
 */

import { writeFileSync, existsSync } from "fs";
import { parseArgs, readBibFile, isCSLItemType } from "./utils.js";
import { createEntry } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";
import type { BibEntry, BibFormat } from "../lib/types.js";

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
	if (!isCSLItemType(typeValue)) {
		console.error(`Error: Invalid type "${typeValue}". Valid types: article, book, chapter...`);
		process.exit(1);
	}
	const type = typeValue;

	if (!id) {
		console.error("Error: --id is required");
		process.exit(1);
	}

	const authorValue = args.options.get("author");
	const newEntry = createEntry({
		id,
		type,
		title: args.options.get("title"),
		author: authorValue !== undefined ? [{ literal: authorValue }] : undefined,
	});

	entries.push(newEntry);

	const output = generate(entries, format);
	writeFileSync(outputFile, output, "utf-8");

	console.log(`Created entry: ${id}`);
	console.log(`Written to: ${outputFile}`);
}

main();
