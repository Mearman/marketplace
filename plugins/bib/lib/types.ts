/**
 * Core type definitions for bibliography manipulation plugin.
 *
 * This module defines:
 * - BibEntry: The intermediate representation used for all conversions
 * - Parser/Generator interfaces for format handling
 * - Conversion result and warning types
 * - Format-specific types and enums
 */

// ============================================================================
// Supported Bibliography Formats
// ============================================================================

export type BibFormat = "bibtex" | "biblatex" | "ris" | "endnote" | "csl-json";

// ============================================================================
// CSL Item Types (normalized entry types)
// ============================================================================

export type CSLItemType =
  | "article"
  | "article-journal"
  | "article-magazine"
  | "article-newspaper"
  | "bill"
  | "book"
  | "broadcast"
  | "chapter"
  | "dataset"
  | "entry"
  | "entry-dictionary"
  | "entry-encyclopedia"
  | "figure"
  | "graphic"
  | "interview"
  | "legal_case"
  | "legislation"
  | "manuscript"
  | "map"
  | "motion_picture"
  | "musical_score"
  | "paper-conference"
  | "patent"
  | "personal_communication"
  | "post"
  | "post-weblog"
  | "report"
  | "review"
  | "review-book"
  | "song"
  | "speech"
  | "thesis"
  | "treaty"
  | "webpage"
  | "software";

// ============================================================================
// Person Name (structured format)
// ============================================================================

export interface Person {
  /** Family/last name */
  family?: string;
  /** Given/first name(s) */
  given?: string;
  /** Literal name (when parsing fails or for organizations) */
  literal?: string;
  /** Suffix (Jr., Sr., III, etc.) */
  suffix?: string;
  /** Dropping particle (de, van, von, etc.) */
  "dropping-particle"?: string;
  /** Non-dropping particle (De, Van, Von, etc.) */
  "non-dropping-particle"?: string;
}

// ============================================================================
// Date Variable (CSL format)
// ============================================================================

export interface DateVariable {
  /** Structured date parts: [[year], [year, month], or [year, month, day]] */
  "date-parts"?: number[][];
  /** Raw date string (preserved for round-trips) */
  raw?: string;
  /** Approximate date flag */
  circa?: boolean;
  /** Season (1=spring, 2=summer, 3=fall, 4=winter) */
  season?: number | string;
}

// ============================================================================
// Bibliography Entry (Intermediate Representation)
// ============================================================================

export interface BibEntry {
  // Required fields
  /** Citation key (BibTeX) or unique ID */
  id: string;
  /** Normalized entry type */
  type: CSLItemType;

  // Creator fields
  author?: Person[];
  editor?: Person[];
  translator?: Person[];
  composer?: Person[];
  director?: Person[];
  illustrator?: Person[];
  interviewer?: Person[];
  "collection-editor"?: Person[];
  "container-author"?: Person[];

  // Title fields
  title?: string;
  /** Journal/book/container title */
  "container-title"?: string;
  /** Series or collection title */
  "collection-title"?: string;
  /** Short title */
  "title-short"?: string;

  // Date fields
  /** Publication date */
  issued?: DateVariable;
  /** Access date */
  accessed?: DateVariable;
  /** Submission date */
  submitted?: DateVariable;
  /** Event date */
  "event-date"?: DateVariable;
  /** Original publication date */
  "original-date"?: DateVariable;

  // Identifier fields
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  PMID?: string;
  PMCID?: string;
  URL?: string;

  // Publication details
  publisher?: string;
  "publisher-place"?: string;
  volume?: string | number;
  /** Issue/number */
  issue?: string | number;
  /** Page range (e.g., "1-10") */
  page?: string;
  /** Number of pages */
  "number-of-pages"?: string | number;
  /** Edition */
  edition?: string | number;
  /** Chapter number */
  "chapter-number"?: string | number;

  // Academic fields
  abstract?: string;
  keyword?: string;
  note?: string;
  annote?: string;

  // Event/conference fields
  event?: string;
  "event-place"?: string;

  // Legal/legislative fields
  authority?: string;
  jurisdiction?: string;
  "call-number"?: string;

  // Media fields
  medium?: string;
  genre?: string;
  status?: string;

  // Language
  language?: string;

  // Format-specific metadata (preserved for round-trips)
  _formatMetadata?: FormatMetadata;

