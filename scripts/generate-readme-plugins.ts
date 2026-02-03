#!/usr/bin/env tsx
/**
 * Generates README documentation from marketplace.json and plugin metadata.
 *
 * Creates two types of documentation:
 * - Root README.md: Concise plugin cards with links to per-plugin READMEs
 * - Per-plugin READMEs: Full documentation for all component types
 *
 * Usage:
 *   pnpm generate-readme     # Update all READMEs with generated content
 *   pnpm validate-readme     # Check if READMEs are up-to-date (CI mode)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const pluginsDir = join(rootDir, "plugins");
const readmePath = join(rootDir, "README.md");
const marketplacePath = join(rootDir, ".claude-plugin", "marketplace.json");

const ROOT_START_MARKER = "<!-- AUTO-GENERATED PLUGINS START -->";
const ROOT_END_MARKER = "<!-- AUTO-GENERATED PLUGINS END -->";

const PLUGIN_START_MARKER = "<!-- AUTO-GENERATED CONTENT START -->";
const PLUGIN_END_MARKER = "<!-- AUTO-GENERATED CONTENT END -->";

// Export markers for testing
export { ROOT_START_MARKER, ROOT_END_MARKER, PLUGIN_START_MARKER, PLUGIN_END_MARKER };

// ============================================================================
// Type Definitions
// ============================================================================

export interface Skill {
	name: string;
	description: string;
	content?: string;
}

export interface Command {
	name: string;
	description: string;
	content?: string;
}

export interface Hook {
	name: string;
	description: string;
	content?: string;
}

export interface Agent {
	name: string;
	description: string;
	content?: string;
}

export interface McpServer {
	name: string;
	description: string;
	content?: string;
}

export interface LspServer {
	name: string;
	description: string;
	content?: string;
}

export interface PluginComponents {
	skills?: Skill[];
	commands?: Command[];
	hooks?: Hook[];
	agents?: Agent[];
	mcp?: McpServer[];
	lsp?: LspServer[];
}

export interface Plugin {
	name: string;
	source: string;
	description: string;
	version: string;
	components?: PluginComponents;
}

export interface MarketplaceJson {
	plugins: Plugin[];
}

// ============================================================================
// Component Type Configuration (Extensible)
// ============================================================================

// Common component item with name, description, content
interface ComponentItem {
  name: string;
  description: string;
  content?: string;
}

interface ComponentTypeConfig {
  name: string;
  directory: string;
  filePattern: string;
  parse: (filePath: string) => ComponentItem | ComponentItem[] | null;
  formatForReadme: (item: ComponentItem) => string;
  formatForCard: (count: number) => string;
}

const COMPONENT_TYPES: ComponentTypeConfig[] = [
	{
		name: "Skills",
		directory: "skills",
		filePattern: "*/SKILL.md",
		parse: parseSkillMd,
		formatForReadme: (skill: ComponentItem) => skill.content ?? `### ${skill.name}\n\n${skill.description}`,
		formatForCard: (n: number) => `${n} skill${n !== 1 ? "s" : ""}`,
	},
	{
		name: "Commands",
		directory: "commands",
		filePattern: "*.md",
		parse: parseCommandMd,
		formatForReadme: (cmd: ComponentItem) => cmd.content ?? `### ${cmd.name}\n\n${cmd.description}`,
		formatForCard: (n: number) => `${n} command${n !== 1 ? "s" : ""}`,
	},
	{
		name: "Hooks",
		directory: "hooks",
		filePattern: "hooks.json",
		parse: parseHooksJson,
		formatForReadme: (hook: ComponentItem) => `### ${hook.name}\n\n\`\`\`json\n${hook.content ?? ""}\n\`\`\``,
		formatForCard: (n: number) => `${n} hook${n !== 1 ? "s" : ""}`,
	},
	{
		name: "Agents",
		directory: "agents",
		filePattern: "*.md",
		parse: parseAgentMd,
		formatForReadme: (agent: ComponentItem) => agent.content ?? `### ${agent.name}\n\n${agent.description}`,
		formatForCard: (n: number) => `${n} agent${n !== 1 ? "s" : ""}`,
	},
	{
		name: "MCP",
		directory: ".",
		filePattern: ".mcp.json",
		parse: parseMcpJson,
		formatForReadme: (mcp: ComponentItem) => `\`\`\`json\n${mcp.content ?? ""}\n\`\`\``,
		formatForCard: (n: number) => (n > 0 ? "MCP" : ""),
	},
	{
		name: "LSP",
		directory: ".",
		filePattern: ".lsp.json",
		parse: parseLspJson,
		formatForReadme: (lsp: ComponentItem) => `\`\`\`json\n${lsp.content ?? ""}\n\`\`\``,
		formatForCard: (n: number) => (n > 0 ? "LSP" : ""),
	},
];

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Extract YAML frontmatter from a markdown file.
 */
