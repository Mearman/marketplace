/**
 * Tests for github-api plugin utilities
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
	API,
	parseRepositoryUrl,
	getAuthHeaders,
	getTokenFromEnv,
	formatDate,
	base64Decode,
	formatNumber,
	parseArgs,
} from "./utils";

describe("API URLs", () => {
	describe("API.repo", () => {
		it("should generate repo API URL", () => {
			const result = API.repo("facebook", "react");
			assert.strictEqual(result, "https://api.github.com/repos/facebook/react");
		});

		it("should handle special characters in owner/repo", () => {
			const result = API.repo("user-123", "repo_456");
			assert.strictEqual(result, "https://api.github.com/repos/user-123/repo_456");
		});
	});

	describe("API.readme", () => {
		it("should generate readme API URL", () => {
			const result = API.readme("vercel", "next.js");
			assert.strictEqual(result, "https://api.github.com/repos/vercel/next.js/readme");
		});

		it("should handle numeric owner names", () => {
			const result = API.readme("123456", "repo");
			assert.strictEqual(result, "https://api.github.com/repos/123456/repo/readme");
		});
	});

	describe("API.user", () => {
		it("should generate user API URL", () => {
			const result = API.user("torvalds");
			assert.strictEqual(result, "https://api.github.com/users/torvalds");
		});

		it("should handle usernames with hyphens", () => {
			const result = API.user("sindre-sorhus");
			assert.strictEqual(result, "https://api.github.com/users/sindre-sorhus");
		});
	});

	describe("API.rateLimit", () => {
		it("should return rate limit API URL", () => {
			const result = API.rateLimit();
			assert.strictEqual(result, "https://api.github.com/rate_limit");
		});

		it("should return same URL on multiple calls", () => {
			const result1 = API.rateLimit();
			const result2 = API.rateLimit();
			assert.strictEqual(result1, result2);
		});
	});
});

describe("parseRepositoryUrl", () => {
	describe("HTTPS URLs", () => {
		it("should parse https://github.com/owner/repo", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});

		it("should parse https URL with .git extension", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react.git");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react.git" });
		});

		it("should parse https URL with trailing slash", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react/");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});

		it("should parse git+https:// URL", () => {
			const result = parseRepositoryUrl("git+https://github.com/nodejs/node");
			assert.deepStrictEqual(result, { owner: "nodejs", repo: "node" });
		});
	});

	describe("SSH URLs", () => {
		it("should parse git@github.com:owner/repo", () => {
			const result = parseRepositoryUrl("git@github.com:facebook/react.git");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});

		it("should parse ssh://git@github.com/owner/repo", () => {
			const result = parseRepositoryUrl("ssh://git@github.com/vercel/next.js");
			assert.deepStrictEqual(result, { owner: "vercel", repo: "next.js" });
		});
	});

	describe("owner/repo format", () => {
		it("should parse owner/repo format", () => {
			const result = parseRepositoryUrl("facebook/react");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});

		it("should parse owner/repo with hyphens and dots", () => {
			const result = parseRepositoryUrl("user-name/repo-name");
			assert.deepStrictEqual(result, { owner: "user-name", repo: "repo-name" });
		});

		it("should parse single-word owner/repo", () => {
			const result = parseRepositoryUrl("a/b");
			assert.deepStrictEqual(result, { owner: "a", repo: "b" });
		});
	});

	describe("invalid URLs", () => {
		it("should return null for invalid URL", () => {
			const result = parseRepositoryUrl("not-a-valid-url");
			assert.strictEqual(result, null);
		});

		it("should return null for empty string", () => {
			const result = parseRepositoryUrl("");
			assert.strictEqual(result, null);
		});

		it("should return null for URL without repo", () => {
			const result = parseRepositoryUrl("https://github.com/facebook");
			assert.strictEqual(result, null);
		});

		it("should return null for URL with too many parts", () => {
			const result = parseRepositoryUrl("facebook/react/tree/main");
			assert.strictEqual(result, null);
		});

		it("should return null for non-github.com URL", () => {
			const result = parseRepositoryUrl("https://gitlab.com/user/repo");
			assert.strictEqual(result, null);
		});

		it("should return null for owner/repo/extra", () => {
			const result = parseRepositoryUrl("owner/repo/extra");
			assert.strictEqual(result, null);
		});
	});

	describe("edge cases", () => {
		it("should handle URL with query parameters", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react?query=value");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});

		it("should handle URL with fragment", () => {
			const result = parseRepositoryUrl("https://github.com/facebook/react#readme");
			assert.deepStrictEqual(result, { owner: "facebook", repo: "react" });
		});
	});
});

describe("getAuthHeaders", () => {
	it("should return headers without token", () => {
		const result = getAuthHeaders();
		assert.deepStrictEqual(result, {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
		});
		assert.strictEqual(result.hasOwnProperty("Authorization"), false);
	});

	it("should return headers with token", () => {
		const token = "ghp_test_token_12345";
		const result = getAuthHeaders(token);

		assert.deepStrictEqual(result, {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
			Authorization: `Bearer ${token}`,
		});
	});

	it("should handle empty string token", () => {
		const result = getAuthHeaders("");
		assert.deepStrictEqual(result, {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
		});
		assert.strictEqual(result.hasOwnProperty("Authorization"), false);
	});

	it("should handle undefined token", () => {
		const result = getAuthHeaders(undefined);
		assert.deepStrictEqual(result, {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "claude-code-github-api",
		});
		assert.strictEqual(result.hasOwnProperty("Authorization"), false);
	});
});

describe("getTokenFromEnv", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = process.env;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return token from GITHUB_TOKEN env var", () => {
		process.env.GITHUB_TOKEN = "ghp_env_token_67890";
		const result = getTokenFromEnv();
		assert.strictEqual(result, "ghp_env_token_67890");
	});

	it("should return undefined when GITHUB_TOKEN not set", () => {
		delete process.env.GITHUB_TOKEN;
		const result = getTokenFromEnv();
		assert.strictEqual(result, undefined);
	});

	it("should return empty string when GITHUB_TOKEN is empty", () => {
		process.env.GITHUB_TOKEN = "";
		const result = getTokenFromEnv();
		assert.strictEqual(result, "");
	});
});

describe("formatDate", () => {
	it("should format full ISO date string", () => {
		const result = formatDate("2023-01-15T10:30:00Z");
		assert.match(result, /Jan \d{1,2}, 2023/);
	});

	it("should format date with time", () => {
		const result = formatDate("2023-12-25T14:45:30Z");
		assert.match(result, /Dec \d{1,2}, 2023/);
	});

	it("should handle leap year dates", () => {
		const result = formatDate("2024-02-29T00:00:00Z");
		assert.match(result, /Feb \d{1,2}, 2024/);
	});

	it("should handle different locales gracefully", () => {
		// The function uses en-US locale, should be consistent
		const result1 = formatDate("2023-06-15T12:00:00Z");
		const result2 = formatDate("2023-06-15T12:00:00Z");
		assert.strictEqual(result1, result2);
	});
});

describe("base64Decode", () => {
	it("should decode base64 string", () => {
		const encoded = Buffer.from("Hello, World!").toString("base64");
		const result = base64Decode(encoded);
		assert.strictEqual(result, "Hello, World!");
	});

	it("should decode multiline base64 string", () => {
		const original = "Line 1\nLine 2\nLine 3";
		const encoded = Buffer.from(original).toString("base64");
		const result = base64Decode(encoded);
		assert.strictEqual(result, original);
	});

	it("should decode base64 with special characters", () => {
		const original = "Special chars: @#$%^&*()";
		const encoded = Buffer.from(original).toString("base64");
		const result = base64Decode(encoded);
		assert.strictEqual(result, original);
	});

	it("should decode emoji", () => {
		const original = "Hello 👋 World 🌍";
		const encoded = Buffer.from(original).toString("base64");
		const result = base64Decode(encoded);
		assert.strictEqual(result, original);
	});

	it("should decode empty string", () => {
		const result = base64Decode("");
		assert.strictEqual(result, "");
	});

	it("should handle unicode characters", () => {
		const original = "日本語 中文 한글";
		const encoded = Buffer.from(original).toString("base64");
		const result = base64Decode(encoded);
		assert.strictEqual(result, original);
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
			const result = parseArgs(["--token=abc123", "--output=json"]);
			assert.strictEqual(result.options.get("token"), "abc123");
			assert.strictEqual(result.options.get("output"), "json");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["pos1", "pos2"]);
			assert.deepStrictEqual(result.positional, ["pos1", "pos2"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			assert.strictEqual(result.flags.has("flag"), true);
			assert.strictEqual(result.options.get("opt"), "value");
			assert.deepStrictEqual(result.positional, ["positional"]);
		});
	});
});