  // Index signature for dynamic property access (parsers assign fields at runtime)
  // Allows unknown values which are validated at runtime
  [key: string]: unknown;
}

// ============================================================================
// Format-Specific Metadata
// ============================================================================

export interface FormatMetadata {
  /** Source format */
  source: BibFormat;
  /** Original entry type (before normalization) */
  originalType?: string;
  /** Custom/unknown fields preserved for round-trips */
  customFields?: Record<string, unknown>;
  /** Warnings generated during parsing */
  conversionWarnings?: string[];
  /** Original raw entry (for debugging) */
  rawEntry?: string;
}

// ============================================================================
// Conversion Results and Warnings
// ============================================================================

export interface ConversionResult {
  /** Converted entries */
  entries: BibEntry[];
  /** Warnings generated during conversion */
  warnings: ConversionWarning[];
  /** Conversion statistics */
  stats: ConversionStats;
}

export interface ConversionWarning {
  /** Entry ID that triggered the warning */
  entryId: string;
  /** Warning severity */
  severity: "info" | "warning" | "error";
  /** Warning type/category */
  type: "type-downgrade" | "field-loss" | "encoding-loss" | "parse-error" | "validation-error";
  /** Human-readable message */
  message: string;
  /** Field that triggered the warning (if applicable) */
  field?: string;
}

export interface ConversionStats {
  /** Total entries processed */
  total: number;
  /** Successfully converted entries */
  successful: number;
  /** Entries with warnings */
  withWarnings: number;
  /** Failed entries */
  failed: number;
}

// ============================================================================
// Parser Interface
// ============================================================================

export interface Parser {
  /** Format identifier */
  format: BibFormat;

  /**
   * Parse bibliography content into intermediate format.
   * @param content - Raw bibliography file content
   * @returns Conversion result with entries and warnings
   */
  parse(content: string): ConversionResult;

  /**
   * Validate bibliography syntax without full parsing.
   * @param content - Raw bibliography file content
   * @returns Validation warnings
   */
  validate?(content: string): ConversionWarning[];
}

// ============================================================================
// Generator Interface
// ============================================================================

export interface Generator {
  /** Format identifier */
  format: BibFormat;

  /**
   * Generate bibliography content from intermediate format.
   * @param entries - Bibliography entries in intermediate format
   * @param options - Format-specific generation options
   * @returns Generated bibliography content
   */
  generate(entries: BibEntry[], options?: GeneratorOptions): string;
}

// ============================================================================
// Generator Options
// ============================================================================

export interface GeneratorOptions {
  /** Indent string (default: 2 spaces) */
  indent?: string;
  /** Line ending (default: \n) */
  lineEnding?: "\n" | "\r\n";
  /** Sort entries by ID */
  sort?: boolean;
  /** Preserve original field order (if available in metadata) */
  preserveFieldOrder?: boolean;
  /** Include comments/preambles from metadata */
  includeMetadata?: boolean;
}

// ============================================================================
// Entry Type Mapping
// ============================================================================

export interface EntryTypeMapping {
  /** CSL JSON type */
  csl: CSLItemType;
  /** BibTeX type */
  bibtex?: string;
  /** BibLaTeX type */
  biblatex?: string;
  /** RIS type */
  ris?: string;
  /** EndNote reference type */
  endnote?: string;
  /** Lossy conversion to BibTeX? */
  lossyToBibTeX?: boolean;
}

// ============================================================================
// Field Mapping
// ============================================================================

export interface FieldMapping {
  /** CSL JSON field */
  csl: string;
  /** BibTeX field */
  bibtex?: string;
  /** BibLaTeX field */
  biblatex?: string;
  /** RIS tag */
  ris?: string;
  /** EndNote field */
  endnote?: string;
  /** Type conversion needed? */
  transform?: "name" | "date" | "number" | "page-range" | "custom";
}

// ============================================================================
// Validation Rules
// ============================================================================

export interface ValidationRule {
  /** Field name */
  field: string;
  /** Is field required? */
  required?: boolean;
  /** Validation regex pattern */
  pattern?: RegExp;
  /** Custom validation function */
  validator?: (value: unknown) => boolean;
  /** Error message */
  message?: string;
}

export interface EntryTypeValidation {
  /** Entry type */
  type: CSLItemType;
  /** Required fields */
  required: string[];
  /** Optional but recommended fields */
  recommended?: string[];
  /** Mutually exclusive field groups */
  exclusiveGroups?: string[][];
}
