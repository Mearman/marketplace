---
description: Merge multiple bibliography files into one, handling duplicates and conflicts. Use when the user asks to combine, merge, or consolidate bibliography files.
---

# bib-merge

Merge multiple bibliography files, with automatic deduplication.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts file1.bib file2.bib file3.bib --output=merged.bib
```

## Options

- `--output=<file>` - Output file (prints to stdout if omitted)
- `--format=<format>` - Output format (default: bibtex)
- `--dedupe=<key>` - Deduplication key: `id` or `doi` (default: id)
- `--sort` - Sort merged entries by ID

## Deduplication

Entries are deduplicated based on the specified key:

**By ID (default):**
- Entries with same `id` field are considered duplicates
- First occurrence is kept

**By DOI:**
- Entries with same DOI are considered duplicates
- Useful for merging references to the same paper from different sources

## Examples

**Merge two BibTeX files:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts refs1.bib refs2.bib --output=all-refs.bib
```

**Merge and deduplicate by DOI:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts pubmed.ris scopus.bib --dedupe=doi --output=merged.bib
```

**Merge with sorting:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts *.bib --output=sorted.bib --sort
```

## Output

```
Merging 3 files...
Total entries after merge: 150
Written to: merged.bib
```

## Mixed Format Support

The merge tool handles files in different formats:

```bash
# Merge BibTeX + RIS + EndNote XML
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts refs.bib papers.ris data.xml --output=all.bib
```

All inputs are converted to the output format.

## Notes

- File formats are auto-detected
- Original metadata is preserved where possible
- Deduplication is case-sensitive
- Merge order matters (first occurrence wins for duplicates)
