/**
 * Custom ESLint rule to enforce test file naming convention
 * Test files must end with .unit.test.ts, .unit.test.tsx, .integration.test.ts, or .integration.test.tsx
 */

import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description: "Enforce test file naming convention (.unit.test.ts, .integration.test.ts, etc.)",
			category: "Best Practices",
			recommended: true,
		},
		messages: {
			invalidTestFileName: "Test file '{{ fileName }}' must end with .unit.test.ts, .unit.test.tsx, .integration.test.ts, or .integration.test.tsx. Suggested name: '{{ suggestedName }}'",
		},
		schema: [], // no options
	},
	create: (context) => {
		const fileName = context.filename;

		// Only check files that end with .test.ts or .test.tsx
		if (!/\.test\.(ts|tsx)$/.test(fileName)) {
			return {};
		}

		// Check if it matches valid patterns
		const validPatterns = [/\.unit\.test\.ts$/, /\.unit\.test\.tsx$/, /\.integration\.test\.ts$/, /\.integration\.test\.tsx$/];
		const isValid = validPatterns.some((pattern) => pattern.test(fileName));

		if (isValid) {
			return {};
		}

		// Generate suggested filename
		const pathParts = fileName.split("/");
		const originalName = pathParts.pop() || "";
		const suggestedName = originalName.replace(/\.test\.(ts|tsx)$/, ".unit.test.$1");

		return {
			Program(): void {
				context.report({
					loc: { line: 0, column: 0 },
					messageId: "invalidTestFileName",
					data: {
						fileName: originalName,
						suggestedName,
					},
				});
			},
		};
	},
};

export default rule;
