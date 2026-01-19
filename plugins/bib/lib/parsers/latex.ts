/**
 * LaTeX encoding/decoding utilities.
 *
 * Handles conversion between:
 * - LaTeX commands: \"{a}, \~{n}, \ae
 * - Unicode characters: ä, ñ, æ
 *
 * Used for BibTeX ↔ other formats conversion.
 */

/**
 * LaTeX command to Unicode mappings
 */
const LATEX_TO_UNICODE: Record<string, string> = {
  // Accented characters - Acute
  "\\'{a}": "á",
  "\\'{e}": "é",
  "\\'{i}": "í",
  "\\'{o}": "ó",
  "\\'{u}": "ú",
  "\\'{y}": "ý",
  "\\'{A}": "Á",
  "\\'{E}": "É",
  "\\'{I}": "Í",
  "\\'{O}": "Ó",
  "\\'{U}": "Ú",
  "\\'{Y}": "Ý",
  "\\'{c}": "ć",
  "\\'{C}": "Ć",
  "\\'{n}": "ń",
  "\\'{N}": "Ń",
  "\\'{s}": "ś",
  "\\'{S}": "Ś",
  "\\'{z}": "ź",
  "\\'{Z}": "Ź",

  // Accented characters - Grave
  "\\`{a}": "à",
  "\\`{e}": "è",
  "\\`{i}": "ì",
  "\\`{o}": "ò",
  "\\`{u}": "ù",
  "\\`{A}": "À",
  "\\`{E}": "È",
  "\\`{I}": "Ì",
  "\\`{O}": "Ò",
  "\\`{U}": "Ù",

  // Accented characters - Circumflex
  "\\^{a}": "â",
  "\\^{e}": "ê",
  "\\^{i}": "î",
  "\\^{o}": "ô",
  "\\^{u}": "û",
  "\\^{A}": "Â",
  "\\^{E}": "Ê",
  "\\^{I}": "Î",
  "\\^{O}": "Ô",
  "\\^{U}": "Û",

  // Accented characters - Umlaut/Diaeresis
  '\\"{a}': "ä",
  '\\"{e}': "ë",
  '\\"{i}': "ï",
  '\\"{o}': "ö",
  '\\"{u}': "ü",
  '\\"{y}': "ÿ",
  '\\"{A}': "Ä",
  '\\"{E}': "Ë",
  '\\"{I}': "Ï",
  '\\"{O}': "Ö",
  '\\"{U}': "Ü",

  // Accented characters - Tilde
  "\\~{a}": "ã",
  "\\~{n}": "ñ",
  "\\~{o}": "õ",
  "\\~{A}": "Ã",
  "\\~{N}": "Ñ",
  "\\~{O}": "Õ",

  // Accented characters - Ring
  "\\r{a}": "å",
  "\\r{A}": "Å",
  "\\r{u}": "ů",
  "\\r{U}": "Ů",

  // Accented characters - Cedilla
  "\\c{c}": "ç",
  "\\c{C}": "Ç",
  "\\c{s}": "ş",
  "\\c{S}": "Ş",

  // Accented characters - Stroke
  "\\l": "ł",
  "\\L": "Ł",
  "\\o": "ø",
  "\\O": "Ø",

  // Ligatures
  "\\ae": "æ",
  "\\AE": "Æ",
  "\\oe": "œ",
  "\\OE": "Œ",
  "\\aa": "å",
  "\\AA": "Å",
  "\\ss": "ß",

  // Special characters
  "\\&": "&",
  "\\%": "%",
  "\\$": "$",
  "\\#": "#",
  "\\_": "_",
  "\\{": "{",
  "\\}": "}",
  "\\~": "~",
  "\\^": "^",
  "\\\\": "\\",

  // Quotation marks
  "``": "\u201C", // opening double quote
  "''": "\u201D", // closing double quote
  "`": "\u2018", // opening single quote
  "'": "\u2019", // closing single quote

  // Dashes
  "---": "—", // em-dash
  "--": "–", // en-dash

  // Spaces
  "~": " ", // non-breaking space
  "\\,": " ", // thin space
  "\\ ": " ", // normal space

  // Math/special
  "\\textregistered": "®",
  "\\texttrademark": "™",
  "\\textcopyright": "©",
  "\\pounds": "£",
  "\\euro": "€",
  "\\dots": "…",
  "\\ldots": "…",

  // Greek letters (common in names)
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\pi": "π",
  "\\sigma": "σ",
  "\\tau": "τ",
  "\\phi": "φ",
  "\\omega": "ω",

  // Accents without braces (for common cases)
  "\\'a": "á",
  "\\'e": "é",
  "\\'i": "í",
  "\\'o": "ó",
  "\\'u": "ú",
  "\\`a": "à",
  "\\`e": "è",
  "\\`i": "ì",
  "\\`o": "ò",
  "\\`u": "ù",
  "\\^a": "â",
  "\\^e": "ê",
  "\\^i": "î",
  "\\^o": "ô",
  "\\^u": "û",
  '\\"a': "ä",
  '\\"e': "ë",
  '\\"i': "ï",
  '\\"o': "ö",
  '\\"u': "ü",
  "\\~a": "ã",
  "\\~n": "ñ",
  "\\~o": "õ",
};

