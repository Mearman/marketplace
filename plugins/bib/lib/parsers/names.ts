/**
 * Name parsing and serialization utilities.
 *
 * Handles conversion between:
 * - BibTeX/RIS format: "Last, First" or "First Last"
 * - CSL JSON format: { family: "Last", given: "First" }
 *
 * Supports:
 * - Name particles (von, van, de, etc.)
 * - Suffixes (Jr., Sr., III, etc.)
 * - Organization/literal names
 * - Multiple name formats
 */

import type { Person } from "../types.js";

/**
 * Parse a name string into structured Person format.
 *
 * Supports formats:
 * - "Last, First" - BibTeX comma format
 * - "First Last" - Natural order
 * - "Last, First, Suffix" - With suffix
 * - "von Last, First" - With particle
 * - "{Organization Name}" - Literal/organization
 *
 * @param nameStr - Name string to parse
 * @returns Structured Person object
 */
export function parseName(nameStr: string): Person {
	const trimmed = nameStr.trim();

	// Handle literal names (enclosed in braces or all caps for orgs)
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		return { literal: trimmed.slice(1, -1) };
	}

	// Check if name contains comma (BibTeX format)
	if (trimmed.includes(",")) {
		return parseCommaSeparatedName(trimmed);
	}

	// Natural order: "First Last" or "First von Last"
	return parseNaturalOrderName(trimmed);
}

/**
 * Parse comma-separated name: "Last, First" or "Last, First, Suffix"
 */
function parseCommaSeparatedName(nameStr: string): Person {
	const parts = nameStr.split(",").map((p) => p.trim());

	if (parts.length === 1) {
		// Just a family name
		return { family: parts[0] };
	}

	const person: Person = {};

	// First part: family name (may include particles)
	const familyPart = parts[0];
	const familyWords = familyPart.split(/\s+/);

	// Check for particles (lowercase words before the family name)
	const particles: string[] = [];
	const familyWords2: string[] = [];

	for (const word of familyWords) {
		if (isParticle(word) && familyWords2.length === 0) {
			particles.push(word);
		} else {
			familyWords2.push(word);
		}
	}

	if (particles.length > 0) {
		person["non-dropping-particle"] = particles.join(" ");
	}

	person.family = familyWords2.join(" ");

	// Second part: given name
	if (parts[1]) {
		person.given = parts[1];
	}

	// Third part: suffix
	if (parts[2]) {
		person.suffix = parts[2];
	}

	return person;
}

/**
 * Parse natural order name: "First Last" or "First von Last"
 */
function parseNaturalOrderName(nameStr: string): Person {
	const words = nameStr.split(/\s+/);

	if (words.length === 1) {
		// Single word - assume family name
		return { family: words[0] };
	}

	const person: Person = {};
	const givenWords: string[] = [];
	const particleWords: string[] = [];
	const familyWords: string[] = [];
	let foundParticle = false;

	// Scan from left to right
	for (let i = 0; i < words.length; i++) {
		const word = words[i];

		// Last word is always part of family name
		if (i === words.length - 1) {
			familyWords.push(word);
			break;
		}

		// Check if this looks like a suffix
		if (isSuffix(word)) {
			person.suffix = word;
			continue;
		}

		// Check if this is a particle
		if (isParticle(word) && !foundParticle) {
			foundParticle = true;
			particleWords.push(word);
		} else if (foundParticle) {
			// After particle, everything is family name (except last is family)
			if (isParticle(word)) {
				particleWords.push(word);
			} else {
				familyWords.push(word);
			}
		} else {
			// Before particle, everything is given name
			givenWords.push(word);
		}
	}

	if (givenWords.length > 0) {
		person.given = givenWords.join(" ");
	}

	if (particleWords.length > 0) {
		person["non-dropping-particle"] = particleWords.join(" ");
	}

	if (familyWords.length > 0) {
		person.family = familyWords.join(" ");
	}

	return person;
}

