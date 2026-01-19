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

  const updates: any = {};
  if (args.options.get("title")) updates.title = args.options.get("title");
  if (args.options.get("type")) updates.type = args.options.get("type");

  entries[entryIndex] = updateEntry(entries[entryIndex], updates);

  const output = generate(entries, format);

  const outputFile = args.options.get("output") || inputFile;
  writeFileSync(outputFile, output, "utf-8");

  console.log(`Updated entry: ${id}`);
  console.log(`Written to: ${outputFile}`);
}

main();
