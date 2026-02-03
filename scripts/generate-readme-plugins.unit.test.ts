#!/usr/bin/env tsx
/**
 * Tests for generate-readme-plugins.ts
 *
 * Tests pure functions for README generation including:
 * - YAML frontmatter parsing
 * - Component summary formatting
 * - Title/description extraction
 * - Root and plugin README generation
 * - Marker preservation logic
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { mkdtempSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
	extractYamlFrontmatter,
	removeFrontmatter,
	formatComponentSummary,
	extractTitleAndDescription,
	generateRootReadmeList,
	generatePluginReadme,
	preserveManualSections,
	PLUGIN_START_MARKER,
	PLUGIN_END_MARKER,
	type PluginComponents,
	type Plugin,
} from "./generate-readme-plugins.js";

describe("generate-readme-plugins.ts", () => {
	let tempDir: string;
	let tempFiles: string[] = [];

	beforeEach(() => {
		// Create a temporary directory for test files
		tempDir = mkdtempSync(join(tmpdir(), "readme-test-"));
		tempFiles = [];
	});

	afterEach(() => {
		// Clean up temp files
		for (const file of tempFiles) {
			try {
				if (existsSync(file)) {
					unlinkSync(file);
				}
			} catch {
				// Ignore cleanup errors
			}
		}
		tempFiles = [];

		// Clean up temp directory
		try {
			rmdirSync(tempDir);
		} catch {
			// Ignore cleanup errors
		}
	});

	// Helper to create a temp file
	function createTempFile(name: string, content: string): string {
		const filePath = join(tempDir, name);
		writeFileSync(filePath, content, "utf-8");
		tempFiles.push(filePath);
		return filePath;
	}

	// ============================================================================
	// YAML Frontmatter Tests
	// ============================================================================

	describe("extractYamlFrontmatter", () => {
		it("should extract simple key-value pairs", () => {
			const content = `---
name: test-skill
description: A test skill
---
# Content here`;

			const result = extractYamlFrontmatter(content);

			assert.deepStrictEqual(result, {
				name: "test-skill",
				description: "A test skill",
			});
		});

		it("should handle empty frontmatter", () => {
			const content = `---
---
# Content here`;

			const result = extractYamlFrontmatter(content);

			// Empty frontmatter returns null (no key-value pairs found)
			assert.strictEqual(result, null);
		});

		it("should return null when no frontmatter exists", () => {
			const content = `# Content here
No frontmatter`;

			const result = extractYamlFrontmatter(content);

			assert.strictEqual(result, null);
		});

		it("should trim whitespace from keys and values", () => {
			const content = `---
name :  test-skill
description: A test skill
---
# Content`;

			const result = extractYamlFrontmatter(content);

			assert.deepStrictEqual(result, {
				name: "test-skill",
				description: "A test skill",
			});
		});

		it("should handle multiline frontmatter", () => {
			const content = `---
name: test-skill
description: A test skill
tags: test, example
version: 1.0.0
---
# Content`;

			const result = extractYamlFrontmatter(content);

			assert.deepStrictEqual(result, {
				name: "test-skill",
				description: "A test skill",
				tags: "test, example",
				version: "1.0.0",
			});
		});

		it("should ignore lines without colons", () => {
			const content = `---
name: test-skill
invalid line without colon
description: A test skill
---
# Content`;

			const result = extractYamlFrontmatter(content);

			assert.deepStrictEqual(result, {
				name: "test-skill",
				description: "A test skill",
			});
		});

		it("should handle colons in values", () => {
			const content = `---
name: test-skill
description: This is: a test
---
# Content`;

			const result = extractYamlFrontmatter(content);

			assert.deepStrictEqual(result, {
				name: "test-skill",
				description: "This is: a test",
			});
		});
	});

	describe("removeFrontmatter", () => {
		it("should remove frontmatter with trailing newline", () => {
			const content = `---
name: test-skill
description: A test skill
---
# Content here
More content`;

			const result = removeFrontmatter(content);

			assert.strictEqual(result, "# Content here\nMore content");
			assert.ok(!result.includes("---"));
		});

		it("should remove frontmatter without trailing newline", () => {
			const content = `---
name: test-skill
---
# Content here`;

			const result = removeFrontmatter(content);

			assert.strictEqual(result, "# Content here");
		});

		it("should return content unchanged when no frontmatter", () => {
			const content = "# Content here\nMore content";

			const result = removeFrontmatter(content);

			assert.strictEqual(result, content);
		});

		it("should handle multiline frontmatter", () => {
			const content = `---
name: test-skill
description: A test skill
tags: test
---
# Content`;

			const result = removeFrontmatter(content);

			assert.strictEqual(result, "# Content");
		});

		it("should handle content with dashes after frontmatter", () => {
			const content = `---
name: test
---
# Title
---
- item 1
- item 2`;

			const result = removeFrontmatter(content);

			assert.strictEqual(result, "# Title\n---\n- item 1\n- item 2");
		});
	});

	// ============================================================================
	// Component Summary Tests
	// ============================================================================

	describe("formatComponentSummary", () => {
		it("should return 'No components' for empty components", () => {
			const components: PluginComponents = {};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "No components");
		});

		it("should format single skill", () => {
			const components: PluginComponents = {
				skills: [{ name: "test", description: "desc" }],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "1 skill");
		});

		it("should pluralize multiple skills", () => {
			const components: PluginComponents = {
				skills: [
					{ name: "test1", description: "desc1" },
					{ name: "test2", description: "desc2" },
				],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "2 skills");
		});

		it("should join multiple component types", () => {
			const components: PluginComponents = {
				skills: [
					{ name: "test1", description: "desc1" },
					{ name: "test2", description: "desc2" },
				],
				commands: [{ name: "cmd", description: "desc" }],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "2 skills, 1 command");
		});

		it("should show up to 3 component types fully", () => {
			const components: PluginComponents = {
				skills: [{ name: "s1", description: "d1" }],
				commands: [{ name: "c1", description: "d2" }],
				agents: [{ name: "a1", description: "d3" }],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "1 skill, 1 command, 1 agent");
		});

		it("should truncate when more than 3 component types", () => {
			const components: PluginComponents = {
				skills: [{ name: "s1", description: "d1" }],
				commands: [{ name: "c1", description: "d2" }],
				agents: [{ name: "a1", description: "d3" }],
				mcp: [{ name: "MCP Servers", description: "1 server configured", content: "{}" }],
				lsp: [{ name: "LSP Servers", description: "1 server configured", content: "{}" }],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "1 skill, 1 command, and 3 more");
		});

		it("should not show MCP when count is 0", () => {
			const components: PluginComponents = {
				skills: [{ name: "s1", description: "d1" }],
			};

			const result = formatComponentSummary(components);

			assert.ok(!result.includes("MCP"));
		});

		it("should show MCP when present", () => {
			const components: PluginComponents = {
				mcp: [{ name: "MCP Servers", description: "1 server configured", content: "{}" }],
			};

			const result = formatComponentSummary(components);

			assert.strictEqual(result, "MCP");
		});
	});

	// ============================================================================
	// Title/Description Extraction Tests
	// ============================================================================

	describe("extractTitleAndDescription", () => {
		it("should split on first colon", () => {
			const result = extractTitleAndDescription("Bibliography: Tools for managing citations");

			assert.deepStrictEqual(result, {
				title: "Bibliography",
				desc: "Tools for managing citations",
			});
		});

		it("should handle colon with spaces", () => {
			const result = extractTitleAndDescription("Bibliography  :  Tools for managing citations");

			assert.deepStrictEqual(result, {
				title: "Bibliography",
				desc: "Tools for managing citations",
			});
		});

		it("should return empty title when no colon", () => {
			const result = extractTitleAndDescription("Tools for managing citations");

			assert.deepStrictEqual(result, {
				title: "",
				desc: "Tools for managing citations",
			});
		});

		it("should split on first period when no colon and period after position 20", () => {
			const result = extractTitleAndDescription(
				"This is a long title that goes on. And this is the description",
			);

			assert.deepStrictEqual(result, {
				title: "This is a long title that goes on",
				desc: "And this is the description",
			});
		});

		it("should not split on early period", () => {
			const result = extractTitleAndDescription("A.B.C Something");

			assert.deepStrictEqual(result, {
				title: "",
				desc: "A.B.C Something",
			});
		});

		it("should handle description without colon or late period", () => {
			const result = extractTitleAndDescription("Short description");

			assert.deepStrictEqual(result, {
				title: "",
				desc: "Short description",
			});
		});

		it("should handle colon in description part", () => {
			const result = extractTitleAndDescription("Tool: Does something: and more");

			assert.deepStrictEqual(result, {
				title: "Tool",
				desc: "Does something: and more",
			});
		});
	});

	// ============================================================================
	// Root README Generation Tests
	// ============================================================================

	describe("generateRootReadmeList", () => {
		const mockPlugins: Plugin[] = [
			{
				name: "bib",
				source: "./plugins/bib",
				description: "Bibliography: Tools for citations",
				version: "0.2.0",
				components: {
					skills: [
						{ name: "bib-convert", description: "Convert formats" },
						{ name: "bib-validate", description: "Validate entries" },
					],
				},
			},
			{
				name: "cve-search",
				source: "./plugins/cve-search",
				description: "Search CVE vulnerabilities",
				version: "0.3.0",
				components: {
					skills: [{ name: "cve-lookup", description: "Look up CVEs" }],
				},
			},
		];

		it("should generate plugin cards with links", () => {
			const result = generateRootReadmeList(mockPlugins);

			assert.ok(result.includes("[bib](plugins/bib/)"));
			assert.ok(result.includes("[cve-search](plugins/cve-search/)"));
		});

		it("should include versions in cards", () => {
			const result = generateRootReadmeList(mockPlugins);

			assert.ok(result.includes("v0.2.0"));
			assert.ok(result.includes("v0.3.0"));
		});

		it("should include component summaries", () => {
			const result = generateRootReadmeList(mockPlugins);

			assert.ok(result.includes("**Components:** 2 skills"));
			assert.ok(result.includes("**Components:** 1 skill"));
		});

		it("should include install commands", () => {
			const result = generateRootReadmeList(mockPlugins);

			assert.ok(result.includes("/plugin install bib@mearman"));
			assert.ok(result.includes("/plugin install cve-search@mearman"));
		});

		it("should handle plugin without components", () => {
			const pluginsWithoutComponents: Plugin[] = [
				{
					name: "empty",
					source: "./plugins/empty",
					description: "Empty plugin",
					version: "0.1.0",
					components: {},
				},
			];

			const result = generateRootReadmeList(pluginsWithoutComponents);

			assert.ok(result.includes("**Components:** No components"));
		});

		it("should use description when no colon for title", () => {
			const pluginsWithoutColon: Plugin[] = [
				{
					name: "test",
					source: "./plugins/test",
					description: "Just a description without colon",
					version: "0.1.0",
					components: {},
				},
			];

			const result = generateRootReadmeList(pluginsWithoutColon);

			assert.ok(result.includes("Just a description without colon"));
		});

		it("should format display name with title colon pattern", () => {
			const result = generateRootReadmeList(mockPlugins);

			assert.ok(result.includes("Bibliography: Tools for citations"));
		});
	});

	// ============================================================================
	// Plugin README Generation Tests
	// ============================================================================

	describe("generatePluginReadme", () => {
		const mockPlugin: Plugin = {
			name: "bib",
			source: "./plugins/bib",
			description: "Bibliography: Tools for citations",
			version: "0.2.0",
			components: {
				skills: [
					{
						name: "bib-convert",
						description: "Convert bibliography formats",
						content: "# Bib Convert\n\nDetailed documentation",
					},
					{
						name: "bib-validate",
						description: "Validate bibliography entries",
						content: "# Bib Validate\n\nMore docs",
					},
				],
				commands: [
					{
						name: "/bib-validate",
						description: "Validate command",
						content: "# /bib-validate\n\nUsage",
					},
				],
			},
		};

		it("should generate plugin README header", () => {
			const result = generatePluginReadme(mockPlugin);

			assert.ok(result.includes("# Bibliography (bib)"));
		});

		it("should include version and install info", () => {
			const result = generatePluginReadme(mockPlugin);

			assert.ok(result.includes("**Version:** v0.2.0"));
			assert.ok(result.includes("**Install:** `/plugin install bib@mearman`"));
		});

		it("should include auto-generated markers", () => {
			const result = generatePluginReadme(mockPlugin);

			assert.ok(result.includes(PLUGIN_START_MARKER));
			assert.ok(result.includes(PLUGIN_END_MARKER));
		});

		it("should generate sections for each component type", () => {
			const result = generatePluginReadme(mockPlugin);

			assert.ok(result.includes("## Skills"));
			assert.ok(result.includes("## Commands"));
		});

		it("should include full content for each component", () => {
			const result = generatePluginReadme(mockPlugin);

			assert.ok(result.includes("# Bib Convert"));
			assert.ok(result.includes("Detailed documentation"));
			assert.ok(result.includes("# Bib Validate"));
			assert.ok(result.includes("More docs"));
			assert.ok(result.includes("# /bib-validate"));
		});

		it("should skip component types with no items", () => {
			const pluginWithOnlySkills: Plugin = {
				name: "test",
				source: "./plugins/test",
				description: "Test plugin",
				version: "0.1.0",
				components: {
					skills: [{ name: "test-skill", description: "A skill" }],
				},
			};

			const result = generatePluginReadme(pluginWithOnlySkills);

			assert.ok(result.includes("## Skills"));
			assert.ok(!result.includes("## Commands"));
			assert.ok(!result.includes("## Hooks"));
		});

		it("should handle plugin with no components", () => {
			const emptyPlugin: Plugin = {
				name: "empty",
				source: "./plugins/empty",
				description: "Empty plugin",
				version: "0.1.0",
				components: {},
			};

			const result = generatePluginReadme(emptyPlugin);

			// When no colon in description, plugin name is used as display name
			assert.ok(result.includes("# empty (empty)"));
			assert.ok(result.includes(PLUGIN_START_MARKER));
			assert.ok(result.includes(PLUGIN_END_MARKER));
		});

		it("should use plugin name when title extraction fails", () => {
			const pluginWithoutTitle: Plugin = {
				name: "test-plugin",
				source: "./plugins/test",
				description: "Just a description",
				version: "0.1.0",
				components: {},
			};

			const result = generatePluginReadme(pluginWithoutTitle);

			// When no colon in description, plugin name is used as display name
			assert.ok(result.includes("# test-plugin (test-plugin)"));
		});
	});

	// ============================================================================
	// Marker Preservation Tests (using actual temp files)
	// ============================================================================

	describe("preserveManualSections", () => {
		const generatedContent = `# Test Plugin (test)

Test plugin description

**Version:** v0.1.0
**Install:** \`/plugin install test@mearman\`

${PLUGIN_START_MARKER}

## Skills

### test-skill

Skill content here

${PLUGIN_END_MARKER}`;

		it("should return generated content when file does not exist", () => {
			const nonExistentPath = join(tempDir, "nonexistent.md");

			const result = preserveManualSections(nonExistentPath, generatedContent);

			assert.strictEqual(result, generatedContent);
		});

		it("should return generated content when existing file has no markers", () => {
			const filePath = createTempFile("test-no-markers.md", "# Old content\n\nSome old content");

			const result = preserveManualSections(filePath, generatedContent);

			assert.strictEqual(result, generatedContent);
		});

		it("should preserve content before markers", () => {
			const existing = `# Manual Header

This is manual content before the auto-generated section.

${PLUGIN_START_MARKER}

## Skills

### old-skill

Old content

${PLUGIN_END_MARKER}`;

			const filePath = createTempFile("test-before.md", existing);

			const result = preserveManualSections(filePath, generatedContent);

			assert.ok(result.includes("# Manual Header"));
			assert.ok(result.includes("This is manual content before the auto-generated section."));
			assert.ok(result.includes("### test-skill"));
			assert.ok(!result.includes("old-skill"));
		});

		it("should preserve content after markers", () => {
			const existing = `${PLUGIN_START_MARKER}

## Skills

### old-skill

Old content

${PLUGIN_END_MARKER}

## Development

This is manual content after the auto-generated section.
`;

			const filePath = createTempFile("test-after.md", existing);

			const result = preserveManualSections(filePath, generatedContent);

			assert.ok(result.includes("## Development"));
			assert.ok(result.includes("This is manual content after the auto-generated section."));
			assert.ok(result.includes("### test-skill"));
			assert.ok(!result.includes("old-skill"));
		});

		it("should preserve content both before and after markers", () => {
			const existing = `# Custom Title

Custom intro content.

${PLUGIN_START_MARKER}

## Skills

### old-skill

Old content

${PLUGIN_END_MARKER}

## Contributing

Custom footer content.
`;

			const filePath = createTempFile("test-both.md", existing);

			const result = preserveManualSections(filePath, generatedContent);

			assert.ok(result.includes("# Custom Title"));
			assert.ok(result.includes("Custom intro content."));
			assert.ok(result.includes("## Contributing"));
			assert.ok(result.includes("Custom footer content."));
			assert.ok(result.includes("### test-skill"));
		});

		it("should handle marker without trailing newline in existing content", () => {
			const existing = `# Manual

${PLUGIN_START_MARKER}
## Skills

### old

${PLUGIN_END_MARKER}
## Footer`;

			const filePath = createTempFile("test-no-newline.md", existing);

			const result = preserveManualSections(filePath, generatedContent);

			assert.ok(result.includes("# Manual"));
			assert.ok(result.includes("## Footer"));
			assert.ok(result.includes("### test-skill"));
		});

		it("should correctly replace marker content", () => {
			const existing = `${PLUGIN_START_MARKER}

## Skills

### old-skill

Old skill content

${PLUGIN_END_MARKER}`;

			const filePath = createTempFile("test-replace.md", existing);

			const result = preserveManualSections(filePath, generatedContent);

			// Should have new content
			assert.ok(result.includes("### test-skill"));
			assert.ok(result.includes("Skill content here"));
			// Should not have old content
			assert.ok(!result.includes("old-skill"));
			assert.ok(!result.includes("Old skill content"));
		});
	});
});