/**
 * Check if a word is a name particle (von, van, de, etc.)
 */
function isParticle(word: string): boolean {
	const lowercase = word.toLowerCase();

	// Common particles (case-sensitive check)
	const particles = [
		"von",
		"van",
		"de",
		"di",
		"del",
		"della",
		"da",
		"le",
		"la",
		"el",
		"al",
		"bin",
		"ibn",
		"ter",
		"op",
		"aan",
		"dos",
		"das",
	];

	// Particle if: (1) in list AND (2) starts with lowercase
	return particles.includes(lowercase) && word[0] === word[0].toLowerCase();
}

/**
 * Check if a word is a suffix (Jr., Sr., III, etc.)
 */
function isSuffix(word: string): boolean {
	const normalized = word.replace(/\./g, "").toLowerCase();

	const suffixes = ["jr", "sr", "ii", "iii", "iv", "v", "vi", "esq", "phd", "md"];

	return suffixes.includes(normalized);
}

/**
 * Serialize a Person object back to name string.
 *
 * @param person - Structured Person object
 * @param format - Output format ("bibtex" or "natural")
 * @returns Name string
 */
export function serializeName(person: Person, format: "bibtex" | "natural" = "bibtex"): string {
	// Literal name - return as-is
	if (person.literal) {
		return format === "bibtex" ? `{${person.literal}}` : person.literal;
	}

	if (format === "bibtex") {
		return serializeBibTeXName(person);
	} else {
		return serializeNaturalName(person);
	}
}

/**
 * Serialize to BibTeX format: "Last, First, Suffix"
 */
function serializeBibTeXName(person: Person): string {
	const parts: string[] = [];

	// Family name (with particles)
	const familyParts: string[] = [];
	if (person["non-dropping-particle"]) {
		familyParts.push(person["non-dropping-particle"]);
	}
	if (person["dropping-particle"]) {
		familyParts.push(person["dropping-particle"]);
	}
	if (person.family) {
		familyParts.push(person.family);
	}

	if (familyParts.length > 0) {
		parts.push(familyParts.join(" "));
	}

	// Given name
	if (person.given) {
		parts.push(person.given);
	}

	// Suffix
	if (person.suffix) {
		parts.push(person.suffix);
	}

	return parts.join(", ");
}

/**
 * Serialize to natural format: "First von Last, Suffix"
 */
function serializeNaturalName(person: Person): string {
	const parts: string[] = [];

	// Given name first
	if (person.given) {
		parts.push(person.given);
	}

	// Particles
	if (person["non-dropping-particle"]) {
		parts.push(person["non-dropping-particle"]);
	}
	if (person["dropping-particle"]) {
		parts.push(person["dropping-particle"]);
	}

	// Family name
	if (person.family) {
		parts.push(person.family);
	}

	let name = parts.join(" ");

	// Append suffix
	if (person.suffix) {
		name += `, ${person.suffix}`;
	}

	return name;
}

/**
 * Parse multiple names from a delimited string.
 *
 * BibTeX uses " and " as delimiter.
 * RIS uses one name per line.
 *
 * @param namesStr - String with multiple names
 * @param delimiter - Delimiter (" and " for BibTeX, "\n" for RIS)
 * @returns Array of Person objects
 */
export function parseNames(namesStr: string, delimiter: string = " and "): Person[] {
	if (!namesStr || namesStr.trim() === "") {
		return [];
	}

	return namesStr
		.split(delimiter)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
		.map(parseName);
}

/**
 * Serialize multiple names to a delimited string.
 *
 * @param persons - Array of Person objects
 * @param delimiter - Delimiter (" and " for BibTeX, "\n" for RIS)
 * @param format - Name format
 * @returns Delimited string
 */
export function serializeNames(
	persons: Person[],
	delimiter: string = " and ",
	format: "bibtex" | "natural" = "bibtex"
): string {
	return persons.map((p) => serializeName(p, format)).join(delimiter);
}
