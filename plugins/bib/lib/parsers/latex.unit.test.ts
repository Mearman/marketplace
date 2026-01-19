/**
 * Tests for LaTeX parser encoding/decoding utilities
 */

import { describe, it, expect } from "vitest";
import {
	decodeLatex,
	encodeLatex,
	hasLatexCommands,
	stripLatex,
	protectText,
	unprotectText,
} from "./latex";

describe("decodeLatex", () => {
	it("should decode accented characters with braces", () => {
		expect(decodeLatex("\\\"{a}")).toBe("ä");
		expect(decodeLatex("\\'{e}")).toBe("é");
		expect(decodeLatex("\\`{a}")).toBe("à");
		expect(decodeLatex("\\^{o}")).toBe("ô");
		expect(decodeLatex("\\~{n}")).toBe("ñ");
	});

	it("should decode accented characters without braces", () => {
		expect(decodeLatex("\\\"a")).toBe("ä");
		expect(decodeLatex("\\'e")).toBe("é");
		expect(decodeLatex("\\`a")).toBe("à");
		expect(decodeLatex("\\^o")).toBe("ô");
		expect(decodeLatex("\\~n")).toBe("ñ");
	});

	it("should decode ligatures", () => {
		expect(decodeLatex("\\ae")).toBe("æ");
		expect(decodeLatex("\\AE")).toBe("Æ");
		expect(decodeLatex("\\oe")).toBe("œ");
		expect(decodeLatex("\\OE")).toBe("Œ");
		expect(decodeLatex("\\ss")).toBe("ß");
	});

	it("should decode special characters", () => {
		expect(decodeLatex("\\&")).toBe("&");
		expect(decodeLatex("\\%")).toBe("%");
		expect(decodeLatex("\\$")).toBe("$");
		expect(decodeLatex("\\#")).toBe("#");
		expect(decodeLatex("\\_")).toBe("_");
		expect(decodeLatex("\\{")).toBe("{");
		expect(decodeLatex("\\}")).toBe("}");
	});

	it("should decode quotation marks", () => {
		expect(decodeLatex("``")).toBe("\u201C"); // opening double quote
		expect(decodeLatex("''")).toBe("\u201D"); // closing double quote
		expect(decodeLatex("`")).toBe("\u2018"); // opening single quote
		expect(decodeLatex("'")).toBe("\u2019"); // closing single quote
	});

	it("should decode dashes", () => {
		expect(decodeLatex("---")).toBe("—"); // em-dash
		expect(decodeLatex("--")).toBe("–"); // en-dash
	});

	it("should decode Greek letters", () => {
		expect(decodeLatex("\\alpha")).toBe("α");
		expect(decodeLatex("\\beta")).toBe("β");
		expect(decodeLatex("\\pi")).toBe("π");
	});

	it("should decode math symbols", () => {
		expect(decodeLatex("\\textregistered")).toBe("®");
		expect(decodeLatex("\\texttrademark")).toBe("™");
		expect(decodeLatex("\\textcopyright")).toBe("©");
		expect(decodeLatex("\\pounds")).toBe("£");
		expect(decodeLatex("\\euro")).toBe("€");
	});

	it("should handle mixed LaTeX and plain text", () => {
		expect(decodeLatex("M\\\"{u}ller")).toBe("Müller");
		expect(decodeLatex("caf\\'{e}")).toBe("café");
	});

	it("should handle empty string", () => {
		expect(decodeLatex("")).toBe("");
	});

	it("should return text without changes when no LaTeX commands", () => {
		expect(decodeLatex("Hello World")).toBe("Hello World");
	});
});

describe("encodeLatex", () => {
	it("should encode accented characters", () => {
		expect(encodeLatex("ä")).toContain("\\");
		expect(encodeLatex("é")).toContain("\\");
		expect(encodeLatex("ñ")).toContain("\\");
	});

	it("should escape special BibTeX characters", () => {
		const encoded = encodeLatex("5% & $10 # _");
		expect(encoded).toContain("\\%");
		expect(encoded).toContain("\\&");
		expect(encoded).toContain("\\$");
		expect(encoded).toContain("\\#");
		expect(encoded).toContain("\\_");
	});

	it("should handle text without special characters", () => {
		expect(encodeLatex("Hello World")).toBe("Hello World");
	});

	it("should encode ligatures", () => {
		expect(encodeLatex("æ")).toContain("\\");
		expect(encodeLatex("œ")).toContain("\\");
		expect(encodeLatex("ß")).toContain("\\");
	});

	it("should handle empty string", () => {
		expect(encodeLatex("")).toBe("");
	});

	it("should encode multiple special characters", () => {
		const encoded = encodeLatex("100% of $10");
		expect(encoded).toContain("\\%");
		expect(encoded).toContain("\\$");
	});
});

