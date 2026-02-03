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
export function latexToMarkdown(latex: string): string {
	let markdown = latex;

	// Extract code blocks first to protect them from conversions
	const codeBlocks: string[] = [];

	// Extract verbatim blocks
	markdown = markdown.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_match, content: string) => {
		const placeholder = `<<<CODEBLOCK${codeBlocks.length}>>>`;
		codeBlocks.push(content);
		return placeholder;
	});

	// Extract lstlisting blocks
	markdown = markdown.replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, (_match, content: string) => {
		const placeholder = `<<<CODEBLOCK${codeBlocks.length}>>>`;
		codeBlocks.push(content);
		return placeholder;
	});

	// Decode LaTeX special characters to Unicode (after code blocks extracted)
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

	// Lists
	markdown = markdown.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items: string) => {
		return items.replace(/\\item\s+/g, "- ").trim();
	});
	markdown = markdown.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items: string) => {
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
	markdown = markdown.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, content: string) => {
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

	// Restore code blocks
	codeBlocks.forEach((content, i) => {
		markdown = markdown.replace(`<<<CODEBLOCK${i}>>>`, `\`\`\`\n${content}\`\`\``);
	});

	// Clean up extra whitespace
	markdown = markdown.replace(/\n{3,}/g, "\n\n");

	return markdown.trim();
}

// ============================================================================
// Types
// ============================================================================

export interface Dependencies {
	console: Console;
	process: NodeJS.Process;
	readFileSync: (path: string, encoding: BufferEncoding) => string;
	writeFileSync: (path: string, data: string, encoding: BufferEncoding) => void;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error(`Error: ${message}`);
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = (args: ReturnType<typeof parseArgs>, deps: Dependencies): void => {
	const { console: consoleDep, process: processDep, readFileSync, writeFileSync } = deps;

	// Get input
	let input: string;
	if (args.flags.has("file")) {
		const filePath = args.positional[0];
		if (!filePath) {
			consoleDep.error("Error: No input file specified");
			processDep.exit(1);
		}
		input = readFileSync(filePath, "utf-8");
	} else {
		input = args.positional.join(" ");
		if (!input) {
			consoleDep.error("Error: No input text specified");
			consoleDep.error("Usage: latex-to-md.ts <text> or latex-to-md.ts --file <file>");
			processDep.exit(1);
		}
	}

	// Convert
	const output = latexToMarkdown(input);

	// Write output
	const outputFile = args.options.get("output");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		consoleDep.log(`Converted Markdown written to ${outputFile}`);
	} else {
		consoleDep.log(output);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	console,
	process,
	readFileSync,
	writeFileSync,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		main(parseArgs(process.argv.slice(2)), defaultDeps);
	} catch (error) {
		handleError(error, defaultDeps);
	}
}
