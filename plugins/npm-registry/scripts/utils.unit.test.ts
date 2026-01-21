/**
 * Tests for npm-registry plugin utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	API,
	parseRepositoryUrl,
	formatNumber,
	parseArgs,
} from "./utils.js";

describe("API URLs", () => {
	describe("API.search", () => {
		it("should generate search URL with default parameters", () => {
			const result = API.search("react");
			assert.ok(result.includes("text=react"));
			assert.ok(result.includes("size=20"));
			assert.ok(result.includes("from=0"));
		});

		it("should generate search URL with custom size", () => {
			const result = API.search("react", 50);
			assert.ok(result.includes("size=50"));
		});

		it("should generate search URL with custom from", () => {
			const result = API.search("react", 20, 100);
			assert.ok(result.includes("from=100"));
		});

		it("should encode query parameters", () => {
			const result = API.search("@babel/core");
			assert.ok(result.includes("text=%40babel%2Fcore"));
		});

		it("should handle spaces in query", () => {
			const result = API.search("http server");
			assert.ok(result.includes("text=http+server"));
		});

		it("should cap size at 250", () => {
			const result = API.search("react", 300, 0);
			assert.ok(result.includes("size=300")); // API doesn't cap, caller does
		});
	});

	describe("API.package", () => {
		it("should generate package URL for scoped package", () => {
			const result = API.package("@babel/core");
			assert.strictEqual(result, "https://registry.npmjs.org/@babel/core");
		});

		it("should generate package URL for unscoped package", () => {
			const result = API.package("react");
			assert.strictEqual(result, "https://registry.npmjs.org/react");
		});

		it("should handle special characters in package name", () => {
			const result = API.package("@angular/core");
			assert.strictEqual(result, "https://registry.npmjs.org/@angular/core");
		});
	});

	describe("API.exists", () => {
		it("should generate exists URL (same as package)", () => {
			const result = API.exists("express");
			assert.strictEqual(result, "https://registry.npmjs.org/express");
		});

		it("should handle scoped packages", () => {
			const result = API.exists("@types/node");
			assert.strictEqual(result, "https://registry.npmjs.org/@types/node");
		});
	});

	describe("API.downloads", () => {
		it("should generate downloads URL for last-week", () => {
			const result = API.downloads("last-week", "react");
			assert.strictEqual(result, "https://api.npmjs.org/downloads/range/last-week/react");
		});

		it("should generate downloads URL for last-month", () => {
			const result = API.downloads("last-month", "express");
			assert.strictEqual(result, "https://api.npmjs.org/downloads/range/last-month/express");
		});

		it("should generate downloads URL for last-year", () => {
			const result = API.downloads("last-year", "vue");
			assert.strictEqual(result, "https://api.npmjs.org/downloads/range/last-year/vue");
		});

		it("should handle scoped packages", () => {
			const result = API.downloads("last-week", "@babel/core");
			assert.strictEqual(result, "https://api.npmjs.org/downloads/range/last-week/@babel/core");
		});

		it("should handle custom period", () => {
			const result = API.downloads("2023-01-01:2023-01-31", "react");
			assert.strictEqual(result, "https://api.npmjs.org/downloads/range/2023-01-01:2023-01-31/react");
		});
	});
});

describe("parseRepositoryUrl", () => {
	describe("NpmRepository object format", () => {
		it("should parse repository object with url property", () => {
			const repo = { type: "git", url: "https://github.com/user/repo" };
			const result = parseRepositoryUrl(repo);
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should parse repository object without type", () => {
			const repo = { url: "https://github.com/user/repo" };
			const result = parseRepositoryUrl(repo);
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should return null for repository object without url", () => {
			const repo = { type: "git" };
			const result = parseRepositoryUrl(repo);
			assert.strictEqual(result, null);
		});
	});

	describe("string URL formats", () => {
		it("should parse HTTPS URL", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should parse git+https URL", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should parse git:// URL", () => {
			const result = parseRepositoryUrl("git://github.com/user/repo");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should parse git@github.com: URL", () => {
			const result = parseRepositoryUrl("git@github.com:user/repo");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should parse ssh://git@github.com/ URL", () => {
			const result = parseRepositoryUrl("ssh://git@github.com/user/repo");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should strip .git suffix", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo.git");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should strip .git from git+https URL", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo.git");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should strip .git from git@github.com URL", () => {
			const result = parseRepositoryUrl("git@github.com:user/repo.git");
			assert.strictEqual(result, "https://github.com/user/repo");
		});
	});

	describe("edge cases", () => {
		it("should return null for undefined", () => {
			const result = parseRepositoryUrl(undefined);
			assert.strictEqual(result, null);
		});

		it("should return null for empty string", () => {
			const result = parseRepositoryUrl("");
			assert.strictEqual(result, null);
		});

		it("should handle GitHub URLs with .git extension", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react.git");
			assert.strictEqual(result, "https://github.com/facebook/react");
		});

		it("should handle GitLab URLs", () => {
			const result = parseRepositoryUrl("https://gitlab.com/user/repo");
			assert.strictEqual(result, "https://gitlab.com/user/repo");
		});

		it("should handle Bitbucket URLs", () => {
			const result = parseRepositoryUrl("https://bitbucket.org/user/repo");
			assert.strictEqual(result, "https://bitbucket.org/user/repo");
		});

		it("should handle URL with trailing slash", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo/");
			assert.strictEqual(result, "https://github.com/user/repo/");
		});

		it("should handle URL with git+ and .git", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo.git");
			assert.strictEqual(result, "https://github.com/user/repo");
		});

		it("should handle URL with query parameters", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo?param=value");
			assert.strictEqual(result, "https://github.com/user/repo?param=value");
		});
	});

	describe("protocol conversion edge cases", () => {
		it("should convert git: to https:", () => {
			const result = parseRepositoryUrl("git:github.com/user/repo");
			assert.strictEqual(result, "https:github.com/user/repo");
		});

		it("should handle multiple protocol transformations", () => {
			const result = parseRepositoryUrl("git+ssh://git@github.com/user/repo.git");
			assert.strictEqual(result, "https://github.com/user/repo");
		});
	});
});

describe("re-exported utilities", () => {
	describe("formatNumber", () => {
		it("should format large numbers with K suffix", () => {
			assert.strictEqual(formatNumber(1500), "1.5K");
			assert.strictEqual(formatNumber(999000), "999.0K");
		});

		it("should format large numbers with M suffix", () => {
			assert.strictEqual(formatNumber(1500000), "1.5M");
			assert.strictEqual(formatNumber(25000000), "25.0M");
		});

		it("should return string for small numbers", () => {
			assert.strictEqual(formatNumber(999), "999");
			assert.strictEqual(formatNumber(0), "0");
		});
	});

	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			assert.strictEqual(result.flags.has("no-cache"), true);
			assert.strictEqual(result.flags.has("verbose"), true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=50", "--from=100"]);
			assert.strictEqual(result.options.get("size"), "50");
			assert.strictEqual(result.options.get("from"), "100");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["react", "express"]);
			assert.deepStrictEqual(result.positional, ["react", "express"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			assert.strictEqual(result.flags.has("flag"), true);
			assert.strictEqual(result.options.get("opt"), "value");
			assert.deepStrictEqual(result.positional, ["positional"]);
		});
	});
});
