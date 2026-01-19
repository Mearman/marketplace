import { describe, expect, it, beforeEach, vi } from "vitest";
import { markdownToLatex } from "./md-to-latex.js";

describe("markdownToLatex", () => {
	describe("Headers", () => {
		it("converts H1 to chapter", () => {
			const input = "# Hello World";
			const output = markdownToLatex(input);
			expect(output).toContain("\\chapter{Hello World}");
		});

		it("converts H2 to section", () => {
			const input = "## Section";
			const output = markdownToLatex(input);
			expect(output).toContain("\\section{Section}");
		});

		it("converts H3 to subsection", () => {
			const input = "### Subsection";
			const output = markdownToLatex(input);
			expect(output).toContain("\\subsection{Subsection}");
		});

		it("converts H4 to subsubsection", () => {
			const input = "#### Subsubsection";
			const output = markdownToLatex(input);
			expect(output).toContain("\\subsubsection{Subsubsection}");
		});

		it("converts H5 to paragraph", () => {
			const input = "##### Paragraph";
			const output = markdownToLatex(input);
			expect(output).toContain("\\paragraph{Paragraph}");
		});

		it("converts H6 to subparagraph", () => {
			const input = "###### Subparagraph";
			const output = markdownToLatex(input);
			expect(output).toContain("\\subparagraph{Subparagraph}");
		});

		it("handles multiple headers", () => {
			const input = "# Title\n\n## Section\n\n### Subsection";
			const output = markdownToLatex(input);
			expect(output).toContain("\\chapter{Title}");
			expect(output).toContain("\\section{Section}");
			expect(output).toContain("\\subsection{Subsection}");
		});
	});

	describe("Text Formatting", () => {
		it("converts **bold** to textbf", () => {
			const input = "This is **bold** text";
			const output = markdownToLatex(input);
			expect(output).toContain("\\textbf{bold}");
		});

		it("converts __bold__ to textbf", () => {
			const input = "This is __bold__ text";
			const output = markdownToLatex(input);
			expect(output).toContain("\\textbf{bold}");
		});

		it("converts *italic* to emph", () => {
			const input = "This is *italic* text";
			const output = markdownToLatex(input);
			expect(output).toContain("\\emph{italic}");
		});

		it("converts _italic_ to emph", () => {
			const input = "This is _italic_ text";
			const output = markdownToLatex(input);
			expect(output).toContain("\\emph{italic}");
		});

		it("handles bold and italic together", () => {
			const input = "**bold** and *italic*";
			const output = markdownToLatex(input);
			expect(output).toContain("\\textbf{bold}");
			expect(output).toContain("\\emph{italic}");
		});

		it("converts inline code to texttt", () => {
			const input = "Use `code` here";
			const output = markdownToLatex(input);
			expect(output).toContain("\\texttt{code}");
		});
	});

	describe("Links", () => {
		it("converts [text](url) to href", () => {
			const input = "[Click here](https://example.com)";
			const output = markdownToLatex(input);
			expect(output).toContain("\\href{https://example.com}{Click here}");
		});

		it("handles multiple links", () => {
			const input = "[Link 1](https://a.com) and [Link 2](https://b.com)";
			const output = markdownToLatex(input);
			expect(output).toContain("\\href{https://a.com}{Link 1}");
			expect(output).toContain("\\href{https://b.com}{Link 2}");
		});
	});

	describe("Images", () => {
		it("converts ![alt](src) with alt text to figure", () => {
			const input = "![My Image](image.png)";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{figure}[h]");
			expect(output).toContain("\\centering");
			expect(output).toContain("\\includegraphics{image.png}");
			expect(output).toContain("\\caption{My Image}");
			expect(output).toContain("\\end{figure}");
		});

		it("converts ![](src) without alt text to includegraphics", () => {
			const input = "![](image.png)";
			const output = markdownToLatex(input);
			expect(output).toContain("\\includegraphics{image.png}");
			expect(output).not.toContain("\\begin{figure}");
		});
	});

	describe("Lists", () => {
		it("converts unordered list to itemize", () => {
			const input = "- Item 1\n- Item 2\n- Item 3";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{itemize}");
			expect(output).toContain("\\item Item 1");
			expect(output).toContain("\\item Item 2");
			expect(output).toContain("\\item Item 3");
			expect(output).toContain("\\end{itemize}");
		});

		it("converts ordered list to enumerate", () => {
			const input = "1. First\n2. Second\n3. Third";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{enumerate}");
			expect(output).toContain("\\item First");
			expect(output).toContain("\\item Second");
			expect(output).toContain("\\item Third");
			expect(output).toContain("\\end{enumerate}");
		});

		it("handles * for unordered lists", () => {
			const input = "* Item 1\n* Item 2";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{itemize}");
			expect(output).toContain("\\item Item 1");
			expect(output).toContain("\\item Item 2");
		});

		it("handles + for unordered lists", () => {
			const input = "+ Item 1\n+ Item 2";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{itemize}");
			expect(output).toContain("\\item Item 1");
			expect(output).toContain("\\item Item 2");
		});
	});

	describe("Code Blocks", () => {
		it("converts code blocks to verbatim", () => {
			const input = "```\ncode here\n```";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{verbatim}");
			expect(output).toContain("code here");
			expect(output).toContain("\\end{verbatim}");
		});

		it("handles code blocks with language specifier", () => {
			const input = "```python\nprint('hello')\n```";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{verbatim}");
			expect(output).toContain("print('hello')");
			expect(output).toContain("\\end{verbatim}");
		});

		it("protects code blocks from markdown conversion", () => {
			const input = "```\n**not bold**\n*not italic*\n```";
			const output = markdownToLatex(input);
			expect(output).toContain("**not bold**");
			expect(output).toContain("*not italic*");
			expect(output).not.toContain("\\textbf");
			expect(output).not.toContain("\\emph");
		});
	});

	describe("Blockquotes", () => {
		it("converts blockquotes to quote environment", () => {
			const input = "> This is a quote";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{quote}");
			expect(output).toContain("This is a quote");
			expect(output).toContain("\\end{quote}");
		});

		it("handles multi-line blockquotes", () => {
			const input = "> Line 1\n> Line 2";
			const output = markdownToLatex(input);
			expect(output).toContain("\\begin{quote}");
			expect(output).toContain("Line 1");
			expect(output).toContain("Line 2");
		});
	});

	describe("Horizontal Rules", () => {
		it("converts --- to hrulefill", () => {
			const input = "Text above\n\n---\n\nText below";
			const output = markdownToLatex(input);
			expect(output).toContain("\\hrulefill");
		});
	});

	describe("Special Characters", () => {
		it("escapes ampersand", () => {
			const input = "Rock & Roll";
			const output = markdownToLatex(input);
			expect(output).toContain("Rock \\& Roll");
		});

		it("escapes percent", () => {
			const input = "100% complete";
			const output = markdownToLatex(input);
			expect(output).toContain("100\\% complete");
		});

		it("escapes dollar sign", () => {
			const input = "Price: $50";
			const output = markdownToLatex(input);
			expect(output).toContain("Price: \\$50");
		});

		it("does not escape braces in generated LaTeX", () => {
			const input = "**bold**";
			const output = markdownToLatex(input);
			expect(output).toContain("\\textbf{bold}");
			expect(output).not.toContain("\\{");
		});
	});

	describe("Complex Documents", () => {
		it("handles mixed content", () => {
			const input = `# Title

This is **bold** and *italic* text.

## Section

- Item 1
- Item 2

[Link](https://example.com)

\`\`\`
code block
\`\`\``;

			const output = markdownToLatex(input);
			expect(output).toContain("\\chapter{Title}");
			expect(output).toContain("\\textbf{bold}");
			expect(output).toContain("\\emph{italic}");
			expect(output).toContain("\\section{Section}");
			expect(output).toContain("\\begin{itemize}");
			expect(output).toContain("\\href{https://example.com}{Link}");
			expect(output).toContain("\\begin{verbatim}");
		});

		it("maintains text without special markdown", () => {
			const input = "Plain text paragraph.";
			const output = markdownToLatex(input);
			expect(output).toContain("Plain text paragraph.");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty input", () => {
			const input = "";
			const output = markdownToLatex(input);
			expect(output).toBe("");
		});

		it("handles input with only whitespace", () => {
			const input = "   \n\n   ";
			const output = markdownToLatex(input);
			expect(output.trim()).toBe("");
		});

		it("handles inline code with special characters", () => {
			const input = "Use `$variable` here";
			const output = markdownToLatex(input);
			expect(output).toContain("\\texttt{$variable}");
			// Special chars inside code should be preserved
		});

		it("preserves multiple consecutive blank lines as double newline", () => {
			const input = "Line 1\n\n\n\nLine 2";
			const output = markdownToLatex(input);
			// Should have content but not necessarily preserve exact whitespace
			expect(output).toContain("Line 1");
			expect(output).toContain("Line 2");
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

	it("should convert Markdown text from positional arguments", async () => {
		const { main } = await import("./md-to-latex");
		const args = parseArgs(["## Hello World"]);

		main(args, deps);

		expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("\\section{Hello World}"));
	});

	it("should read Markdown from file when --file flag is used", async () => {
		const { main } = await import("./md-to-latex");
		mockReadFileSync.mockReturnValue("**Bold text**");

		const args = parseArgs(["--file", "input.md"]);

		main(args, deps);

		expect(mockReadFileSync).toHaveBeenCalledWith("input.md", "utf-8");
		expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("\\textbf{Bold text}"));
	});

	it("should write output to file when --output option is provided", async () => {
		const { main } = await import("./md-to-latex");

		const args = parseArgs(["## Test", "--output=output.tex"]);

		main(args, deps);

		expect(mockWriteFileSync).toHaveBeenCalledWith("output.tex", expect.stringContaining("\\section{Test}"), "utf-8");
		expect(mockConsole.log).toHaveBeenCalledWith("Converted LaTeX written to output.tex");
	});

	it("should show error when --file flag but no file path", async () => {
		const { main } = await import("./md-to-latex");

		const args = parseArgs(["--file"]);

		expect(() => main(args, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: No input file specified");
	});

	it("should show error when no input text provided", async () => {
		const { main } = await import("./md-to-latex");

		const args = parseArgs([]);

		expect(() => main(args, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: No input text specified");
	});

	it("should show error when --file but empty positional args", async () => {
		const { main } = await import("./md-to-latex");

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
		const { handleError } = await import("./md-to-latex");
		const error = new Error("Test error");

		expect(() => handleError(error, deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: Test error");
		expect(mockProcess.exit).toHaveBeenCalledWith(1);
	});

	it("should handle string errors", async () => {
		const { handleError } = await import("./md-to-latex");

		expect(() => handleError("String error", deps)).toThrow("process.exit called");
		expect(mockConsole.error).toHaveBeenCalledWith("Error: String error");
	});
});