describe("hasLatexCommands", () => {
	it("should detect backslash commands", () => {
		expect(hasLatexCommands("\\textbf{bold}")).toBe(true);
		expect(hasLatexCommands("\\alpha")).toBe(true);
		expect(hasLatexCommands("\\\"o")).toBe(true);
	});

	it("should detect escaped characters", () => {
		expect(hasLatexCommands("\\&")).toBe(true);
		expect(hasLatexCommands("\\%")).toBe(true);
	});

	it("should return false for plain text", () => {
		expect(hasLatexCommands("Hello World")).toBe(false);
		expect(hasLatexCommands("Müller")).toBe(false);
	});

	it("should return false for empty string", () => {
		expect(hasLatexCommands("")).toBe(false);
	});

	it("should return false for text without backslashes", () => {
		expect(hasLatexCommands("normal text")).toBe(false);
	});
});

describe("stripLatex", () => {
	it("should strip LaTeX commands and keep content", () => {
		expect(stripLatex("\\textbf{bold}")).toBe("bold");
		expect(stripLatex("\\emph{emphasized}")).toBe("emphasized");
		expect(stripLatex("\\textit{italic}")).toBe("italic");
	});

	it("should decode LaTeX commands to Unicode", () => {
		expect(stripLatex("M\\\"{u}ller")).toBe("Müller");
		expect(stripLatex("caf\\'{e}")).toBe("café");
	});

	it("should handle nested commands", () => {
		expect(stripLatex("\\textbf{\\emph{text}}")).toBe("text");
	});

	it("should handle escaped characters", () => {
		expect(stripLatex("\\&")).toBe("&");
		expect(stripLatex("\\%")).toBe("%");
	});

	it("should clean up whitespace", () => {
		expect(stripLatex("\\command   text")).toBe("text");
		expect(stripLatex("text   with    spaces")).toBe("text with spaces");
	});

	it("should handle complex LaTeX", () => {
		const result = stripLatex("\\textbf{\\textit{nested}} text");
		expect(result).toBe("nested text");
	});

	it("should return empty string for empty input", () => {
		expect(stripLatex("")).toBe("");
	});

	it("should handle plain text without changes", () => {
		expect(stripLatex("Hello World")).toBe("Hello World");
	});
});

describe("protectText", () => {
	it("should protect uppercase words", () => {
		expect(protectText("The RNA World")).toBe("The {RNA} World");
		expect(protectText("NASA Study")).toBe("{NASA} Study");
	});

	it("should not protect single uppercase letters", () => {
		expect(protectText("A Study")).toBe("A Study");
		expect(protectText("The A Test")).toBe("The A Test");
	});

	it("should handle multiple acronyms", () => {
		expect(protectText("DNA and RNA")).toBe("{DNA} and {RNA}");
		expect(protectText("The NASA and ESA projects")).toBe("The {NASA} and {ESA} projects");
	});

	it("should handle text without acronyms", () => {
		expect(protectText("hello world")).toBe("hello world");
		expect(protectText("Hello world")).toBe("Hello world");
	});

	it("should handle empty string", () => {
		expect(protectText("")).toBe("");
	});

	it("should not protect lowercase words", () => {
		expect(protectText("the text")).toBe("the text");
	});

	it("should protect acronyms at start of string", () => {
		expect(protectText("NASA mission")).toBe("{NASA} mission");
	});
});

describe("unprotectText", () => {
	it("should remove protective braces", () => {
		expect(unprotectText("{RNA}")).toBe("RNA");
		expect(unprotectText("The {RNA} World")).toBe("The RNA World");
	});

	it("should handle multiple protected words", () => {
		expect(unprotectText("{DNA} and {RNA}")).toBe("DNA and RNA");
		expect(unprotectText("{NASA} {ESA}")).toBe("NASA ESA");
	});

	it("should handle text without braces", () => {
		expect(unprotectText("hello world")).toBe("hello world");
	});

	it("should handle empty string", () => {
		expect(unprotectText("")).toBe("");
	});

	it("should preserve spaces", () => {
		expect(unprotectText("The {RNA} World")).toBe("The RNA World");
	});
});

describe("round-trip conversions", () => {
	it("should encode accented characters to LaTeX", () => {
		const original = "Müller café";
		const encoded = encodeLatex(original);
		// Should convert Unicode to LaTeX commands
		expect(encoded).toContain("\\");
		expect(encoded).toContain("{");
	});

	it("should escape special BibTeX characters", () => {
		const original = "5% of $10";
		const encoded = encodeLatex(original);
		// Should escape special characters
		expect(encoded).toContain("\\%");
		expect(encoded).toContain("\\$");
	});

	it("should protect and unprotect text", () => {
		const original = "The RNA World";
		const protectedText = protectText(original);
		const unprotectedText = unprotectText(protectedText);
		expect(unprotectedText).toBe(original);
	});

	it("should strip LaTeX commands", () => {
		const latex = "\\textbf{The RNA World}";
		const stripped = stripLatex(latex);
		expect(stripped).toBe("The RNA World");
	});
});
