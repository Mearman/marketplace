import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { latexToMarkdown } from "./latex-to-md.js";

describe("latexToMarkdown", () => {
	describe("Sections/Headers", () => {
		it("converts chapter to H1", () => {
			const input = "\\chapter{Hello World}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("# Hello World"));
		});

		it("converts section to H2", () => {
			const input = "\\section{Section}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("## Section"));
		});

		it("converts subsection to H3", () => {
			const input = "\\subsection{Subsection}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("### Subsection"));
		});

		it("converts subsubsection to H4", () => {
			const input = "\\subsubsection{Subsubsection}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("#### Subsubsection"));
		});

		it("converts paragraph to H5", () => {
			const input = "\\paragraph{Paragraph}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("##### Paragraph"));
		});

		it("converts subparagraph to H6", () => {
			const input = "\\subparagraph{Subparagraph}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("###### Subparagraph"));
		});

		it("handles multiple headers", () => {
			const input = "\\chapter{Title}\n\n\\section{Section}\n\n\\subsection{Subsection}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("# Title"));
			assert.ok(output.includes("## Section"));
			assert.ok(output.includes("### Subsection"));
		});
	});

	describe("Text Formatting", () => {
		it("converts textbf to **bold**", () => {
			const input = "This is \\textbf{bold} text";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("**bold**"));
		});

		it("converts textit to *italic*", () => {
			const input = "This is \\textit{italic} text";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("*italic*"));
		});

		it("converts emph to *italic*", () => {
			const input = "This is \\emph{emphasis} text";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("*emphasis*"));
		});

		it("converts texttt to inline code", () => {
			const input = "Use \\texttt{code} here";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("`code`"));
		});

		it("converts verb to inline code", () => {
			const input = "Use \\verb|code| here";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("`code`"));
		});

		it("handles multiple formatting types", () => {
			const input = "\\textbf{bold} and \\textit{italic} and \\texttt{code}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("**bold**"));
			assert.ok(output.includes("*italic*"));
			assert.ok(output.includes("`code`"));
		});
	});

	describe("Links", () => {
		it("converts href to [text](url)", () => {
			const input = "\\href{https://example.com}{Click here}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("[Click here](https://example.com)"));
		});

		it("converts url to <url>", () => {
			const input = "\\url{https://example.com}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("<https://example.com>"));
		});

		it("handles multiple links", () => {
			const input = "\\href{https://a.com}{Link 1} and \\href{https://b.com}{Link 2}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("[Link 1](https://a.com)"));
			assert.ok(output.includes("[Link 2](https://b.com)"));
		});
	});

	describe("Images", () => {
		it("converts figure with caption to ![alt](src)", () => {
			const input = `\\begin{figure}
\\includegraphics{image.png}
\\caption{My Image}
\\end{figure}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("![My Image](image.png)"));
		});

		it("converts includegraphics without caption", () => {
			const input = "\\includegraphics{image.png}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("![](image.png)"));
		});

		it("handles includegraphics with options", () => {
			const input = "\\includegraphics[width=5cm]{image.png}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("![](image.png)"));
		});

		it("converts figure with centering", () => {
			const input = `\\begin{figure}[h]
\\centering
\\includegraphics{image.png}
\\caption{Description}
\\end{figure}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("![Description](image.png)"));
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
			assert.ok(output.includes("- First item"));
			assert.ok(output.includes("- Second item"));
			assert.ok(output.includes("- Third item"));
		});

		it("converts enumerate to ordered list", () => {
			const input = `\\begin{enumerate}
\\item First
\\item Second
\\item Third
\\end{enumerate}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("1. First"));
			assert.ok(output.includes("2. Second"));
			assert.ok(output.includes("3. Third"));
		});

		it("handles items with spaces", () => {
			const input = `\\begin{itemize}
\\item   Item with spaces
\\item Item 2
\\end{itemize}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("- Item with spaces"));
			assert.ok(output.includes("- Item 2"));
		});
	});

	describe("Code Blocks", () => {
		it("converts verbatim to code block", () => {
			const input = `\\begin{verbatim}
code here
\\end{verbatim}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("```"));
			assert.ok(output.includes("code here"));
		});

		it("converts lstlisting to code block", () => {
			const input = `\\begin{lstlisting}
code here
\\end{lstlisting}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("```"));
			assert.ok(output.includes("code here"));
		});

		it("preserves code content without conversion", () => {
			const input = `\\begin{verbatim}
\\textbf{not converted}
\\end{verbatim}`;
			const output = latexToMarkdown(input);
			// Should not convert LaTeX commands inside verbatim
			assert.ok(output.includes("\\textbf{not converted}"));
			assert.ok(!output.includes("**not converted**"));
		});
	});

	describe("Blockquotes", () => {
		it("converts quote environment to blockquote", () => {
			const input = `\\begin{quote}
This is a quote
\\end{quote}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("> This is a quote"));
		});

		it("handles multi-line quotes", () => {
			const input = `\\begin{quote}
Line 1
Line 2
Line 3
\\end{quote}`;
			const output = latexToMarkdown(input);
			assert.ok(output.includes("> Line 1"));
			assert.ok(output.includes("> Line 2"));
			assert.ok(output.includes("> Line 3"));
		});
	});

	describe("Horizontal Rules", () => {
		it("converts hrulefill to ---", () => {
			const input = "Text above\n\n\\hrulefill\n\nText below";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("---"));
		});

		it("converts hline to ---", () => {
			const input = "Text above\n\n\\hline\n\nText below";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("---"));
		});
	});

	describe("Unicode Character Decoding", () => {
		it("decodes accented characters with braces", () => {
			const input = "Caf\\'{e}";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("Café"));
		});

		it("decodes accented characters without braces", () => {
			const input = "\\'e";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("é"));
		});

		it("decodes umlaut", () => {
			const input = "\\\"a";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("ä"));
		});

		it("decodes ligatures", () => {
			const input = "\\ae\\ and \\oe\\ and \\ss";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("æ"));
			assert.ok(output.includes("œ"));
			assert.ok(output.includes("ß"));
		});

		it("decodes multiple special characters", () => {
			const input = "R\\'esum\\'e with \\c{c}afe";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("é"));
			assert.ok(output.includes("ç"));
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
			assert.ok(output.includes("# Title"));
			assert.ok(output.includes("**bold**"));
			assert.ok(output.includes("*italic*"));
			assert.ok(output.includes("## Section"));
			assert.ok(output.includes("- Item 1"));
			assert.ok(output.includes("[Link](https://example.com)"));
			assert.ok(output.includes("```"));
		});

		it("maintains plain text", () => {
			const input = "Plain text paragraph.";
			const output = latexToMarkdown(input);
			assert.ok(output.includes("Plain text paragraph."));
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
			assert.ok(output.includes("# Hello World"));
			assert.ok(output.includes("**bold**"));
			assert.ok(output.includes("*italic*"));
			assert.ok(output.includes("`code`"));
			assert.ok(output.includes("## Section"));
			assert.ok(output.includes("- Item 1"));
			assert.ok(output.includes("1. First"));
			assert.ok(output.includes("```"));
			assert.ok(output.includes("print('hello')"));
			assert.ok(output.includes("[Link](https://example.com)"));
			assert.ok(output.includes("![Image](image.png)"));
			assert.ok(output.includes("é"));
			assert.ok(output.includes("ä"));
			assert.ok(output.includes("æ"));
		});
	});

	describe("Edge Cases", () => {
		it("handles empty input", () => {
			const input = "";
			const output = latexToMarkdown(input);
			assert.strictEqual(output, "");
		});

		it("handles input with only whitespace", () => {
			const input = "   \n\n   ";
			const output = latexToMarkdown(input);
			assert.ok(output.trim().length >= 0);
		});

		it("handles nested formatting", () => {
			const input = "\\textbf{bold \\textit{and italic}}";
			const output = latexToMarkdown(input);
			// Should attempt to convert nested structures
			assert.ok(output.includes("**"));
			assert.ok(output.includes("*"));
		});

		it("cleans up excessive whitespace", () => {
			const input = "Line 1\n\n\n\n\nLine 2";
			const output = latexToMarkdown(input);
			// Should reduce to at most double newline
			assert.ok(!output.match(/\n{4,}/));
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
			assert.ok(output.includes("# Title"));
			assert.ok(output.includes("**bold**"));
			assert.ok(output.includes("## Section"));
			assert.ok(output.includes("- Item 1"));
			assert.ok(output.includes("- Item 2"));
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

	it("should convert LaTeX text from positional arguments", async () => {
		const { main } = await import("./latex-to-md.js");
		const args = parseArgs(["\\section{Hello World}"]);

		main(args, deps);

		assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("## Hello World")));
	});

	it("should read LaTeX from file when --file flag is used", async () => {
		const { main } = await import("./latex-to-md.js");
		mockReadFileSync.mock.mockImplementation(() => "\\textbf{Bold text}");

		const args = parseArgs(["--file", "input.tex"]);

		main(args, deps);

		assert.strictEqual(mockReadFileSync.mock.calls[0].arguments[0], "input.tex");
		assert.strictEqual(mockReadFileSync.mock.calls[0].arguments[1], "utf-8");
		assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("**Bold text**")));
	});

	it("should write output to file when --output option is provided", async () => {
		const { main } = await import("./latex-to-md.js");

		const args = parseArgs(["\\section{Test}", "--output=output.md"]);

		main(args, deps);

		assert.strictEqual(mockWriteFileSync.mock.calls[0].arguments[0], "output.md");
		assert.ok(typeof mockWriteFileSync.mock.calls[0].arguments[1] === "string" && mockWriteFileSync.mock.calls[0].arguments[1].includes("## Test"));
		assert.strictEqual(mockWriteFileSync.mock.calls[0].arguments[2], "utf-8");
		assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments[0] === "Converted Markdown written to output.md"));
	});

	it("should show error when --file flag but no file path", async () => {
		const { main } = await import("./latex-to-md.js");

		const args = parseArgs(["--file"]);

		assert.throws(() => main(args, deps), { message: "process.exit called" });
		assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: No input file specified"));
	});

	it("should show error when no input text provided", async () => {
		const { main } = await import("./latex-to-md.js");

		const args = parseArgs([]);

		assert.throws(() => main(args, deps), { message: "process.exit called" });
		assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: No input text specified"));
	});

	it("should show error when --file but empty positional args", async () => {
		const { main } = await import("./latex-to-md.js");

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
		const { handleError } = await import("./latex-to-md.js");
		const error = new Error("Test error");

		assert.throws(() => handleError(error, deps), { message: "process.exit called" });
		assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: Test error"));
		assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
	});

	it("should handle string errors", async () => {
		const { handleError } = await import("./latex-to-md.js");

		assert.throws(() => handleError("String error", deps), { message: "process.exit called" });
		assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error: String error"));
	});
});
