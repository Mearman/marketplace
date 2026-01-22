/**
 * Built-in schema associations for common JSON configuration files.
 *
 * Maps file patterns to their JSON Schema URLs for validation and completion.
 * These serve as fallback when SchemaStore catalog is unavailable.
 */

export interface SchemaAssociation {
  pattern: string;
  uri: string;
}

/**
 * Built-in schema associations for common configuration files.
 * Sourced from SchemaStore.org and official schema repositories.
 */
export const BUILT_IN_ASSOCIATIONS: readonly SchemaAssociation[] = [
	// Node.js / NPM
	{ pattern: "package.json", uri: "https://json.schemastore.org/package.json" },

	// TypeScript
	{ pattern: "tsconfig.json", uri: "https://json.schemastore.org/tsconfig.json" },
	{ pattern: "tsconfig.*.json", uri: "https://json.schemastore.org/tsconfig.json" },

	// ESLint
	{ pattern: ".eslintrc.json", uri: "https://json.schemastore.org/eslintrc.json" },
	{ pattern: ".eslintrc", uri: "https://json.schemastore.org/eslintrc.json" },

	// Prettier
	{ pattern: ".prettierrc.json", uri: "https://json.schemastore.org/prettierrc.json" },
	{ pattern: ".prettierrc", uri: "https://json.schemastore.org/prettierrc.json" },
	{ pattern: "prettier.config.json", uri: "https://json.schemastore.org/prettierrc.json" },

	// Babel
	{ pattern: ".babelrc.json", uri: "https://json.schemastore.org/babelrc.json" },
	{ pattern: "babel.config.json", uri: "https://json.schemastore.org/babelrc.json" },

	// Webpack
	{ pattern: "webpack.config.js", uri: "https://json.schemastore.org/webpack-config.json" },

	// Vite
	{ pattern: "vite.config.js", uri: "https://json.schemastore.org/vite-config.json" },

	// ESLint v8+
	{ pattern: "eslint.config.js", uri: "https://json.schemastore.org/eslintrc.json" },

	// Jest
	{ pattern: "jest.config.js", uri: "https://json.schemastore.org/jest-config.json" },

	// AVA
	{ pattern: "ava.config.js", uri: "https://json.schemastore.org/ava-config.json" },

	// Mocha
	{ pattern: ".mocharc.json", uri: "https://json.schemastore.org/mocharc.json" },
	{ pattern: ".mocharc", uri: "https://json.schemastore.org/mocharc.json" },

	// VS Code
	{ pattern: ".vscode/*.json", uri: "https://json.schemastore.org/vscode.json" },

	// Chrome Extensions (removed due to conflict with generic manifest.json)
	// Firefox Add-ons (removed due to conflict with generic manifest.json)

	// Azure
	{ pattern: "azure-pipelines*.json", uri: "https://json.schemastore.org/azure-pipelines.json" },

	// CircleCI
	{ pattern: ".circleci/config.yml", uri: "https://json.schemastore.org/circleciconfig.json" },

	// Travis CI
	{ pattern: ".travis.yml", uri: "https://json.schemastore.org/travis.json" },

	// Docker
	{ pattern: "docker-compose.yml", uri: "https://json.schemastore.org/docker-compose.yml" },
	{ pattern: "docker-compose*.yml", uri: "https://json.schemastore.org/docker-compose.yml" },

	// Kubernetes
	{ pattern: "k8s/*.yml", uri: "https://json.schemastore.org/kustomization.json" },
	{ pattern: "kubernetes/*.yml", uri: "https://json.schemastore.org/kustomization.json" },

	// Helm
	{ pattern: "Chart.yaml", uri: "https://json.schemastore.org/chart.json" },

	// Swagger / OpenAPI
	{ pattern: "swagger.json", uri: "https://json.schemastore.org/swagger-2.0.json" },
	{ pattern: "openapi.json", uri: "https://json.schemastore.org/openapi-3.0.json" },
	{ pattern: "openapi.yaml", uri: "https://json.schemastore.org/openapi-3.0.json" },

	// JSON Schema drafts
	{ pattern: "schema.json", uri: "http://json-schema.org/draft-07/schema#" },

	// Language config
	{ pattern: ".languageconfig.json", uri: "https://json.schemastore.org/languageconfig.json" },

	// Lerna
	{ pattern: "lerna.json", uri: "https://json.schemastore.org/lerna.json" },

	// TypeScript definitions
	{ pattern: "typings.json", uri: "https://json.schemastore.org/typings.json" },
] as const;

/**
 * Find schema URI for a given file path.
 *
 * @param filePath - Absolute or relative file path
 * @returns Schema URI if found, undefined otherwise
 */
export function findSchemaForFile(filePath: string): string | undefined {
	const fileName = filePath.split("/").pop() ?? "";
	const parts = filePath.split("/");

	// Direct name match
	for (const assoc of BUILT_IN_ASSOCIATIONS) {
		if (assoc.pattern === fileName) {
			return assoc.uri;
		}
	}

	// Pattern matching (wildcards)
	for (const assoc of BUILT_IN_ASSOCIATIONS) {
		if (assoc.pattern.includes("*")) {
			const pattern = assoc.pattern.replace("*", ".*");
			const regex = new RegExp(`^${pattern}$`);
			if (regex.test(fileName)) {
				return assoc.uri;
			}
		}
	}

	// Path patterns (e.g., ".vscode/*.json")
	for (const assoc of BUILT_IN_ASSOCIATIONS) {
		if (assoc.pattern.includes("/")) {
			const patternParts = assoc.pattern.split("/");
			const filePathParts = parts.slice(-patternParts.length);

			if (filePathParts.length === patternParts.length) {
				let match = true;
				for (let i = 0; i < patternParts.length; i++) {
					const pattern = patternParts[i].replace("*", ".*");
					const regex = new RegExp(`^${pattern}$`);
					if (!regex.test(filePathParts[i])) {
						match = false;
						break;
					}
				}
				if (match) {
					return assoc.uri;
				}
			}
		}
	}

	return undefined;
}

/**
 * Convert associations to LSP schema associations format.
 */
export function toLSPAssociations(): Record<string, string[]> {
	const result: Record<string, string[]> = {};

	for (const assoc of BUILT_IN_ASSOCIATIONS) {
		result[assoc.pattern] = [assoc.uri];
	}

	return result;
}
