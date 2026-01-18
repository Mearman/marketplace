#!/usr/bin/env tsx
/**
 * Generates the plugins section of README.md from marketplace.json and plugin metadata.
 *
 * Usage:
 *   pnpm generate-readme     # Update README.md with generated plugin list
 *   pnpm validate-readme     # Check if README is up-to-date (CI mode)
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const pluginsDir = join(rootDir, "plugins");
const readmePath = join(rootDir, "README.md");
const marketplacePath = join(rootDir, ".claude-plugin", "marketplace.json");

const START_MARKER = "<!-- AUTO-GENERATED PLUGINS START -->";
const END_MARKER = "<!-- AUTO-GENERATED PLUGINS END -->";

interface Skill {
  name: string;
  description: string;
}

interface Plugin {
  name: string;
  source: string;
  description: string;
  version: string;
  skills: Skill[];
}

interface MarketplaceJson {
  plugins: Plugin[];
}

function readMarketplace(): MarketplaceJson {
	const content = readFileSync(marketplacePath, "utf-8");
	return JSON.parse(content) as MarketplaceJson;
}

/**
 * Extract YAML frontmatter from a SKILL.md file.
 * Returns the parsed frontmatter as an object, or null if not found.
 */
function extractYamlFrontmatter(content: string): Record<string, string> | null {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return null;
	}

	const frontmatter: Record<string, string> = {};
	const lines = match[1].split("\n");

	for (const line of lines) {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();
			frontmatter[key] = value;
		}
	}

	return frontmatter;
}

/**
 * Read all skills for a plugin from its skills directory.
 */
