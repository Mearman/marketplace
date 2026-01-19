#!/usr/bin/env node
/**
 * Delete bibliography entries
 *
 * Usage:
 *   npx tsx scripts/delete.ts input.bib --id=smith2024 --output=cleaned.bib
 */

import { writeFileSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { deleteEntries } from "../lib/crud/index.js";
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

  const filtered = deleteEntries(entries, [id]);

  console.log(`Deleted entry: ${id}`);
  console.log(`Remaining entries: ${filtered.length}`);

  const output = generate(filtered, format);

  const outputFile = args.options.get("output") || inputFile;
  writeFileSync(outputFile, output, "utf-8");

  console.log(`Written to: ${outputFile}`);
}

main();