export function extractYamlFrontmatter(content: string): Record<string, string> | null {
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
 * Remove YAML frontmatter from content.
 */
export function removeFrontmatter(content: string): string {
	return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/**
 * Parse a SKILL.md file.
 */
function parseSkillMd(filePath: string): Skill | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const frontmatter = extractYamlFrontmatter(content);

		// Extract heading (first # line after frontmatter)
		const withoutFrontmatter = removeFrontmatter(content);
		const headingMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
		const name = frontmatter?.name || headingMatch?.[1] || "";

		const skillDir = dirname(dirname(filePath)); // Go up from SKILL.md to skill directory
		const skillName = skillDir.split("/").pop() || name;

		return {
			name: name || skillName,
			description: frontmatter?.description || "",
			content: withoutFrontmatter.trim(),
		};
	} catch {
		return null;
	}
}

/**
 * Parse a command .md file.
 */
function parseCommandMd(filePath: string): Command | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const frontmatter = extractYamlFrontmatter(content);

		// Extract heading
		const withoutFrontmatter = removeFrontmatter(content);
		const headingMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
		const name = frontmatter?.name || headingMatch?.[1] || "";

		// Command name from filename
		const fileName = filePath.split("/").pop()?.replace(".md", "") || name;

		return {
			name: name || fileName,
			description: frontmatter?.description || "",
			content: withoutFrontmatter.trim(),
		};
	} catch {
		return null;
	}
}

/**
 * Type guard for hook matcher config object
 */
function isMatcherConfig(value: unknown): value is { matcher?: string; hooks?: unknown[] } {
	return typeof value === "object" && value !== null;
}

/**
 * Get property value from object safely without type assertions
 */
function getProp(obj: object, key: string): unknown {
	return Object.getOwnPropertyDescriptor(obj, key)?.value;
}

/**
 * Get string property from object safely
 */
function getStringProp(obj: object, key: string): string | undefined {
	const val = getProp(obj, key);
	return typeof val === "string" ? val : undefined;
}

/**
 * Get array property from object safely
 */
function getArrayProp(obj: object, key: string): unknown[] {
	const val = getProp(obj, key);
	return Array.isArray(val) ? val : [];
}

/**
 * Parse hooks.json file.
 */
function parseHooksJson(filePath: string): Hook[] | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const parsed: unknown = JSON.parse(content);

		if (typeof parsed !== "object" || parsed === null) {
			return null;
		}

		// Get object entries directly after type narrowing
		const hooksConfig = parsed;
		const hooks: Hook[] = [];

		for (const [eventType, eventConfig] of Object.entries(hooksConfig)) {
			if (Array.isArray(eventConfig)) {
				for (const matcherConfig of eventConfig) {
					if (isMatcherConfig(matcherConfig)) {
						const matcher = getStringProp(matcherConfig, "matcher");
						const hookConfigs = getArrayProp(matcherConfig, "hooks");

						hooks.push({
							name: `${eventType}${matcher ? ` (${matcher})` : ""}`,
							description: `${hookConfigs.length} hook${hookConfigs.length !== 1 ? "s" : ""}`,
							content: JSON.stringify(hookConfigs, null, 2),
						});
					}
				}
			}
		}

		return hooks.length > 0 ? hooks : null;
	} catch {
		return null;
	}
}

/**
 * Parse an agent .md file.
 */
function parseAgentMd(filePath: string): Agent | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const frontmatter = extractYamlFrontmatter(content);

		// Extract heading
		const withoutFrontmatter = removeFrontmatter(content);
		const headingMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
		const name = frontmatter?.name || headingMatch?.[1] || "";

		return {
			name,
			description: frontmatter?.description || "",
			content: withoutFrontmatter.trim(),
		};
	} catch {
		return null;
	}
}

/**
 * Parse .mcp.json file.
 */
function parseMcpJson(filePath: string): McpServer | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const parsed: unknown = JSON.parse(content);

		if (typeof parsed !== "object" || parsed === null) {
			return null;
		}

		const serverCount = Object.keys(parsed).length;

		if (serverCount === 0) return null;

		return {
			name: "MCP Servers",
			description: `${serverCount} server${serverCount !== 1 ? "s" : ""} configured`,
			content: JSON.stringify(parsed, null, 2),
		};
	} catch {
		return null;
	}
}

