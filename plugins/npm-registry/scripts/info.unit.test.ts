/**
 * Tests for npm-registry info.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./info";
import type { NpmPackage } from "./utils";
import { parseArgs } from "./utils";

describe("info.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
		};

		// Mock process
		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock dependencies
		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		const mockPackageData: NpmPackage = {
			id: "react",
			name: "react",
			description: "A JavaScript library for building user interfaces",
			version: "18.2.0",
			"dist-tags": { latest: "18.2.0", next: "18.3.0" },
			versions: {
				"18.2.0": { dependencies: { loose: "1.0.0" } } as any,
				"18.1.0": {} as any,
			},
			license: "MIT",
			homepage: "https://reactjs.org",
			repository: { type: "git", url: "git+https://github.com/facebook/react.git" },
			bugs: { url: "https://github.com/facebook/react/issues" },
			author: { name: "Facebook" },
			keywords: ["react", "framework", "ui", "frontend", "javascript"],
			maintainers: [
				{ name: "User 1", email: "user1@example.com" },
				{ name: "User 2", email: "user2@example.com" },
			],
			time: {
				created: "2013-05-24T15:19:19Z",
				modified: "2023-01-01T00:00:00Z",
				"18.2.0": "2023-01-01T00:00:00Z",
				"18.1.0": "2022-12-01T00:00:00Z",
			},
		} as NpmPackage;

		it("should display package info", async () => {
			mockFetchWithCache.mockResolvedValue(mockPackageData);
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: react");
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("react"));
		});

		it("should display scoped package info", async () => {
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, name: "@babel/core" });
			const args = parseArgs(["@babel/core"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith("Fetching: @babel/core");
		});

		it("should pass --no-cache flag to fetchWithCache", async () => {
			mockFetchWithCache.mockResolvedValue(mockPackageData);
			const args = parseArgs(["--no-cache", "react"]);

			await main(args, deps);

			expect(mockFetchWithCache).toHaveBeenCalledWith(
				expect.objectContaining({
					bypassCache: true,
				})
			);
		});

		it("should handle package with no description", async () => {
			const noDesc = { ...mockPackageData, description: undefined };
			mockFetchWithCache.mockResolvedValue(noDesc);
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("react"));
		});

		it("should handle package with no license", async () => {
			const noLicense = { ...mockPackageData, license: undefined };
			mockFetchWithCache.mockResolvedValue(noLicense);
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Latest:"));
		});

		it("should handle package with no keywords", async () => {
			const noKeywords = { ...mockPackageData, keywords: undefined };
			mockFetchWithCache.mockResolvedValue(noKeywords);
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("react"));
		});

		it("should handle package with >10 keywords", async () => {
			const manyKeywords = [
				"kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8", "kw9", "kw10", "kw11", "kw12"
			];
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, keywords: manyKeywords });
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Keywords:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(and 2 more)"));
		});

		it("should handle package with >5 maintainers", async () => {
			const manyMaintainers = Array(7).fill({ name: "User", email: "user@example.com" });
			mockFetchWithCache.mockResolvedValue({ ...mockPackageData, maintainers: manyMaintainers });
			const args = parseArgs(["react"]);

			await main(args, deps);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Maintainers:"));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("(and 2 more)"));
		});

		it("should show usage and exit when no package provided", async () => {
			const args = parseArgs([]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle fetchWithCache rejection", async () => {
			mockFetchWithCache.mockRejectedValue(new Error("Resource not found"));
			const args = parseArgs(["react"]);

			await expect(main(args, deps)).rejects.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("Package \"react\" not found");
		});
	});

	describe("handleError", () => {
		it("should log not found message for 404 error", () => {
			const error = new Error("Resource not found");
			expect(() => handleError(error, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("Package \"react\" not found");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log generic error message for other errors", () => {
			const error = new Error("Network error");
			expect(() => handleError(error, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
