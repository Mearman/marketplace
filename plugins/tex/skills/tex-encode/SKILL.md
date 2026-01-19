---
description: >
  Encode Unicode characters to LaTeX commands. Use when converting text with special characters (é, ü, ñ, etc.) to LaTeX format for use in .tex files, BibTeX entries, or LaTeX documents.
---

# LaTeX Unicode Encoder

Convert Unicode characters to LaTeX command syntax for use in LaTeX documents.

## Usage

```bash
npx tsx scripts/encode.ts [options] <text-or-file>
```

## Options

- `--file` - Read input from file instead of command line argument
- `--output <file>` - Write output to file
- `--format <type>` - Output format: `braced` (default) or `compact`

## Examples

### Encode text with accents
```bash
npx tsx scripts/encode.ts "café naïve"
# Output: caf\'{e} na\"{i}ve
```

### Encode from file
```bash
npx tsx scripts/encode.ts --file input.txt --output output.tex
```

### Encode for BibTeX
```bash
npx tsx scripts/encode.ts --format braced "Müller"
# Output: M\"{u}ller
```

## Supported Characters

- **Accented characters**: é, è, ê, ë, ñ, ü, etc.
- **Ligatures**: æ, œ, ß
- **Special characters**: &, %, $, #, _
- **Greek letters**: α, β, γ, δ, etc.
- **Dashes**: – (en-dash), — (em-dash)
- **Quotes**: ", ", ', '

## Technical Details

The encoder converts Unicode characters to LaTeX commands using a comprehensive mapping table:
- Accented vowels: `é` → `\'{e}`, `ü` → `\"{u}`
- Special characters: `&` → `\&`, `%` → `\%`
- Ligatures: `æ` → `\ae`, `ß` → `\ss`

Regular spaces are NOT escaped. Only special LaTeX characters and Unicode characters without ASCII equivalents are encoded.
