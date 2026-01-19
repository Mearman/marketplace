/**
 * Tests for gravatar plugin utilities
 */

import { describe, it, expect } from "vitest";
import {
	md5,
	buildGravatarUrl,
	getGravatarProfileUrl,
	type GravatarUrlOptions,
	parseArgs,
} from "./utils";

describe("md5", () => {
	it("should hash email to lowercase MD5", () => {
		const result = md5("Test@example.com");
		const lowerResult = md5("test@example.com");
		expect(result).toBe(lowerResult);
	});

	it("should trim whitespace before hashing", () => {
		const trimmedResult = md5("test@example.com");
		const result = md5("  test@example.com  ");
		expect(result).toBe(trimmedResult);
	});

	it("should handle special characters in email", () => {
		const result = md5("user+tag@example.com");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle numbers in email", () => {
		const result = md5("user123@example45.com");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle hyphens in email", () => {
		const result = md5("user-name@example-domain.com");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle dots in email", () => {
		const result = md5("first.last@example.com");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should return consistent hash for same email", () => {
		const email = "test@example.com";
		const result1 = md5(email);
		const result2 = md5(email);
		expect(result1).toBe(result2);
	});

	it("should handle empty string", () => {
		const result = md5("");
		expect(result).toBe("d41d8cd98f00b204e9800998ecf8427e");
	});
});

describe("buildGravatarUrl", () => {
	it("should build URL with hash only", () => {
		const result = buildGravatarUrl("test@example.com");
		expect(result).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}$/);
	});

	it("should include size parameter", () => {
		const options: GravatarUrlOptions = { size: 200 };
		const result = buildGravatarUrl("test@example.com", options);
		expect(result).toContain("size=200");
	});

	it("should include default parameter", () => {
		const options: GravatarUrlOptions = { default: "identicon" };
		const result = buildGravatarUrl("test@example.com", options);
		expect(result).toContain("d=identicon");
	});

	it("should include rating parameter", () => {
		const options: GravatarUrlOptions = { rating: "pg" };
		const result = buildGravatarUrl("test@example.com", options);
		expect(result).toContain("r=pg");
	});

	it("should include forceDefault parameter", () => {
		const options: GravatarUrlOptions = { forceDefault: true };
		const result = buildGravatarUrl("test@example.com", options);
		expect(result).toContain("f=y");
	});

	it("should include multiple parameters", () => {
		const options: GravatarUrlOptions = {
			size: 300,
			default: "monsterid",
			rating: "g",
		};
		const result = buildGravatarUrl("test@example.com", options);
		expect(result).toContain("size=300");
		expect(result).toContain("d=monsterid");
		expect(result).toContain("r=g");
	});

	it("should handle all default types", () => {
		const defaults: GravatarUrlOptions["default"][] = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank", "404"];

		defaults.forEach((def) => {
			const options: GravatarUrlOptions = { default: def };
			const result = buildGravatarUrl("test@example.com", options);
			expect(result).toContain(`d=${def}`);
		});
	});

	it("should handle all rating types", () => {
		const ratings: GravatarUrlOptions["rating"][] = ["g", "pg", "r", "x"];

		ratings.forEach((rating) => {
			const options: GravatarUrlOptions = { rating };
			const result = buildGravatarUrl("test@example.com", options);
			expect(result).toContain(`r=${rating}`);
		});
	});

	it("should lowercase email before hashing", () => {
		const result1 = buildGravatarUrl("TEST@EXAMPLE.COM");
		const result2 = buildGravatarUrl("test@example.com");
		expect(result1).toBe(result2);
	});

	it("should trim email before hashing", () => {
		const result1 = buildGravatarUrl("  test@example.com  ");
		const result2 = buildGravatarUrl("test@example.com");
		expect(result1).toBe(result2);
	});
});

describe("getGravatarProfileUrl", () => {
	it("should build profile URL with hash", () => {
		const result = getGravatarProfileUrl("test@example.com");
		expect(result).toMatch(/^https:\/\/www\.gravatar\.com\/[a-f0-9]{32}$/);
	});

	it("should lowercase email before hashing", () => {
		const result1 = getGravatarProfileUrl("TEST@EXAMPLE.COM");
		const result2 = getGravatarProfileUrl("test@example.com");
		expect(result1).toBe(result2);
	});

	it("should trim email before hashing", () => {
		const result1 = getGravatarProfileUrl("  test@example.com  ");
		const result2 = getGravatarProfileUrl("test@example.com");
		expect(result1).toBe(result2);
	});

	it("should handle special characters in email", () => {
		const result = getGravatarProfileUrl("user+tag@example.com");
		expect(result).toMatch(/^https:\/\/www\.gravatar\.com\/[a-f0-9]{32}$/);
	});

	it("should return consistent URL for same email", () => {
		const email = "test@example.com";
		const result1 = getGravatarProfileUrl(email);
		const result2 = getGravatarProfileUrl(email);
		expect(result1).toBe(result2);
	});
});

describe("re-exported utilities", () => {
	describe("parseArgs", () => {
		it("should parse flags", () => {
			const result = parseArgs(["--no-cache", "--verbose"]);
			expect(result.flags.has("no-cache")).toBe(true);
			expect(result.flags.has("verbose")).toBe(true);
		});

		it("should parse options", () => {
			const result = parseArgs(["--size=200", "--default=identicon"]);
			expect(result.options.get("size")).toBe("200");
			expect(result.options.get("default")).toBe("identicon");
		});

		it("should parse positional arguments", () => {
			const result = parseArgs(["test@example.com", "user@example.com"]);
			expect(result.positional).toEqual(["test@example.com", "user@example.com"]);
		});

		it("should parse mixed arguments", () => {
			const result = parseArgs(["--flag", "--opt=value", "positional"]);
			expect(result.flags.has("flag")).toBe(true);
			expect(result.options.get("opt")).toBe("value");
			expect(result.positional).toEqual(["positional"]);
		});
	});
});
