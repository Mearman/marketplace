---
description: Read and display bibliography entries with formatting options. Query specific entries by ID, author, or other criteria. Use when the user asks to show, display, view, or read bibliography entries.
---

# bib-read

Read and display bibliography entries in a human-readable format.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts input.bib [--id=<id>]
```

## Options

- `--id=<string>` - Show only entry with this ID

## Examples

**Display all entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib
```

**Display specific entry:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib --id=smith2024
```

## Output Format

Each entry is displayed with key information:

```
[smith2024] article-journal
  Authors: Smith, John
  Title: Machine Learning in Biology
  Year: 2024

[jones2023] book
  Authors: Jones, Jane
  Title: Introduction to AI
  Year: 2023

Total: 2 entries
```

## Use Cases

**Quick lookup:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib --id=important2024
```

**Browse all entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib | less
```

**Count entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib | grep "Total:"
```

## Notes

- Format is auto-detected
- Output is human-readable (not machine-parseable)
- For filtering by author/year, use `bib-filter` instead
- For full entry details, open file in editor or convert to JSON
