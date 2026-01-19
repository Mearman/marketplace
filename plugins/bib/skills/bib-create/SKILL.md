---
description: Create new bibliography entries with interactive prompts or from templates. Add entries to existing bibliography files. Use when the user asks to add, create, or insert new bibliography entries.
---

# bib-create

Create and add new entries to bibliography files.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/create.ts output.bib --id=<id> --type=<type> [fields...]
```

## Required Fields

- `--id=<string>` - Citation key (e.g., smith2024)
- `--type=<string>` - Entry type (article, book, etc.)

## Optional Fields

- `--title=<string>` - Entry title
- `--author=<string>` - Author name(s)

(More fields can be added by extending the script)

## Examples

**Create a new journal article:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/create.ts refs.bib \
  --id=smith2024 \
  --type=article-journal \
  --title="Machine Learning in Biology" \
  --author="Smith, John"
```

**Add to existing file:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/create.ts existing.bib \
  --id=jones2024 \
  --type=book \
  --title="Introduction to AI"
```

**Create new file:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/create.ts new-refs.bib \
  --id=first2024 \
  --type=article \
  --title="First Paper"
```

## Behavior

- If output file exists: entry is appended
- If output file doesn't exist: new file is created
- Format is auto-detected from existing file (defaults to BibTeX for new files)
- Duplicate IDs are not checked (user's responsibility)

## Entry Types

Common types:
- `article` / `article-journal` - Journal article
- `book` - Book
- `chapter` - Book chapter
- `paper-conference` - Conference paper
- `thesis` - Thesis/dissertation
- `dataset` - Dataset
- `software` - Software
- `webpage` - Web page

## Output

```
Created entry: smith2024
Written to: refs.bib
```

## Notes

- Minimal validation (only ID and type required)
- Additional fields should be added via --update or manual editing
- For complex entries, consider manual editing or conversion from another format
