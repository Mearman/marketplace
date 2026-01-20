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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fs module
vi.mock("node:fs", () => {
	const mockFs = {
		existsSync: vi.fn((path: string) => {
			if (typeof path === "string") {
				if (path.includes("marketplace.json")) return true;
				if (path.includes("README.md")) return true;
			}
			return true;
		}),
		readFileSync: vi.fn((path: string) => {
			if (typeof path === "string") {
				if (path.includes("marketplace.json")) {
					return JSON.stringify({ plugins: [] });
				}
				if (path.includes("README.md")) {
					return "<!-- AUTO-GENERATED PLUGINS START -->\n<!-- AUTO-GENERATED PLUGINS END -->";
				}
			}
			return "";
		}),
		writeFileSync: vi.fn(),
		readdirSync: vi.fn(() => []),
	};
	return mockFs;
});

// Mock console.error to prevent error output
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock process.exit to prevent actual exit
vi.stubGlobal("process", {
	...process,
	exit: vi.fn(() => {
		throw new Error("process.exit called");
	}),
});

// Import after mocks are set up
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
} from "./generate-readme-plugins";
import { existsSync, readFileSync } from "node:fs";

// Get typed references to mocks
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

describe("generate-readme-plugins.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

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

			expect(result).toEqual({
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
			expect(result).toBeNull();
		});

		it("should return null when no frontmatter exists", () => {
			const content = `# Content here
No frontmatter`;

			const result = extractYamlFrontmatter(content);

			expect(result).toBeNull();
		});

		it("should trim whitespace from keys and values", () => {
			const content = `---
name :  test-skill
description: A test skill
---
# Content`;

			const result = extractYamlFrontmatter(content);

			expect(result).toEqual({
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

			expect(result).toEqual({
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

			expect(result).toEqual({
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

			expect(result).toEqual({
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

			expect(result).toBe("# Content here\nMore content");
			expect(result).not.toContain("---");
		});

		it("should remove frontmatter without trailing newline", () => {
			const content = `---
name: test-skill
---
# Content here`;

			const result = removeFrontmatter(content);

			expect(result).toBe("# Content here");
		});

		it("should return content unchanged when no frontmatter", () => {
			const content = "# Content here\nMore content";

			const result = removeFrontmatter(content);

			expect(result).toBe(content);
		});

		it("should handle multiline frontmatter", () => {
			const content = `---
name: test-skill
description: A test skill
tags: test
---
# Content`;

			const result = removeFrontmatter(content);

			expect(result).toBe("# Content");
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

			expect(result).toBe("# Title\n---\n- item 1\n- item 2");
		});
	});

	// ============================================================================
	// Component Summary Tests
	// ============================================================================

	describe("formatComponentSummary", () => {
		it("should return 'No components' for empty components", () => {
			const components: PluginComponents = {};

			const result = formatComponentSummary(components);

			expect(result).toBe("No components");
		});

		it("should format single skill", () => {
			const components: PluginComponents = {
				skills: [{ name: "test", description: "desc" }],
			};

			const result = formatComponentSummary(components);

			expect(result).toBe("1 skill");
		});

		it("should pluralize multiple skills", () => {
			const components: PluginComponents = {
				skills: [
					{ name: "test1", description: "desc1" },
					{ name: "test2", description: "desc2" },
				],
			};

			const result = formatComponentSummary(components);

			expect(result).toBe("2 skills");
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

			expect(result).toBe("2 skills, 1 command");
		});

		it("should show up to 3 component types fully", () => {
			const components: PluginComponents = {
				skills: [{ name: "s1", description: "d1" }],
				commands: [{ name: "c1", description: "d2" }],
				agents: [{ name: "a1", description: "d3" }],
			};

			const result = formatComponentSummary(components);

			expect(result).toBe("1 skill, 1 command, 1 agent");
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

			expect(result).toBe("1 skill, 1 command, and 3 more");
		});

		it("should not show MCP when count is 0", () => {
			const components: PluginComponents = {
				skills: [{ name: "s1", description: "d1" }],
			};

			const result = formatComponentSummary(components);

			expect(result).not.toContain("MCP");
		});

		it("should show MCP when present", () => {
			const components: PluginComponents = {
				mcp: [{ name: "MCP Servers", description: "1 server configured", content: "{}" }],
			};

			const result = formatComponentSummary(components);

			expect(result).toBe("MCP");
		});
	});

	// ============================================================================
	// Title/Description Extraction Tests
	// ============================================================================

	describe("extractTitleAndDescription", () => {
		it("should split on first colon", () => {
			const result = extractTitleAndDescription("Bibliography: Tools for managing citations");

			expect(result).toEqual({
				title: "Bibliography",
				desc: "Tools for managing citations",
			});
		});

		it("should handle colon with spaces", () => {
			const result = extractTitleAndDescription("Bibliography  :  Tools for managing citations");

			expect(result).toEqual({
				title: "Bibliography",
				desc: "Tools for managing citations",
			});
		});

		it("should return empty title when no colon", () => {
			const result = extractTitleAndDescription("Tools for managing citations");

			expect(result).toEqual({
				title: "",
				desc: "Tools for managing citations",
			});
		});

		it("should split on first period when no colon and period after position 20", () => {
			const result = extractTitleAndDescription("This is a long title that goes on. And this is the description");

			expect(result).toEqual({
				title: "This is a long title that goes on",
				desc: "And this is the description",
			});
		});

		it("should not split on early period", () => {
			const result = extractTitleAndDescription("A.B.C Something");

			expect(result).toEqual({
				title: "",
				desc: "A.B.C Something",
			});
		});

		it("should handle description without colon or late period", () => {
			const result = extractTitleAndDescription("Short description");

			expect(result).toEqual({
				title: "",
				desc: "Short description",
			});
		});

		it("should handle colon in description part", () => {
			const result = extractTitleAndDescription("Tool: Does something: and more");

			expect(result).toEqual({
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

			expect(result).toContain("[bib](plugins/bib/)");
			expect(result).toContain("[cve-search](plugins/cve-search/)");
		});

		it("should include versions in cards", () => {
			const result = generateRootReadmeList(mockPlugins);

			expect(result).toContain("v0.2.0");
			expect(result).toContain("v0.3.0");
		});

		it("should include component summaries", () => {
			const result = generateRootReadmeList(mockPlugins);

			expect(result).toContain("**Components:** 2 skills");
			expect(result).toContain("**Components:** 1 skill");
		});

		it("should include install commands", () => {
			const result = generateRootReadmeList(mockPlugins);

			expect(result).toContain("/plugin install bib@mearman");
			expect(result).toContain("/plugin install cve-search@mearman");
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

			expect(result).toContain("**Components:** No components");
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

			expect(result).toContain("Just a description without colon");
		});

		it("should format display name with title colon pattern", () => {
			const result = generateRootReadmeList(mockPlugins);

			expect(result).toContain("Bibliography: Tools for citations");
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

			expect(result).toContain("# Bibliography (bib)");
		});

		it("should include version and install info", () => {
			const result = generatePluginReadme(mockPlugin);

			expect(result).toContain("**Version:** v0.2.0");
			expect(result).toContain("**Install:** `/plugin install bib@mearman`");
		});

		it("should include auto-generated markers", () => {
			const result = generatePluginReadme(mockPlugin);

			expect(result).toContain(PLUGIN_START_MARKER);
			expect(result).toContain(PLUGIN_END_MARKER);
		});

		it("should generate sections for each component type", () => {
			const result = generatePluginReadme(mockPlugin);

			expect(result).toContain("## Skills");
			expect(result).toContain("## Commands");
		});

		it("should include full content for each component", () => {
			const result = generatePluginReadme(mockPlugin);

			expect(result).toContain("# Bib Convert");
			expect(result).toContain("Detailed documentation");
			expect(result).toContain("# Bib Validate");
			expect(result).toContain("More docs");
			expect(result).toContain("# /bib-validate");
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

			expect(result).toContain("## Skills");
			expect(result).not.toContain("## Commands");
			expect(result).not.toContain("## Hooks");
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
			expect(result).toContain("# empty (empty)");
			expect(result).toContain(PLUGIN_START_MARKER);
			expect(result).toContain(PLUGIN_END_MARKER);
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
			expect(result).toContain("# test-plugin (test-plugin)");
		});
	});

	// ============================================================================
	// Marker Preservation Tests
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
			mockExistsSync.mockReturnValue(false);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toBe(generatedContent);
			expect(mockExistsSync).toHaveBeenCalledWith("/path/to/README.md");
			expect(mockReadFileSync).not.toHaveBeenCalled();
		});

		it("should return generated content when existing file has no markers", () => {
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue("# Old content\n\nSome old content");

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toBe(generatedContent);
		});

		it("should preserve content before markers", () => {
			const existing = `# Manual Header

This is manual content before the auto-generated section.

${PLUGIN_START_MARKER}

## Skills

### old-skill

Old content

${PLUGIN_END_MARKER}`;

			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(existing);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toContain("# Manual Header");
			expect(result).toContain("This is manual content before the auto-generated section.");
			expect(result).toContain("### test-skill");
			expect(result).not.toContain("old-skill");
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

			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(existing);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toContain("## Development");
			expect(result).toContain("This is manual content after the auto-generated section.");
			expect(result).toContain("### test-skill");
			expect(result).not.toContain("old-skill");
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

			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(existing);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toContain("# Custom Title");
			expect(result).toContain("Custom intro content.");
			expect(result).toContain("## Contributing");
			expect(result).toContain("Custom footer content.");
			expect(result).toContain("### test-skill");
		});

		it("should handle marker without trailing newline in existing content", () => {
			const existing = `# Manual

${PLUGIN_START_MARKER}
## Skills

### old

${PLUGIN_END_MARKER}
## Footer`;

			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(existing);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			expect(result).toContain("# Manual");
			expect(result).toContain("## Footer");
			expect(result).toContain("### test-skill");
		});

		it("should correctly replace marker content", () => {
			const existing = `${PLUGIN_START_MARKER}

## Skills

### old-skill

Old skill content

${PLUGIN_END_MARKER}`;

			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(existing);

			const result = preserveManualSections("/path/to/README.md", generatedContent);

			// Should have new content
			expect(result).toContain("### test-skill");
			expect(result).toContain("Skill content here");
			// Should not have old content
			expect(result).not.toContain("old-skill");
			expect(result).not.toContain("Old skill content");
		});
	});
});
