import { describe, it } from "node:test";
import assert from "node:assert";
import {
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
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, "smith2024");
		});

		it("should filter by author", () => {
			const result = filterEntries(sampleEntries, { author: "Smith" });
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].author?.[0].family, "Smith");
		});

		it("should filter by year", () => {
			const result = filterEntries(sampleEntries, { year: 2024 });
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result.every((e) => e.issued?.["date-parts"]?.[0]?.[0] === 2024), true);
		});

		it("should filter by type", () => {
			const result = filterEntries(sampleEntries, { type: "book" });
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].type, "book");
		});

		it("should filter by keyword", () => {
			const result = filterEntries(sampleEntries, { keyword: "ML" });
			assert.strictEqual(result.length, 1);
			assert.ok(result[0].keyword?.includes("ML"));
		});

		it("should combine multiple criteria (AND)", () => {
			const result = filterEntries(sampleEntries, { author: "Jones", year: 2024 });
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, "jones2024");
		});

		it("should return empty array when no matches", () => {
			const result = filterEntries(sampleEntries, { author: "Nonexistent" });
			assert.strictEqual(result.length, 0);
		});
	});

	describe("createEntry", () => {
		it("should create entry with required fields", () => {
			const entry = createEntry({
				id: "new2024",
				type: "article-journal",
				title: "New Article",
			});

			assert.strictEqual(entry.id, "new2024");
			assert.strictEqual(entry.type, "article-journal");
			assert.strictEqual(entry.title, "New Article");
		});

		it("should throw error without ID", () => {
			assert.throws(() => {
				createEntry({ type: "article-journal" } as any);
			}, "id");
		});

		it("should throw error without type", () => {
			assert.throws(() => {
				createEntry({ id: "test" } as any);
			}, "type");
		});

		it("should include optional fields", () => {
			const entry = createEntry({
				id: "test",
				type: "article-journal",
				author: [{ family: "Test" }],
				title: "Title",
			});

			assert.ok(entry.author);
			assert.strictEqual(entry.title, "Title");
		});
	});

	describe("updateEntry", () => {
		it("should update title", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, { title: "Updated Title" });

			assert.strictEqual(updated.title, "Updated Title");
			assert.strictEqual(updated.id, original.id); // ID unchanged
			assert.deepStrictEqual(updated.author, original.author); // Other fields unchanged
		});

		it("should never change ID", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, { id: "newid" } as any);

			assert.strictEqual(updated.id, original.id); // ID forced to remain the same
		});

		it("should update multiple fields", () => {
			const original = sampleEntries[0];
			const updated = updateEntry(original, {
				title: "New Title",
				abstract: "New abstract",
			});

			assert.strictEqual(updated.title, "New Title");
			assert.strictEqual(updated.abstract, "New abstract");
		});
	});

	describe("deleteEntries", () => {
		it("should delete single entry by ID", () => {
			const result = deleteEntries(sampleEntries, ["smith2024"]);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result.every((e) => e.id !== "smith2024"), true);
		});

		it("should delete multiple entries", () => {
			const result = deleteEntries(sampleEntries, ["smith2024", "jones2024"]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, "doe2023");
		});

		it("should handle non-existent IDs gracefully", () => {
			const result = deleteEntries(sampleEntries, ["nonexistent"]);
			assert.strictEqual(result.length, 3); // All entries remain
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
			assert.strictEqual(merged.length, 2);
		});

		it("should deduplicate by ID", () => {
			const set1: BibEntry[] = [
				{ id: "dup", type: "article-journal", title: "First" },
			];
			const set2: BibEntry[] = [
				{ id: "dup", type: "article-journal", title: "Second" },
			];

			const merged = mergeEntries([set1, set2], "id");
			assert.strictEqual(merged.length, 1);
			assert.strictEqual(merged[0].title, "First"); // First occurrence wins
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
			assert.strictEqual(merged.length, 1);
			assert.strictEqual(merged[0].id, "entry1"); // First occurrence wins
		});

		it("should handle empty sets", () => {
			const merged = mergeEntries([[], []]);
			assert.strictEqual(merged.length, 0);
		});
	});

	describe("sortEntries", () => {
		it("should sort by ID", () => {
			const result = sortEntries(sampleEntries, "id");
			assert.strictEqual(result[0].id, "doe2023");
			assert.strictEqual(result[1].id, "jones2024");
			assert.strictEqual(result[2].id, "smith2024");
		});

		it("should sort by author", () => {
			const result = sortEntries(sampleEntries, "author");
			assert.strictEqual(result[0].author?.[0].family, "Doe");
			assert.strictEqual(result[1].author?.[0].family, "Jones");
			assert.strictEqual(result[2].author?.[0].family, "Smith");
		});

		it("should sort by year (descending)", () => {
			const result = sortEntries(sampleEntries, "year");
			assert.strictEqual(result[0].issued?.["date-parts"]?.[0]?.[0], 2024);
			assert.strictEqual(result[result.length - 1].issued?.["date-parts"]?.[0]?.[0], 2023);
		});

		it("should not mutate original array", () => {
			const original = [...sampleEntries];
			sortEntries(sampleEntries, "id");
			assert.deepStrictEqual(sampleEntries, original); // Original unchanged
		});
	});
});
