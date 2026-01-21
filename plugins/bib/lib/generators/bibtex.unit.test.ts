import { describe, it } from "node:test";
import assert from "node:assert";
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
			assert.ok(output.includes("@article{smith2024,"));
			assert.ok(output.match(/author = \{Smith, John\}/));
			assert.ok(output.match(/title = \{Test Article\}/));
			assert.ok(output.includes("year = {2024}"));
		});

		it("should generate multiple entries", () => {
			const entries: BibEntry[] = [
				{ id: "entry1", type: "article-journal", title: "First" },
				{ id: "entry2", type: "book", title: "Second" },
			];

			const output = generator.generate(entries);
			assert.ok(output.includes("@article{entry1,"));
			assert.ok(output.includes("@book{entry2,"));
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
			assert.ok(output.includes("author = {Smith, John and Doe, Jane}"));
		});

		it("should generate date fields", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				issued: { "date-parts": [[2024, 3, 15]] },
			};

			const output = generator.generate([entry]);
			assert.ok(output.includes("year = {2024}"));
			assert.ok(output.includes("month = mar"));
			assert.ok(output.includes("day = {15}"));
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
			assert.ok(output.includes("title = {Title}"));
			assert.ok(output.includes("journal = {Journal}"));
			assert.ok(output.includes("volume = {10}"));
			assert.ok(output.includes("number = {3}"));
			assert.ok(output.includes("pages = {100-110}"));
			assert.ok(output.includes("doi = {10.1234/test}"));
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
			assert.ok(output.includes("\\"));
			assert.ok(output.match(/title = \{.*\}/));
		});

		it("should encode author names with special characters", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				author: [{ family: "Müller", given: "Hans" }],
			};

			const output = generator.generate([entry]);
			assert.ok(output.includes("\\"));
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
			assert.ok(alphaIndex < zebraIndex);
		});

		it("should use custom indentation", () => {
			const entry: BibEntry = {
				id: "test",
				type: "article-journal",
				title: "Test",
			};

			const output = generator.generate([entry], { indent: "\t" });
			assert.ok(output.includes("\ttitle = {Test}"));
		});
	});

	describe("entry type mapping", () => {
		it("should map book to @book", () => {
			const entry: BibEntry = { id: "test", type: "book" };
			const output = generator.generate([entry]);
			assert.ok(output.includes("@book{test,"));
		});

		it("should map paper-conference to @inproceedings", () => {
			const entry: BibEntry = { id: "test", type: "paper-conference" };
			const output = generator.generate([entry]);
			assert.ok(output.includes("@inproceedings{test,"));
		});

		it("should map dataset to @misc (lossy conversion)", () => {
			const entry: BibEntry = { id: "test", type: "dataset" };
			const output = generator.generate([entry]);
			assert.ok(output.includes("@misc{test,"));
		});
	});
});
