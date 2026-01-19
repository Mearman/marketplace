---
description: Remove entries from bibliography files by ID or matching criteria. Use when the user asks to delete, remove, or purge bibliography entries.
---

# bib-delete

Delete entries from bibliography files.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/delete.ts input.bib --id=<id> --output=cleaned.bib
```

## Required

- `--id=<string>` - ID of entry to delete

## Options

- `--output=<file>` - Output file (overwrites input if omitted)

## Examples

**Delete specific entry:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/delete.ts refs.bib \
  --id=smith2024 \
  --output=refs-cleaned.bib
```

**Delete in-place:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/delete.ts refs.bib --id=outdated2020
```

## Behavior

- Entry must exist (error if not found)
- All other entries are preserved
- Format is preserved
- Overwrites input file if `--output` is omitted

## Output

```
Deleted entry: smith2024
Remaining entries: 149
Written to: refs-cleaned.bib
```

## Bulk Deletion

For deleting multiple entries, use in combination with filters:

**Delete all entries from 2020:**
```bash
# Step 1: Filter to keep only 2020 entries
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --year=2020 --output=to-delete.bib

# Step 2: Get IDs and delete manually
# (Bulk delete would require script enhancement)
```

**Alternative approach - filter to keep:**
```bash
# Keep everything EXCEPT 2020
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/filter.ts refs.bib --year=2021 --output=2021-only.bib
# Then merge other years...
```

## Notes

- Deletion is permanent (no undo)
- Consider backing up files before deletion
- For complex deletions, use `bib-filter` to extract what you want to keep
- Format is auto-detected and preserved
