import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserConfig } from "@commitlint/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Dynamically discovers plugin directories to generate valid commit scopes.
 * New plugins are automatically valid scopes without config changes.
 */
function getPluginScopes(): string[] {
	const pluginsDir = join(__dirname, "plugins");
	try {
		return readdirSync(pluginsDir).filter((name) => {
			const pluginPath = join(pluginsDir, name);
			return statSync(pluginPath).isDirectory();
		});
	} catch {
		return [];
	}
}

// Core scopes (always available)
const coreScopes = [
	"marketplace", // .claude-plugin/marketplace.json
	"schemas",     // schemas/
	"docs",        // README, CLAUDE.md
	"ci",          // GitHub workflows
	"deps",        // Dependencies
	"release",     // semantic-release commits
	"lib",         // Shared utilities (/lib)
];

// Plugin scopes (auto-detected from plugins/ directory)
const pluginScopes = getPluginScopes();

const config: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"scope-enum": [2, "always", [...coreScopes, ...pluginScopes]],
		// Allow empty scopes for certain commit types
		// @ts-expect-error - tuple type is complex, this works at runtime
		"scope-empty": [0, "never", ["chore", "ci", "docs", "style", "test", "refactor", "perf"]] as any,
		"body-max-line-length": [0], // Disabled for semantic-release changelog commits
	},
};

export default config;