/**
 * Parse .lsp.json file.
 */
function parseLspJson(filePath: string): LspServer | null {
	try {
		const content = readFileSync(filePath, "utf-8");
		const parsed: unknown = JSON.parse(content);

		if (typeof parsed !== "object" || parsed === null) {
			return null;
		}

		const serverCount = Object.keys(parsed).length;

		if (serverCount === 0) return null;

		return {
			name: "LSP Servers",
			description: `${serverCount} server${serverCount !== 1 ? "s" : ""} configured`,
			content: JSON.stringify(parsed, null, 2),
		};
	} catch {
		return null;
	}
}

// ============================================================================
// Discovery Functions
// ============================================================================

/**
 * Find files matching a pattern in a directory.
 */
function findFiles(pluginPath: string, directory: string, pattern: string): string[] {
	const searchDir = join(pluginPath, directory);

	if (!existsSync(searchDir)) {
		return [];
	}

	const files: string[] = [];

	function scanDir(dir: string) {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				// Handle skills/*/{SKILL.md} pattern
				if (pattern.includes("*/")) {
					const skillFile = join(fullPath, "SKILL.md");
					if (existsSync(skillFile)) {
						files.push(skillFile);
					}
				} else {
					scanDir(fullPath);
				}
			} else if (entry.isFile()) {
				// Handle *.md or hooks.json pattern
				if (pattern === "*.md" && entry.name.endsWith(".md")) {
					files.push(fullPath);
				} else if (pattern === entry.name) {
					files.push(fullPath);
				}
			}
		}
	}

	scanDir(searchDir);
	return files;
}

/**
 * Type guard to check if value is an array of ComponentItems
 */
function isComponentItemArray(value: unknown): value is ComponentItem[] {
	return Array.isArray(value);
}

/**
 * Assign component to the appropriate key in components object
 */
function assignComponent(
	components: PluginComponents,
	key: string,
	value: ComponentItem[]
): void {
	switch (key) {
	case "skills":
		components.skills = value;
		break;
	case "commands":
		components.commands = value;
		break;
	case "hooks":
		components.hooks = value;
		break;
	case "agents":
		components.agents = value;
		break;
	case "mcp":
		components.mcp = value;
		break;
	case "lsp":
		components.lsp = value;
		break;
	}
}

/**
 * Discover all components for a plugin.
 */
