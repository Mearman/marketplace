# Bibliography manipulation plugin supporting BibTeX, BibLaTeX, RIS, EndNote XML, and CSL JSON formats (bib)

Bibliography manipulation plugin supporting BibTeX, BibLaTeX, RIS, EndNote XML, and CSL JSON formats: Convert, validate, merge, filter, and perform CRUD operations on bibliography files.

**Version:** v0.2.0
**Install:** `/plugin install bib@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Web Page Citation Creator

Create bibliography citations from web page URLs with automatic archival snapshot and metadata extraction.

## Features

- **Wayback Machine Integration**: Automatically submits URLs to the Internet Archive for preservation
- **Metadata Extraction**: Extracts title, author, description, site name, and publish date from semantic HTML
- **Multiple Formats**: Outputs citations in BibTeX or CSL JSON format
- **Smart Citation Keys**: Generates citation keys from domain + author + year

## Usage

```bash
npx tsx plugins/bib/scripts/cite-web.ts <url>
npx tsx plugins/bib/scripts/cite-web.ts <url> --format=bibtex
npx tsx plugins/bib/scripts/cite-web.ts <url> --no-wayback
npx tsx plugins/bib/scripts/cite-web.ts <url> --output=citations.bib
```

## Metadata Extraction

The script extracts metadata from semantic HTML tags:

### Title
- `<title>` tag
- Open Graph: `<meta property="og:title">`
- Twitter Card: `<meta name="twitter:title">`
- Standard: `<meta name="title">`

### Author
- `<meta name="author">`
- Open Graph: `<meta property="og:author">` or `<meta property="article:author">`
- Twitter Card: `<meta name="twitter:creator">`

### Description
- `<meta name="description">`
- Open Graph: `<meta property="og:description">`
- Twitter Card: `<meta name="twitter:description">`

### Site Name
- Open Graph: `<meta property="og:site_name">`
- `<meta name="application-name">`

### Published Date
- Open Graph: `<meta property="article:published_time">`
- `<meta name="publish-date">` or `<meta name="date">`

## Arguments

- **Positional argument**: URL to cite
- **`--file <path>`**: Read URL from file (uses first line)
- **`--format <format>`**: Output format (default: bibtex)
  - `bibtex` or `bib`: BibTeX format
  - `csl`, `json`, or `csl-json`: CSL JSON format
- **`--no-wayback`**: Skip Wayback Machine submission (faster, but no archive)
- **`--output <file>`**: Write output to file (default: stdout)

## Output Formats

### BibTeX

```bibtex
@online{smithexample2024,
  author = {John Smith},
  title = {Example Article Title},
  url = {https://example.com/article},
  urldate = {2024-03-15},
  year = {2024}
}
```

### CSL JSON

```json
[
  {
    "id": "smithexample2024",
    "type": "webpage",
    "title": "Example Article Title",
    "author": [{"literal": "John Smith"}],
    "URL": "https://example.com/article",
    "accessed": {"date-parts": [[2024, 3, 15]]},
    "archive-url": "https://web.archive.org/web/20240315123456/https://example.com/article"
  }
]
```

## Examples

### Basic citation

```bash
npx tsx plugins/bib/scripts/cite-web.ts "https://example.com/article"
```

Output:
```bibtex
@online{example2024,
  title = {Example Article Title},
  url = {https://example.com/article},
  urldate = {2024-03-15}
}
```

### With Wayback archival

```bash
npx tsx plugins/bib/scripts/cite-web.ts "https://blog.example.com/post"
```

Output includes archive URL:
```bibtex
@online{example2024,
  title = {Blog Post Title},
  url = {https://blog.example.com/post},
  urldate = {2024-03-15},
  note = {Archived at https://web.archive.org/web/20240315123456/...}
}
```

### CSL JSON format

```bash
npx tsx plugins/bib/scripts/cite-web.ts "https://docs.example.com" --format=csl
```

### Skip archival (faster)

```bash
npx tsx plugins/bib/scripts/cite-web.ts "https://example.com" --no-wayback
```

### Save to file

```bash
npx tsx plugins/bib/scripts/cite-web.ts "https://example.com" --output=citations.bib
```

### Batch processing

```bash
# Create file with URLs (one per line)
echo "https://example.com/article1" > urls.txt

# Cite each URL
while read url; do
  npx tsx plugins/bib/scripts/cite-web.ts "$url" >> citations.bib
done < urls.txt
```

## Citation Key Generation

Citation keys are automatically generated from:
1. **Domain name**: `example.com` → `example`
2. **Author** (if available): `John Smith` → `smith`
3. **Year**: Archive date or publish date or current year

Examples:
- `https://blog.example.com/post` by John Smith (2024) → `smithexample2024`
- `https://example.com/article` (no author, 2023) → `example2023`

## Wayback Machine Integration

By default, the script submits URLs to the Internet Archive's Wayback Machine for preservation:

1. **Submission**: Sends URL to `https://web.archive.org/save/<url>`
2. **Archive URL**: Extracts the permanent archive URL from response
3. **Archive Date**: Records the snapshot timestamp
4. **Fallback**: If submission fails, continues without archive

The archive URL is included in the citation:
- **BibTeX**: In `note` field or custom `archiveurl`/`archivedate` fields
- **CSL JSON**: In `archive-url` field

**Skip archival** with `--no-wayback` for faster execution when archiving isn't needed.

## Error Handling

The script handles various error scenarios:

- **Invalid URL**: Validates URL format before processing
- **Fetch failures**: Reports HTTP errors with status codes
- **Missing metadata**: Falls back to "Untitled" for missing titles
- **Wayback failures**: Continues without archive if submission fails
- **No author**: Omits author field if not found

Errors are written to stderr, while citations are written to stdout (or file).

## Limitations

- **JavaScript-heavy sites**: May not extract metadata from dynamically rendered content
- **Paywalls**: Cannot access content behind authentication
- **Rate limiting**: Wayback Machine may rate-limit submissions
- **No PDF support**: Only HTML pages (use separate tool for PDFs)
- **Simple parsing**: Uses regex matching, not full DOM parsing

For complex pages or JavaScript-rendered content, consider:
1. Using `--no-wayback` to skip archival
2. Manually editing the citation after generation
3. Using browser developer tools to inspect metadata tags

## Related Skills

- **bib-create**: Create bibliography entries interactively
- **bib-read**: View existing bibliography entries
- **bib-convert**: Convert between bibliography formats
- **wayback-submit**: Submit URLs to Wayback Machine without citation generation

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

# bib-merge

Merge multiple bibliography files, with automatic deduplication.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts file1.bib file2.bib file3.bib --output=merged.bib
```

## Options

- `--output=<file>` - Output file (prints to stdout if omitted)
- `--format=<format>` - Output format (default: bibtex)
- `--dedupe=<key>` - Deduplication key: `id` or `doi` (default: id)
- `--sort` - Sort merged entries by ID

## Deduplication

Entries are deduplicated based on the specified key:

**By ID (default):**
- Entries with same `id` field are considered duplicates
- First occurrence is kept

**By DOI:**
- Entries with same DOI are considered duplicates
- Useful for merging references to the same paper from different sources

## Examples

**Merge two BibTeX files:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts refs1.bib refs2.bib --output=all-refs.bib
```

**Merge and deduplicate by DOI:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts pubmed.ris scopus.bib --dedupe=doi --output=merged.bib
```

**Merge with sorting:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts *.bib --output=sorted.bib --sort
```

## Output

```
Merging 3 files...
Total entries after merge: 150
Written to: merged.bib
```

## Mixed Format Support

The merge tool handles files in different formats:

```bash
# Merge BibTeX + RIS + EndNote XML
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/merge.ts refs.bib papers.ris data.xml --output=all.bib
```

All inputs are converted to the output format.

## Notes

- File formats are auto-detected
- Original metadata is preserved where possible
- Deduplication is case-sensitive
- Merge order matters (first occurrence wins for duplicates)

# bib-read

Read and display bibliography entries in a human-readable format.

## Usage

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts input.bib [--id=<id>]
```

## Options

- `--id=<string>` - Show only entry with this ID

## Examples

**Display all entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib
```

**Display specific entry:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib --id=smith2024
```

## Output Format

Each entry is displayed with key information:

```
[smith2024] article-journal
  Authors: Smith, John
  Title: Machine Learning in Biology
  Year: 2024

[jones2023] book
  Authors: Jones, Jane
  Title: Introduction to AI
  Year: 2023

Total: 2 entries
```

## Use Cases

**Quick lookup:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib --id=important2024
```

**Browse all entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib | less
```

**Count entries:**
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/read.ts refs.bib | grep "Total:"
```

## Notes

- Format is auto-detected
- Output is human-readable (not machine-parseable)
- For filtering by author/year, use `bib-filter` instead
- For full entry details, open file in editor or convert to JSON

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

<!-- AUTO-GENERATED CONTENT END -->