#!/usr/bin/env node
/**
 * Merge multiple bibliography files
 *
 * Usage:
 *   npx tsx scripts/merge.ts file1.bib file2.bib --output=merged.bib
 */

import { writeFileSync } from "fs";
import { parseArgs, readBibFile } from "./utils.js";
import { mergeEntries } from "../lib/crud/index.js";
import { generate } from "../lib/converter.js";

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.positional.length < 2) {
    console.error("Error: Need at least 2 files to merge");
    process.exit(1);
  }

  console.log(`Merging ${args.positional.length} files...`);

  const entrySets = args.positional.map((file) => {
    const { content, format } = readBibFile(file);
    const { parse } = require("../lib/converter.js");
    return parse(content, format).entries;
  });

  const dedupeBy = args.options.get("dedupe") === "doi" ? "doi" : "id";
  const merged = mergeEntries(entrySets, dedupeBy);

  console.log(`Total entries after merge: ${merged.length}`);

  const outputFormat = args.options.get("format") || "bibtex";
  const output = generate(merged, outputFormat as any, { sort: args.flags.has("sort") });

  const outputFile = args.options.get("output") || args.options.get("o");
  if (outputFile) {
    writeFileSync(outputFile, output, "utf-8");
    console.log(`Written to: ${outputFile}`);
  } else {
    console.log(output);
  }
}

main();