function discoverComponents(pluginName: string): PluginComponents {
	const pluginPath = join(pluginsDir, pluginName);
	const components: PluginComponents = {};

	for (const type of COMPONENT_TYPES) {
		const files = findFiles(pluginPath, type.directory, type.filePattern);

		if (files.length > 0) {
			const key = type.name.toLowerCase();

			if (type.name === "Hooks") {
				// Hooks returns array from single file
				const parsed = type.parse(files[0]);
				if (parsed && isComponentItemArray(parsed)) {
					assignComponent(components, key, parsed);
				}
			} else if (type.name === "MCP" || type.name === "LSP") {
				// MCP/LSP are single-file configs
				const parsed = type.parse(files[0]);
				if (parsed && !isComponentItemArray(parsed)) {
					assignComponent(components, key, [parsed]);
				}
			} else {
				// Skills, Commands, Agents are multi-file
				const items = files
					.map((f) => type.parse(f))
					.filter((item): item is ComponentItem => item !== null && !Array.isArray(item));

				if (items.length > 0) {
					assignComponent(components, key, items);
				}
			}
		}
	}

	return components;
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Get component array from PluginComponents by name
 */
function getComponentByName(components: PluginComponents, name: string): ComponentItem[] | undefined {
	switch (name.toLowerCase()) {
	case "skills":
		return components.skills;
	case "commands":
		return components.commands;
	case "hooks":
		return components.hooks;
	case "agents":
		return components.agents;
	case "mcp":
		return components.mcp;
	case "lsp":
		return components.lsp;
	default:
		return undefined;
	}
}

/**
 * Format component summary for root README card.
 */
export function formatComponentSummary(components: PluginComponents): string {
	const parts: string[] = [];

	for (const type of COMPONENT_TYPES) {
		const items = getComponentByName(components, type.name);
		const count = items?.length ?? 0;

		if (count > 0) {
			const label = type.formatForCard(count);
			if (label) {
				parts.push(label);
			}
		}
	}

	if (parts.length === 0) return "No components";
	if (parts.length === 1) return parts[0];
	if (parts.length <= 3) return parts.join(", ");
	return `${parts.slice(0, 2).join(", ")}, and ${parts.length - 2} more`;
}

/**
 * Extract title and description from plugin description.
 */
export function extractTitleAndDescription(description: string): { title: string; desc: string } {
	const colonIndex = description.indexOf(":");

	if (colonIndex > 0) {
		return {
			title: description.slice(0, colonIndex).trim(),
			desc: description.slice(colonIndex + 1).trim(),
		};
	}

	// Try to find first sentence
	const firstPeriod = description.indexOf(". ");
	if (firstPeriod > 20) {
		return {
			title: description.slice(0, firstPeriod).trim(),
			desc: description.slice(firstPeriod + 1).trim(),
		};
	}

	return { title: "", desc: description };
}

// ============================================================================
// Root README Generation
// ============================================================================

/**
 * Generate the plugins list for root README (card format).
 */
export function generateRootReadmeList(plugins: Plugin[]): string {
	return plugins
		.map((plugin) => {
			const { title, desc } = extractTitleAndDescription(plugin.description);
			const displayName = title || plugin.name;
			const componentSummary = formatComponentSummary(plugin.components || {});

			return `### [${plugin.name}](plugins/${plugin.name}/) — v${plugin.version}

${displayName}${title ? ": " : ""}${desc}

**Components:** ${componentSummary}

\`\`\`bash
/plugin install ${plugin.name}@mearman
\`\`\``;
		})
		.join("\n\n");
}

/**
 * Read the current README and extract content outside markers.
 */
function readRootReadme(): { before: string; after: string } {
	const content = readFileSync(readmePath, "utf-8");

	const startIndex = content.indexOf(ROOT_START_MARKER);
	const endIndex = content.indexOf(ROOT_END_MARKER);

	if (startIndex === -1 || endIndex === -1) {
		console.error("Error: Marker comments not found in README.md");
		console.error(`Ensure README contains: ${ROOT_START_MARKER} && ${ROOT_END_MARKER}`);
		process.exit(1);
	}

	const before = content.slice(0, startIndex);
	const after = content.slice(endIndex + ROOT_END_MARKER.length);

	return { before, after };
}

/**
 * Write root README.
 */
function writeRootReadme(before: string, generated: string, after: string): void {
	const content = `${before}${ROOT_START_MARKER}\n${generated}\n${ROOT_END_MARKER}${after}`;
	writeFileSync(readmePath, content, "utf-8");
}

/**
 * Check if root README would be modified without writing changes.
 */
function checkRootReadme(before: string, generated: string, after: string): boolean {
	const currentContent = readFileSync(readmePath, "utf-8");
	const newContent = `${before}${ROOT_START_MARKER}\n${generated}\n${ROOT_END_MARKER}${after}`;
	return currentContent === newContent;
}

// ============================================================================
// Per-Plugin README Generation
// ============================================================================

/**
 * Generate content for a per-plugin README.
 */
export function generatePluginReadme(plugin: Plugin): string {
	const { title, desc } = extractTitleAndDescription(plugin.description);
	const displayName = title || plugin.name;

	const sections: string[] = [];

	// Header
	sections.push(`# ${displayName} (${plugin.name})`);
	sections.push("");
	sections.push(`${displayName}${title ? ": " : ""}${desc}`);
	sections.push("");
	sections.push(`**Version:** v${plugin.version}`);
	sections.push(`**Install:** \`/plugin install ${plugin.name}@mearman\``);
	sections.push("");
	sections.push(PLUGIN_START_MARKER);
	sections.push("");

	const components = plugin.components || {};

	// Generate sections for each component type
	for (const type of COMPONENT_TYPES) {
		const items = getComponentByName(components, type.name);

		if (items && items.length > 0) {
			sections.push(`## ${type.name}`);
			sections.push("");

			for (const item of items) {
				sections.push(type.formatForReadme(item));
				sections.push("");
			}
		}
	}

	sections.push(PLUGIN_END_MARKER);

	return sections.join("\n");
}

/**
 * Preserve manual sections in a plugin README.
 */
export function preserveManualSections(readmePath: string, generated: string): string {
	if (!existsSync(readmePath)) {
		return generated;
	}

	const existingContent = readFileSync(readmePath, "utf-8");

	// Check if existing content has markers
	const existingStartIndex = existingContent.indexOf(PLUGIN_START_MARKER);
	const existingEndIndex = existingContent.indexOf(PLUGIN_END_MARKER);

	if (existingStartIndex === -1 || existingEndIndex === -1) {
		// No markers, return generated content
		return generated;
	}

	// Preserve content outside markers (include newlines that follow the markers)
	const before = existingContent.slice(0, existingStartIndex);
	const after = existingContent.slice(existingEndIndex + PLUGIN_END_MARKER.length);

	// Extract generated content between markers (excluding the markers themselves)
	const generatedStartIndex = generated.indexOf(PLUGIN_START_MARKER);
	const generatedEndIndex = generated.indexOf(PLUGIN_END_MARKER);
	const generatedBody = generated.slice(
		generatedStartIndex + PLUGIN_START_MARKER.length + 1, // +1 to skip the newline after marker
		generatedEndIndex
	);

	// Reconstruct with preserved before/after and generated body
	return `${before}${PLUGIN_START_MARKER}\n${generatedBody}${PLUGIN_END_MARKER}${after}`;
}

/**
 * Write a per-plugin README.
 */
function writePluginReadme(pluginName: string, content: string): void {
	const pluginReadmePath = join(pluginsDir, pluginName, "README.md");
	const preservedContent = preserveManualSections(pluginReadmePath, content);
	writeFileSync(pluginReadmePath, preservedContent, "utf-8");
}

/**
 * Check if a per-plugin README is up-to-date.
 */
function checkPluginReadme(pluginName: string, content: string): boolean {
	const pluginReadmePath = join(pluginsDir, pluginName, "README.md");

	if (!existsSync(pluginReadmePath)) {
		return false;
	}

	const existingContent = readFileSync(pluginReadmePath, "utf-8");
	const preservedContent = preserveManualSections(pluginReadmePath, content);

	return existingContent === preservedContent;
}

/**
 * Type guard for MarketplaceJson
 */
function isMarketplaceJson(value: unknown): value is MarketplaceJson {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	if (!("plugins" in value)) {
		return false;
	}
	const pluginsDesc = Object.getOwnPropertyDescriptor(value, "plugins");
	return pluginsDesc !== undefined && Array.isArray(pluginsDesc.value);
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
	const checkOnly = process.argv.includes("--check");
	const marketplaceJson = readFileSync(marketplacePath, "utf-8");
	const parsed: unknown = JSON.parse(marketplaceJson);

	if (!isMarketplaceJson(parsed)) {
		throw new Error("Invalid marketplace.json format");
	}

	const marketplace = parsed;

	// Enrich plugins with component information
	for (const plugin of marketplace.plugins) {
		plugin.components = discoverComponents(plugin.name);
	}

	// Sort plugins by name
	marketplace.plugins.sort((a, b) => a.name.localeCompare(b.name));

	// Generate root README content
	const pluginsList = generateRootReadmeList(marketplace.plugins);
	const rootGenerated = `## Available Plugins

${pluginsList}`;

	// Read existing root README
	const { before, after } = readRootReadme();

	let rootUpToDate = true;
	let pluginsUpToDate = true;

	if (checkOnly) {
		// Check root README
		rootUpToDate = checkRootReadme(before, rootGenerated, after);

		// Check plugin READMEs
		for (const plugin of marketplace.plugins) {
			const pluginContent = generatePluginReadme(plugin);
			if (!checkPluginReadme(plugin.name, pluginContent)) {
				pluginsUpToDate = false;
				console.error(`plugins/${plugin.name}/README.md is out-of-date`);
			}
		}

		if (rootUpToDate && pluginsUpToDate) {
			console.log("All READMEs are up-to-date.");
			return;
		}

		if (!rootUpToDate) {
			console.error("README.md is out-of-date. Run \"pnpm generate-readme\" to update.");
		}
		if (!pluginsUpToDate) {
			console.error(
				"Plugin READMEs are out-of-date. Run \"pnpm generate-readme\" to update."
			);
		}
		process.exit(1);
	}

	// Write root README
	writeRootReadme(before, rootGenerated, after);
	console.log("Generated README.md plugin sections.");
	console.log(`  ${marketplace.plugins.length} plugins`);

	// Write plugin READMEs
	for (const plugin of marketplace.plugins) {
		const pluginContent = generatePluginReadme(plugin);
		writePluginReadme(plugin.name, pluginContent);
	}

	console.log(`Generated ${marketplace.plugins.length} plugin READMEs.`);

	// Show component summary
	for (const plugin of marketplace.plugins) {
		const summary = formatComponentSummary(plugin.components || {});
		if (summary !== "No components") {
			console.log(`  ${plugin.name}: ${summary}`);
		}
	}
}

// Only run main when this file is executed directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
