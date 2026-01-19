#!/usr/bin/env node
/**
 * Convert Markdown to LaTeX
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "../../../lib/args/index.js";

/**
 * Convert Markdown to LaTeX
 */
function markdownToLatex(markdown: string): string {
	let latex = markdown;

	// Extract code blocks first to protect them
	const codeBlocks: string[] = [];
	const inlineCode: string[] = [];

	// Extract code blocks
	latex = latex.replace(/```[\s\S]*?```/g, (match) => {
		const placeholder = `<<<CODEBLOCK${codeBlocks.length}>>>`;
		codeBlocks.push(match);
		return placeholder;
	});

	// Extract inline code
	latex = latex.replace(/`([^`]+)`/g, (match) => {
		const placeholder = `<<<INLINECODE${inlineCode.length}>>>`;
		inlineCode.push(match);
		return placeholder;
	});

	// Headers (before escaping # character)
	latex = latex.replace(/^######\s+(.+)$/gm, "\\subparagraph{$1}");
	latex = latex.replace(/^#####\s+(.+)$/gm, "\\paragraph{$1}");
	latex = latex.replace(/^####\s+(.+)$/gm, "\\subsubsection{$1}");
	latex = latex.replace(/^###\s+(.+)$/gm, "\\subsection{$1}");
	latex = latex.replace(/^##\s+(.+)$/gm, "\\section{$1}");
	latex = latex.replace(/^#\s+(.+)$/gm, "\\chapter{$1}");

	// Images (before links, since images use [])
	latex = latex.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
		if (alt) {
			return `\\begin{figure}[h]\n\\centering\n\\includegraphics{${src}}\n\\caption{${alt}}\n\\end{figure}`;
		}
		return `\\includegraphics{${src}}`;
	});

	// Links
	latex = latex.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "\\href{$2}{$1}");

	// Bold: **text** or __text__ (before italic to avoid conflicts)
	latex = latex.replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}");
	latex = latex.replace(/__(.+?)__/g, "\\textbf{$1}");

	// Italic: *text* or _text_
	latex = latex.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "\\emph{$1}");
	latex = latex.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "\\emph{$1}");

	// Ordered lists (before unordered to avoid conflicts)
	const orderedListItems: string[] = [];
	latex = latex.replace(/^(\d+)\.\s+(.+)$/gm, (_match, _num, item) => {
		const placeholder = `<<<ORDEREDITEM${orderedListItems.length}>>>`;
		orderedListItems.push(item);
		return placeholder;
	});

	// Wrap consecutive ordered items
	latex = latex.replace(/(<<<ORDEREDITEM\d+>>>(\n|$))+/g, (match) => {
		const items = match.match(/<<<ORDEREDITEM(\d+)>>>/g) || [];
		const itemTexts = items.map(item => {
			const idx = parseInt(item.match(/\d+/)?.[0] || "0");
			return `\\item ${orderedListItems[idx]}`;
		});
		return `\\begin{enumerate}\n${itemTexts.join("\n")}\n\\end{enumerate}\n`;
	});

	// Unordered lists
	const unorderedListItems: string[] = [];
	latex = latex.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_match, _indent, item) => {
		const placeholder = `<<<UNORDEREDITEM${unorderedListItems.length}>>>`;
		unorderedListItems.push(item);
		return placeholder;
	});

	// Wrap consecutive unordered items
	latex = latex.replace(/(<<<UNORDEREDITEM\d+>>>(\n|$))+/g, (match) => {
		const items = match.match(/<<<UNORDEREDITEM(\d+)>>>/g) || [];
		const itemTexts = items.map(item => {
			const idx = parseInt(item.match(/\d+/)?.[0] || "0");
			return `\\item ${unorderedListItems[idx]}`;
		});
		return `\\begin{itemize}\n${itemTexts.join("\n")}\n\\end{itemize}\n`;
	});

	// Blockquotes
	latex = latex.replace(/^>\s+(.+)$/gm, "\\begin{quote}\n$1\n\\end{quote}");

	// Horizontal rules
	latex = latex.replace(/^---$/gm, "\\hrulefill");

	// Escape special LaTeX characters in plain text (not {}, as we generate those)
	// This is a simplified approach - we escape common special chars but not braces
	// since we've just generated LaTeX commands that use braces
	latex = latex.replace(/&/g, "\\&");
	latex = latex.replace(/%/g, "\\%");
	latex = latex.replace(/\$/g, "\\$");

	// Restore inline code
	inlineCode.forEach((code, i) => {
		const content = code.slice(1, -1); // Remove backticks
		latex = latex.replace(`<<<INLINECODE${i}>>>`, `\\texttt{${content}}`);
	});

	// Restore and convert code blocks
	codeBlocks.forEach((block, i) => {
		const match = block.match(/```(\w+)?\n?([\s\S]*?)```/);
		if (match) {
			const code = match[2] || "";
			latex = latex.replace(`<<<CODEBLOCK${i}>>>`, `\\begin{verbatim}\n${code}\\end{verbatim}`);
		}
	});

	return latex;
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
			console.error("Usage: md-to-latex.ts <text> or md-to-latex.ts --file <file>");
			process.exit(1);
		}
	}

	// Convert
	const output = markdownToLatex(input);

	// Write output
	const outputFile = args.options.get("output");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.log(`Converted LaTeX written to ${outputFile}`);
	} else {
		console.log(output);
	}
}

main();
