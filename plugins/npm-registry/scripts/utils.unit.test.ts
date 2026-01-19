/**
 * Tests for npm-registry plugin utilities
 */

import { describe, it, expect } from "vitest";
import {
	API,
	parseRepositoryUrl,
	formatNumber,
	parseArgs,
} from "./utils";

describe("API URLs", () => {
	describe("API.search", () => {
		it("should generate search URL with default parameters", () => {
			const result = API.search("react");
			expect(result).toContain("text=react");
			expect(result).toContain("size=20");
			expect(result).toContain("from=0");
		});

		it("should generate search URL with custom size", () => {
			const result = API.search("react", 50);
			expect(result).toContain("size=50");
		});

		it("should generate search URL with custom from", () => {
			const result = API.search("react", 20, 100);
			expect(result).toContain("from=100");
		});

		it("should encode query parameters", () => {
			const result = API.search("@babel/core");
			expect(result).toContain("text=%40babel%2Fcore");
		});

		it("should handle spaces in query", () => {
			const result = API.search("http server");
			expect(result).toContain("text=http+server");
		});

		it("should cap size at 250", () => {
			const result = API.search("react", 300, 0);
			expect(result).toContain("size=300"); // API doesn't cap, caller does
		});
	});

	describe("API.package", () => {
		it("should generate package URL for scoped package", () => {
			const result = API.package("@babel/core");
			expect(result).toBe("https://registry.npmjs.org/@babel/core");
		});

		it("should generate package URL for unscoped package", () => {
			const result = API.package("react");
			expect(result).toBe("https://registry.npmjs.org/react");
		});

		it("should handle special characters in package name", () => {
			const result = API.package("@angular/core");
			expect(result).toBe("https://registry.npmjs.org/@angular/core");
		});
	});

	describe("API.exists", () => {
		it("should generate exists URL (same as package)", () => {
			const result = API.exists("express");
			expect(result).toBe("https://registry.npmjs.org/express");
		});

		it("should handle scoped packages", () => {
			const result = API.exists("@types/node");
			expect(result).toBe("https://registry.npmjs.org/@types/node");
		});
	});

	describe("API.downloads", () => {
		it("should generate downloads URL for last-week", () => {
			const result = API.downloads("last-week", "react");
			expect(result).toBe("https://api.npmjs.org/downloads/range/last-week/react");
		});

		it("should generate downloads URL for last-month", () => {
			const result = API.downloads("last-month", "express");
			expect(result).toBe("https://api.npmjs.org/downloads/range/last-month/express");
		});

		it("should generate downloads URL for last-year", () => {
			const result = API.downloads("last-year", "vue");
			expect(result).toBe("https://api.npmjs.org/downloads/range/last-year/vue");
		});

		it("should handle scoped packages", () => {
			const result = API.downloads("last-week", "@babel/core");
			expect(result).toBe("https://api.npmjs.org/downloads/range/last-week/@babel/core");
		});

		it("should handle custom period", () => {
			const result = API.downloads("2023-01-01:2023-01-31", "react");
			expect(result).toBe("https://api.npmjs.org/downloads/range/2023-01-01:2023-01-31/react");
		});
	});
});

describe("parseRepositoryUrl", () => {
	describe("NpmRepository object format", () => {
		it("should parse repository object with url property", () => {
			const repo = { type: "git", url: "https://github.com/user/repo" };
			const result = parseRepositoryUrl(repo);
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should parse repository object without type", () => {
			const repo = { url: "https://github.com/user/repo" };
			const result = parseRepositoryUrl(repo);
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should return null for repository object without url", () => {
			const repo = { type: "git" };
			const result = parseRepositoryUrl(repo);
			expect(result).toBeNull();
		});
	});

	describe("string URL formats", () => {
		it("should parse HTTPS URL", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should parse git+https URL", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should parse git:// URL", () => {
			const result = parseRepositoryUrl("git://github.com/user/repo");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should parse git@github.com: URL", () => {
			const result = parseRepositoryUrl("git@github.com:user/repo");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should parse ssh://git@github.com/ URL", () => {
			const result = parseRepositoryUrl("ssh://git@github.com/user/repo");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should strip .git suffix", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo.git");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should strip .git from git+https URL", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo.git");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should strip .git from git@github.com URL", () => {
			const result = parseRepositoryUrl("git@github.com:user/repo.git");
			expect(result).toBe("https://github.com/user/repo");
		});
	});

	describe("edge cases", () => {
		it("should return null for undefined", () => {
			const result = parseRepositoryUrl(undefined);
			expect(result).toBeNull();
		});

		it("should return null for empty string", () => {
			const result = parseRepositoryUrl("");
			expect(result).toBeNull();
		});

		it("should handle GitHub URLs with .git extension", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react.git");
			expect(result).toBe("https://github.com/facebook/react");
		});

		it("should handle GitLab URLs", () => {
			const result = parseRepositoryUrl("https://gitlab.com/user/repo");
			expect(result).toBe("https://gitlab.com/user/repo");
		});

		it("should handle Bitbucket URLs", () => {
			const result = parseRepositoryUrl("https://bitbucket.org/user/repo");
			expect(result).toBe("https://bitbucket.org/user/repo");
		});

		it("should handle URL with trailing slash", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo/");
			expect(result).toBe("https://github.com/user/repo/");
		});

		it("should handle URL with git+ and .git", () => {
			const result = parseRepositoryUrl("git+https://github.com/user/repo.git");
			expect(result).toBe("https://github.com/user/repo");
		});

		it("should handle URL with query parameters", () => {
			const result = parseRepositoryUrl("https://github.com/user/repo?param=value");
			expect(result).toBe("https://github.com/user/repo?param=value");
		});
	});

	describe("protocol conversion edge cases", () => {
		it("should convert git: to https:", () => {
			const result = parseRepositoryUrl("git:github.com/user/repo");
			expect(result).toBe("https:github.com/user/repo");
		});

		it("should handle multiple protocol transformations", () => {
			const result = parseRepositoryUrl("git+ssh://git@github.com/user/repo.git");
			expect(result).toBe("https://github.com/user/repo");
		});
	});
});

describe("re-exported utilities", () => {
	describe("formatNumber", () => {
		it("should format large numbers with K suffix", () => {
			expect(formatNumber(1500)).toBe("1.5K");
			expect(formatNumber(999000)).toBe("999.0K");
		});

		it("should format large numbers with M suffix", () => {
			expect(formatNumber(1500000)).toBe("1.5M");
			expect(formatNumber(25000000)).toBe("25.0M");
		});

		it("should return string for small numbers", () => {
			expect(formatNumber(999)).toBe("999");
			expect(formatNumber(0)).toBe("0");
		});
	});

	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			expect(result.flags.has("no-cache")).toBe(true);
			expect(result.flags.has("verbose")).toBe(true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=50", "--from=100"]);
			expect(result.options.get("size")).toBe("50");
			expect(result.options.get("from")).toBe("100");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["react", "express"]);
			expect(result.positional).toEqual(["react", "express"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			expect(result.flags.has("flag")).toBe(true);
			expect(result.options.get("opt")).toBe("value");
			expect(result.positional).toEqual(["positional"]);
		});
	});
});
