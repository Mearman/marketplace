/**
 * Tests for pypi-json info.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./info";
import { parseArgs } from "./utils";

describe("info.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful info display", () => {
			it("should display package info", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Fetching: requests");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("requests"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Latest Version: 2.31.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("License: Apache 2.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Author: Kenneth Reitz"));
			});

			it("should display summary", async () => {
				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
						summary: "Python HTTP for Humans.",
					},
					releases: {},
					urls: [],
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Summary:"));
				expect(mockConsole.log).toHaveBeenCalledWith("Python HTTP for Humans.");
			});

			it("should display description", async () => {
				const longDescription = "Requests is an elegant and simple HTTP library for Python, built for human beings. "
					.repeat(5); // Make it longer than 200 chars

				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
						description: `Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n${longDescription}`,
					},
					releases: {},
					urls: [],
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Description:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("..."));
			});

			it("should display project URLs", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Project URLs:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Homepage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Source:"));
			});

			it("should display keywords", async () => {
				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
						keywords: "http, requests, urllib",
					},
					releases: {},
					urls: [],
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Keywords: http, requests, urllib"));
			});

			it("should display classifiers", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Classifiers:"));
			});

			it("should display files with --files flag", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Latest Release Files"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("requests-2.31.0-py3-none-any.whl"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("requests-2.31.0.tar.gz"));
			});

			it("should display yanked files", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("YANKED"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Security issue"));
			});

			it("should display releases with --releases flag", async () => {
				mockFetchWithCache.mockResolvedValue({
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
				});

				const args = parseArgs(["--releases", "requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Release History"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("2.31.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("2.30.0"));
			});

			it("should bypass cache with --no-cache flag", async () => {
				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls: [],
				});

				const args = parseArgs(["--no-cache", "requests"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should show truncation for many files", async () => {
				const urls = Array.from({ length: 15 }, (_, i) => ({
					filename: `file-${i}.whl`,
					url: `https://example.com/file-${i}.whl`,
					hashes: { sha256: `hash-${i}` },
					size: 1000,
					yanked: false,
				}));

				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases: {},
					urls,
				});

				const args = parseArgs(["--files", "requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("... and 5 more files"));
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

				mockFetchWithCache.mockResolvedValue({
					info: {
						name: "requests",
						version: "2.31.0",
					},
					releases,
					urls: [],
				});

				const args = parseArgs(["--releases", "requests"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("... and 5 more releases"));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx info.ts <package-name>"));
			});
		});

		describe("error handling", () => {
			it("should handle 404 errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("404 Not Found"));

				const args = parseArgs(["nonexistent-package"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("not found on PyPI"));
			});

			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("ECONNREFUSED"));

				const args = parseArgs(["requests"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("ETIMEDOUT"));

				const args = parseArgs(["requests"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			});

			it("should handle ENOTFOUND errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("ENOTFOUND pypi.org"));

				const args = parseArgs(["requests"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			});

			it("should handle generic errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Unknown error"));

				const args = parseArgs(["requests"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Unknown error");
			});

			it("should handle non-Error errors", async () => {
				mockFetchWithCache.mockRejectedValue("string error");

				const args = parseArgs(["requests"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			});
		});
	});

	describe("handleError", () => {
		it("should handle 404 error", () => {
			const error = new Error("404 Not Found");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("not found on PyPI"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle ECONNREFUSED error", () => {
			const error = new Error("ECONNREFUSED");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle ETIMEDOUT error", () => {
			const error = new Error("ETIMEDOUT");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle timeout error", () => {
			const error = new Error("timeout");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle ENOTFOUND error", () => {
			const error = new Error("ENOTFOUND");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network error"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle generic Error instance", () => {
			const error = new Error("Generic error");

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Generic error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error error", () => {
			const error = "string error";

			expect(() => handleError(error, "requests", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should ignore packageName parameter for non-404 errors", () => {
			const error = new Error("Some other error");

			expect(() => handleError(error, "any-package-name", deps)).toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Some other error");
		});
	});
});
