#!/usr/bin/env node
/**
 * Read and display bibliography entries
 *
 * Usage:
 *   npx tsx scripts/read.ts input.bib
 *   npx tsx scripts/read.ts input.bib --id=smith2024
 */

import { parseArgs, readBibFile } from "./utils.js";
import { filterEntries } from "../lib/crud/index.js";
import { parse } from "../lib/converter.js";

function main() {
  const args = parseArgs(process.argv.slice(2));

  const inputFile = args.positional[0];
  if (!inputFile) {
    console.error("Error: No input file specified");
    process.exit(1);
  }

  const { content, format } = readBibFile(inputFile);
  const entries = parse(content, format).entries;

  const id = args.options.get("id");
  const filtered = id ? filterEntries(entries, { id }) : entries;

  for (const entry of filtered) {
    console.log(`\n[${entry.id}] ${entry.type}`);
    if (entry.author) {
      const authors = entry.author.map((a) => a.family || a.literal).join(", ");
      console.log(`  Authors: ${authors}`);
    }
    if (entry.title) console.log(`  Title: ${entry.title}`);
    if (entry.issued) {
      const year = entry.issued["date-parts"]?.[0]?.[0];
      if (year) console.log(`  Year: ${year}`);
    }
  }

  console.log(`\nTotal: ${filtered.length} entries`);
}

main();
