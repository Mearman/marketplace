/**
 * CRUD Operations for Bibliography Entries
 *
 * Provides utilities for Create, Read, Update, Delete operations on bibliography files.
 */

import type { BibEntry, BibFormat } from "../types.js";
import { parse, generate } from "../converter.js";

/**
 * Read entries from a bibliography file
 */
export function readEntries(content: string, format: BibFormat): BibEntry[] {
	const result = parse(content, format);
	return result.entries;
}

/**
 * Filter entries by criteria
 */
export function filterEntries(
	entries: BibEntry[],
	criteria: {
    id?: string;
    author?: string;
    year?: number;
    type?: string;
    keyword?: string;
  }
): BibEntry[] {
	return entries.filter((entry) => {
		if (criteria.id && entry.id !== criteria.id) return false;

		if (criteria.author) {
			const hasAuthor = entry.author?.some((a) =>
				[a.family, a.given, a.literal]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(criteria.author!.toLowerCase())
			);
			if (!hasAuthor) return false;
		}

		if (criteria.year) {
			const yearMatch = entry.issued?.["date-parts"]?.[0]?.[0] === criteria.year;
			if (!yearMatch) return false;
		}

		if (criteria.type && entry.type !== criteria.type) return false;

		if (criteria.keyword) {
			const hasKeyword = entry.keyword?.toLowerCase().includes(criteria.keyword.toLowerCase());
			if (!hasKeyword) return false;
		}

		return true;
	});
}

/**
 * Create a new entry
 */
export function createEntry(partial: Partial<BibEntry>): BibEntry {
	if (!partial.id) {
		throw new Error("Entry must have an id");
	}

	if (!partial.type) {
		throw new Error("Entry must have a type");
	}

	return {
		id: partial.id,
		type: partial.type,
		...partial,
	} as BibEntry;
}

/**
 * Update an existing entry
 */
export function updateEntry(entry: BibEntry, updates: Partial<BibEntry>): BibEntry {
	return {
		...entry,
		...updates,
		id: entry.id, // Never change ID
	};
}

/**
 * Delete entries by ID
 */
export function deleteEntries(entries: BibEntry[], idsToDelete: string[]): BibEntry[] {
	const deleteSet = new Set(idsToDelete);
	return entries.filter((entry) => !deleteSet.has(entry.id));
}

/**
 * Merge multiple bibliography files
 */
export function mergeEntries(entrySets: BibEntry[][], deduplicateBy: "id" | "doi" = "id"): BibEntry[] {
	const merged: BibEntry[] = [];
	const seen = new Set<string>();

	for (const entries of entrySets) {
		for (const entry of entries) {
			const key = deduplicateBy === "id" ? entry.id : entry.DOI || entry.id;

			if (!seen.has(key)) {
				seen.add(key);
				merged.push(entry);
			}
		}
	}

	return merged;
}

/**
 * Sort entries
 */
export function sortEntries(entries: BibEntry[], by: "id" | "author" | "year" = "id"): BibEntry[] {
	return [...entries].sort((a, b) => {
		if (by === "id") {
			return a.id.localeCompare(b.id);
		}

		if (by === "author") {
			const aAuthor = a.author?.[0]?.family || a.author?.[0]?.literal || "";
			const bAuthor = b.author?.[0]?.family || b.author?.[0]?.literal || "";
			return aAuthor.localeCompare(bAuthor);
		}

		if (by === "year") {
			const aYear = a.issued?.["date-parts"]?.[0]?.[0] || 0;
			const bYear = b.issued?.["date-parts"]?.[0]?.[0] || 0;
			return bYear - aYear; // Descending (newest first)
		}

		return 0;
	});
}
