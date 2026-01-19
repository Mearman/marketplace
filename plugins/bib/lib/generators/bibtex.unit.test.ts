import { describe, it, expect } from "vitest";
import { BibTeXGenerator } from "./bibtex.js";
import type { BibEntry } from "../types.js";

describe("BibTeXGenerator", () => {
	const generator = new BibTeXGenerator();

	describe("basic generation", () => {
		it("should generate simple article", () => {
			const entry: BibEntry = {
				id: "smith2024",
				type: "article-journal",
				title: "Test Article",
				author: [{ family: "Smith", given: "John" }],
				issued: { "date-parts": [[2024]] },
			};

			const output = generator.generate([entry]);
			expect(output).toContain("@article{smith2024,");
			expect(output).toMatch(/author = \{Smith, John\}/);
			expect(output).toMatch(/title = \{Test Article\}/);
			expect(output).toContain("year = {2024}");
		});

		it("should generate multiple entries", () => {
			const entries: BibEntry[] = [
				{ id: "entry1", type: "article-journal", title: "First" },
				{ id: "entry2", type: "book", title: "Second" },
			];

			const output = generator.generate(entries);
			expect(output).toContain("@article{entry1,");
			expect(output).toContain("@book{entry2,");
		});
	});

	describe("field generation", () => {
		it("should generate author field", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				author: [
					{ family: "Smith", given: "John" },
					{ family: "Doe", given: "Jane" },
				],
			};

			const output = generator.generate([entry]);
			expect(output).toContain("author = {Smith, John and Doe, Jane}");
		});

		it("should generate date fields", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				issued: { "date-parts": [[2024, 3, 15]] },
			};

			const output = generator.generate([entry]);
			expect(output).toContain("year = {2024}");
			expect(output).toContain("month = mar");
			expect(output).toContain("day = {15}");
		});

		it("should generate common fields", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				title: "Title",
				"container-title": "Journal",
				volume: "10",
				issue: "3",
				page: "100-110",
				DOI: "10.1234/test",
			};

			const output = generator.generate([entry]);
			expect(output).toContain("title = {Title}");
			expect(output).toContain("journal = {Journal}");
			expect(output).toContain("volume = {10}");
			expect(output).toContain("number = {3}");
			expect(output).toContain("pages = {100-110}");
			expect(output).toContain("doi = {10.1234/test}");
		});
	});

	describe("LaTeX encoding", () => {
		it("should encode special characters", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				title: "Müller & Co.",
			};

			const output = generator.generate([entry]);
			expect(output).toContain("\\");
			expect(output).toMatch(/title = \{.*\}/);
		});

		it("should encode author names with special characters", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				author: [{ family: "Müller", given: "Hans" }],
			};

			const output = generator.generate([entry]);
			expect(output).toContain("\\");
		});
	});

	describe("options", () => {
		it("should sort entries when requested", () => {
			const entries: BibEntry[] = [
				{ id: "zebra", type: "article-journal", title: "Z" },
				{ id: "alpha", type: "article-journal", title: "A" },
			];

			const output = generator.generate(entries, { sort: true });
			const alphaIndex = output.indexOf("@article{alpha,");
			const zebraIndex = output.indexOf("@article{zebra,");
			expect(alphaIndex).toBeLessThan(zebraIndex);
		});

		it("should use custom indentation", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				title: "Test",
			};

			const output = generator.generate([entry], { indent: "\t" });
			expect(output).toContain("\ttitle = {Test}");
		});
	});

	describe("entry type mapping", () => {
		it("should map book to @book", () => {
			const entry: BibEntry = { id: "test", type: "book" };
			const output = generator.generate([entry]);
			expect(output).toContain("@book{test,");
		});

		it("should map paper-conference to @inproceedings", () => {
			const entry: BibEntry = { id: "test", type: "paper-conference" };
			const output = generator.generate([entry]);
			expect(output).toContain("@inproceedings{test,");
		});

		it("should map dataset to @misc (lossy conversion)", () => {
			const entry: BibEntry = { id: "test", type: "dataset" };
			const output = generator.generate([entry]);
			expect(output).toContain("@misc{test,");
		});
	});
});
