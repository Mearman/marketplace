# tex (tex)

texLaTeX manipulation, generation, and conversion tools

**Version:** v0.2.0
**Install:** `/plugin install tex@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# LaTeX to Markdown Converter

Convert LaTeX documents to Markdown format with support for common LaTeX commands and environments.

## Usage

```bash
npx tsx plugins/tex/scripts/latex-to-md.ts <text>
npx tsx plugins/tex/scripts/latex-to-md.ts --file <input.tex>
npx tsx plugins/tex/scripts/latex-to-md.ts --file <input.tex> --output <output.md>
```

## Supported Conversions

### Sections/Headers
- `\chapter{Title}` → `# Title`
- `\section{Title}` → `## Title`
- `\subsection{Title}` → `### Title`
- `\subsubsection{Title}` → `#### Title`
- `\paragraph{Title}` → `##### Title`
- `\subparagraph{Title}` → `###### Title`

### Text Formatting
- `\textbf{bold}` → `**bold**`
- `\textit{italic}` → `*italic*`
- `\emph{emphasis}` → `*emphasis*`
- `\texttt{code}` → `` `code` ``
- `\verb|code|` → `` `code` ``

### Code Blocks
```latex
\begin{verbatim}
code here
\end{verbatim}
```
→
````markdown
```
code here
```
````

Also supports `lstlisting` environment.

### Lists

**Itemize (unordered):**
```latex
\begin{itemize}
\item First item
\item Second item
\end{itemize}
```
→
```markdown
- First item
- Second item
```

**Enumerate (ordered):**
```latex
\begin{enumerate}
\item First
\item Second
\end{enumerate}
```
→
```markdown
1. First
2. Second
```

### Links
- `\href{url}{text}` → `[text](url)`
- `\url{url}` → `<url>`

### Images

**With caption (figure environment):**
```latex
\begin{figure}
\includegraphics{image.png}
\caption{Description}
\end{figure}
```
→
```markdown
![Description](image.png)
```

**Without caption:**
- `\includegraphics{image.png}` → `![](image.png)`
- `\includegraphics[width=5cm]{image.png}` → `![](image.png)` (options stripped)

### Blockquotes
```latex
\begin{quote}
This is a quote
\end{quote}
```
→
```markdown
> This is a quote
```

### Horizontal Rules
- `\hrulefill` → `---`
- `\hline` → `---`

## Unicode Character Decoding

LaTeX special characters are automatically decoded to Unicode:
- `\'{e}` → `é`
- `\"{a}` → `ä`
- `\c{c}` → `ç`
- `\ae` → `æ`
- `\oe` → `œ`
- `\ss` → `ß`
- And ~100 more LaTeX commands

See **tex-decode** skill for complete list of supported characters.

## Math Preservation

LaTeX math notation is preserved as-is:
- Inline math: `$...$` remains `$...$`
- Display math: `$$...$$` remains `$$...$$`

Many Markdown renderers support this syntax natively.

## Arguments

- **Positional arguments**: Text to convert (if no `--file` flag)
- **`--file`**: Read input from file
- **`--output <file>`**: Write output to file (default: stdout)

## Examples

### Convert inline text
```bash
npx tsx plugins/tex/scripts/latex-to-md.ts "\\section{Hello}\n\nThis is \\textbf{bold}."
```

### Convert file
```bash
npx tsx plugins/tex/scripts/latex-to-md.ts --file paper.tex --output paper.md
```

### Extract plain text from LaTeX
```bash
npx tsx plugins/tex/scripts/latex-to-md.ts --file document.tex | npx tsx plugins/tex/scripts/strip.ts
```

## Limitations

- Does not handle complex LaTeX packages or custom commands
- Tables are not automatically converted (LaTeX tables vary widely in structure)
- Cross-references (`\ref`, `\cite`) are not resolved
- Bibliographies require separate handling
- Complex math environments may need manual adjustment
- Nested environments beyond simple cases may not convert perfectly

## Related Skills

- **md-to-latex**: Convert Markdown to LaTeX
- **tex-decode**: Decode LaTeX commands to Unicode (used internally)
- **tex-strip**: Remove all LaTeX formatting for plain text
- **tex-protect**: Protect text from LaTeX interpretation

# Markdown to LaTeX Converter

Convert Markdown documents to LaTeX format with comprehensive support for common Markdown syntax.

## Usage

```bash
npx tsx plugins/tex/scripts/md-to-latex.ts <text>
npx tsx plugins/tex/scripts/md-to-latex.ts --file <input.md>
npx tsx plugins/tex/scripts/md-to-latex.ts --file <input.md> --output <output.tex>
```

## Supported Conversions

### Headers
- `# Heading` → `\chapter{Heading}`
- `## Heading` → `\section{Heading}`
- `### Heading` → `\subsection{Heading}`
- `#### Heading` → `\subsubsection{Heading}`
- `##### Heading` → `\paragraph{Heading}`
- `###### Heading` → `\subparagraph{Heading}`

### Text Formatting
- `**bold**` or `__bold__` → `\textbf{bold}`
- `*italic*` or `_italic_` → `\emph{italic}`
- `` `code` `` → `\texttt{code}`

### Code Blocks
````markdown
```python
def hello():
    print("world")
```
````
→
```latex
\begin{verbatim}
def hello():
    print("world")
\end{verbatim}
```

### Lists

**Unordered lists:**
```markdown
- Item 1
- Item 2
  - Nested item
```
→
```latex
\begin{itemize}
\item Item 1
\item Item 2
  \item Nested item
\end{itemize}
```

**Ordered lists:**
```markdown
1. First
2. Second
3. Third
```
→
```latex
\begin{enumerate}
\item First
\item Second
\item Third
\end{enumerate}
```

### Links
- `[text](url)` → `\href{url}{text}`

### Images
- `![alt](path)` → `\begin{figure}[h]\n\centering\n\includegraphics{path}\n\caption{alt}\n\end{figure}`
- `![](path)` → `\includegraphics{path}` (no caption)

### Blockquotes
```markdown
> This is a quote
> spanning multiple lines
```
→
```latex
\begin{quote}
This is a quote
spanning multiple lines
\end{quote}
```

### Horizontal Rules
- `---` → `\hrulefill`

## Special Character Handling

LaTeX special characters (`&`, `%`, `$`, `#`, `_`, `{`, `}`) are automatically escaped in text content (but not in code blocks).

## Arguments

- **Positional arguments**: Text to convert (if no `--file` flag)
- **`--file`**: Read input from file
- **`--output <file>`**: Write output to file (default: stdout)

## Examples

### Convert inline text
```bash
npx tsx plugins/tex/scripts/md-to-latex.ts "# Hello World\n\nThis is **bold** text."
```

### Convert file
```bash
npx tsx plugins/tex/scripts/md-to-latex.ts --file document.md --output document.tex
```

### Use in pipeline
```bash
echo "## Section\n\nParagraph with *italic*" | npx tsx plugins/tex/scripts/md-to-latex.ts
```

## Limitations

- Does not handle complex nested structures beyond simple cases
- Tables are not automatically converted (Markdown tables have no direct LaTeX equivalent without packages)
- Math notation is preserved as-is (both Markdown and LaTeX use `$...$` for inline math and `$$...$$` for display math)
- HTML tags in Markdown are not converted

## Related Skills

- **latex-to-md**: Convert LaTeX back to Markdown
- **tex-encode**: Encode Unicode characters to LaTeX commands
- **tex-decode**: Decode LaTeX commands to Unicode
- **tex-strip**: Remove all LaTeX formatting for plain text

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

<!-- AUTO-GENERATED CONTENT END -->