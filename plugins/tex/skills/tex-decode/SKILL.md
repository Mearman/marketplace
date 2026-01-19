---
description: >
  Decode LaTeX commands to Unicode characters. Use when converting LaTeX-encoded text to readable Unicode format, extracting plain text from .tex files, or processing BibTeX entries for display.
---

# LaTeX Command Decoder

Convert LaTeX command syntax to Unicode characters for readable text output.

## Usage

```bash
npx tsx scripts/decode.ts [options] <text-or-file>
```

## Options

- `--file` - Read input from file instead of command line argument
- `--output <file>` - Write output to file
- `--strip` - Also remove formatting commands (like `\textbf`, `\emph`)

## Examples

### Decode LaTeX text
```bash
npx tsx scripts/decode.ts "caf\\'{e} na\\\"{\i}ve"
# Output: café naïve
```

### Decode from file
```bash
npx tsx scripts/decode.ts --file paper.tex --output readable.txt
```

### Decode and strip formatting
```bash
npx tsx scripts/decode.ts --strip "\\textbf{M\\\"{\u}ller}"
# Output: Müller
```

### Decode BibTeX author names
```bash
npx tsx scripts/decode.ts "M\\\"{\u}ller, Hans and Garc\\'{\i}a, Mar\\'{\i}a"
# Output: Müller, Hans and García, María
```

## Supported Commands

- **Accented characters**: `\'{e}`, `\`{a}`, `\^{o}`, `\"{u}`, `\~{n}`
- **Accent shortcuts**: `\'e`, `\"a` (without braces)
- **Ligatures**: `\ae`, `\oe`, `\ss`
- **Special characters**: `\&`, `\%`, `\$`, `\#`, `\_`
- **Greek letters**: `\alpha`, `\beta`, `\gamma`
- **Dashes**: `--` (en-dash), `---` (em-dash)
- **Quotes**: `` `` `` (open quote), `''` (close quote)

## Technical Details

The decoder uses a comprehensive mapping table with ~100 LaTeX commands. Commands are decoded in order of length (longest first) to handle overlapping patterns correctly.

Both braced (`\'{e}`) and non-braced (`\'e`) accent syntax is supported.
