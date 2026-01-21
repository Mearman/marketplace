/**
 * Tests for npms-io compare.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./compare.js";
import { parseArgs, type NpmsMgetResponse } from "./utils.js";

describe("compare.ts", () => {
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
			exit: mock.fn().mockImplementation(() => {
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
		const createMockPackage = (name: string, score: number, version: string): NpmsMgetResponse[keyof NpmsMgetResponse] => ({
			collected: {
				metadata: {
					name,
					version,
					description: `Test package ${name}`,
					keywords: ["test"],
					date: "2024-01-15T00:00:00.000Z",
					links: {
						npm: `https://www.npmjs.com/package/${name}`,
						repository: `https://github.com/test/${name}`,
					},
					author: { name: "Test Author" },
				},
				npm: {
					downloads: [1000, 2000, 3000],
					downloadsAccumulated: [1000, 3000, 6000],
					weekDownloads: 1000,
					monthDownloads: 50000,
					quarterDownloads: 150000,
					yearDownloads: 600000,
				},
				github: {
					stars: 1000,
					forks: 200,
					subscribers: 50,
					issues: { open: 10, closed: 100, total: 110 },
					forksCount: 200,
					forksOpen: 5,
					forksClosed: 195,
					stargazers: 1000,
					subscribersCount: 50,
					openIssues: 10,
					closedIssues: 100,
					issueComments: 50,
					contributors: 20,
					commitCount: 500,
					latestCommit: {
						sha: "abc123",
						date: "2024-01-15T00:00:00.000Z",
						message: "Test commit",
						author: { name: "Test Author", email: "test@example.com" },
					},
					recentReleases: [],
					firstRelease: { version: "1.0.0", semver: "1.0.0", date: "2024-01-01T00:00:00.000Z", time: 1704067200000 },
					latestRelease: { version: version, semver: version, date: "2024-01-15T00:00:00.000Z", time: 1705276800000 },
					participatesInCoc: true,
					hasCustomCodeOfConduct: false,
					hasOpenDiscussions: false,
					hasContributingGuide: true,
					hasLicense: true,
					hasSecurityPolicy: true,
					hasSecurityAudit: false,
				},
			},
			score: {
				final: score,
				detail: {
					quality: 0.85,
					popularity: 0.90,
					maintenance: 0.95,
				},
			},
			analyzedAt: "2024-01-15T00:00:00.000Z",
		});

		describe("successful comparison scenarios", () => {
			it("should compare two packages successfully", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls;
				assert.strictEqual(logCalls[0][0], "Comparing: react vs vue");
				assert.ok(String(logCalls[1][0]).includes("Package Comparison: react vs vue"));
				assert.strictEqual(logCalls[2][0], "-".repeat(60));
				assert.ok(String(logCalls[3][0]).includes("Highest overall score"));
			});

			it("should compare three or more packages", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
					angular: createMockPackage("angular", 0.88, "16.0.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue", "angular"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				assert.ok(logCalls.includes("Comparing: react vs vue vs angular"));
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Package Comparison: react vs vue vs angular")));

				// Verify table header contains all three packages
				const headerRow = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Metric"));
				assert.ok(headerRow);
				assert.ok(headerRow.includes("react"));
				assert.ok(headerRow.includes("vue"));
				assert.ok(headerRow.includes("angular"));
			});

			it("should correctly identify the highest scoring package", async () => {
				const mockData: NpmsMgetResponse = {
					pkg1: createMockPackage("pkg1", 0.75, "1.0.0"),
					pkg2: createMockPackage("pkg2", 0.92, "2.0.0"),
					pkg3: createMockPackage("pkg3", 0.85, "3.0.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["pkg1", "pkg2", "pkg3"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const recommendation = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Highest overall score"));
				assert.ok(recommendation);
				assert.ok(recommendation.includes("pkg2"));
				assert.ok(recommendation.includes("92/100"));
			});
		});

		describe("package not found scenarios", () => {
			it("should handle all packages not found", async () => {
				const mockData: NpmsMgetResponse = {
					"nonexistent1": null,
					"nonexistent2": null,
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["nonexistent1", "nonexistent2"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				assert.strictEqual(logCalls[logCalls.length - 2][0], "\nNo packages found or analyzed");
				assert.strictEqual(logCalls[logCalls.length - 1][0], "\nNot found: nonexistent1, nonexistent2");
				assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should handle some packages not found (mixed available/missing)", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					"nonexistent": null,
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "nonexistent", "vue"]);

				await main(args, deps);

				// Should still show comparison for available packages
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				assert.ok(logCalls.some((call: string) => typeof call === "string" && call.includes("Package Comparison: react vs vue")));

				// Should mention missing package
				const missingNotice = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Not found or not analyzed"));
				assert.ok(missingNotice);
				assert.ok(missingNotice.includes("nonexistent"));
			});

			it("should show comparison table only for available packages when some are missing", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					"missing-pkg": null,
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "missing-pkg"]);

				await main(args, deps);

				// Table should only show react
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const headerRow = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Metric"));
				assert.ok(headerRow);
				assert.ok(headerRow.includes("react"));
				assert.ok(!headerRow.includes("missing-pkg"));

				// Should show missing notice
				const missingNotice = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Not found or not analyzed"));
				assert.ok(missingNotice);
				assert.ok(missingNotice.includes("missing-pkg"));
			});
		});

		describe("missing data scenarios", () => {
			it("should display N/A for packages without github data", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				// Remove github data from vue
				delete (mockData.vue!.collected as any).github;
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const starsRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Stars"));
				const forksRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Forks"));
				const issuesRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Issues"));

				// React should have numbers, vue should have N/A
				assert.ok(starsRow);
				assert.ok(starsRow.includes("1.0K")); // react
				assert.ok(starsRow.includes("N/A")); // vue
				assert.ok(forksRow);
				assert.ok(issuesRow);
			});

			it("should display N/A for packages without npm data", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				// Remove npm data from vue
				delete (mockData.vue!.collected as any).npm;
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const downloadsRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Downloads/Mo"));
				assert.ok(downloadsRow);
				assert.ok(downloadsRow.includes("50.0K")); // react
				assert.ok(downloadsRow.includes("N/A")); // vue
			});

			it("should display N/A when github field exists but specific properties are missing", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				// Partial github data (missing stars)
				(mockData.vue!.collected as any).github = {
					forks: 200,
					openIssues: 10,
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const starsRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Stars"));
				assert.ok(starsRow);
				assert.ok(starsRow.includes("1.0K")); // react has stars
				assert.ok(starsRow.includes("N/A")); // vue missing stars
			});
		});

		describe("table formatting", () => {
			it("should display table header with correct format", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const headerRow = logCalls.find((call: string) => call && call.includes && call.includes("Metric"));

				assert.ok(headerRow);
				assert.ok(headerRow.includes("Metric"));
				assert.ok(headerRow.includes("react"));
				assert.ok(headerRow.includes("vue"));
			});

			it("should display separator line between sections", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const separators = logCalls.filter((call: string) => call && call.startsWith && call.startsWith("─"));

				// Should have separator lines (one after header, one after scores)
				assert.ok(separators.length > 0);
			});

			it("should pad package names for alignment", async () => {
				const mockData: NpmsMgetResponse = {
					a: createMockPackage("a", 0.90, "1.0.0"),
					"very-long-package-name": createMockPackage("very-long-package-name", 0.85, "2.0.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["a", "very-long-package-name"]);

				await main(args, deps);

				// Verify that column width accommodates longest package name
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const headerRow = logCalls.find((call: string) => call && call.includes && call.includes("Metric"));

				assert.ok(headerRow);
				// The max width should accommodate "very-long-package-name"
				assert.ok(headerRow.includes("very-long-package-name"));
			});

			it("should display all score rows (Overall, Quality, Popularity, Maintenance)", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = { flags: new Set<string>(), positional: ["react", "vue"] };

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const overallRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Overall"));
				const qualityRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Quality"));
				const popularityRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Popularity"));
				const maintenanceRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Maintenance"));

				assert.ok(overallRow);
				assert.ok(qualityRow);
				assert.ok(popularityRow);
				assert.ok(maintenanceRow);
			});

			it("should display version row", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = { flags: new Set<string>(), positional: ["react", "vue"] };

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const versionRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Version"));
				assert.ok(versionRow);
				assert.ok(versionRow.includes("18.2.0"));
			});

			it("should display github stats rows (Stars, Forks, Issues)", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = { flags: new Set<string>(), positional: ["react", "vue"] };

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const starsRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Stars"));
				const forksRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Forks"));
				const issuesRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Issues"));

				assert.ok(starsRow);
				assert.ok(forksRow);
				assert.ok(issuesRow);

				// Check that numbers are formatted (with K/M suffixes)
				assert.ok(starsRow.includes("1.0K"));
				assert.ok(forksRow.includes("200"));
				assert.ok(issuesRow.includes("10"));
			});

			it("should display downloads row", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = { flags: new Set<string>(), positional: ["react", "vue"] };

				await main(args, deps);

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const downloadsRow = logCalls.find((call: string) => call && call.startsWith && call.startsWith("Downloads/Mo"));
				assert.ok(downloadsRow);
				assert.ok(downloadsRow.includes("50.0K"));
			});
		});

		describe("cache control", () => {
			it("should use cache by default", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, false);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["--no-cache", "react", "vue"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.bypassCache, true);
			});

			it("should use correct cache key based on package names", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.cacheKey, "compare-react-vue");
			});

			it("should use correct TTL (6 hours)", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.ttl, 21600); // 6 hours
			});

			it("should use POST method for fetch", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				const call = mockFetchWithCache.mock.calls[mockFetchWithCache.mock.calls.length - 1][0];
				assert.strictEqual(call.fetchOptions.method, "POST");
				assert.assert.deepStrictEqual(call.fetchOptions.headers, { "Content-Type": "application/json" });
				assert.strictEqual(call.fetchOptions.body, JSON.stringify(["react", "vue"]));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when less than 2 packages provided", async () => {
				const args = parseArgs(["react"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const usageOutput = logCalls.join("\n");
				assert.ok(usageOutput.includes("Usage:"));
				assert.ok(usageOutput.includes("npx tsx compare.ts <package1> <package2>"));
				assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should show usage message when no packages provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const usageOutput = logCalls.join("\n");
				assert.ok(usageOutput.includes("Usage:"));
				assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				assert.ok(usageOutput.includes("Examples:"));
				assert.ok(usageOutput.includes("npx tsx compare.ts react vue angular"));
				assert.ok(usageOutput.includes("npx tsx compare.ts axios got node-fetch"));
				assert.ok(usageOutput.includes("npx tsx compare.ts express koa fastify hapi"));
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

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react", "vue"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Network error"]);
				assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["react", "vue"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Request timeout"]);
			});

			it("should handle 500 errors from API", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Internal Server Error: 500"));
				const args = parseArgs(["react", "vue"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Internal Server Error: 500"]);
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Too Many Requests: 429"));
				const args = parseArgs(["react", "vue"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Too Many Requests: 429"]);
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			assert.throws(() => handleError(error, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "Test error message"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "string error"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "null"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "undefined"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle numeric errors", () => {
			assert.throws(() => handleError(404, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "404"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should handle object errors without message property", () => {
			const error = { code: 500, status: "error" };
			assert.throws(() => handleError(error, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			// String(error) converts objects to "[object Object]"
			assert.assert.deepStrictEqual(mockConsole.error.mock.calls[mockConsole.error.mock.calls.length - 1], ["Error:", "[object Object]"]);
			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			assert.throws(() => handleError(error, { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.assert.deepStrictEqual(mockProcess.exit.mock.calls[mockProcess.exit.mock.calls.length - 1], [1]);
		});
	});
});
