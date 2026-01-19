---
description: Filter and manipulate bibliography entries by criteria (author, year, keyword, entry type). Parse, search, extract entries, and format/pretty-print files. Use when the user asks to search, filter, extract, parse, or format bibliography files.
---

# bib-filter

Filter bibliography entries by various criteria.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts input.bib [criteria] --output=filtered.bib
```

## Filter Criteria

- `--id=<string>` - Filter by entry ID (exact match)
- `--author=<string>` - Filter by author name (substring match)
- `--year=<number>` - Filter by publication year
- `--type=<string>` - Filter by entry type (article, book, etc.)
- `--keyword=<string>` - Filter by keyword (substring match)

Multiple criteria are combined with AND logic.

## Options

- `--output=<file>` - Output file (prints to stdout if omitted)
- `--sort` - Sort filtered results

## Examples

**Find all papers by Smith:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --author=Smith
```

**Find papers from 2024:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --year=2024 --output=2024-papers.bib
```

**Find articles about machine learning:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --keyword="machine learning"
```

**Filter by type:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --type=article-journal
```

**Combine multiple criteria:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --author=Smith --year=2024 --type=article
```

## Output

```
Total entries: 150
Filtered entries: 12
[Filtered bibliography output...]
```

## Matching Behavior

- **ID**: Exact match
- **Author**: Case-insensitive substring match (checks all authors)
- **Year**: Exact year match
- **Type**: Exact type match (e.g., "article-journal")
- **Keyword**: Case-insensitive substring match

## Use Cases

**Extract subset for a specific paper:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts main.bib --keyword="neural networks" --output=nn-refs.bib
```

**Find all books:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --type=book
```

**Get recent publications:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --year=2024
```

## Notes

- Format is auto-detected
- Output uses same format as input
- Empty results return empty bibliography file
- Can be combined with `--sort` for ordered output
