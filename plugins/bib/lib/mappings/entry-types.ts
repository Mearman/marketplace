/**
 * Entry Type Mappings between bibliography formats.
 *
 * This module defines how entry types map across:
 * - BibTeX (legacy, limited types)
 * - BibLaTeX (extended BibTeX with modern types)
 * - CSL JSON (Citation Style Language, most expressive)
 * - RIS (Reference Manager format)
 * - EndNote XML
 *
 * Strategy: CSL JSON is the hub format. All conversions go through CSL.
 */

import type { EntryTypeMapping, CSLItemType } from "../types.js";

/**
 * Entry type mapping table.
 * Key: CSL JSON type (normalized)
 * Value: Mappings to other formats
 */
export const ENTRY_TYPE_MAPPINGS: Record<string, EntryTypeMapping> = {
	// ========================================================================
	// Core Academic Types (well-supported across all formats)
	// ========================================================================

	"article-journal": {
		csl: "article-journal",
		bibtex: "article",
		biblatex: "article",
		ris: "JOUR",
		endnote: "Journal Article",
	},

	article: {
		csl: "article",
		bibtex: "article",
		biblatex: "article",
		ris: "JOUR",
		endnote: "Journal Article",
	},

	book: {
		csl: "book",
		bibtex: "book",
		biblatex: "book",
		ris: "BOOK",
		endnote: "Book",
	},

	chapter: {
		csl: "chapter",
		bibtex: "incollection",
		biblatex: "incollection",
		ris: "CHAP",
		endnote: "Book Section",
	},

	"paper-conference": {
		csl: "paper-conference",
		bibtex: "inproceedings",
		biblatex: "inproceedings",
		ris: "CONF",
		endnote: "Conference Paper",
	},

	thesis: {
		csl: "thesis",
		bibtex: "phdthesis", // or mastersthesis - need context
		biblatex: "thesis",
		ris: "THES",
		endnote: "Thesis",
	},

	report: {
		csl: "report",
		bibtex: "techreport",
		biblatex: "report",
		ris: "RPRT",
		endnote: "Report",
	},

	// ========================================================================
	// Magazine/Newspaper (periodicals)
	// ========================================================================

	"article-magazine": {
		csl: "article-magazine",
		bibtex: "article",
		biblatex: "article",
		ris: "MGZN",
		endnote: "Magazine Article",
	},

	"article-newspaper": {
		csl: "article-newspaper",
		bibtex: "article",
		biblatex: "article",
		ris: "NEWS",
		endnote: "Newspaper Article",
	},

	// ========================================================================
	// Modern Types (lossy to BibTeX, maps to @misc)
	// ========================================================================

	dataset: {
		csl: "dataset",
		bibtex: "misc", // BibTeX doesn't have dataset type
		biblatex: "dataset",
		ris: "DATA",
		endnote: "Dataset",
		lossyToBibTeX: true,
	},

	software: {
		csl: "software",
		bibtex: "misc",
		biblatex: "software",
		ris: "COMP",
		endnote: "Computer Program",
		lossyToBibTeX: true,
	},

	webpage: {
		csl: "webpage",
		bibtex: "misc",
		biblatex: "online",
		ris: "ELEC",
		endnote: "Web Page",
		lossyToBibTeX: true,
	},

	patent: {
		csl: "patent",
		bibtex: "misc",
		biblatex: "patent",
		ris: "PAT",
		endnote: "Patent",
		lossyToBibTeX: true,
	},

	// ========================================================================
	// Reference Works
	// ========================================================================

	"entry-encyclopedia": {
		csl: "entry-encyclopedia",
		bibtex: "incollection",
		biblatex: "inreference",
		ris: "ENCYC",
		endnote: "Encyclopedia",
	},

	"entry-dictionary": {
		csl: "entry-dictionary",
		bibtex: "incollection",
		biblatex: "inreference",
		ris: "DICT",
		endnote: "Dictionary",
	},

	// ========================================================================
	// Legal/Legislative
	// ========================================================================

	legal_case: {
		csl: "legal_case",
		bibtex: "misc",
		biblatex: "jurisdiction",
		ris: "CASE",
		endnote: "Legal Rule or Regulation",
		lossyToBibTeX: true,
	},

	legislation: {
		csl: "legislation",
		bibtex: "misc",
		biblatex: "legislation",
		ris: "STAT",
		endnote: "Bill",
		lossyToBibTeX: true,
	},

	// ========================================================================
	// Media Types
	// ========================================================================

	motion_picture: {
		csl: "motion_picture",
		bibtex: "misc",
		biblatex: "movie",
		ris: "MPCT",
		endnote: "Film or Broadcast",
		lossyToBibTeX: true,
	},

	broadcast: {
		csl: "broadcast",
		bibtex: "misc",
		biblatex: "audio",
		ris: "MPCT",
		endnote: "Film or Broadcast",
		lossyToBibTeX: true,
	},

	song: {
		csl: "song",
		bibtex: "misc",
		biblatex: "music",
		ris: "SOUND",
		endnote: "Music",
		lossyToBibTeX: true,
	},

	graphic: {
		csl: "graphic",
		bibtex: "misc",
		biblatex: "artwork",
		ris: "ART",
		endnote: "Artwork",
		lossyToBibTeX: true,
	},

	map: {
		csl: "map",
		bibtex: "misc",
		biblatex: "misc",
		ris: "MAP",
		endnote: "Map",
		lossyToBibTeX: true,
	},

	// ========================================================================
	// Other Academic
	// ========================================================================

	manuscript: {
		csl: "manuscript",
		bibtex: "unpublished",
		biblatex: "unpublished",
		ris: "UNPB",
		endnote: "Manuscript",
	},

	"review-book": {
		csl: "review-book",
		bibtex: "article",
		biblatex: "review",
		ris: "JOUR",
		endnote: "Journal Article",
	},

	review: {
		csl: "review",
		bibtex: "article",
		biblatex: "review",
		ris: "JOUR",
		endnote: "Journal Article",
	},

	speech: {
		csl: "speech",
		bibtex: "misc",
		biblatex: "misc",
		ris: "HEAR",
		endnote: "Hearing",
		lossyToBibTeX: true,
	},

	interview: {
		csl: "interview",
		bibtex: "misc",
		biblatex: "misc",
		ris: "INPR",
		endnote: "Interview",
		lossyToBibTeX: true,
	},

	personal_communication: {
		csl: "personal_communication",
		bibtex: "misc",
		biblatex: "letter",
		ris: "PCOMM",
		endnote: "Personal Communication",
		lossyToBibTeX: true,
	},

	// ========================================================================
	// Web/Blog
	// ========================================================================

	post: {
		csl: "post",
		bibtex: "misc",
		biblatex: "online",
		ris: "BLOG",
		endnote: "Blog",
		lossyToBibTeX: true,
	},

	"post-weblog": {
		csl: "post-weblog",
		bibtex: "misc",
		biblatex: "online",
		ris: "BLOG",
		endnote: "Blog",
		lossyToBibTeX: true,
	},
};

