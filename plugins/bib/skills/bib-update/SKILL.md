---
description: Modify existing bibliography entries by updating fields, changing entry types, or correcting values. Use when the user asks to edit, update, modify, or change bibliography entries.
---

# bib-update

Update existing bibliography entries.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/update.ts input.bib --id=<id> [fields...] --output=updated.bib
```

## Required

- `--id=<string>` - ID of entry to update

## Updatable Fields

- `--title=<string>` - Update title
- `--type=<string>` - Change entry type
- (Additional fields can be added by extending the script)

## Options

- `--output=<file>` - Output file (overwrites input if omitted)

## Examples

**Update title:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/update.ts refs.bib \
  --id=smith2024 \
  --title="Updated Title" \
  --output=refs-updated.bib
```

**Change entry type:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/update.ts refs.bib \
  --id=smith2024 \
  --type=book
```

**Update in-place:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/update.ts refs.bib \
  --id=jones2023 \
  --title="Corrected Title"
```

## Behavior

- Entry must exist (error if not found)
- Only specified fields are updated
- Other fields remain unchanged
- Format is preserved
- Overwrites input file if `--output` is omitted

## Output

```
Updated entry: smith2024
Written to: refs-updated.bib
```

## Notes

- ID cannot be changed (it's the key)
- For complex updates, consider:
  1. Export to JSON
  2. Edit JSON
  3. Convert back to original format
- Format is auto-detected and preserved
