/**
 * Tests for pypi-json info.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./info.js";
import { parseArgs } from "./utils.js";

describe("info.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
		};

		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		mockFetchWithCache = mock.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful info display", () => {
			it("should display package info", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						license: "Apache 2.0",
						author: "Kenneth Reitz",
						summary: "Python HTTP for Humans.",
						description: "Requests is an elegant and simple HTTP library for Python.",
						requires_python: ">=3.7",
						keywords: "http",
						classifiers: ["Development Status :: 5 - Production/Stable"],
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.strictEqual(mockConsole.log.mock.calls[0].arguments[0], "Fetching: requests");
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("requests")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Latest Version: 2.31.0")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("License: Apache 2.0")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Author: Kenneth Reitz")));
			});

			it("should display summary", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						summary: "Python HTTP for Humans.",
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Summary:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => call.arguments[0] === "Python HTTP for Humans."));
			});

			it("should display description", async () => {
				const longDescription = "Requests is an elegant and simple HTTP library for Python, built for human beings. "
					.repeat(5); // Make it longer than 200 chars

				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						description: `Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n${longDescription}`,
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Description:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("...")));
			});

			it("should display project URLs", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						project_urls: {
							Homepage: "https://requests.readthedocs.io",
							Source: "https://github.com/psf/requests",
						},
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Project URLs:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Homepage:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Source:")));
			});

			it("should display keywords", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						keywords: "http, requests, urllib",
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Keywords: http, requests, urllib")));
			});

			it("should display classifiers", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
						classifiers: [
							"Development Status :: 5 - Production/Stable",
							"License :: OSI Approved :: Apache Software License",
							"Programming Language :: Python :: 3",
						],
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Classifiers:")));
			});

			it("should display files with --files flag", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls: [
						{
							filename: "requests-2.31.0-py3-none-any.whl",
							url: "https://files.pythonhosted.org/requests-2.31.0-py3-none-any.whl",
							hashes: { sha256: "abc123" },
							size: 62000,
							yanked: false,
						},
						{
							filename: "requests-2.31.0.tar.gz",
							url: "https://files.pythonhosted.org/requests-2.31.0.tar.gz",
							hashes: { sha256: "def456" },
							size: 115000,
							yanked: false,
						},
					],
				}));

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Latest Release Files")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("requests-2.31.0-py3-none-any.whl")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("requests-2.31.0.tar.gz")));
			});

			it("should display yanked files", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls: [
						{
							filename: "requests-2.31.0-py3-none-any.whl",
							url: "https://files.pythonhosted.org/requests-2.31.0-py3-none-any.whl",
							hashes: { sha256: "abc123" },
							size: 62000,
							yanked: true,
							yanked_reason: "Security issue",
						},
					],
				}));

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("YANKED")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Security issue")));
			});

			it("should display releases with --releases flag", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {
						"2.31.0": [
							{
								filename: "requests-2.31.0-py3-none-any.whl",
								url: "https://files.pythonhosted.org/requests-2.31.0-py3-none-any.whl",
								hashes: { sha256: "abc123" },
								size: 62000,
								yanked: false,
								upload_time_iso_8601: "2023-05-22T15:00:00Z",
							},
						],
						"2.30.0": [
							{
								filename: "requests-2.30.0.tar.gz",
								url: "https://files.pythonhosted.org/requests-2.30.0.tar.gz",
								hashes: { sha256: "def456" },
								size: 110000,
								yanked: false,
								upload_time_iso_8601: "2023-01-01T10:00:00Z",
							},
						],
					},
					urls: [],
				}));

				const args = parseArgs(["--releases", "requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Release History")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("2.31.0")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("2.30.0")));
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls: [],
				}));

				const args = parseArgs(["--no-cache", "requests"]);

				await main(args, deps);

				assert.strictEqual(mockFetchWithCache.mock.calls[0].arguments[0].bypassCache, true);
			});

			it("should show truncation for many files", async () => {
				const urls = Array.from({ length: 15 }, (_, i) => ({
					filename: `file-${i}.whl`,
					url: `https://example.com/file-${i}.whl`,
					hashes: { sha256: `hash-${i}` },
					size: 1000,
					yanked: false,
				}));

				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls,
				}));

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("... and 5 more files")));
			});

			it("should show truncation for many releases", async () => {
				const releases: Record<string, any[]> = {};
				for (let i = 0; i < 20; i++) {
					releases[`2.${i}.0`] = [
						{
							filename: `requests-2.${i}.0-py3-none-any.whl`,
							url: `https://example.com/requests-2.${i}.0-py3-none-any.whl`,
							hashes: { sha256: `hash-${i}` },
							size: 60000,
							yanked: false,
							upload_time_iso_8601: "2023-01-01T10:00:00Z",
						},
					];
				}

				mockFetchWithCache.mock.mockImplementation(async () => ({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases,
					urls: [],
				}));

				const args = parseArgs(["--releases", "requests"]);

				await main(args, deps);

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("... and 5 more releases")));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Usage:")));
				assert.ok(mockConsole.log.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("npx tsx info.ts <package-name>")));
			});
		});

		describe("error handling", () => {
			it("should handle 404 errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("404 Not Found"); });

				const args = parseArgs(["nonexistent-package"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("not found on PyPI")));
			});

			it("should handle network errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("ECONNREFUSED"); });

				const args = parseArgs(["requests"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("ETIMEDOUT"); });

				const args = parseArgs(["requests"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			});

			it("should handle ENOTFOUND errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("ENOTFOUND pypi.org"); });

				const args = parseArgs(["requests"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			});

			it("should handle generic errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("Unknown error"); });

				const args = parseArgs(["requests"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error:" && call.arguments[1] === "Unknown error"));
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mock.mockImplementation(async () => { throw new Error("string error"); });

				const args = parseArgs(["requests"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error:" && call.arguments[1] === "string error"));
			});
		});
	});

	describe("handleError", () => {
		it("should handle 404 error", () => {
			const error = new Error("404 Not Found");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("not found on PyPI")));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle ECONNREFUSED error", () => {
			const error = new Error("ECONNREFUSED");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle ETIMEDOUT error", () => {
			const error = new Error("ETIMEDOUT");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle timeout error", () => {
			const error = new Error("timeout");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle ENOTFOUND error", () => {
			const error = new Error("ENOTFOUND");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => typeof call.arguments[0] === "string" && call.arguments[0].includes("Network error")));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle generic Error instance", () => {
			const error = new Error("Generic error");

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error:" && call.arguments[1] === "Generic error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should handle non-Error error", () => {
			const error = "string error";

			assert.throws(() => handleError(error, "requests", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error:" && call.arguments[1] === "string error"));
			assert.strictEqual(mockProcess.exit.mock.calls[0].arguments[0], 1);
		});

		it("should ignore packageName parameter for non-404 errors", () => {
			const error = new Error("Some other error");

			assert.throws(() => handleError(error, "any-package-name", deps), { message: "process.exit called" });

			assert.ok(mockConsole.error.mock.calls.some((call: any) => call.arguments[0] === "Error:" && call.arguments[1] === "Some other error"));
		});
	});
});
