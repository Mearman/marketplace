/**
 * Field Mappings between bibliography formats.
 *
 * This module defines how fields map across different formats and what
 * transformations are needed (name parsing, date parsing, etc.)
 */

import type { FieldMapping } from "../types.js";

/**
 * Field mapping table.
 * Key: CSL JSON field (normalized)
 * Value: Mappings to other formats + transformation type
 */
export const FIELD_MAPPINGS: Record<string, FieldMapping> = {
	// ========================================================================
	// Creator Fields (require name parsing)
	// ========================================================================

	author: {
		csl: "author",
		bibtex: "author",
		biblatex: "author",
		ris: "AU",
		endnote: "author",
		transform: "name",
	},

	editor: {
		csl: "editor",
		bibtex: "editor",
		biblatex: "editor",
		ris: "ED",
		endnote: "editor",
		transform: "name",
	},

	translator: {
		csl: "translator",
		bibtex: "translator",
		biblatex: "translator",
		ris: "A3",
		endnote: "translator",
		transform: "name",
	},

	// ========================================================================
	// Title Fields
	// ========================================================================

	title: {
		csl: "title",
		bibtex: "title",
		biblatex: "title",
		ris: "TI",
		endnote: "title",
	},

	"container-title": {
		csl: "container-title",
		bibtex: "journal", // or booktitle depending on type
		biblatex: "journaltitle",
		ris: "JO",
		endnote: "secondary-title",
	},

	"collection-title": {
		csl: "collection-title",
		bibtex: "series",
		biblatex: "series",
		ris: "T3",
		endnote: "series",
	},

	"title-short": {
		csl: "title-short",
		bibtex: "shorttitle",
		biblatex: "shorttitle",
		ris: "ST",
		endnote: "short-title",
	},

	// ========================================================================
	// Date Fields (require date parsing)
	// ========================================================================

	issued: {
		csl: "issued",
		bibtex: "year", // + month, day
		biblatex: "date",
		ris: "PY",
		endnote: "year",
		transform: "date",
	},

	accessed: {
		csl: "accessed",
		bibtex: "urldate",
		biblatex: "urldate",
		ris: "Y2",
		endnote: "access-date",
		transform: "date",
	},

	// ========================================================================
	// Identifiers
	// ========================================================================

	DOI: {
		csl: "DOI",
		bibtex: "doi",
		biblatex: "doi",
		ris: "DO",
		endnote: "doi",
	},

	ISBN: {
		csl: "ISBN",
		bibtex: "isbn",
		biblatex: "isbn",
		ris: "SN",
		endnote: "isbn",
	},

	ISSN: {
		csl: "ISSN",
		bibtex: "issn",
		biblatex: "issn",
		ris: "SN",
		endnote: "issn",
	},

	URL: {
		csl: "URL",
		bibtex: "url",
		biblatex: "url",
		ris: "UR",
		endnote: "url",
	},

	PMID: {
		csl: "PMID",
		bibtex: "pmid",
		biblatex: "eprint", // with eprinttype=pubmed
		ris: "AN",
		endnote: "accession-number",
	},

	// ========================================================================
	// Publication Details
	// ========================================================================

	publisher: {
		csl: "publisher",
		bibtex: "publisher",
		biblatex: "publisher",
		ris: "PB",
		endnote: "publisher",
	},

	"publisher-place": {
		csl: "publisher-place",
		bibtex: "address",
		biblatex: "location",
		ris: "CY",
		endnote: "place-published",
	},

	volume: {
		csl: "volume",
		bibtex: "volume",
		biblatex: "volume",
		ris: "VL",
		endnote: "volume",
		transform: "number",
	},

	issue: {
		csl: "issue",
		bibtex: "number",
		biblatex: "number",
		ris: "IS",
		endnote: "number",
		transform: "number",
	},

	page: {
		csl: "page",
		bibtex: "pages",
		biblatex: "pages",
		ris: "SP", // + EP for end page
		endnote: "pages",
		transform: "page-range",
	},

	"number-of-pages": {
		csl: "number-of-pages",
		bibtex: "pagetotal",
		biblatex: "pagetotal",
		ris: "EP",
		endnote: "number-of-pages",
		transform: "number",
	},

	edition: {
		csl: "edition",
		bibtex: "edition",
		biblatex: "edition",
		ris: "ET",
		endnote: "edition",
	},

	"chapter-number": {
		csl: "chapter-number",
		bibtex: "chapter",
		biblatex: "chapter",
		ris: "CP",
		endnote: "section",
	},

	// ========================================================================
	// Academic Fields
	// ========================================================================

	abstract: {
		csl: "abstract",
		bibtex: "abstract",
		biblatex: "abstract",
		ris: "AB",
		endnote: "abstract",
	},

	keyword: {
		csl: "keyword",
		bibtex: "keywords",
		biblatex: "keywords",
		ris: "KW",
		endnote: "keywords",
	},

	note: {
		csl: "note",
		bibtex: "note",
		biblatex: "note",
		ris: "N1",
		endnote: "notes",
	},

	annote: {
		csl: "annote",
		bibtex: "annote",
		biblatex: "annotation",
		ris: "N2",
		endnote: "research-notes",
	},

	// ========================================================================
	// Event/Conference Fields
	// ========================================================================

	event: {
		csl: "event",
		bibtex: "eventtitle",
		biblatex: "eventtitle",
		ris: "T2",
		endnote: "conference-name",
	},

	"event-place": {
		csl: "event-place",
		bibtex: "venue",
		biblatex: "venue",
		ris: "C1",
		endnote: "conference-location",
	},

	// ========================================================================
	// Media Fields
	// ========================================================================

	medium: {
		csl: "medium",
		bibtex: "howpublished",
		biblatex: "howpublished",
		ris: "M1",
		endnote: "type-of-work",
	},

	genre: {
		csl: "genre",
		bibtex: "type",
		biblatex: "type",
		ris: "M3",
		endnote: "genre",
	},

	// ========================================================================
	// Other
	// ========================================================================

	language: {
		csl: "language",
		bibtex: "language",
		biblatex: "language",
		ris: "LA",
		endnote: "language",
	},
};