/**
 * Reverse mapping: BibTeX type -> CSL type
 */
export const BIBTEX_TO_CSL: Record<string, CSLItemType> = {
	article: "article-journal",
	book: "book",
	booklet: "book",
	inbook: "chapter",
	incollection: "chapter",
	inproceedings: "paper-conference",
	conference: "paper-conference",
	manual: "book",
	mastersthesis: "thesis",
	phdthesis: "thesis",
	proceedings: "book",
	techreport: "report",
	unpublished: "manuscript",
	misc: "article", // Default fallback
};

/**
 * Reverse mapping: RIS type -> CSL type
 */
export const RIS_TO_CSL: Record<string, CSLItemType> = {
	JOUR: "article-journal",
	BOOK: "book",
	CHAP: "chapter",
	CONF: "paper-conference",
	THES: "thesis",
	RPRT: "report",
	MGZN: "article-magazine",
	NEWS: "article-newspaper",
	DATA: "dataset",
	COMP: "software",
	ELEC: "webpage",
	PAT: "patent",
	ENCYC: "entry-encyclopedia",
	DICT: "entry-dictionary",
	CASE: "legal_case",
	STAT: "legislation",
	MPCT: "motion_picture",
	SOUND: "song",
	ART: "graphic",
	MAP: "map",
	UNPB: "manuscript",
	HEAR: "speech",
	INPR: "interview",
	PCOMM: "personal_communication",
	BLOG: "post-weblog",
	GEN: "article", // Generic - fallback
};

/**
 * Reverse mapping: EndNote type -> CSL type
 */
export const ENDNOTE_TO_CSL: Record<string, CSLItemType> = {
	"Journal Article": "article-journal",
	Book: "book",
	"Book Section": "chapter",
	"Conference Paper": "paper-conference",
	Thesis: "thesis",
	Report: "report",
	"Magazine Article": "article-magazine",
	"Newspaper Article": "article-newspaper",
	Dataset: "dataset",
	"Computer Program": "software",
	"Web Page": "webpage",
	Patent: "patent",
	Encyclopedia: "entry-encyclopedia",
	Dictionary: "entry-dictionary",
	"Legal Rule or Regulation": "legal_case",
	Bill: "legislation",
	"Film or Broadcast": "motion_picture",
	Music: "song",
	Artwork: "graphic",
	Map: "map",
	Manuscript: "manuscript",
	Hearing: "speech",
	Interview: "interview",
	"Personal Communication": "personal_communication",
	Blog: "post-weblog",
};

/**
 * Get CSL type from any format-specific type
 */
export function normalizeToCslType(type: string, format: "bibtex" | "biblatex" | "ris" | "endnote"): CSLItemType {
	const normalized = type.toLowerCase().trim();

	switch (format) {
	case "bibtex":
	case "biblatex":
		return BIBTEX_TO_CSL[normalized] ?? "article";
	case "ris":
		return RIS_TO_CSL[type.toUpperCase().trim()] ?? "article";
	case "endnote":
		return ENDNOTE_TO_CSL[type] ?? "article";
	default:
		return "article";
	}
}

/**
 * Get format-specific type from CSL type
 */
export function denormalizeFromCslType(
	cslType: CSLItemType,
	targetFormat: "bibtex" | "biblatex" | "ris" | "endnote"
): { type: string; lossy: boolean } {
	// Use Object.prototype.hasOwnProperty to check if key exists
	const hasMapping = Object.prototype.hasOwnProperty.call(ENTRY_TYPE_MAPPINGS, cslType);
	if (!hasMapping) {
		// Unknown CSL type - fallback to article/misc
		return {
			type: targetFormat === "bibtex" || targetFormat === "biblatex" ? "misc" : "GEN",
			lossy: true,
		};
	}

	const mapping = ENTRY_TYPE_MAPPINGS[cslType];
	const type = mapping[targetFormat];
	const lossy = mapping.lossyToBibTeX && (targetFormat === "bibtex");

	return {
		type: type ?? "misc",
		lossy: lossy ?? false,
	};
}
