---
description: Validate bibliography files for format correctness and completeness. Check for required fields, syntax errors, and format-specific rules. Use when the user asks to validate, check, or verify bibliography files.
---

# bib-validate

Validate bibliography files for syntax errors, format compliance, and completeness.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/validate.ts input.bib
```

The script automatically detects the format and validates accordingly.

## Validation Checks

**All Formats:**
- Syntax correctness
- Required fields presence
- Entry structure

**BibTeX/BibLaTeX:**
- Balanced braces
- Valid entry types
- String macro definitions
- Field syntax

**RIS:**
- TY/ER tag pairs
- Tag format (XX  - value)
- Required TY tag

**EndNote XML:**
- XML well-formedness
- Record structure
- Required fields

**CSL JSON:**
- Valid JSON syntax
- Required `id` and `type` fields
- Array/object structure

## Output

**Success:**
```
✓ No validation errors found
```

**Errors Found:**
```
Warnings:
  [ERROR] smith2024: Missing required field 'title'
  [WARNING] jones2023: Unknown entry type 'dataset' for BibTeX
```

Exit code: 1 if errors found, 0 if valid.

## Examples

**Validate BibTeX file:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/validate.ts references.bib
```

**Validate RIS file:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/validate.ts papers.ris
```

## Common Validation Errors

**BibTeX:**
- Unmatched braces: `title = {The {RNA} World`
- Missing comma: `title = "Paper" author = "Smith"`
- Invalid entry type: `@unknown{key,`

**RIS:**
- Missing TY tag
- Unclosed entry (missing ER tag)
- Invalid tag format

**CSL JSON:**
- Invalid JSON syntax
- Missing required fields
- Wrong data types

## Notes

- Format is auto-detected
- Validation is fast and non-destructive
- Use before converting to catch errors early