/**
 * BibTeX-specific field mappings that vary by entry type
 */
export const BIBTEX_TYPE_SPECIFIC_FIELDS: Record<string, Record<string, string>> = {
	inproceedings: {
		"container-title": "booktitle",
	},
	incollection: {
		"container-title": "booktitle",
	},
	inbook: {
		"container-title": "booktitle",
	},
	article: {
		"container-title": "journal",
	},
};

/**
 * Get BibTeX field name for a CSL field, considering entry type context
 */
export function getBibTeXField(cslField: string, entryType?: string): string | undefined {
	// Check type-specific mappings first
	if (entryType && BIBTEX_TYPE_SPECIFIC_FIELDS[entryType]?.[cslField]) {
		return BIBTEX_TYPE_SPECIFIC_FIELDS[entryType][cslField];
	}

	// Fall back to general mapping
	return FIELD_MAPPINGS[cslField]?.bibtex;
}

/**
 * Get CSL field name from BibTeX field
 */
export function getCslFieldFromBibTeX(bibtexField: string): string | undefined {
	const normalized = bibtexField.toLowerCase().trim();

	// Special cases
	if (normalized === "booktitle") return "container-title";
	if (normalized === "journal") return "container-title";
	if (normalized === "journaltitle") return "container-title";
	if (normalized === "year") return "issued";
	if (normalized === "month") return "issued";

	// Find in mappings
	for (const [cslField, mapping] of Object.entries(FIELD_MAPPINGS)) {
		if (mapping.bibtex?.toLowerCase() === normalized || mapping.biblatex?.toLowerCase() === normalized) {
			return cslField;
		}
	}

	return undefined;
}

/**
 * Get RIS tag from CSL field
 */
export function getRisTag(cslField: string): string | undefined {
	return FIELD_MAPPINGS[cslField]?.ris;
}

/**
 * Get CSL field from RIS tag
 */
export function getCslFieldFromRis(risTag: string): string | undefined {
	const normalized = risTag.toUpperCase().trim();

	for (const [cslField, mapping] of Object.entries(FIELD_MAPPINGS)) {
		if (mapping.ris === normalized) {
			return cslField;
		}
	}

	return undefined;
}
