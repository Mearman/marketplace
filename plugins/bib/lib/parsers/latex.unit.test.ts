import { describe, it, expect } from "vitest";
import { decodeLatex, encodeLatex, hasLatexCommands, stripLatex, protectText, unprotectText } from "../../../../lib/latex/index.js";

describe("decodeLatex", () => {
  it("should decode umlaut", () => {
    expect(decodeLatex('\\"{a}')).toBe("ä");
    expect(decodeLatex('\\"{o}')).toBe("ö");
    expect(decodeLatex('\\"{u}')).toBe("ü");
  });

  it("should decode acute accent", () => {
    expect(decodeLatex("\\'{e}")).toBe("é");
    expect(decodeLatex("\\'{a}")).toBe("á");
  });

  it("should decode grave accent", () => {
    expect(decodeLatex("\\`{e}")).toBe("è");
    expect(decodeLatex("\\`{a}")).toBe("à");
  });

  it("should decode circumflex", () => {
    expect(decodeLatex("\\^{e}")).toBe("ê");
    expect(decodeLatex("\\^{o}")).toBe("ô");
  });

  it("should decode tilde", () => {
    expect(decodeLatex("\\~{n}")).toBe("ñ");
    expect(decodeLatex("\\~{a}")).toBe("ã");
  });

  it("should decode cedilla", () => {
    expect(decodeLatex("\\c{c}")).toBe("ç");
  });

  it("should decode ligatures", () => {
    expect(decodeLatex("\\ae")).toBe("æ");
    expect(decodeLatex("\\oe")).toBe("œ");
    expect(decodeLatex("\\ss")).toBe("ß");
  });

  it("should decode special characters", () => {
    expect(decodeLatex("\\&")).toBe("&");
    expect(decodeLatex("\\%")).toBe("%");
    expect(decodeLatex("\\$")).toBe("$");
  });

  it("should decode dashes", () => {
    expect(decodeLatex("---")).toBe("—");
    expect(decodeLatex("--")).toBe("–");
  });

  it("should decode multiple commands", () => {
    expect(decodeLatex('M\\"{u}ller')).toBe("Müller");
  });

  it("should handle text without LaTeX commands", () => {
    expect(decodeLatex("Hello World")).toBe("Hello World");
  });

  it("should decode accents without braces", () => {
    expect(decodeLatex("\\'e")).toBe("é");
    expect(decodeLatex('\\"a')).toBe("ä");
  });
});

describe("encodeLatex", () => {
  it("should encode umlaut", () => {
    expect(encodeLatex("ä")).toContain("\\");
    expect(encodeLatex("ö")).toContain("\\");
  });

  it("should encode special characters", () => {
    const encoded = encodeLatex("5% & $10");
    expect(encoded).toContain("\\%");
    expect(encoded).toContain("\\&");
    expect(encoded).toContain("\\$");
  });

  it("should encode common accented characters", () => {
    expect(encodeLatex("café")).toContain("\\");
    expect(encodeLatex("naïve")).toContain("\\");
  });

  it("should handle text without special characters", () => {
    expect(encodeLatex("Hello World")).toBe("Hello World");
  });

  it("should encode German characters", () => {
    const encoded = encodeLatex("Müller");
    expect(encoded).toContain("\\");
  });
});

describe("hasLatexCommands", () => {
  it("should detect LaTeX commands", () => {
    expect(hasLatexCommands('\\"{a}')).toBe(true);
    expect(hasLatexCommands("\\alpha")).toBe(true);
    expect(hasLatexCommands("\\&")).toBe(true);
  });

  it("should return false for plain text", () => {
    expect(hasLatexCommands("Hello World")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(hasLatexCommands("")).toBe(false);
  });
});

describe("stripLatex", () => {
  it("should strip LaTeX commands and keep content", () => {
    expect(stripLatex("\\textbf{bold}")).toBe("bold");
    expect(stripLatex("\\emph{emphasized}")).toBe("emphasized");
  });

  it("should strip accents and convert to Unicode", () => {
    const result = stripLatex('M\\"{u}ller');
    expect(result).toBe("Müller");
  });

  it("should handle nested commands", () => {
    expect(stripLatex("\\textbf{\\emph{text}}")).toBe("text");
  });

  it("should clean up whitespace", () => {
    expect(stripLatex("\\command   text")).toBe("text");
  });
});

describe("protectText", () => {
  it("should protect uppercase acronyms", () => {
    expect(protectText("The RNA World")).toBe("The {RNA} World");
    expect(protectText("NASA Study")).toBe("{NASA} Study");
  });

  it("should not protect single uppercase letters", () => {
    expect(protectText("A Study")).toBe("A Study");
  });

  it("should handle multiple acronyms", () => {
    expect(protectText("DNA and RNA")).toBe("{DNA} and {RNA}");
  });

  it("should handle text without acronyms", () => {
    expect(protectText("hello world")).toBe("hello world");
  });
});

describe("unprotectText", () => {
  it("should remove protective braces", () => {
    expect(unprotectText("{RNA}")).toBe("RNA");
    expect(unprotectText("The {RNA} World")).toBe("The RNA World");
  });

  it("should handle multiple protected words", () => {
    expect(unprotectText("{DNA} and {RNA}")).toBe("DNA and RNA");
  });

  it("should handle text without braces", () => {
    expect(unprotectText("hello world")).toBe("hello world");
  });
});

describe("Round-trip encoding/decoding", () => {
  it("should handle basic encode-decode for braced commands", () => {
    // Test with pre-encoded LaTeX (the format that parsers would produce)
    const latex = 'M\\"{u}ller caf\\' + "'{e}";
    const decoded = decodeLatex(latex);
    expect(decoded).toBe("Müller café");
  });

  it("should encode unicode to latex commands", () => {
    const original = "café";
    const encoded = encodeLatex(original);
    // Should produce something with LaTeX commands (exact format may vary)
    expect(encoded).toMatch(/caf/);
    expect(encoded.length).toBeGreaterThan(original.length);
  });
});
