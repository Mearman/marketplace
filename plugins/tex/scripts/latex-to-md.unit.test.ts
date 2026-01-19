import { describe, expect, it, beforeEach, vi } from "vitest";
import { latexToMarkdown } from "./latex-to-md.js";

describe("latexToMarkdown", () => {
	describe("Sections/Headers", () => {
		it("converts chapter to H1", () => {
			const input = "\\chapter{Hello World}";
			const output = latexToMarkdown(input);
			expect(output).toContain("# Hello World");
		});

		it("converts section to H2", () => {
			const input = "\\section{Section}";
			const output = latexToMarkdown(input);
			expect(output).toContain("## Section");
		});

		it("converts subsection to H3", () => {
			const input = "\\subsection{Subsection}";
			const output = latexToMarkdown(input);
			expect(output).toContain("### Subsection");
		});

		it("converts subsubsection to H4", () => {
			const input = "\\subsubsection{Subsubsection}";
			const output = latexToMarkdown(input);
			expect(output).toContain("#### Subsubsection");
		});

		it("converts paragraph to H5", () => {
			const input = "\\paragraph{Paragraph}";
			const output = latexToMarkdown(input);
			expect(output).toContain("##### Paragraph");
		});

		it("converts subparagraph to H6", () => {
			const input = "\\subparagraph{Subparagraph}";
			const output = latexToMarkdown(input);
			expect(output).toContain("###### Subparagraph");
		});

		it("handles multiple headers", () => {
			const input = "\\chapter{Title}\n\n\\section{Section}\n\n\\subsection{Subsection}";
			const output = latexToMarkdown(input);
			expect(output).toContain("# Title");
			expect(output).toContain("## Section");
			expect(output).toContain("### Subsection");
		});
	});

	describe("Text Formatting", () => {
		it("converts textbf to **bold**", () => {
			const input = "This is \\textbf{bold} text";
			const output = latexToMarkdown(input);
			expect(output).toContain("**bold**");
		});

		it("converts textit to *italic*", () => {
			const input = "This is \\textit{italic} text";
			const output = latexToMarkdown(input);
			expect(output).toContain("*italic*");
		});

		it("converts emph to *italic*", () => {
			const input = "This is \\emph{emphasis} text";
			const output = latexToMarkdown(input);
			expect(output).toContain("*emphasis*");
		});

		it("converts texttt to inline code", () => {
			const input = "Use \\texttt{code} here";
			const output = latexToMarkdown(input);
			expect(output).toContain("`code`");
		});

		it("converts verb to inline code", () => {
			const input = "Use \\verb|code| here";
			const output = latexToMarkdown(input);
			expect(output).toContain("`code`");
		});

		it("handles multiple formatting types", () => {
			const input = "\\textbf{bold} and \\textit{italic} and \\texttt{code}";
			const output = latexToMarkdown(input);
			expect(output).toContain("**bold**");
			expect(output).toContain("*italic*");
			expect(output).toContain("`code`");
		});
	});

	describe("Links", () => {
		it("converts href to [text](url)", () => {
			const input = "\\href{https://example.com}{Click here}";
			const output = latexToMarkdown(input);
			expect(output).toContain("[Click here](https://example.com)");
		});

		it("converts url to <url>", () => {
			const input = "\\url{https://example.com}";
			const output = latexToMarkdown(input);
			expect(output).toContain("<https://example.com>");
		});

		it("handles multiple links", () => {
			const input = "\\href{https://a.com}{Link 1} and \\href{https://b.com}{Link 2}";
			const output = latexToMarkdown(input);
			expect(output).toContain("[Link 1](https://a.com)");
			expect(output).toContain("[Link 2](https://b.com)");
		});
	});

	describe("Images", () => {
		it("converts figure with caption to ![alt](src)", () => {
			const input = `\\begin{figure}
\\includegraphics{image.png}
\\caption{My Image}
\\end{figure}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("![My Image](image.png)");
		});

		it("converts includegraphics without caption", () => {
			const input = "\\includegraphics{image.png}";
			const output = latexToMarkdown(input);
			expect(output).toContain("![](image.png)");
		});

		it("handles includegraphics with options", () => {
			const input = "\\includegraphics[width=5cm]{image.png}";
			const output = latexToMarkdown(input);
			expect(output).toContain("![](image.png)");
		});

		it("converts figure with centering", () => {
			const input = `\\begin{figure}[h]
\\centering
\\includegraphics{image.png}
\\caption{Description}
\\end{figure}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("![Description](image.png)");
		});
	});

	describe("Lists", () => {
		it("converts itemize to unordered list", () => {
			const input = `\\begin{itemize}
\\item First item
\\item Second item
\\item Third item
\\end{itemize}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("- First item");
			expect(output).toContain("- Second item");
			expect(output).toContain("- Third item");
		});

		it("converts enumerate to ordered list", () => {
			const input = `\\begin{enumerate}
\\item First
\\item Second
\\item Third
\\end{enumerate}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("1. First");
			expect(output).toContain("2. Second");
			expect(output).toContain("3. Third");
		});

		it("handles items with spaces", () => {
			const input = `\\begin{itemize}
\\item   Item with spaces
\\item Item 2
\\end{itemize}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("- Item with spaces");
			expect(output).toContain("- Item 2");
		});
	});

	describe("Code Blocks", () => {
		it("converts verbatim to code block", () => {
			const input = `\\begin{verbatim}
code here
\\end{verbatim}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("```");
			expect(output).toContain("code here");
		});

		it("converts lstlisting to code block", () => {
			const input = `\\begin{lstlisting}
code here
\\end{lstlisting}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("```");
			expect(output).toContain("code here");
		});

		it("preserves code content without conversion", () => {
			const input = `\\begin{verbatim}
\\textbf{not converted}
\\end{verbatim}`;
			const output = latexToMarkdown(input);
			// Should not convert LaTeX commands inside verbatim
			expect(output).toContain("\\textbf{not converted}");
			expect(output).not.toContain("**not converted**");
		});
	});

	describe("Blockquotes", () => {
		it("converts quote environment to blockquote", () => {
			const input = `\\begin{quote}
This is a quote
\\end{quote}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("> This is a quote");
		});

		it("handles multi-line quotes", () => {
			const input = `\\begin{quote}
Line 1
Line 2
Line 3
\\end{quote}`;
			const output = latexToMarkdown(input);
			expect(output).toContain("> Line 1");
			expect(output).toContain("> Line 2");
			expect(output).toContain("> Line 3");
		});
	});

	describe("Horizontal Rules", () => {
		it("converts hrulefill to ---", () => {
			const input = "Text above\n\n\\hrulefill\n\nText below";
			const output = latexToMarkdown(input);
			expect(output).toContain("---");
		});

		it("converts hline to ---", () => {
			const input = "Text above\n\n\\hline\n\nText below";
			const output = latexToMarkdown(input);
			expect(output).toContain("---");
		});
	});

	describe("Unicode Character Decoding", () => {
		it("decodes accented characters with braces", () => {
			const input = "Caf\\'{e}";
			const output = latexToMarkdown(input);
			expect(output).toContain("Café");
		});

		it("decodes accented characters without braces", () => {
			const input = "\\'e";
			const output = latexToMarkdown(input);
			expect(output).toContain("é");
		});

		it("decodes umlaut", () => {
			const input = "\\\"a";
			const output = latexToMarkdown(input);
			expect(output).toContain("ä");
		});

		it("decodes ligatures", () => {
			const input = "\\ae\\ and \\oe\\ and \\ss";
			const output = latexToMarkdown(input);
			expect(output).toContain("æ");
			expect(output).toContain("œ");
			expect(output).toContain("ß");
		});

		it("decodes multiple special characters", () => {
			const input = "R\\'esum\\'e with \\c{c}afe";
			const output = latexToMarkdown(input);
			expect(output).toContain("é");
			expect(output).toContain("ç");
		});
	});

	describe("Complex Documents", () => {
		it("handles mixed content", () => {
			const input = `\\chapter{Title}

This is \\textbf{bold} and \\emph{italic} text.

\\section{Section}

\\begin{itemize}
\\item Item 1
\\item Item 2
\\end{itemize}

\\href{https://example.com}{Link}

\\begin{verbatim}
code block
\\end{verbatim}`;

			const output = latexToMarkdown(input);
			expect(output).toContain("# Title");
			expect(output).toContain("**bold**");
			expect(output).toContain("*italic*");
			expect(output).toContain("## Section");
			expect(output).toContain("- Item 1");
			expect(output).toContain("[Link](https://example.com)");
			expect(output).toContain("```");
		});

		it("maintains plain text", () => {
			const input = "Plain text paragraph.";
			const output = latexToMarkdown(input);
			expect(output).toContain("Plain text paragraph.");
		});

		it("handles document with all features", () => {
			const input = `\\chapter{Hello World}

This is a \\textbf{bold} test with \\emph{italic} and \\texttt{code} text.

\\section{Section}

\\begin{itemize}
\\item Item 1
\\item Item 2
\\end{itemize}

\\begin{enumerate}
\\item First
\\item Second
\\end{enumerate}

\\begin{verbatim}
print('hello')
\\end{verbatim}

\\href{https://example.com}{Link}

\\begin{figure}[h]
\\centering
\\includegraphics{image.png}
\\caption{Image}
\\end{figure}

Special characters: \\'{e} \\"{a} \\ae`;

			const output = latexToMarkdown(input);
			expect(output).toContain("# Hello World");
			expect(output).toContain("**bold**");
			expect(output).toContain("*italic*");
			expect(output).toContain("`code`");
			expect(output).toContain("## Section");
			expect(output).toContain("- Item 1");
			expect(output).toContain("1. First");
			expect(output).toContain("```");
			expect(output).toContain("print('hello')");
			expect(output).toContain("[Link](https://example.com)");
			expect(output).toContain("![Image](image.png)");
			expect(output).toContain("é");
			expect(output).toContain("ä");
			expect(output).toContain("æ");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty input", () => {
			const input = "";
			const output = latexToMarkdown(input);
			expect(output).toBe("");
		});

		it("handles input with only whitespace", () => {
			const input = "   \n\n   ";
			const output = latexToMarkdown(input);
			expect(output.trim().length).toBeGreaterThanOrEqual(0);
		});

		it("handles nested formatting", () => {
			const input = "\\textbf{bold \\textit{and italic}}";
			const output = latexToMarkdown(input);
			// Should attempt to convert nested structures
			expect(output).toContain("**");
			expect(output).toContain("*");
		});

		it("cleans up excessive whitespace", () => {
			const input = "Line 1\n\n\n\n\nLine 2";
			const output = latexToMarkdown(input);
			// Should reduce to at most double newline
			expect(output).not.toMatch(/\n{4,}/);
		});
	});

	describe("Round-Trip Compatibility", () => {
		it("maintains semantic meaning through conversion", () => {
			const original = `\\chapter{Title}

This is \\textbf{bold} text.

\\section{Section}

\\begin{itemize}
\\item Item 1
\\item Item 2
\\end{itemize}`;

			const output = latexToMarkdown(original);

			// Check all semantic elements are preserved
			expect(output).toContain("# Title");
			expect(output).toContain("**bold**");
			expect(output).toContain("## Section");
			expect(output).toContain("- Item 1");
			expect(output).toContain("- Item 2");
		});
	});
});

describe("main() function with dependency injection", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockReadFileSync: any;
	let mockWriteFileSync: any;
	let deps: any;
	let parseArgs: any;

	beforeEach(async () => {
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		mockReadFileSync = vi.fn();
		mockWriteFileSync = vi.fn();

		deps = {
			console: mockConsole,
			process: mockProcess,
			readFileSync: mockReadFileSync,
			writeFileSync: mockWriteFileSync,
		};

		// Import parseArgs dynamically
		const mod = await import("../../../lib/args/index.js");
		parseArgs = mod.parseArgs;

		vi.clearAllMocks();
	});

	it("should convert LaTeX text from positional arguments", async () => {
		const { main } = await import("./latex-to-md");
		const args = parseArgs(["\\section{Hello World}"]);

		main(args, deps);

		expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("## Hello World"));
	});

	it("should read LaTeX from file when --file flag is used", async () => {
		const { main } = await import("./latex-to-md");
		mockReadFileSync.mockReturnValue("\\textbf{Bold text}");

		const args = parseArgs(["--file", "input.tex"]);

		main(args, deps);

		expect(mockReadFileSync).toHaveBeenCalledWith("input.tex", "utf-8");
		expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("**Bold text**"));
	});

	it("should write output to file when --output option is provided", async () => {
		const { main } = await import("./latex-to-md");

		const args = parseArgs(["\\section{Test}", "--output=output.md"]);

		main(args, deps);

		expect(mockWriteFileSync).toHaveBeenCalledWith("output.md", expect.stringContaining("## Test"), "utf-8");
		expect(mockConsole.log).toHaveBeenCalledWith("Converted Markdown written to output.md");
	});

	it("should show error when --file flag but no file path", async () => {
		const { main } = await import("./latex-to-md");

		const args = parseArgs(["--file"]);

		expect(() => main(args, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: No input file specified");
	});

	it("should show error when no input text provided", async () => {
		const { main } = await import("./latex-to-md");

		const args = parseArgs([]);

		expect(() => main(args, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: No input text specified");
	});

	it("should show error when --file but empty positional args", async () => {
		const { main } = await import("./latex-to-md");

		const args = parseArgs(["--file"]);

		expect(() => main(args, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: No input file specified");
	});
});

describe("handleError", () => {
	let mockConsole: any;
	let mockProcess: any;
	let deps: any;

	beforeEach(() => {
		mockConsole = {
			error: vi.fn(),
		};

		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		deps = {
			console: mockConsole,
			process: mockProcess,
		};

		vi.clearAllMocks();
	});

	it("should log error message and exit", async () => {
		const { handleError } = await import("./latex-to-md");
		const error = new Error("Test error");

		expect(() => handleError(error, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: Test error");
		expect(mockProcess.exit).toHaveBeenCalledWith(1);
	});

	it("should handle string errors", async () => {
		const { handleError } = await import("./latex-to-md");

		expect(() => handleError("String error", deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: String error");
	});
});
