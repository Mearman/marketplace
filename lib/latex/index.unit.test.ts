import { describe, it } from "node:test";
import assert from "node:assert";
import { decodeLatex, encodeLatex, hasLatexCommands, stripLatex, protectText, unprotectText } from "./index.js";

describe("decodeLatex", () => {
	it("should decode umlaut", () => {
		assert.strictEqual(decodeLatex("\\\"{a}"), "ä");
		assert.strictEqual(decodeLatex("\\\"{o}"), "ö");
		assert.strictEqual(decodeLatex("\\\"{u}"), "ü");
	});

	it("should decode acute accent", () => {
		assert.strictEqual(decodeLatex("\\'{e}"), "é");
		assert.strictEqual(decodeLatex("\\'{a}"), "á");
	});

	it("should decode grave accent", () => {
		assert.strictEqual(decodeLatex("\\`{e}"), "è");
		assert.strictEqual(decodeLatex("\\`{a}"), "à");
	});

	it("should decode circumflex", () => {
		assert.strictEqual(decodeLatex("\\^{e}"), "ê");
		assert.strictEqual(decodeLatex("\\^{o}"), "ô");
	});

	it("should decode tilde", () => {
		assert.strictEqual(decodeLatex("\\~{n}"), "ñ");
		assert.strictEqual(decodeLatex("\\~{a}"), "ã");
	});

	it("should decode cedilla", () => {
		assert.strictEqual(decodeLatex("\\c{c}"), "ç");
	});

	it("should decode ligatures", () => {
		assert.strictEqual(decodeLatex("\\ae"), "æ");
		assert.strictEqual(decodeLatex("\\oe"), "œ");
		assert.strictEqual(decodeLatex("\\ss"), "ß");
	});

	it("should decode special characters", () => {
		assert.strictEqual(decodeLatex("\\&"), "&");
		assert.strictEqual(decodeLatex("\\%"), "%");
		assert.strictEqual(decodeLatex("\\$"), "$");
	});

	it("should decode dashes", () => {
		assert.strictEqual(decodeLatex("---"), "—");
		assert.strictEqual(decodeLatex("--"), "–");
	});

	it("should decode multiple commands", () => {
		assert.strictEqual(decodeLatex("M\\\"{u}ller"), "Müller");
	});

	it("should handle text without LaTeX commands", () => {
		assert.strictEqual(decodeLatex("Hello World"), "Hello World");
	});

	it("should decode accents without braces", () => {
		assert.strictEqual(decodeLatex("\\'e"), "é");
		assert.strictEqual(decodeLatex("\\\"a"), "ä");
	});
});

describe("encodeLatex", () => {
	it("should encode umlaut", () => {
		assert.ok(encodeLatex("ä").includes("\\"));
		assert.ok(encodeLatex("ö").includes("\\"));
	});

	it("should encode special characters", () => {
		const encoded = encodeLatex("5% & $10");
		assert.ok(encoded.includes("\\%"));
		assert.ok(encoded.includes("\\&"));
		assert.ok(encoded.includes("\\$"));
	});

	it("should encode common accented characters", () => {
		assert.ok(encodeLatex("café").includes("\\"));
		assert.ok(encodeLatex("naïve").includes("\\"));
	});

	it("should handle text without special characters", () => {
		assert.strictEqual(encodeLatex("Hello World"), "Hello World");
	});

	it("should encode German characters", () => {
		const encoded = encodeLatex("Müller");
		assert.ok(encoded.includes("\\"));
	});
});

describe("hasLatexCommands", () => {
	it("should detect LaTeX commands", () => {
		assert.strictEqual(hasLatexCommands("\\\"{a}"), true);
		assert.strictEqual(hasLatexCommands("\\alpha"), true);
		assert.strictEqual(hasLatexCommands("\\&"), true);
	});

	it("should return false for plain text", () => {
		assert.strictEqual(hasLatexCommands("Hello World"), false);
	});

	it("should return false for empty string", () => {
		assert.strictEqual(hasLatexCommands(""), false);
	});
});

describe("stripLatex", () => {
	it("should strip LaTeX commands and keep content", () => {
		assert.strictEqual(stripLatex("\\textbf{bold}"), "bold");
		assert.strictEqual(stripLatex("\\emph{emphasized}"), "emphasized");
	});

	it("should strip accents and convert to Unicode", () => {
		const result = stripLatex("M\\\"{u}ller");
		assert.strictEqual(result, "Müller");
	});

	it("should handle nested commands", () => {
		assert.strictEqual(stripLatex("\\textbf{\\emph{text}}"), "text");
	});

	it("should clean up whitespace", () => {
		assert.strictEqual(stripLatex("\\command   text"), "text");
	});
});

describe("protectText", () => {
	it("should protect uppercase acronyms", () => {
		assert.strictEqual(protectText("The RNA World"), "The {RNA} World");
		assert.strictEqual(protectText("NASA Study"), "{NASA} Study");
	});

	it("should not protect single uppercase letters", () => {
		assert.strictEqual(protectText("A Study"), "A Study");
	});

	it("should handle multiple acronyms", () => {
		assert.strictEqual(protectText("DNA and RNA"), "{DNA} and {RNA}");
	});

	it("should handle text without acronyms", () => {
		assert.strictEqual(protectText("hello world"), "hello world");
	});
});

describe("unprotectText", () => {
	it("should remove protective braces", () => {
		assert.strictEqual(unprotectText("{RNA}"), "RNA");
		assert.strictEqual(unprotectText("The {RNA} World"), "The RNA World");
	});

	it("should handle multiple protected words", () => {
		assert.strictEqual(unprotectText("{DNA} and {RNA}"), "DNA and RNA");
	});

	it("should handle text without braces", () => {
		assert.strictEqual(unprotectText("hello world"), "hello world");
	});
});

describe("Round-trip encoding/decoding", () => {
	it("should handle basic encode-decode for braced commands", () => {
		// Test with pre-encoded LaTeX (the format that parsers would produce)
		const latex = "M\\\"{u}ller caf\\" + "'{e}";
		const decoded = decodeLatex(latex);
		assert.strictEqual(decoded, "Müller café");
	});

	it("should encode unicode to latex commands", () => {
		const original = "café";
		const encoded = encodeLatex(original);
		// Should produce something with LaTeX commands (exact format may vary)
		assert.ok(encoded.match(/caf/));
		assert.ok(encoded.length > original.length);
	});
});
