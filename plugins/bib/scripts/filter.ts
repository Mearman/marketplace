#!/usr/bin/env node
/**
 * Filter bibliography entries by criteria
 *
 * Usage:
 *   npx tsx scripts/filter.ts input.bib --author=Smith --year=2024
 */

import { writeFileSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { filterEntries } from "../lib/crud/index.js";
import { parse, generate } from "../lib/converter.js";

// Define filter criteria type matching filterEntries expectations
type FilterCriteria = {
  id?: string;
  author?: string;
  year?: number;
  type?: string;
  keyword?: string;
};

function main() {
	const args = parseArgs(process.argv.slice(2));

	const inputFile = args.positional[0];
	if (!inputFile) {
		console.error("Error: No input file specified");
		process.exit(1);
	}

	const { content, format } = readBibFile(inputFile);
	const entries = parse(content, format).entries;

	console.log(`Total entries: ${entries.length}`);

	const criteria: Partial<FilterCriteria> = {};
	if (args.options.get("id")) criteria.id = args.options.get("id");
	if (args.options.get("author")) criteria.author = args.options.get("author");
	if (args.options.get("year")) criteria.year = parseInt(args.options.get("year")!);
	if (args.options.get("type")) criteria.type = args.options.get("type");
	if (args.options.get("keyword")) criteria.keyword = args.options.get("keyword");

	const filtered = filterEntries(entries, criteria);

	console.log(`Filtered entries: ${filtered.length}`);

	const output = generate(filtered, format, { sort: args.flags.has("sort") });

	const outputFile = args.options.get("output") || args.options.get("o");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.log(`Written to: ${outputFile}`);
	} else {
		console.log(output);
	}
}

main();
