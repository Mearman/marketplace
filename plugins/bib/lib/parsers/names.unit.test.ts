import { describe, it, expect } from "vitest";
import { parseName, serializeName, parseNames, serializeNames } from "./names.js";

describe("parseName", () => {
	it("should parse comma-separated name (Last, First)", () => {
		const person = parseName("Smith, John");
		expect(person.family).toBe("Smith");
		expect(person.given).toBe("John");
	});

	it("should parse comma-separated name with suffix", () => {
		const person = parseName("Smith, John, Jr.");
		expect(person.family).toBe("Smith");
		expect(person.given).toBe("John");
		expect(person.suffix).toBe("Jr.");
	});

	it("should parse natural order name (First Last)", () => {
		const person = parseName("John Smith");
		expect(person.family).toBe("Smith");
		expect(person.given).toBe("John");
	});

	it("should parse name with particle (von)", () => {
		const person = parseName("von Neumann, John");
		expect(person["non-dropping-particle"]).toBe("von");
		expect(person.family).toBe("Neumann");
		expect(person.given).toBe("John");
	});

	it("should parse name with multiple particles", () => {
		const person = parseName("de la Cruz, Maria");
		expect(person["non-dropping-particle"]).toBe("de la");
		expect(person.family).toBe("Cruz");
		expect(person.given).toBe("Maria");
	});

	it("should parse literal name in braces", () => {
		const person = parseName("{The Research Team}");
		expect(person.literal).toBe("The Research Team");
	});

	it("should parse single word as family name", () => {
		const person = parseName("Einstein");
		expect(person.family).toBe("Einstein");
	});

	it("should handle natural order with particle", () => {
		const person = parseName("Ludwig van Beethoven");
		expect(person.given).toBe("Ludwig");
		expect(person["non-dropping-particle"]).toBe("van");
		expect(person.family).toBe("Beethoven");
	});
});

describe("serializeName", () => {
	it("should serialize to BibTeX format", () => {
		const person = { family: "Smith", given: "John" };
		expect(serializeName(person, "bibtex")).toBe("Smith, John");
	});

	it("should serialize with suffix", () => {
		const person = { family: "Smith", given: "John", suffix: "Jr." };
		expect(serializeName(person, "bibtex")).toBe("Smith, John, Jr.");
	});

	it("should serialize with particle", () => {
		const person = {
			family: "Neumann",
			given: "John",
			"non-dropping-particle": "von",
		};
		expect(serializeName(person, "bibtex")).toBe("von Neumann, John");
	});

	it("should serialize literal name", () => {
		const person = { literal: "The Research Team" };
		expect(serializeName(person, "bibtex")).toBe("{The Research Team}");
	});

	it("should serialize to natural format", () => {
		const person = { family: "Smith", given: "John" };
		expect(serializeName(person, "natural")).toBe("John Smith");
	});

	it("should serialize natural format with suffix", () => {
		const person = { family: "Smith", given: "John", suffix: "Jr." };
		expect(serializeName(person, "natural")).toBe("John Smith, Jr.");
	});
});

describe("parseNames", () => {
	it("should parse multiple names with 'and' delimiter", () => {
		const persons = parseNames("Smith, John and Doe, Jane", " and ");
		expect(persons).toHaveLength(2);
		expect(persons[0].family).toBe("Smith");
		expect(persons[1].family).toBe("Doe");
	});

	it("should handle empty string", () => {
		const persons = parseNames("", " and ");
		expect(persons).toHaveLength(0);
	});

	it("should handle single name", () => {
		const persons = parseNames("Smith, John", " and ");
		expect(persons).toHaveLength(1);
		expect(persons[0].family).toBe("Smith");
	});
});

describe("serializeNames", () => {
	it("should serialize multiple names with delimiter", () => {
		const persons = [
			{ family: "Smith", given: "John" },
			{ family: "Doe", given: "Jane" },
		];
		expect(serializeNames(persons, " and ", "bibtex")).toBe("Smith, John and Doe, Jane");
	});

	it("should handle empty array", () => {
		const persons: any[] = [];
		expect(serializeNames(persons, " and ", "bibtex")).toBe("");
	});
});
