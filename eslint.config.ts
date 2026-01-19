import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import jsonc from "eslint-plugin-jsonc";
import markdown from "@eslint/markdown";
import testNamingRule from "./scripts/eslint-test-naming-rule";

export default [
	{
		ignores: [
			"node_modules/",
			"dist/",
			"*.min.js",
			"*.d.ts",
			"plugins/*/.claude-plugin/",
			".claude/",
			"scripts/sync-marketplace-versions.ts",
		],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslintParser,
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			"test-naming": {
				rules: {
					"test-file-naming": testNamingRule,
				},
			},
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-unused-vars": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"indent": ["error", "tab"],
			"quotes": ["error", "double"],
			"test-naming/test-file-naming": "error",
		},
	},
	...jsonc.configs["flat/recommended-with-json"].map((config) => ({
		...config,
		files: ["**/*.json"],
		rules: {
			...config.rules,
			"jsonc/indent": ["error", "tab"],
			"jsonc/quotes": ["error", "double"],
		},
	})),
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
];
