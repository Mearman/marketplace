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

// Commit types that allow empty scopes
const typesAllowedEmptyScope = ["chore", "ci", "docs", "style", "test", "refactor", "perf"];

const config: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	plugins: [
		{
			rules: {
				"scope-empty-conditional": (parsed) => {
					const { type, scope } = parsed;

					// For types that allow empty scope, always pass
					if (type && typesAllowedEmptyScope.includes(type)) {
						return [true];
					}

					// For other types (feat, fix, etc.), scope must not be empty
					// Check if scope is missing or null
					const typeLabel = type ?? "unknown";
					if (scope === null || scope === undefined) {
						return [false, `scope may not be empty for type '${typeLabel}'`];
					}
					// Also check for empty string (though this shouldn't happen with parsed commits)
					if (scope === "") {
						return [false, `scope may not be empty for type '${typeLabel}'`];
					}
					return [true];
				},
			},
		},
	],
	rules: {
		"scope-enum": [2, "always", [...coreScopes, ...pluginScopes]],
		// Override the default scope-empty rule with our conditional version
		"scope-empty": [0], // Disable default rule
		"scope-empty-conditional": [2, "always"], // Use our custom rule
		"body-max-line-length": [0], // Disabled for semantic-release changelog commits
	},
};

export default config;