function readPluginSkills(pluginName: string): Skill[] {
	const skillsDir = join(pluginsDir, pluginName, "skills");

	if (!existsSync(skillsDir)) {
		return [];
	}

	const skillNames = readdirSync(skillsDir).filter((name) => {
		const skillPath = join(skillsDir, name);
		return statSync(skillPath).isDirectory();
	});

	const skills: Skill[] = [];

	for (const skillName of skillNames) {
		const skillMdPath = join(skillsDir, skillName, "SKILL.md");

		if (!existsSync(skillMdPath)) {
			continue;
		}

		const content = readFileSync(skillMdPath, "utf-8");
		const frontmatter = extractYamlFrontmatter(content);

		if (frontmatter) {
			skills.push({
				name: frontmatter.name || skillName,
				description: frontmatter.description || "",
			});
		}
	}

	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract specific API content from SKILL.md content.
 * Focuses on what users need: request format, parameters, and response interpretation.
 * Skips verbose tables, detailed examples, and extensive documentation.
 */
function extractApiDetails(content: string, skillName: string): string {
	const lines = content.split("\n");
	const startIndex = lines.findIndex((line) => line.includes("## API Query") || line.includes("## Availability API") || line.includes("## Repository API") || line.includes("## User API") || line.includes("## GitHub REST API"));

	if (startIndex === -1) return "";

	const headingLevel = lines[startIndex].match(/^##\s+(\S+)\s+(\S+)\s+(\S+)/);
	if (headingLevel) {
		// Extract from API Query, Request Format, Parameters, Response sections only
		const endIndex = lines.findIndex((line, index) => {
			const isEndSection = line.match(/^##\s+/) && index > startIndex;
			const isSubheading = line.match(/^###\s+/);
			return isEndSection || isSubheading;
		});

		if (endIndex > startIndex) {
			return lines.slice(startIndex + 1, endIndex).join("\n");
		}
	}

	return "";
}

/**
 * Generate the plugins list with inline collapsible details.
 */
function generatePluginsList(plugins: Plugin[]): string {
	return plugins
		.map((plugin) => {
			// Split description on first colon to extract title
			const colonIndex = plugin.description.indexOf(":");
			let title: string;
			let description: string;

			if (colonIndex > 0) {
				title = plugin.description.slice(0, colonIndex).trim();
				description = plugin.description.slice(colonIndex + 1).trim();
			} else {
				title = plugin.name;
				description = plugin.description;
			}

			const skillsDetails = plugin.skills
				.map((skill) => {
					// Read the SKILL.md to extract the heading and first paragraph
					const skillMdPath = join(pluginsDir, plugin.name, "skills", skill.name, "SKILL.md");
					let skillHeading = skill.name; // fallback
					let skillDescription = skill.description; // fallback to YAML description
					let apiDetails = "";

					try {
						const content = readFileSync(skillMdPath, "utf-8");
						// Extract heading (first # line)
						const headingMatch = content.match(/^#\s+(.+)$/m);
						if (headingMatch) {
							skillHeading = headingMatch[1];
						}

						// Extract first paragraph after the heading (skip YAML frontmatter)
						const lines = content.split("\n");
						const headingIndex = lines.findIndex((line) => line.startsWith("#"));
						if (headingIndex >= 0) {
							// Skip empty lines and the heading itself, find first non-empty line
							let contentStart = headingIndex + 1;
							while (contentStart < lines.length && lines[contentStart].trim() === "") {
								contentStart++;
														 }
															if (contentStart < lines.length) {
																skillDescription = lines[contentStart];
															}
														}

						// Extract API details if present
						apiDetails = extractApiDetails(content, skill.name);
					} catch {
						// File doesn't exist or can't be read, use YAML description
					}

					let skillContent = `${skillDescription}`;
					if (apiDetails) {
						skillContent += `\n\n${apiDetails}`;
					}

					return `<details>
<summary>${skillHeading}</summary>

${skillContent}

</details>`;
				})
				.join("\n\n");

			return `### ${title} v${plugin.version}

${description}

\`\`\`bash
/plugin install ${plugin.name}@mearman
\`\`\`

##### Skills

${skillsDetails}`;
		})
		.join("\n\n");
}

/**
 * Read the current README and extract content outside markers.
 */
function readReadme(): { before: string; after: string } {
	const content = readFileSync(readmePath, "utf-8");

	const startIndex = content.indexOf(START_MARKER);
	const endIndex = content.indexOf(END_MARKER);

	if (startIndex === -1 || endIndex === -1) {
		console.error("Error: Marker comments not found in README.md");
		console.error(`Ensure README contains: ${START_MARKER} && ${END_MARKER}`);
		process.exit(1);
	}

	const before = content.slice(0, startIndex);
	const after = content.slice(endIndex + END_MARKER.length);

	return { before, after };
}

function writeReadme(before: string, generated: string, after: string): void {
	const content = `${before}${START_MARKER}\n${generated}\n${END_MARKER}${after}`;
	writeFileSync(readmePath, content, "utf-8");
}

/**
 * Check if README would be modified without writing changes.
 */
function checkReadme(before: string, generated: string, after: string): boolean {
	const currentContent = readFileSync(readmePath, "utf-8");
	const newContent = `${before}${START_MARKER}\n${generated}\n${END_MARKER}${after}`;
	return currentContent === newContent;
}

function main(): void {
	const checkOnly = process.argv.includes("--check");
	const marketplace = readMarketplace();

	// Enrich plugins with skill information
	for (const plugin of marketplace.plugins) {
		plugin.skills = readPluginSkills(plugin.name);
	}

	// Sort plugins by name
	marketplace.plugins.sort((a, b) => a.name.localeCompare(b.name));

	// Generate content
	const pluginsList = generatePluginsList(marketplace.plugins);

	const generated = `## Available Plugins

${pluginsList}`;

	// Read existing README
	const { before, after } = readReadme();

	if (checkOnly) {
		const isUpToDate = checkReadme(before, generated, after);
		if (isUpToDate) {
			console.log("README.md is up-to-date.");
			return;
		}
		console.error("README.md is out-of-date. Run \"pnpm generate-readme\" to update.");
		process.exit(1);
	}

	// Write updated README
	writeReadme(before, generated, after);
	console.log("Generated README.md plugin sections.");
	console.log(`  ${marketplace.plugins.length} plugins`);
	console.log(`  ${marketplace.plugins.reduce((sum, p) => sum + p.skills.length, 0)} total skills`);
}

main();
