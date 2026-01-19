#!/usr/bin/env node
/**
 * Create bibliography citation from web page URL
 * - Submits to Wayback Machine for archival snapshot
 * - Extracts metadata from semantic HTML (title, author, description)
 * - Generates citation in specified format
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "../../../lib/args/index.js";
import type { BibEntry } from "../lib/types.js";
import { createBibTeXGenerator } from "../lib/generators/bibtex.js";
import { createCSLJSONGenerator } from "../lib/generators/csl.js";

interface PageMetadata {
	url: string;
	title?: string;
	author?: string;
	description?: string;
	siteName?: string;
	publishedDate?: string;
	archiveUrl?: string;
	archiveDate?: string;
}

/**
 * Submit URL to Wayback Machine and get archive URL
 */
async function submitToWayback(url: string): Promise<{ archiveUrl: string; archiveDate: string } | null> {
	try {
		const submitUrl = `https://web.archive.org/save/${url}`;
		const response = await fetch(submitUrl, {
			method: "GET",
			redirect: "follow",
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; BibCiteBot/1.0)",
			},
		});

		if (!response.ok) {
			console.error(`Wayback submission warning: ${response.status} ${response.statusText}`);
			return null;
		}

		// Extract archive URL from response
		const finalUrl = response.url;
		const match = finalUrl.match(/\/web\/(\d{14})\/(.*)/);
		if (match) {
			const timestamp = match[1];
			const year = timestamp.slice(0, 4);
			const month = timestamp.slice(4, 6);
			const day = timestamp.slice(6, 8);
			const archiveDate = `${year}-${month}-${day}`;

			return {
				archiveUrl: finalUrl,
				archiveDate,
			};
		}

		return null;
	} catch (error) {
		console.error(`Wayback submission error: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

/**
 * Extract metadata from HTML content
 */
function extractMetadata(html: string, url: string): PageMetadata {
	const metadata: PageMetadata = { url };

	// Extract title from <title> tag
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	if (titleMatch) {
		metadata.title = titleMatch[1].trim();
	}

	// Helper to extract meta tag content
	const getMeta = (pattern: RegExp): string | undefined => {
		const match = html.match(pattern);
		return match ? match[1].trim() : undefined;
	};

	// Try various meta tag formats for each field
	// Title (prioritize Open Graph, then Twitter Card, then standard)
	metadata.title =
		metadata.title ||
		getMeta(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);

	// Author
	metadata.author =
		getMeta(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+property=["']og:author["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']twitter:creator["']\s+content=["']([^"']+)["']/i);

	// Description
	metadata.description =
		getMeta(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);

	// Site name
	metadata.siteName =
		getMeta(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']application-name["']\s+content=["']([^"']+)["']/i);

	// Published date
	metadata.publishedDate =
		getMeta(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']publish-date["']\s+content=["']([^"']+)["']/i) ||
		getMeta(/<meta\s+name=["']date["']\s+content=["']([^"']+)["']/i);

	return metadata;
}

/**
 * Fetch page and extract metadata
 */
async function fetchPageMetadata(url: string): Promise<PageMetadata> {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; BibCiteBot/1.0)",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();
		return extractMetadata(html, url);
	} catch (error) {
		throw new Error(`Failed to fetch page: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Generate citation key from URL and metadata
 */
function generateCitationKey(metadata: PageMetadata): string {
	let key = "";

	// Try to extract domain name for key
	try {
		const urlObj = new URL(metadata.url);
		const domain = urlObj.hostname.replace(/^www\./, "").split(".")[0];
		key = domain;
	} catch {
		key = "web";
	}

	// Add author if available
	if (metadata.author) {
		const authorPart = metadata.author.split(/[\s,]+/)[0].toLowerCase();
		key = `${authorPart}${key}`;
	}

	// Add year if available
	const year = metadata.archiveDate?.slice(0, 4) || metadata.publishedDate?.slice(0, 4) || new Date().getFullYear();
	key = `${key}${year}`;

	// Sanitize key (only alphanumeric)
	key = key.replace(/[^a-zA-Z0-9]/g, "");

	return key;
}

/**
 * Convert metadata to bibliography entry
 */
function metadataToBibEntry(metadata: PageMetadata): BibEntry {
	const entry: BibEntry = {
		id: generateCitationKey(metadata),
		type: "webpage",
		title: metadata.title || "Untitled",
		URL: metadata.url,
	};

	// Add author if available
	if (metadata.author) {
		entry.author = [{ literal: metadata.author }];
	}

	// Add container-title (site name) if available
	if (metadata.siteName) {
		entry["container-title"] = metadata.siteName;
	}

	// Add accessed date (archive date or current date)
	const accessDate = metadata.archiveDate || new Date().toISOString().slice(0, 10);
	const [year, month, day] = accessDate.split("-").map(Number);
	entry.accessed = {
		"date-parts": [[year, month, day]],
	};

	// Add published date if available
	if (metadata.publishedDate) {
		try {
			const pubDate = new Date(metadata.publishedDate);
			entry.issued = {
				"date-parts": [[pubDate.getFullYear(), pubDate.getMonth() + 1, pubDate.getDate()]],
			};
		} catch {
			// Ignore invalid dates
		}
	}

	// Add archive URL to note field if available
	if (metadata.archiveUrl) {
		entry.note = `Archived at ${metadata.archiveUrl}`;
	}

	// Add abstract (description) if available
	if (metadata.description) {
		entry.abstract = metadata.description;
	}

	return entry;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	// Get URL
	let url: string;
	if (args.flags.has("file")) {
		// Read URLs from file (one per line)
		const filePath = args.positional[0];
		if (!filePath) {
			console.error("Error: No input file specified");
			process.exit(1);
		}
		const content = readFileSync(filePath, "utf-8");
		url = content.split("\n")[0].trim();
	} else {
		url = args.positional[0];
		if (!url) {
			console.error("Error: No URL specified");
			console.error("Usage: cite-web.ts <url> [--no-wayback] [--format=bibtex|csl] [--output=<file>]");
			process.exit(1);
		}
	}

	// Validate URL
	try {
		new URL(url);
	} catch {
		console.error(`Error: Invalid URL: ${url}`);
		process.exit(1);
	}

	const skipWayback = args.flags.has("no-wayback");
	const format = args.options.get("format") || "bibtex";

	console.error(`Fetching metadata from: ${url}`);

	// Fetch page metadata
	const metadata = await fetchPageMetadata(url);

	console.error(`Title: ${metadata.title || "Not found"}`);
	console.error(`Author: ${metadata.author || "Not found"}`);

	// Submit to Wayback Machine unless skipped
	if (!skipWayback) {
		console.error("Submitting to Wayback Machine...");
		const waybackResult = await submitToWayback(url);
		if (waybackResult) {
			metadata.archiveUrl = waybackResult.archiveUrl;
			metadata.archiveDate = waybackResult.archiveDate;
			console.error(`Archived: ${waybackResult.archiveUrl}`);
			console.error(`Archive date: ${waybackResult.archiveDate}`);
		} else {
			console.error("Warning: Wayback submission failed, proceeding without archive");
		}
	}

	// Convert to bibliography entry
	const entry = metadataToBibEntry(metadata);

	// Generate output in requested format
	let output: string;
	if (format === "csl" || format === "json" || format === "csl-json") {
		const generator = createCSLJSONGenerator();
		output = generator.generate([entry]);
	} else if (format === "bibtex" || format === "bib") {
		const generator = createBibTeXGenerator();
		output = generator.generate([entry]);
	} else {
		console.error(`Error: Unknown format: ${format}`);
		console.error("Supported formats: bibtex, csl");
		process.exit(1);
	}

	// Write output
	const outputFile = args.options.get("output");
	if (outputFile) {
		writeFileSync(outputFile, output, "utf-8");
		console.error(`Citation written to ${outputFile}`);
	} else {
		console.log(output);
	}
}

// Only run main if this is the main module (not imported in tests)
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	});
}
