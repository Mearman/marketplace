import { describe, it } from "node:test";
import * as assert from "node:assert";
import { parseName, serializeName, parseNames, serializeNames } from "./names.js";

describe("parseName", () => {
	it("should parse comma-separated name (Last, First)", () => {
		const person = parseName("Smith, John");
		assert.strictEqual(person.family, "Smith");
		assert.strictEqual(person.given, "John");
	});

	it("should parse comma-separated name with suffix", () => {
		const person = parseName("Smith, John, Jr.");
		assert.strictEqual(person.family, "Smith");
		assert.strictEqual(person.given, "John");
		assert.strictEqual(person.suffix, "Jr.");
	});

	it("should parse natural order name (First Last)", () => {
		const person = parseName("John Smith");
		assert.strictEqual(person.family, "Smith");
		assert.strictEqual(person.given, "John");
	});

	it("should parse name with particle (von)", () => {
		const person = parseName("von Neumann, John");
		assert.strictEqual(person["non-dropping-particle"], "von");
		assert.strictEqual(person.family, "Neumann");
		assert.strictEqual(person.given, "John");
	});

	it("should parse name with multiple particles", () => {
		const person = parseName("de la Cruz, Maria");
		assert.strictEqual(person["non-dropping-particle"], "de la");
		assert.strictEqual(person.family, "Cruz");
		assert.strictEqual(person.given, "Maria");
	});

	it("should parse literal name in braces", () => {
		const person = parseName("{The Research Team}");
		assert.strictEqual(person.literal, "The Research Team");
	});

	it("should parse single word as family name", () => {
		const person = parseName("Einstein");
		assert.strictEqual(person.family, "Einstein");
	});

	it("should handle natural order with particle", () => {
		const person = parseName("Ludwig van Beethoven");
		assert.strictEqual(person.given, "Ludwig");
		assert.strictEqual(person["non-dropping-particle"], "van");
		assert.strictEqual(person.family, "Beethoven");
	});
});

describe("serializeName", () => {
	it("should serialize to BibTeX format", () => {
		const person = { family: "Smith", given: "John" };
		assert.strictEqual(serializeName(person, "bibtex"), "Smith, John");
	});

	it("should serialize with suffix", () => {
		const person = { family: "Smith", given: "John", suffix: "Jr." };
		assert.strictEqual(serializeName(person, "bibtex"), "Smith, John, Jr.");
	});

	it("should serialize with particle", () => {
		const person = {
			family: "Neumann",
			given: "John",
			"non-dropping-particle": "von",
		};
		assert.strictEqual(serializeName(person, "bibtex"), "von Neumann, John");
	});

	it("should serialize literal name", () => {
		const person = { literal: "The Research Team" };
		assert.strictEqual(serializeName(person, "bibtex"), "{The Research Team}");
	});

	it("should serialize to natural format", () => {
		const person = { family: "Smith", given: "John" };
		assert.strictEqual(serializeName(person, "natural"), "John Smith");
	});

	it("should serialize natural format with suffix", () => {
		const person = { family: "Smith", given: "John", suffix: "Jr." };
		assert.strictEqual(serializeName(person, "natural"), "John Smith, Jr.");
	});
});

describe("parseNames", () => {
	it("should parse multiple names with 'and' delimiter", () => {
		const persons = parseNames("Smith, John and Doe, Jane", " and ");
		assert.strictEqual(persons.length, 2);
		assert.strictEqual(persons[0].family, "Smith");
		assert.strictEqual(persons[1].family, "Doe");
	});

	it("should handle empty string", () => {
		const persons = parseNames("", " and ");
		assert.strictEqual(persons.length, 0);
	});

	it("should handle single name", () => {
		const persons = parseNames("Smith, John", " and ");
		assert.strictEqual(persons.length, 1);
		assert.strictEqual(persons[0].family, "Smith");
	});
});

describe("serializeNames", () => {
	it("should serialize multiple names with delimiter", () => {
		const persons = [
			{ family: "Smith", given: "John" },
			{ family: "Doe", given: "Jane" },
		];
		assert.strictEqual(serializeNames(persons, " and ", "bibtex"), "Smith, John and Doe, Jane");
	});

	it("should handle empty array", () => {
		const persons: any[] = [];
		assert.strictEqual(serializeNames(persons, " and ", "bibtex"), "");
	});
});
