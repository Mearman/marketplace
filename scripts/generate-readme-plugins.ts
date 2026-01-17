#!/usr/bin/env tsx
/**
 * Generates the plugins section of README.md from marketplace.json and plugin metadata.
 *
 * Usage:
 *   pnpm generate-readme     # Update README.md with generated plugin tables
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
 * Generate the flat plugins table.
 */
function generatePluginsTable(plugins: Plugin[]): string {
	const header = `| Plugin | Description | Skills | Install |
|--------|-------------|--------|---------|`;

	const rows = plugins.map((plugin) => {
		const skillList = plugin.skills.map((s) => s.name).join(", ");
		const installCmd = `\`/plugin install ${plugin.name}@mearman\``;
		const escapedDesc = plugin.description.replace(/\|/g, "\\|");
		return `| \`${plugin.name}\` | ${escapedDesc} | ${skillList} | ${installCmd} |`;
	});

	return [header, ...rows].join("\n");
}

/**
 * Generate collapsible detailed sections for each plugin.
 */
function generatePluginDetails(plugins: Plugin[]): string {
	return plugins
		.map((plugin) => {
			const skillsList = plugin.skills
				.map(
					(skill) => `### ${skill.name}

${skill.description}`
				)
				.join("\n\n");

			return `<details>
<summary><b>${plugin.name}</b> (${plugin.skills.length} skill${plugin.skills.length === 1 ? "" : "s"}) - ${plugin.description}</summary>

#### Skills

${skillsList}

**Version:** ${plugin.version}
**Install:** \`/plugin install ${plugin.name}@mearman\`

</details>`;
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
		console.error(`Ensure README contains: ${START_MARKER} and ${END_MARKER}`);
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
	const pluginsTable = generatePluginsTable(marketplace.plugins);
	const pluginDetails = generatePluginDetails(marketplace.plugins);

	const generated = `## Available Plugins

${pluginsTable}

## Plugin Details

${pluginDetails}`;

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
