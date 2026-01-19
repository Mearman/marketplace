#!/usr/bin/env node
/**
 * Convert LaTeX to Markdown
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "../../../lib/args/index.js";
import { decodeLatex } from "../../../lib/latex/index.js";

/**
 * Convert LaTeX to Markdown
 */
function latexToMarkdown(latex: string): string {
	let markdown = latex;

	// Decode LaTeX special characters to Unicode
	markdown = decodeLatex(markdown);

	// Sections/headers
	markdown = markdown.replace(/\\chapter\{([^}]+)\}/g, "# $1");
	markdown = markdown.replace(/\\section\{([^}]+)\}/g, "## $1");
	markdown = markdown.replace(/\\subsection\{([^}]+)\}/g, "### $1");
	markdown = markdown.replace(/\\subsubsection\{([^}]+)\}/g, "#### $1");
	markdown = markdown.replace(/\\paragraph\{([^}]+)\}/g, "##### $1");
	markdown = markdown.replace(/\\subparagraph\{([^}]+)\}/g, "###### $1");

	// Text formatting
	markdown = markdown.replace(/\\textbf\{([^}]+)\}/g, "**$1**");
	markdown = markdown.replace(/\\textit\{([^}]+)\}/g, "*$1*");
	markdown = markdown.replace(/\\emph\{([^}]+)\}/g, "*$1*");
	markdown = markdown.replace(/\\texttt\{([^}]+)\}/g, "`$1`");
	markdown = markdown.replace(/\\verb\|([^|]+)\|/g, "`$1`");

	// Code blocks
	markdown = markdown.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, "```\n$1```");
	markdown = markdown.replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, "```\n$1```");

	// Lists
	markdown = markdown.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
		return items.replace(/\\item\s+/g, "- ").trim();
	});
	markdown = markdown.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
		let counter = 1;
		return items.replace(/\\item\s+/g, () => `${counter++}. `).trim();
	});

	// Links
	markdown = markdown.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, "[$2]($1)");
	markdown = markdown.replace(/\\url\{([^}]+)\}/g, "<$1>");

	// Images
	markdown = markdown.replace(
		/\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}[\s\S]*?\\caption\{([^}]+)\}[\s\S]*?\\end\{figure\}/g,
		"![$2]($1)"
	);
	markdown = markdown.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, "![]($1)");

	// Blockquotes
	markdown = markdown.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, content) => {
		return content
			.trim()
			.split("\n")
			.map((line: string) => `> ${line}`)
			.join("\n");
	});

	// Horizontal rules
	markdown = markdown.replace(/\\hrulefill/g, "---");
	markdown = markdown.replace(/\\hline/g, "---");

	// Math (preserve LaTeX math)
	// Inline math stays as $...$
	// Display math stays as $$...$$

	// Clean up extra whitespace
	markdown = markdown.replace(/\n{3,}/g, "\n\n");

	return markdown.trim();
}

function main() {
	const args = parseArgs(process.argv.slice(2));

	// Get input
	let input: string;
	if (args.flags.has("file")) {
		const filePath = args.positional[0];
		if (!filePath) {
			console.error("Error: No input file specified");
			process.exit(1);
		}
		input = readFileSync(filePath, "utf-8");
	} else {
		input = args.positional.join(" ");
		if (!input) {
			console.error("Error: No input text specified");
			console.error("Usage: latex-to-md.ts <text> or latex-to-md.ts --file <file>");
			process.exit(1);
		}
	}

	// Convert
	const output = latexToMarkdown(input);

	// Write output
	const outputFile = args.options.get("output");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.log(`Converted Markdown written to ${outputFile}`);
	} else {
		console.log(output);
	}
}

main();