/**
 * Decode LaTeX commands to Unicode.
 *
 * @param text - Text with LaTeX commands
 * @returns Text with Unicode characters
 */
export function decodeLatex(text: string): string {
  if (!text) return text;

  let result = text;

  // Sort by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(LATEX_TO_UNICODE).sort((a, b) => b.length - a.length);

  for (const latex of sortedKeys) {
    const unicode = LATEX_TO_UNICODE[latex];
    // Use global replacement
    result = result.split(latex).join(unicode);
  }

  // Handle additional patterns with regex
  // Accent commands without braces: \'e -> é
  // Match each accent type explicitly (double-escape backslash for regex)
  result = result.replace(/\\\\'(\w)/g, (match, char) => LATEX_TO_UNICODE["\\'{" + char + "}"] || match);
  result = result.replace(/\\\\`(\w)/g, (match, char) => LATEX_TO_UNICODE["\\`{" + char + "}"] || match);
  result = result.replace(/\\\\\^(\w)/g, (match, char) => LATEX_TO_UNICODE["\\^{" + char + "}"] || match);
  result = result.replace(/\\\\"(\w)/g, (match, char) => LATEX_TO_UNICODE['\\"{' + char + "}"] || match);
  result = result.replace(/\\\\~(\w)/g, (match, char) => LATEX_TO_UNICODE["\\~{" + char + "}"] || match);

  return result;
}

/**
 * Encode Unicode to LaTeX commands.
 *
 * @param text - Text with Unicode characters
 * @returns Text with LaTeX commands
 */
export function encodeLatex(text: string): string {
  if (!text) return text;

  let result = text;

  // Escape special BibTeX characters FIRST (before converting Unicode to LaTeX commands)
  // Don't escape braces {} - they're used for grouping in LaTeX commands
  // Don't escape backslash - it's used in LaTeX commands
  result = result.replace(/([&%$#_])/g, "\\$1");

  // Create reverse mapping
  const unicodeToLatex: Record<string, string> = {};
  for (const [latex, unicode] of Object.entries(LATEX_TO_UNICODE)) {
    // Skip special characters that don't need encoding in all contexts
    // Also skip space mappings - normal spaces shouldn't be escaped
    // Skip non-braced accents - always use braced form for encoding
    if (
      ["~", "`", "'", "``", "''", "\\ ", "\\,"].includes(latex) ||
      unicode === " " ||
      /^\\['\`\^\"\~][a-z]$/i.test(latex)
    ) {
      continue;
    }
    unicodeToLatex[unicode] = latex;
  }

  // Sort by Unicode string length (longest first)
  const sortedUnicode = Object.keys(unicodeToLatex).sort((a, b) => b.length - a.length);

  for (const unicode of sortedUnicode) {
    const latex = unicodeToLatex[unicode];
    result = result.split(unicode).join(latex);
  }

  return result;
}

/**
 * Check if text contains LaTeX commands.
 *
 * @param text - Text to check
 * @returns True if text contains LaTeX commands
 */
export function hasLatexCommands(text: string): boolean {
  if (!text) return false;

  // Check for backslash followed by letter or special char
  return /\\[a-zA-Z]+|\\[^a-zA-Z]/.test(text);
}

/**
 * Strip all LaTeX commands (simple text extraction).
 *
 * This is more aggressive than decodeLatex - it removes formatting commands
 * that don't have Unicode equivalents.
 *
 * @param text - Text with LaTeX commands
 * @returns Plain text
 */
export function stripLatex(text: string): string {
  if (!text) return text;

  // First decode known commands
  let result = decodeLatex(text);

  // Remove remaining LaTeX commands
  // Remove \command{...} patterns - loop to handle nested commands
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, "$1");
  }

  // Remove standalone commands
  result = result.replace(/\\[a-zA-Z]+/g, "");

  // Remove escaped characters
  result = result.replace(/\\(.)/g, "$1");

  // Clean up extra whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Protect text from being interpreted as LaTeX (wrap in braces).
 *
 * Used for preserving capitalization in titles, etc.
 *
 * @param text - Text to protect
 * @returns Protected text
 */
export function protectText(text: string): string {
  if (!text) return text;

  // Protect uppercase words (acronyms, proper nouns)
  return text.replace(/\b([A-Z]{2,})\b/g, "{$1}");
}

/**
 * Unprotect text (remove protective braces).
 *
 * @param text - Protected text
 * @returns Unprotected text
 */
export function unprotectText(text: string): string {
  if (!text) return text;

  // Remove single-level braces
  return text.replace(/\{([^{}]+)\}/g, "$1");
}
