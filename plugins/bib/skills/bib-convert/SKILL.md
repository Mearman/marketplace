---
description: Convert bibliography files between formats (BibTeX, BibLaTeX, RIS, EndNote XML, CSL JSON). Use when the user asks to convert, transform, or change bibliography formats.
---

# bib-convert

Convert bibliography files between 5 supported formats:
- **BibTeX** - Classic LaTeX bibliography format
- **BibLaTeX** - Extended BibTeX with modern entry types (dataset, software, online)
- **CSL JSON** - Citation Style Language JSON (universal format)
- **RIS** - Reference Manager format (tag-based)
- **EndNote XML** - EndNote reference manager XML format

## Usage

Convert bibliography to another format:

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/convert.ts input.bib --to=csl-json --output=output.json
```

### Options

- `--from=<format>` - Source format (auto-detected if omitted)
- `--to=<format>` - Target format (**required**)
- `--output=<file>` - Output file (prints to stdout if omitted)
- `--sort` - Sort entries by ID
- `--indent=<string>` - Indentation for formatted output (default: 2 spaces)

### Supported Formats

- `bibtex` - BibTeX (.bib)
- `biblatex` - BibLaTeX (.bib)
- `csl-json` - CSL JSON (.json)
- `ris` - RIS (.ris)
- `endnote` - EndNote XML (.xml)

## Examples

**Convert BibTeX to CSL JSON:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/convert.ts references.bib --to=csl-json --output=references.json
```

**Convert RIS to BibTeX with sorting:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/convert.ts papers.ris --to=bibtex --output=papers.bib --sort
```

**Auto-detect source format:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/convert.ts mystery.txt --to=bibtex
```

## Conversion Architecture

The plugin uses a hub-and-spoke architecture with CSL JSON as the intermediate format:

```
BibTeX ←→ BibLaTeX ←→ CSL JSON ←→ RIS
                          ↕
                      EndNote XML
```

This ensures maximum fidelity for conversions between related formats while supporting all 5 formats.

## Lossy Conversions

Some conversions may be lossy:

**To BibTeX (lossy for modern types):**
- `dataset` → `@misc` (BibTeX has no dataset type)
- `software` → `@misc`
- `webpage` → `@misc`
- `patent` → `@misc`

Warnings are generated for lossy conversions. Original type information is preserved in metadata for round-trip conversions.

**To BibLaTeX (no loss):**
All CSL JSON types map to BibLaTeX types without loss.

## Output

The script outputs:
1. Conversion statistics (total, successful, warnings, failed)
2. Warnings for lossy conversions or parse errors
3. Converted bibliography (to file or stdout)

## Notes

- Format auto-detection works for most files
- LaTeX special characters are automatically encoded/decoded (ä ↔ \"{a})
- Name parsing handles particles (von, van, de) and suffixes (Jr., III)
- Date parsing supports multiple formats (ISO, natural language)
