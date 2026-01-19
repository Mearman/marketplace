import { describe, it, expect } from "vitest";
import {
	readEntries,
	filterEntries,
	createEntry,
	updateEntry,
	deleteEntries,
	mergeEntries,
	sortEntries,
} from "./index.js";
import type { BibEntry } from "../types.js";

describe("CRUD Operations", () => {
	const sampleEntries: BibEntry[] = [
		{
			id: "smith2024",
			type: "article-journal",
			author: [{ family: "Smith", given: "John" }],
			title: "Machine Learning",
			issued: { "date-parts": [[2024]] },
			keyword: "AI, ML",
		},
		{
			id: "doe2023",
			type: "book",
			author: [{ family: "Doe", given: "Jane" }],
			title: "Introduction to AI",
			issued: { "date-parts": [[2023]] },
		},
		{
			id: "jones2024",
			type: "article-journal",
			author: [{ family: "Jones", given: "Bob" }],
			title: "Deep Learning",
			issued: { "date-parts": [[2024]] },
			keyword: "AI, DL",
		},
	];

	describe("filterEntries", () => {
		it("should filter by ID", () => {
			const result = filterEntries(sampleEntries, { id: "smith2024" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("smith2024");
		});

		it("should filter by author", () => {
			const result = filterEntries(sampleEntries, { author: "Smith" });
			expect(result).toHaveLength(1);
			expect(result[0].author?.[0].family).toBe("Smith");
		});

		it("should filter by year", () => {
			const result = filterEntries(sampleEntries, { year: 2024 });
			expect(result).toHaveLength(2);
			expect(result.every((e) => e.issued?.["date-parts"]?.[0]?.[0] === 2024)).toBe(true);
		});

		it("should filter by type", () => {
			const result = filterEntries(sampleEntries, { type: "book" });
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("book");
		});

		it("should filter by keyword", () => {
			const result = filterEntries(sampleEntries, { keyword: "ML" });
			expect(result).toHaveLength(1);
			expect(result[0].keyword).toContain("ML");
		});

		it("should combine multiple criteria (AND)", () => {
			const result = filterEntries(sampleEntries, { author: "Jones", year: 2024 });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("jones2024");
		});

		it("should return empty array when no matches", () => {
			const result = filterEntries(sampleEntries, { author: "Nonexistent" });
			expect(result).toHaveLength(0);
		});
	});

	describe("createEntry", () => {
		it("should create entry with required fields", () => {
			const entry = createEntry({
				id: "new2024",
				type: "article-journal",
				title: "New Article",
			});

			expect(entry.id).toBe("new2024");
			expect(entry.type).toBe("article-journal");
			expect(entry.title).toBe("New Article");
		});

		it("should throw error without ID", () => {
			expect(() => {
				createEntry({ type: "article-journal" } as any);
			}).toThrow("id");
		});

		it("should throw error without type", () => {
			expect(() => {
				createEntry({ id: "test" } as any);
			}).toThrow("type");
		});

		it("should include optional fields", () => {
			const entry = createEntry({
				id: "test",
				type: "article-journal",
				author: [{ family: "Test" }],
				title: "Title",
			});

			expect(entry.author).toBeDefined();
			expect(entry.title).toBe("Title");
		});
	});

	describe("updateEntry", () => {
		it("should update title", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, { title: "Updated Title" });

			expect(updated.title).toBe("Updated Title");
			expect(updated.id).toBe(original.id); // ID unchanged
			expect(updated.author).toEqual(original.author); // Other fields unchanged
		});

		it("should never change ID", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, { id: "newid" } as any);

			expect(updated.id).toBe(original.id); // ID forced to remain the same
		});

		it("should update multiple fields", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, {
				title: "New Title",
				abstract: "New abstract",
			});

			expect(updated.title).toBe("New Title");
			expect(updated.abstract).toBe("New abstract");
		});
	});

	describe("deleteEntries", () => {
		it("should delete single entry by ID", () => {
			const result = deleteEntries(sampleEntries, ["smith2024"]);
			expect(result).toHaveLength(2);
			expect(result.every((e) => e.id !== "smith2024")).toBe(true);
		});

		it("should delete multiple entries", () => {
			const result = deleteEntries(sampleEntries, ["smith2024", "jones2024"]);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("doe2023");
		});

		it("should handle non-existent IDs gracefully", () => {
			const result = deleteEntries(sampleEntries, ["nonexistent"]);
			expect(result).toHaveLength(3); // All entries remain
		});
	});

	describe("mergeEntries", () => {
		it("should merge multiple entry sets", () => {
			const set1: BibEntry[] = [
				{ id: "entry1", type: "article-journal", title: "First" },
			];
			const set2: BibEntry[] = [
				{ id: "entry2", type: "article-journal", title: "Second" },
			];

			const merged = mergeEntries([set1, set2]);
			expect(merged).toHaveLength(2);
		});

		it("should deduplicate by ID", () => {
			const set1: BibEntry[] = [
				{ id: "dup", type: "article-journal", title: "First" },
			];
			const set2: BibEntry[] = [
				{ id: "dup", type: "article-journal", title: "Second" },
			];

			const merged = mergeEntries([set1, set2], "id");
			expect(merged).toHaveLength(1);
			expect(merged[0].title).toBe("First"); // First occurrence wins
		});

		it("should deduplicate by DOI", () => {
			const set1: BibEntry[] = [
				{
					id: "entry1",
					type: "article-journal",
					title: "First",
					DOI: "10.1234/test",
				},
			];
			const set2: BibEntry[] = [
				{
					id: "entry2",
					type: "article-journal",
					title: "Second",
					DOI: "10.1234/test",
				},
			];

			const merged = mergeEntries([set1, set2], "doi");
			expect(merged).toHaveLength(1);
			expect(merged[0].id).toBe("entry1"); // First occurrence wins
		});

		it("should handle empty sets", () => {
			const merged = mergeEntries([[], []]);
			expect(merged).toHaveLength(0);
		});
	});

	describe("sortEntries", () => {
		it("should sort by ID", () => {
			const result = sortEntries(sampleEntries, "id");
			expect(result[0].id).toBe("doe2023");
			expect(result[1].id).toBe("jones2024");
			expect(result[2].id).toBe("smith2024");
		});

		it("should sort by author", () => {
			const result = sortEntries(sampleEntries, "author");
			expect(result[0].author?.[0].family).toBe("Doe");
			expect(result[1].author?.[0].family).toBe("Jones");
			expect(result[2].author?.[0].family).toBe("Smith");
		});

		it("should sort by year (descending)", () => {
			const result = sortEntries(sampleEntries, "year");
			expect(result[0].issued?.["date-parts"]?.[0]?.[0]).toBe(2024);
			expect(result[result.length - 1].issued?.["date-parts"]?.[0]?.[0]).toBe(2023);
		});

		it("should not mutate original array", () => {
			const original = [...sampleEntries];
			sortEntries(sampleEntries, "id");
			expect(sampleEntries).toEqual(original); // Original unchanged
		});
	});
});
