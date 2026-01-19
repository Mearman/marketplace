/**
 * Tests for npms-io analyze.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./analyze";
import { parseArgs, type NpmsPackage } from "./utils";

describe("analyze.ts", () => {
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
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
		};

		// Mock process
		mockProcess = {
			exit: vi.fn().mockImplementation(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = vi.fn();

		deps = {
			fetchWithCache: mockFetchWithCache,
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		const createMockPackage = (overrides: Partial<NpmsPackage> = {}): NpmsPackage => ({
			collected: {
				metadata: {
					name: "react",
					version: "18.2.0",
					description: "React is a JavaScript library for building user interfaces.",
					keywords: ["react", "ui", "framework"],
					date: "2023-01-15T10:30:00.000Z",
					links: {
						npm: "https://www.npmjs.com/package/react",
						homepage: "https://react.dev",
						repository: "https://github.com/facebook/react",
						bugs: "https://github.com/facebook/react/issues",
					},
				},
				npm: {
					downloads: [10000, 20000, 30000],
					downloadsAccumulated: [10000, 30000, 60000],
					weekDownloads: 1000000,
					monthDownloads: 4000000,
					quarterDownloads: 12000000,
					yearDownloads: 48000000,
				},
				github: {
					stars: 200000,
					forks: 45000,
					subscribers: 8000,
					issues: { open: 500, closed: 10000, total: 10500 },
					forksCount: 45000,
					forksOpen: 100,
					forksClosed: 44900,
					stargazers: 200000,
					subscribersCount: 8000,
					openIssues: 500,
					closedIssues: 10000,
					issueComments: 50000,
					contributors: 1500,
					commitCount: 18000,
					latestCommit: {
						sha: "abc123",
						date: "2023-01-14T15:20:00.000Z",
						message: "Fix bug in hooks",
						author: { name: "Developer", email: "dev@example.com" },
					},
					recentReleases: [
						{ version: "18.2.0", semver: "18.2.0", date: "2023-01-15T00:00:00.000Z", time: 1673740800000 },
						{ version: "18.1.0", semver: "18.1.0", date: "2022-12-10T00:00:00.000Z", time: 1670630400000 },
						{ version: "18.0.0", semver: "18.0.0", date: "2022-11-15T00:00:00.000Z", time: 1668470400000 },
					],
					firstRelease: { version: "0.0.1", semver: "0.0.1", date: "2013-05-24T00:00:00.000Z", time: 1369382400000 },
					latestRelease: { version: "18.2.0", semver: "18.2.0", date: "2023-01-15T00:00:00.000Z", time: 1673740800000 },
					participatesInCoc: true,
					hasCustomCodeOfConduct: false,
					hasOpenDiscussions: true,
					hasContributingGuide: true,
					hasLicense: true,
					hasSecurityPolicy: true,
					hasSecurityAudit: false,
				},
			},
			score: {
				final: 0.95,
				detail: {
					quality: 0.9,
					popularity: 0.98,
					maintenance: 0.97,
				},
			},
			analyzedAt: "2023-01-15T12:00:00.000Z",
			...overrides,
		});

		describe("successful analysis", () => {
			it("should display complete package analysis with all data", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith("Analyzing: react");
				expect(mockConsole.log).toHaveBeenCalledWith("react - Package Analysis");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Quality Scores:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Overall: 95/100"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Quality: 90/100"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Popularity: 98/100"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Maintenance: 97/100"));
			});

			it("should display package information section", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["express"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Package Information:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Version: 18.2.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Description:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Published:"));
			});

			it("should display npm statistics", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npm Statistics:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Week:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("downloads"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Month:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Quarter:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Year:"));
			});

			it("should display GitHub activity", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["vue"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("GitHub Activity:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Stars:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Forks:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Open Issues:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Contributors:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Latest Commit:"));
			});

			it("should display project health indicators", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["angular"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Project Health:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Participates in CoC"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Has contributing guide"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Has license"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Has security policy"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Has open discussions"));
			});

			it("should display recent releases", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["axios"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Recent Releases:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("18.2.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("18.1.0"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("18.0.0"));
			});

			it("should display links", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["typescript"]);

				await main(args, deps);

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Links:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npm:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Homepage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Repository:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Bugs:"));
			});
		});

		describe("missing optional data", () => {
			it("should handle package without description", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						metadata: {
							...createMockPackage().collected.metadata,
							description: "",
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["no-desc-pkg"]);

				await main(args, deps);

				// Should not display description line
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const hasDescription = logCalls.some((call: string) => call.includes("Description:"));
				expect(hasDescription).toBe(false);
			});

			it("should handle package without npm statistics", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						npm: {
							downloads: [],
							downloadsAccumulated: [],
							weekDownloads: 0,
							monthDownloads: 0,
							quarterDownloads: 0,
							yearDownloads: 0,
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["no-npm-pkg"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const hasNpmStats = logCalls.some((call: string) => call.includes("npm Statistics:"));
				expect(hasNpmStats).toBe(false);
			});

			it("should handle package without github data", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						github: undefined as any,
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["no-github-pkg"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const hasGitHubActivity = logCalls.some((call: string) => call.includes("GitHub Activity:"));
				const hasProjectHealth = logCalls.some((call: string) => call.includes("Project Health:"));
				expect(hasGitHubActivity).toBe(false);
				expect(hasProjectHealth).toBe(false);
			});

			it("should handle package without links", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						metadata: {
							...createMockPackage().collected.metadata,
							links: undefined,
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["no-links-pkg"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const hasLinks = logCalls.some((call: string) => call.includes("Links:"));
				expect(hasLinks).toBe(false);
			});

			it("should handle missing github optional fields", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						github: {
							...createMockPackage().collected.github,
							stars: undefined,
							forks: undefined,
							openIssues: undefined,
							contributors: undefined,
						} as any,
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["partial-github"]);

				await main(args, deps);

				// Should show GitHub Activity section but skip undefined fields
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("GitHub Activity:"));

				// Verify it doesn't show undefined fields
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call.join(" "));
				const fullLog = logCalls.join(" ");
				// Should not have "Stars:", "Forks:", etc. when they're undefined
				expect(fullLog).not.toContain("Stars: undefined");
				expect(fullLog).not.toContain("Forks: undefined");
			});

			it("should handle package with no recent releases", async () => {
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						github: {
							...createMockPackage().collected.github,
							recentReleases: [],
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["old-pkg"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const hasRecentReleases = logCalls.some((call: string) => call.includes("Recent Releases:"));
				expect(hasRecentReleases).toBe(false);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should use correct cache key based on package name", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "analyze-@types/node",
					})
				);
			});

			it("should use correct TTL of 6 hours", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["express"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						ttl: 21600, // 6 hours
					})
				);
			});

			it("should use correct API URL", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						url: "https://api.npms.io/v2/package/lodash",
					})
				);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx analyze.ts <package-name>"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("Examples:");
				expect(usageOutput).toContain("npx tsx analyze.ts react");
				expect(usageOutput).toContain("npx tsx analyze.ts express");
				expect(usageOutput).toContain("npx tsx analyze.ts @babel/core");
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("--no-cache");
				expect(usageOutput).toContain("Bypass cache and fetch fresh data");
			});
		});

		describe("output formatting", () => {
			it("should truncate long descriptions to 80 characters", async () => {
				const longDescription = "This is a very long description that exceeds the eighty character limit and should be truncated with an ellipsis at the end.";
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						metadata: {
							...createMockPackage().collected.metadata,
							description: longDescription,
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["long-desc-pkg"]);

				await main(args, deps);

				const descriptionCall = mockConsole.log.mock.calls.find((call: any[]) =>
					call[0]?.includes("Description:")
				);
				expect(descriptionCall).toBeDefined();
				const descText = descriptionCall[0];
				expect(descText.length).toBeLessThanOrEqual(80 + 30); // 80 char + "  Description: " + "..."
				expect(descText).toContain("...");
			});

			it("should limit recent releases to 5", async () => {
				const manyReleases = Array.from({ length: 10 }, (_, i) => ({
					version: `1.${i}.0`,
					semver: `1.${i}.0`,
					date: "2023-01-01T00:00:00.000Z",
					time: 1672531200000,
				}));
				const mockPackage = createMockPackage({
					collected: {
						...createMockPackage().collected,
						github: {
							...createMockPackage().collected.github,
							recentReleases: manyReleases,
						},
					},
				});
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["many-releases"]);

				await main(args, deps);

				// Find the "Recent Releases:" section and count version lines after it
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const recentReleasesIndex = logCalls.findIndex((call: string) => call.includes("Recent Releases:"));

				// Count lines that look like version releases (contain " - " and start with spaces)
				// after the "Recent Releases:" header
				const releaseLines = logCalls.slice(recentReleasesIndex + 1).filter((call: string) =>
					call.match(/^\s+\d+\.\d+\.\d+.*\s+-\s+/) // Matches "  1.0.0 - Jan 1, 2023"
				);

				// Should show max 5 releases
				expect(releaseLines.length).toBeLessThanOrEqual(5);
			});

			it("should include blank lines for proper formatting", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["test-formatting"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				expect(logCalls[0]).toEqual(["Analyzing: test-formatting"]);
				// Should have blank lines between sections
				expect(logCalls).toContainEqual([]);
			});
		});
	});

	describe("handleError", () => {
		it("should log friendly message for 'Resource not found' error", () => {
			const error = new Error("Resource not found");
			expect(() => handleError(error, "my-package", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.log).toHaveBeenCalledWith("Package \"my-package\" not found or analysis not available");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log error message for generic errors", () => {
			const error = new Error("Network timeout");
			expect(() => handleError(error, "react", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network timeout");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle string errors", () => {
			expect(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle numeric errors", () => {
			expect(() => handleError(500, "vue", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "500");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle object errors without message property", () => {
			const error = { code: "ERR_CODE", status: 500 };
			expect(() => handleError(error, "angular", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "[object Object]");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			expect(() => handleError(error, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should be case-sensitive for 'Resource not found' check", () => {
			const error = new Error("resource not found");
			expect(() => handleError(error, "test", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// Should go to error console, not friendly message
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "resource not found");
			expect(mockConsole.log).not.toHaveBeenCalledWith(expect.stringContaining("not found or analysis not available"));
		});

		it("should match 'Resource not found' in longer error message", () => {
			const error = new Error("Error: Resource not found for package xyz");
			expect(() => handleError(error, "xyz", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// Should show friendly message because it contains "Resource not found"
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("not found or analysis not available"));
			expect(mockConsole.error).not.toHaveBeenCalled();
		});
	});
});
