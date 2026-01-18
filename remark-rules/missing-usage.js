// @ts-check
/**
 * remark-lint rule to ensure SKILL.md files have a ## Usage section.
 *
 * @module missing-usage
 */

import { lintRule } from "unified-lint-rule";
import { visit } from "unist-util-visit";

const remarkLintMissingUsage = lintRule(
	{
		origin: "marketplace:missing-usage",
		url: "https://github.com/Mearman/marketplace",
	},
	/**
	 * @param {import('mdast').Root} tree
	 *   Tree.
	 * @param {import('vfile').VFile} file
	 *   File.
	 * @returns {undefined}
	 *   Nothing.
	 */
	function (tree, file) {
		// Only check SKILL.md files (files in /skills/ directories)
		if (!file.dirname || !file.dirname.includes("/skills/")) {
			return;
		}

		let hasUsageHeading = false;

		visit(tree, "heading", (node) => {
			// Only check H2 headings (depth === 2)
			if (node.depth === 2) {
				const textNode = node.children.find((child) => child.type === "text");
				if (textNode && textNode.type === "text" && textNode.value === "Usage") {
					hasUsageHeading = true;
				}
			}
		});

		if (!hasUsageHeading) {
			file.message(
				"SKILL.md files must have a '## Usage' section to document how to invoke the skill. This section is extracted by the README generator and shown to users in the marketplace."
			);
		}
	}
);

export default remarkLintMissingUsage;
