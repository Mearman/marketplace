#!/usr/bin/env node
/**
 * Validate bibliography file
 *
 * Usage:
 *   npx tsx scripts/validate.ts input.bib
 */

import { parseArgs, readBibFile, formatWarnings } from "./utils.js";
import { validate } from "../lib/converter.js";

function main() {
  const args = parseArgs(process.argv.slice(2));

  const inputFile = args.positional[0];
  if (!inputFile) {
    console.error("Error: No input file specified");
    process.exit(1);
  }

  const { content, format } = readBibFile(inputFile);

  console.log(`Validating ${format} file: ${inputFile}`);

  const warnings = validate(content, format);

  if (warnings.length === 0) {
    console.log("✓ No validation errors found");
  } else {
    console.log(formatWarnings(warnings));
    process.exit(1);
  }
}

main();
