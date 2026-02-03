import tseslint from "typescript-eslint";
import jsonc from "eslint-plugin-jsonc";
import markdown from "@eslint/markdown";
import type { ConfigArray } from "typescript-eslint";
import testNamingRule from "./scripts/eslint-test-naming-rule";

// Cast jsonc configs to be compatible with tseslint.config()
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Required for jsonc plugin compatibility
const jsoncConfigs = jsonc.configs["flat/recommended-with-json"].map((config) => ({
	...config,
	files: ["**/*.json"],
	rules: {
		...config.rules,
		"jsonc/indent": ["error", "tab"],
		"jsonc/quotes": ["error", "double"],
	},
})) as ConfigArray;

export default tseslint.config(
	{
		ignores: [
			"node_modules/",
			"dist/",
			"coverage/",
			"*.min.js",
			"*.d.ts",
			"plugins/*/.claude-plugin/",
			".claude/",
			"scripts/sync-marketplace-versions.ts",
		],
	},
	// Base TypeScript config with strict type checking
	{
		files: ["**/*.ts"],
		extends: [
			...tseslint.configs.strictTypeChecked,
		],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: {
			"test-naming": {
				rules: {
					"test-file-naming": testNamingRule,
				},
			},
		},
		rules: {
			// =====================================================================
			// TYPE ASSERTION RULES (Core focus of this config)
			// =====================================================================

			// Ban `as Type` assertions (but allow `as const`)
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{
					assertionStyle: "never",
				},
			],
			// Ban non-null assertions (!) - these hide potential null issues
			"@typescript-eslint/no-non-null-assertion": "error",

			// =====================================================================
			// TYPE SAFETY RULES
			// =====================================================================

			// Prevent any leakage
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-explicit-any": "error",

			// =====================================================================
			// RELAXED RULES (pragmatic for this codebase)
			// =====================================================================

			// Allow numbers, booleans in template literals (very common pattern)
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
					allowBoolean: true,
					allowNullish: false,
					allowAny: false,
				},
			],

			// Allow async functions without await (common for interface compliance)
			"@typescript-eslint/require-await": "off",

			// Allow returning void from arrow functions (common pattern)
			"@typescript-eslint/no-confusing-void-expression": "off",

			// Allow unbound methods (common in mock patterns and callbacks)
			"@typescript-eslint/unbound-method": "off",

			// Allow deprecations (we use them intentionally)
			"@typescript-eslint/no-deprecated": "warn",

			// Relax unnecessary condition checks (can be overly strict)
			"@typescript-eslint/no-unnecessary-condition": "warn",

			// Allow unknown in catch (strict mode prefers this, but Error is fine)
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",

			// =====================================================================
			// EXISTING RULES
			// =====================================================================

			"@typescript-eslint/no-unused-vars": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"indent": ["error", "tab"],
			"quotes": ["error", "double"],
			"test-naming/test-file-naming": "error",
		},
	},
	// Test file exemptions - allow mocking flexibility
	{
		files: ["**/*.unit.test.ts", "**/*.test.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/consistent-type-assertions": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
		},
	},
	// JSON config
	...jsoncConfigs,
	// Markdown config
	...markdown.configs.recommended,
	{
		files: ["**/*.md"],
		rules: {
			"markdown/fenced-code-language": "off",
			"markdown/heading-increment": "off",
			"markdown/no-missing-label-refs": "off",
			"markdown/no-multiple-h1": "off",
		},
	},
	{
		files: ["**/*.md/*.json", "**/*.md/*.js", "**/*.md/*.ts"],
		rules: {
			"jsonc/no-comments": "off",
			"no-irregular-whitespace": "off",
			"no-undef": "off",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
);
