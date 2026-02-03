/**
 * Tests for npms-io analyze.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import * as assert from "node:assert";
import { main, handleError } from "./analyze.js";
import { parseArgs, type NpmsPackage } from "./utils.js";

describe("analyze.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
	let mockFetchWithCache: any;
	let deps: any;

	beforeEach(() => {
		mock.reset();

		// Mock console
		mockConsole = {
			log: mock.fn(),
			error: mock.fn(),
			warn: mock.fn(),
			info: mock.fn(),
			debug: mock.fn(),
			trace: mock.fn(),
		};

		// Mock process
		mockProcess = {
			exit: mock.fn(() => {
				throw new Error("process.exit called");
			}),
		};

		// Mock fetchWithCache
		mockFetchWithCache = mock.fn();

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

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.includes("Analyzing: react"));
				assert.ok(logCalls.includes("react - Package Analysis"));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Quality Scores:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Overall: 95/100")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Quality: 90/100")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Popularity: 98/100")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Maintenance: 97/100")));
			});

			it("should display package information section", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["express"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Package Information:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Version: 18.2.0")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Description:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Published:")));
			});

			it("should display npm statistics", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("npm Statistics:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Week:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("downloads")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Month:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Quarter:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Year:")));
			});

			it("should display GitHub activity", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("GitHub Activity:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Stars:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Forks:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Open Issues:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Contributors:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Latest Commit:")));
			});

			it("should display project health indicators", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["angular"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Project Health:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Participates in CoC")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Has contributing guide")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Has license")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Has security policy")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Has open discussions")));
			});

			it("should display recent releases", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["axios"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Recent Releases:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("18.2.0")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("18.1.0")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("18.0.0")));
			});

			it("should display links", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["typescript"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Links:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("npm:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Homepage:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Repository:")));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Bugs:")));
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
				assert.strictEqual(hasDescription, false);
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
				assert.strictEqual(hasNpmStats, false);
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
				assert.strictEqual(hasGitHubActivity, false);
				assert.strictEqual(hasProjectHealth, false);
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
				assert.strictEqual(hasLinks, false);
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
				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("GitHub Activity:")));

				// Verify it doesn't show undefined fields
				const fullLog = logCalls.join(" ");
				// Should not have "Stars:", "Forks:", etc. when they're undefined
				assert.ok(!fullLog.includes("Stars: undefined"));
				assert.ok(!fullLog.includes("Forks: undefined"));
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
				assert.strictEqual(hasRecentReleases, false);
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["react"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["--no-cache", "react"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, true);
			});

			it("should use correct cache key based on package name", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["@types/node"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.cacheKey, "analyze-@types/node");
			});

			it("should use correct TTL of 6 hours", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["express"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.ttl, 21600); // 6 hours
			});

			it("should use correct API URL", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["lodash"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.url, "https://api.npms.io/v2/package/lodash");
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no package name provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((c: any) => c[0]);
				const usageOutput = logCalls.join("\n");
				assert.ok(usageOutput.includes("Usage:"));
				assert.ok(usageOutput.includes("npx tsx analyze.ts <package-name>"));
				assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("Examples:"));
				assert.ok(usageOutput.includes("npx tsx analyze.ts react"));
				assert.ok(usageOutput.includes("npx tsx analyze.ts express"));
				assert.ok(usageOutput.includes("npx tsx analyze.ts @babel/core"));
			});

			it("should include --no-cache option in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("--no-cache"));
				assert.ok(usageOutput.includes("Bypass cache and fetch fresh data"));
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
				assert.ok(descriptionCall);
				const descText = descriptionCall[0];
				assert.ok(descText.length <= 80 + 30); // 80 char + "  Description: " + "..."
				assert.ok(descText.includes("..."));
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
				const logCalls: string[] = mockConsole.log.mock.calls.map((call: any[]) => String(call[0] || ""));
				const recentReleasesIndex = logCalls.findIndex((call: string) => call.includes("Recent Releases:"));

				// Count lines that look like version releases (contain " - " and start with spaces)
				// after the "Recent Releases:" header
				const releaseLines = logCalls.slice(recentReleasesIndex + 1).filter((call: string) =>
					call.match(/^\s+\d+\.\d+\.\d+.*\s+-\s+/) // Matches "  1.0.0 - Jan 1, 2023"
				);

				// Should show max 5 releases
				assert.ok(releaseLines.length <= 5);
			});

			it("should include blank lines for proper formatting", async () => {
				const mockPackage = createMockPackage();
				mockFetchWithCache.mockResolvedValue(mockPackage);
				const args = parseArgs(["test-formatting"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				assert.deepStrictEqual(logCalls[0], ["Analyzing: test-formatting"]);
				// Should have blank lines between sections
				assert.ok(logCalls.some((call: any[]) => call.length === 0));
			});
		});
	});

	describe("handleError", () => {
		it("should log friendly message for 'Resource not found' error", () => {
			const error = new Error("Resource not found");
			assert.throws(() => handleError(error, "my-package", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.log.mock.calls[mockConsole.log.mock.calls.length - 1], "Package \"my-package\" not found or analysis not available");
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should log error message for generic errors", () => {
			const error = new Error("Network timeout");
			assert.throws(() => handleError(error, "react", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Network timeout"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle string errors", () => {
			assert.throws(() => handleError("string error", "express", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "string error"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "lodash", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "null"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "axios", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "undefined"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle numeric errors", () => {
			assert.throws(() => handleError(500, "vue", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "500"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle object errors without message property", () => {
			const error = { code: "ERR_CODE", status: 500 };
			assert.throws(() => handleError(error, "angular", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "[object Object]"]);
			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			assert.throws(() => handleError(error, "test", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should be case-sensitive for 'Resource not found' check", () => {
			const error = new Error("resource not found");
			assert.throws(() => handleError(error, "test", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			// Should go to error console, not friendly message
			assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "resource not found"]);
			assert.ok(!mockConsole.log.mock.calls.some((call: any[]) => call[0] && typeof call[0] === "string" && call[0].includes("not found or analysis not available")));
		});

		it("should match 'Resource not found' in longer error message", () => {
			const error = new Error("Error: Resource not found for package xyz");
			assert.throws(() => handleError(error, "xyz", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			// Should show friendly message because it contains "Resource not found"
			assert.ok(mockConsole.log.mock.calls.some((call: any[]) => call[0] && typeof call[0] === "string" && call[0].includes("not found or analysis not available")));
			assert.strictEqual(mockConsole.error.mock.calls.length, 0);
		});
	});
});
