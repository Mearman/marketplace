---
description: >
  Protect text from LaTeX interpretation by wrapping in braces. Use when preserving capitalization in BibTeX titles, protecting acronyms from lowercasing, or ensuring specific text isn't interpreted as LaTeX commands.
---

# LaTeX Text Protector

Wrap text in protective braces to prevent LaTeX from interpreting or modifying it.

## Usage

```bash
npx tsx scripts/protect.ts [options] <text-or-file>
```

## Options

- `--file` - Read input from file instead of command line argument
- `--output <file>` - Write output to file
- `--mode <type>` - Protection mode: `acronyms` (default), `all`, or `custom`
- `--pattern <regex>` - Custom regex pattern for what to protect

## Examples

### Protect acronyms in title
```bash
npx tsx scripts/protect.ts "The RNA World Hypothesis"
# Output: The {RNA} World Hypothesis
```

### Protect multiple acronyms
```bash
npx tsx scripts/protect.ts "DNA and RNA in COVID-19"
# Output: {DNA} and {RNA} in {COVID-19}
```

### Protect from file
```bash
npx tsx scripts/protect.ts --file titles.txt --output protected.txt
```

### Protect all uppercase words
```bash
npx tsx scripts/protect.ts --mode all "IMPORTANT Notice"
# Output: {IMPORTANT} {Notice}
```

### Custom protection pattern
```bash
npx tsx scripts/protect.ts --pattern "[A-Z]{2,}" "DNA RNA ATP"
# Output: {DNA} {RNA} {ATP}
```

## Protection Modes

### `acronyms` (default)
Protects words with 2+ consecutive uppercase letters:
- `RNA` → `{RNA}`
- `COVID-19` → `{COVID-19}`
- `DNA` → `{DNA}`

Single uppercase letters are NOT protected: `A Study` → `A Study`

### `all`
Protects any word starting with uppercase:
- `Important` → `{Important}`
- `Notice` → `{Notice}`

### `custom`
Protects text matching a custom regex pattern

## Why Protect Text?

### BibTeX Title Capitalization
BibTeX automatically lowercases titles except for protected text:
```bibtex
title = {The RNA World}  % → "The rna world" (wrong!)
title = {The {RNA} World}  % → "The RNA World" (correct!)
```

### Preserving Acronyms
Protects technical terms and acronyms from case changes:
- `DNA`, `RNA`, `HTTP`, `API`
- `COVID-19`, `SARS-CoV-2`

### Chemical Formulas
Protects chemical notation:
- `H2O` → `{H2O}`
- `CO2` → `{CO2}`

## Unprotect

To remove protective braces:
```bash
npx tsx scripts/unprotect.ts "{RNA} and {DNA}"
# Output: RNA and DNA
```

## Technical Details

Protection works by wrapping matched text in single-level braces `{...}`. LaTeX treats braced text as a single unit and doesn't modify its capitalization.

The default pattern `/\b([A-Z]{2,})\b/g` matches:
- 2+ consecutive uppercase letters
- Word boundaries (doesn't match mid-word uppercase)
- Hyphens and numbers within words: `COVID-19` matches

Single uppercase letters at word boundaries are intentionally NOT protected to allow normal sentence capitalization.
