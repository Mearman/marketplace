/**
 * Tests for gravatar plugin utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
	md5,
	buildGravatarUrl,
	getGravatarProfileUrl,
	type GravatarUrlOptions,
	parseArgs,
} from "./utils.js";

describe("md5", () => {
	it("should hash email to lowercase MD5", () => {
		const result = md5("Test@example.com");
		const lowerResult = md5("test@example.com");
		assert.strictEqual(result, lowerResult);
	});

	it("should trim whitespace before hashing", () => {
		const trimmedResult = md5("test@example.com");
		const result = md5("  test@example.com  ");
		assert.strictEqual(result, trimmedResult);
	});

	it("should handle special characters in email", () => {
		const result = md5("user+tag@example.com");
		assert.strictEqual(result.length, 32);
		assert.match(result, /^[a-f0-9]{32}$/);
	});

	it("should handle numbers in email", () => {
		const result = md5("user123@example45.com");
		assert.strictEqual(result.length, 32);
		assert.match(result, /^[a-f0-9]{32}$/);
	});

	it("should handle hyphens in email", () => {
		const result = md5("user-name@example-domain.com");
		assert.strictEqual(result.length, 32);
		assert.match(result, /^[a-f0-9]{32}$/);
	});

	it("should handle dots in email", () => {
		const result = md5("first.last@example.com");
		assert.strictEqual(result.length, 32);
		assert.match(result, /^[a-f0-9]{32}$/);
	});

	it("should return consistent hash for same email", () => {
		const email = "test@example.com";
		const result1 = md5(email);
		const result2 = md5(email);
		assert.strictEqual(result1, result2);
	});

	it("should handle empty string", () => {
		const result = md5("");
		assert.strictEqual(result, "d41d8cd98f00b204e9800998ecf8427e");
	});
});

describe("buildGravatarUrl", () => {
	it("should build URL with hash only", () => {
		const result = buildGravatarUrl("test@example.com");
		assert.match(result, /^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}$/);
	});

	it("should include size parameter", () => {
		const options: GravatarUrlOptions = { size: 200 };
		const result = buildGravatarUrl("test@example.com", options);
		assert.match(result, /size=200/);
	});

	it("should include default parameter", () => {
		const options: GravatarUrlOptions = { default: "identicon" };
		const result = buildGravatarUrl("test@example.com", options);
		assert.match(result, /d=identicon/);
	});

	it("should include rating parameter", () => {
		const options: GravatarUrlOptions = { rating: "pg" };
		const result = buildGravatarUrl("test@example.com", options);
		assert.match(result, /r=pg/);
	});

	it("should include forceDefault parameter", () => {
		const options: GravatarUrlOptions = { forceDefault: true };
		const result = buildGravatarUrl("test@example.com", options);
		assert.match(result, /f=y/);
	});

	it("should include multiple parameters", () => {
		const options: GravatarUrlOptions = {
			size: 300,
			default: "monsterid",
			rating: "g",
		};
		const result = buildGravatarUrl("test@example.com", options);
		assert.match(result, /size=300/);
		assert.match(result, /d=monsterid/);
		assert.match(result, /r=g/);
	});

	it("should handle all default types", () => {
		const defaults: GravatarUrlOptions["default"][] = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank", "404"];

		defaults.forEach((def) => {
			const options: GravatarUrlOptions = { default: def };
			const result = buildGravatarUrl("test@example.com", options);
			assert.match(result, new RegExp(`d=${def}`));
		});
	});

	it("should handle all rating types", () => {
		const ratings: GravatarUrlOptions["rating"][] = ["g", "pg", "r", "x"];

		ratings.forEach((rating) => {
			const options: GravatarUrlOptions = { rating };
			const result = buildGravatarUrl("test@example.com", options);
			assert.match(result, new RegExp(`r=${rating}`));
		});
	});

	it("should lowercase email before hashing", () => {
		const result1 = buildGravatarUrl("TEST@EXAMPLE.COM");
		const result2 = buildGravatarUrl("test@example.com");
		assert.strictEqual(result1, result2);
	});

	it("should trim email before hashing", () => {
		const result1 = buildGravatarUrl("  test@example.com  ");
		const result2 = buildGravatarUrl("test@example.com");
		assert.strictEqual(result1, result2);
	});
});

describe("getGravatarProfileUrl", () => {
	it("should build profile URL with hash", () => {
		const result = getGravatarProfileUrl("test@example.com");
		assert.match(result, /^https:\/\/www\.gravatar\.com\/[a-f0-9]{32}$/);
	});

	it("should lowercase email before hashing", () => {
		const result1 = getGravatarProfileUrl("TEST@EXAMPLE.COM");
		const result2 = getGravatarProfileUrl("test@example.com");
		assert.strictEqual(result1, result2);
	});

	it("should trim email before hashing", () => {
		const result1 = getGravatarProfileUrl("  test@example.com  ");
		const result2 = getGravatarProfileUrl("test@example.com");
		assert.strictEqual(result1, result2);
	});

	it("should handle special characters in email", () => {
		const result = getGravatarProfileUrl("user+tag@example.com");
		assert.match(result, /^https:\/\/www\.gravatar\.com\/[a-f0-9]{32}$/);
	});

	it("should return consistent URL for same email", () => {
		const email = "test@example.com";
		const result1 = getGravatarProfileUrl(email);
		const result2 = getGravatarProfileUrl(email);
		assert.strictEqual(result1, result2);
	});
});

describe("re-exported utilities", () => {
	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			assert.strictEqual(result.flags.has("no-cache"), true);
			assert.strictEqual(result.flags.has("verbose"), true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=200", "--default=identicon"]);
			assert.strictEqual(result.options.get("size"), "200");
			assert.strictEqual(result.options.get("default"), "identicon");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["test@example.com", "user@example.com"]);
			assert.deepStrictEqual(result.positional, ["test@example.com", "user@example.com"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			assert.strictEqual(result.flags.has("flag"), true);
			assert.strictEqual(result.options.get("opt"), "value");
			assert.deepStrictEqual(result.positional, ["positional"]);
		});
	});
});
