/**
 * Tests for LaTeX parser encoding/decoding utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
	decodeLatex,
	encodeLatex,
	hasLatexCommands,
	stripLatex,
	protectText,
	unprotectText,
} from "./latex.js";

describe("decodeLatex", () => {
	it("should decode accented characters with braces", () => {
		assert.strictEqual(decodeLatex("\\\"{a}"), "ä");
		assert.strictEqual(decodeLatex("\\'{e}"), "é");
		assert.strictEqual(decodeLatex("\\`{a}"), "à");
		assert.strictEqual(decodeLatex("\\^{o}"), "ô");
		assert.strictEqual(decodeLatex("\\~{n}"), "ñ");
	});

	it("should decode accented characters without braces", () => {
		assert.strictEqual(decodeLatex("\\\"a"), "ä");
		assert.strictEqual(decodeLatex("\\'e"), "é");
		assert.strictEqual(decodeLatex("\\`a"), "à");
		assert.strictEqual(decodeLatex("\\^o"), "ô");
		assert.strictEqual(decodeLatex("\\~n"), "ñ");
	});

	it("should decode ligatures", () => {
		assert.strictEqual(decodeLatex("\\ae"), "æ");
		assert.strictEqual(decodeLatex("\\AE"), "Æ");
		assert.strictEqual(decodeLatex("\\oe"), "œ");
		assert.strictEqual(decodeLatex("\\OE"), "Œ");
		assert.strictEqual(decodeLatex("\\ss"), "ß");
	});

	it("should decode special characters", () => {
		assert.strictEqual(decodeLatex("\\&"), "&");
		assert.strictEqual(decodeLatex("\\%"), "%");
		assert.strictEqual(decodeLatex("\\$"), "$");
		assert.strictEqual(decodeLatex("\\#"), "#");
		assert.strictEqual(decodeLatex("\\_"), "_");
		assert.strictEqual(decodeLatex("\\{"), "{");
		assert.strictEqual(decodeLatex("\\}"), "}");
	});

	it("should decode quotation marks", () => {
		assert.strictEqual(decodeLatex("``"), "\u201C"); // opening double quote
		assert.strictEqual(decodeLatex("''"), "\u201D"); // closing double quote
		assert.strictEqual(decodeLatex("`"), "\u2018"); // opening single quote
		assert.strictEqual(decodeLatex("'"), "\u2019"); // closing single quote
	});

	it("should decode dashes", () => {
		assert.strictEqual(decodeLatex("---"), "—"); // em-dash
		assert.strictEqual(decodeLatex("--"), "–"); // en-dash
	});

	it("should decode Greek letters", () => {
		assert.strictEqual(decodeLatex("\\alpha"), "α");
		assert.strictEqual(decodeLatex("\\beta"), "β");
		assert.strictEqual(decodeLatex("\\pi"), "π");
	});

	it("should decode math symbols", () => {
		assert.strictEqual(decodeLatex("\\textregistered"), "®");
		assert.strictEqual(decodeLatex("\\texttrademark"), "™");
		assert.strictEqual(decodeLatex("\\textcopyright"), "©");
		assert.strictEqual(decodeLatex("\\pounds"), "£");
		assert.strictEqual(decodeLatex("\\euro"), "€");
	});

	it("should handle mixed LaTeX and plain text", () => {
		assert.strictEqual(decodeLatex("M\\\"{u}ller"), "Müller");
		assert.strictEqual(decodeLatex("caf\\'{e}"), "café");
	});

	it("should handle empty string", () => {
		assert.strictEqual(decodeLatex(""), "");
	});

	it("should return text without changes when no LaTeX commands", () => {
		assert.strictEqual(decodeLatex("Hello World"), "Hello World");
	});
});

describe("encodeLatex", () => {
	it("should encode accented characters", () => {
		assert.ok(encodeLatex("ä").includes("\\"));
		assert.ok(encodeLatex("é").includes("\\"));
		assert.ok(encodeLatex("ñ").includes("\\"));
	});

	it("should escape special BibTeX characters", () => {
		const encoded = encodeLatex("5% & $10 # _");
		assert.ok(encoded.includes("\\%"));
		assert.ok(encoded.includes("\\&"));
		assert.ok(encoded.includes("\\$"));
		assert.ok(encoded.includes("\\#"));
		assert.ok(encoded.includes("\\_"));
	});

	it("should handle text without special characters", () => {
		assert.strictEqual(encodeLatex("Hello World"), "Hello World");
	});

	it("should encode ligatures", () => {
		assert.ok(encodeLatex("æ").includes("\\"));
		assert.ok(encodeLatex("œ").includes("\\"));
		assert.ok(encodeLatex("ß").includes("\\"));
	});

	it("should handle empty string", () => {
		assert.strictEqual(encodeLatex(""), "");
	});

	it("should encode multiple special characters", () => {
		const encoded = encodeLatex("100% of $10");
		assert.ok(encoded.includes("\\%"));
		assert.ok(encoded.includes("\\$"));
	});
});

describe("hasLatexCommands", () => {
	it("should detect backslash commands", () => {
		assert.strictEqual(hasLatexCommands("\\textbf{bold}"), true);
		assert.strictEqual(hasLatexCommands("\\alpha"), true);
		assert.strictEqual(hasLatexCommands("\\\"o"), true);
	});

	it("should detect escaped characters", () => {
		assert.strictEqual(hasLatexCommands("\\&"), true);
		assert.strictEqual(hasLatexCommands("\\%"), true);
	});

	it("should return false for plain text", () => {
		assert.strictEqual(hasLatexCommands("Hello World"), false);
		assert.strictEqual(hasLatexCommands("Müller"), false);
	});

	it("should return false for empty string", () => {
		assert.strictEqual(hasLatexCommands(""), false);
	});

	it("should return false for text without backslashes", () => {
		assert.strictEqual(hasLatexCommands("normal text"), false);
	});
});

describe("stripLatex", () => {
	it("should strip LaTeX commands and keep content", () => {
		assert.strictEqual(stripLatex("\\textbf{bold}"), "bold");
		assert.strictEqual(stripLatex("\\emph{emphasized}"), "emphasized");
		assert.strictEqual(stripLatex("\\textit{italic}"), "italic");
	});

	it("should decode LaTeX commands to Unicode", () => {
		assert.strictEqual(stripLatex("M\\\"{u}ller"), "Müller");
		assert.strictEqual(stripLatex("caf\\'{e}"), "café");
	});

	it("should handle nested commands", () => {
		assert.strictEqual(stripLatex("\\textbf{\\emph{text}}"), "text");
	});

	it("should handle escaped characters", () => {
		assert.strictEqual(stripLatex("\\&"), "&");
		assert.strictEqual(stripLatex("\\%"), "%");
	});

	it("should clean up whitespace", () => {
		assert.strictEqual(stripLatex("\\command   text"), "text");
		assert.strictEqual(stripLatex("text   with    spaces"), "text with spaces");
	});

	it("should handle complex LaTeX", () => {
		const result = stripLatex("\\textbf{\\textit{nested}} text");
		assert.strictEqual(result, "nested text");
	});

	it("should return empty string for empty input", () => {
		assert.strictEqual(stripLatex(""), "");
	});

	it("should handle plain text without changes", () => {
		assert.strictEqual(stripLatex("Hello World"), "Hello World");
	});
});

describe("protectText", () => {
	it("should protect uppercase words", () => {
		assert.strictEqual(protectText("The RNA World"), "The {RNA} World");
		assert.strictEqual(protectText("NASA Study"), "{NASA} Study");
	});

	it("should not protect single uppercase letters", () => {
		assert.strictEqual(protectText("A Study"), "A Study");
		assert.strictEqual(protectText("The A Test"), "The A Test");
	});

	it("should handle multiple acronyms", () => {
		assert.strictEqual(protectText("DNA and RNA"), "{DNA} and {RNA}");
		assert.strictEqual(protectText("The NASA and ESA projects"), "The {NASA} and {ESA} projects");
	});

	it("should handle text without acronyms", () => {
		assert.strictEqual(protectText("hello world"), "hello world");
		assert.strictEqual(protectText("Hello world"), "Hello world");
	});

	it("should handle empty string", () => {
		assert.strictEqual(protectText(""), "");
	});

	it("should not protect lowercase words", () => {
		assert.strictEqual(protectText("the text"), "the text");
	});

	it("should protect acronyms at start of string", () => {
		assert.strictEqual(protectText("NASA mission"), "{NASA} mission");
	});
});

describe("unprotectText", () => {
	it("should remove protective braces", () => {
		assert.strictEqual(unprotectText("{RNA}"), "RNA");
		assert.strictEqual(unprotectText("The {RNA} World"), "The RNA World");
	});

	it("should handle multiple protected words", () => {
		assert.strictEqual(unprotectText("{DNA} and {RNA}"), "DNA and RNA");
		assert.strictEqual(unprotectText("{NASA} {ESA}"), "NASA ESA");
	});

	it("should handle text without braces", () => {
		assert.strictEqual(unprotectText("hello world"), "hello world");
	});

	it("should handle empty string", () => {
		assert.strictEqual(unprotectText(""), "");
	});

	it("should preserve spaces", () => {
		assert.strictEqual(unprotectText("The {RNA} World"), "The RNA World");
	});
});

describe("round-trip conversions", () => {
	it("should encode accented characters to LaTeX", () => {
		const original = "Müller café";
		const encoded = encodeLatex(original);
		// Should convert Unicode to LaTeX commands
		assert.ok(encoded.includes("\\"));
		assert.ok(encoded.includes("{"));
	});

	it("should escape special BibTeX characters", () => {
		const original = "5% of $10";
		const encoded = encodeLatex(original);
		// Should escape special characters
		assert.ok(encoded.includes("\\%"));
		assert.ok(encoded.includes("\\$"));
	});

	it("should protect and unprotect text", () => {
		const original = "The RNA World";
		const protectedText = protectText(original);
		const unprotectedText = unprotectText(protectedText);
		assert.strictEqual(unprotectedText, original);
	});

	it("should strip LaTeX commands", () => {
		const latex = "\\textbf{The RNA World}";
		const stripped = stripLatex(latex);
		assert.strictEqual(stripped, "The RNA World");
	});
});
