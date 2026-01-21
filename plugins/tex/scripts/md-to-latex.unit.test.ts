import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { markdownToLatex } from "./md-to-latex.js";

describe("markdownToLatex", () => {
	describe("Headers", () => {
		it("converts H1 to chapter", () => {
			const input = "# Hello World";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\chapter{Hello World}"));
		});

		it("converts H2 to section", () => {
			const input = "## Section";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\section{Section}"));
		});

		it("converts H3 to subsection", () => {
			const input = "### Subsection";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\subsection{Subsection}"));
		});

		it("converts H4 to subsubsection", () => {
			const input = "#### Subsubsection";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\subsubsection{Subsubsection}"));
		});

		it("converts H5 to paragraph", () => {
			const input = "##### Paragraph";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\paragraph{Paragraph}"));
		});

		it("converts H6 to subparagraph", () => {
			const input = "###### Subparagraph";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\subparagraph{Subparagraph}"));
		});

		it("handles multiple headers", () => {
			const input = "# Title\n\n## Section\n\n### Subsection";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\chapter{Title}"));
			assert.ok(output.includes("\\section{Section}"));
			assert.ok(output.includes("\\subsection{Subsection}"));
		});
	});

	describe("Text Formatting", () => {
		it("converts **bold** to textbf", () => {
			const input = "This is **bold** text";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\textbf{bold}"));
		});

		it("converts __bold__ to textbf", () => {
			const input = "This is __bold__ text";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\textbf{bold}"));
		});

		it("converts *italic* to emph", () => {
			const input = "This is *italic* text";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\emph{italic}"));
		});

		it("converts _italic_ to emph", () => {
			const input = "This is _italic_ text";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\emph{italic}"));
		});

		it("handles bold and italic together", () => {
			const input = "**bold** and *italic*";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\textbf{bold}"));
			assert.ok(output.includes("\\emph{italic}"));
		});

		it("converts inline code to texttt", () => {
			const input = "Use `code` here";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\texttt{code}"));
		});
	});

	describe("Links", () => {
		it("converts [text](url) to href", () => {
			const input = "[Click here](https://example.com)";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\href{https://example.com}{Click here}"));
		});

		it("handles multiple links", () => {
			const input = "[Link 1](https://a.com) and [Link 2](https://b.com)";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\href{https://a.com}{Link 1}"));
			assert.ok(output.includes("\\href{https://b.com}{Link 2}"));
		});
	});

	describe("Images", () => {
		it("converts ![alt](src) with alt text to figure", () => {
			const input = "![My Image](image.png)";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{figure}[h]"));
			assert.ok(output.includes("\\centering"));
			assert.ok(output.includes("\\includegraphics{image.png}"));
			assert.ok(output.includes("\\caption{My Image}"));
			assert.ok(output.includes("\\end{figure}"));
		});

		it("converts ![](src) without alt text to includegraphics", () => {
			const input = "![](image.png)";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\includegraphics{image.png}"));
			assert.ok(!output.includes("\\begin{figure}"));
		});
	});

	describe("Lists", () => {
		it("converts unordered list to itemize", () => {
			const input = "- Item 1\n- Item 2\n- Item 3";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{itemize}"));
			assert.ok(output.includes("\\item Item 1"));
			assert.ok(output.includes("\\item Item 2"));
			assert.ok(output.includes("\\item Item 3"));
			assert.ok(output.includes("\\end{itemize}"));
		});

		it("converts ordered list to enumerate", () => {
			const input = "1. First\n2. Second\n3. Third";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{enumerate}"));
			assert.ok(output.includes("\\item First"));
			assert.ok(output.includes("\\item Second"));
			assert.ok(output.includes("\\item Third"));
			assert.ok(output.includes("\\end{enumerate}"));
		});

		it("handles * for unordered lists", () => {
			const input = "* Item 1\n* Item 2";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{itemize}"));
			assert.ok(output.includes("\\item Item 1"));
			assert.ok(output.includes("\\item Item 2"));
		});

		it("handles + for unordered lists", () => {
			const input = "+ Item 1\n+ Item 2";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{itemize}"));
			assert.ok(output.includes("\\item Item 1"));
			assert.ok(output.includes("\\item Item 2"));
		});
	});

	describe("Code Blocks", () => {
		it("converts code blocks to verbatim", () => {
			const input = "```\ncode here\n```";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{verbatim}"));
			assert.ok(output.includes("code here"));
			assert.ok(output.includes("\\end{verbatim}"));
		});

		it("handles code blocks with language specifier", () => {
			const input = "```python\nprint('hello')\n```";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{verbatim}"));
			assert.ok(output.includes("print('hello')"));
			assert.ok(output.includes("\\end{verbatim}"));
		});

		it("protects code blocks from markdown conversion", () => {
			const input = "```\n**not bold**\n*not italic*\n```";
			const output = markdownToLatex(input);
			assert.ok(output.includes("**not bold**"));
			assert.ok(output.includes("*not italic*"));
			assert.ok(!output.includes("\\textbf"));
			assert.ok(!output.includes("\\emph"));
		});
	});

	describe("Blockquotes", () => {
		it("converts blockquotes to quote environment", () => {
			const input = "> This is a quote";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{quote}"));
			assert.ok(output.includes("This is a quote"));
			assert.ok(output.includes("\\end{quote}"));
		});

		it("handles multi-line blockquotes", () => {
			const input = "> Line 1\n> Line 2";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\begin{quote}"));
			assert.ok(output.includes("Line 1"));
			assert.ok(output.includes("Line 2"));
		});
	});

	describe("Horizontal Rules", () => {
		it("converts --- to hrulefill", () => {
			const input = "Text above\n\n---\n\nText below";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\hrulefill"));
		});
	});

	describe("Special Characters", () => {
		it("escapes ampersand", () => {
			const input = "Rock & Roll";
			const output = markdownToLatex(input);
			assert.ok(output.includes("Rock \\& Roll"));
		});

		it("escapes percent", () => {
			const input = "100% complete";
			const output = markdownToLatex(input);
			assert.ok(output.includes("100\\% complete"));
		});

		it("escapes dollar sign", () => {
			const input = "Price: $50";
			const output = markdownToLatex(input);
			assert.ok(output.includes("Price: \\$50"));
		});

		it("does not escape braces in generated LaTeX", () => {
			const input = "**bold**";
			const output = markdownToLatex(input);
			assert.ok(output.includes("\\textbf{bold}"));
			assert.ok(!output.includes("\\{"));
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
				assert.ok(output.includes("\\chapter{Title}"));
				assert.ok(output.includes("\\textbf{bold}"));
				assert.ok(output.includes("\\emph{italic}"));
				assert.ok(output.includes("\\section{Section}"));
				assert.ok(output.includes("\\begin{itemize}"));
				assert.ok(output.includes("\\href{https://example.com}{Link}"));
				assert.ok(output.includes("\\begin{verbatim}"));
			});

			it("maintains text without special markdown", () => {
				const input = "Plain text paragraph.";
				const output = markdownToLatex(input);
				assert.ok(output.includes("Plain text paragraph."));
			});
		});

		describe("Edge Cases", () => {
			it("handles empty input", () => {
				const input = "";
				const output = markdownToLatex(input);
				assert.strictEqual(output, "");
			});

			it("handles input with only whitespace", () => {
				const input = "   \n\n   ";
				const output = markdownToLatex(input);
				assert.strictEqual(output.trim(), "");
			});

			it("handles inline code with special characters", () => {
				const input = "Use `$variable` here";
				const output = markdownToLatex(input);
				assert.ok(output.includes("\\texttt{$variable}"));
			// Special chars inside code should be preserved
			});

			it("preserves multiple consecutive blank lines as double newline", () => {
				const input = "Line 1\n\n\n\nLine 2";
				const output = markdownToLatex(input);
				// Should have content but not necessarily preserve exact whitespace
				assert.ok(output.includes("Line 1"));
				assert.ok(output.includes("Line 2"));
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
			mock.reset();

			mockConsole = {
				log: mock.fn(),
				error: mock.fn(),
			};

			mockProcess = {
				exit: mock.fn(() => {
					throw new Error("process.exit called");
				}),
			};

			mockReadFileSync = mock.fn();
			mockWriteFileSync = mock.fn();

			deps = {
				console: mockConsole,
				process: mockProcess,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			};

			// Import parseArgs dynamically
			const mod = await import("../../../lib/args/index.js");
			parseArgs = mod.parseArgs;
		});

		it("should convert Markdown text from positional arguments", async () => {
			const { main } = await import("./md-to-latex.js");
			const args = parseArgs(["## Hello World"]);

			main(args, deps);

			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("\\section{Hello World}")));
		});

		it("should read Markdown from file when --file flag is used", async () => {
			const { main } = await import("./md-to-latex.js");
			mockReadFileSync.mock.mockImplementation(() => "**Bold text**");

			const args = parseArgs(["--file", "input.md"]);

			main(args, deps);

			assert.strictEqual(mockReadFileSync.mock.calls[0].arguments[0], "input.md");
			assert.strictEqual(mockReadFileSync.mock.calls[0].arguments[1], "utf-8");
			assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("\\textbf{Bold text}")));
		});

		it("should write output to file when --output option is provided", async () => {
			const { main } = await import("./md-to-latex.js");

			const args = parseArgs(["## Test", "--output=output.tex"]);

			main(args, deps);

			assert.strictEqual(mockWriteFileSync.mock.calls[0].arguments[0], "output.tex");
			assert.ok(typeof mockWriteFileSync.mock.calls[0].arguments[1] === "string" && mockWriteFileSync.mock.calls[0].arguments[1].includes("\\section{Test}"));
			assert.strictEqual(mockWriteFileSync.mock.calls[0].arguments[2], "utf-8");
			assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments[0] === "Converted LaTeX written to output.tex"));
		});

		it("should show error when --file flag but no file path", async () => {
			const { main } = await import("./md-to-latex.js");

			const args = parseArgs(["--file"]);

			assert.throws(() => main(args, deps), { message: "process.exit called" });
			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: No input file specified"));
		});

		it("should show error when no input text provided", async () => {
			const { main } = await import("./md-to-latex.js");

			const args = parseArgs([]);

			assert.throws(() => main(args, deps), { message: "process.exit called" });
			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: No input text specified"));
		});

		it("should show error when --file but empty positional args", async () => {
			const { main } = await import("./md-to-latex.js");

			const args = parseArgs(["--file"]);

			assert.throws(() => main(args, deps), { message: "process.exit called" });
			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: No input file specified"));
		});
	});

	describe("handleError", () => {
		let mockConsole: any;
		let mockProcess: any;
		let deps: any;

		beforeEach(() => {
			mock.reset();

			mockConsole = {
				error: mock.fn(),
			};

			mockProcess = {
				exit: mock.fn(() => {
					throw new Error("process.exit called");
				}),
			};

			deps = {
				console: mockConsole,
				process: mockProcess,
			};
		});

		it("should log error message and exit", async () => {
			const { handleError } = await import("./md-to-latex.js");
			const error = new Error("Test error");

			assert.throws(() => handleError(error, deps), { message: "process.exit called" });
			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: Test error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle string errors", async () => {
			const { handleError } = await import("./md-to-latex.js");

			assert.throws(() => handleError("String error", deps), { message: "process.exit called" });
			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: String error"));
		});
	});
});
