import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		environment: "node",
		include: [
			"lib/**/*.test.ts",
			"scripts/**/*.test.ts",
			"plugins/**/scripts/**/*.test.ts",
			"plugins/**/lib/**/*.test.ts",
		],
		exclude: [
			"node_modules",
			"dist",
			"plugins/*/.claude-plugin",
			"**/*.d.ts",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules",
				"dist",
				"**/*.test.ts",
				"**/*.config.ts",
				"plugins/*/.claude-plugin",
			],
		},
	},
});
