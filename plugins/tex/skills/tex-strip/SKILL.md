---
description: >
  Strip all LaTeX commands and extract plain text. Use when extracting readable text from LaTeX documents, removing formatting for analysis, or converting LaTeX to plain text.
---

# LaTeX Command Stripper

Extract plain text from LaTeX documents by removing all commands and formatting.

## Usage

```bash
npx tsx scripts/strip.ts [options] <text-or-file>
```

## Options

- `--file` - Read input from file instead of command line argument
- `--output <file>` - Write output to file
- `--keep-structure` - Preserve paragraph breaks and spacing

## Examples

### Strip formatting commands
```bash
npx tsx scripts/strip.ts "\\textbf{Bold} and \\emph{italic} text"
# Output: Bold and italic text
```

### Strip nested commands
```bash
npx tsx scripts/strip.ts "\\textbf{\\emph{nested}}"
# Output: nested
```

### Extract plain text from file
```bash
npx tsx scripts/strip.ts --file paper.tex --output plain.txt
```

### Strip LaTeX with Unicode conversion
```bash
npx tsx scripts/strip.ts "M\\\"{\u}ller wrote \\textit{many papers}"
# Output: Müller wrote many papers
```

## What Gets Stripped

- **Formatting commands**: `\textbf`, `\emph`, `\textit`, `\underline`
- **Font commands**: `\textrm`, `\textsf`, `\texttt`
- **Size commands**: `\large`, `\small`, `\tiny`
- **Nested commands**: Recursively removes all levels of nesting
- **Escaped characters**: Converts `\&` → `&`, `\%` → `%`, etc.

## What Gets Preserved

- **Text content**: All readable text is preserved
- **Accented characters**: LaTeX accents are decoded to Unicode
- **Whitespace**: Single spaces are preserved and normalized

## Technical Details

The stripper works in two phases:

1. **Decode phase**: Known LaTeX commands (accents, ligatures, special chars) are decoded to Unicode
2. **Strip phase**: Remaining formatting commands are removed iteratively to handle nesting

Commands are removed using pattern matching: `\command{content}` → `content`

Extra whitespace is normalized to single spaces, and leading/trailing whitespace is trimmed.
