/**
 * Tests for npms-io compare.ts script
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { main, handleError } from "./compare";
import { parseArgs, type NpmsMgetResponse } from "./utils";

describe("compare.ts", () => {
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

				expect(mockConsole.log).toHaveBeenCalledWith("Comparing: react vs vue");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Package Comparison: react vs vue"));
				expect(mockConsole.log).toHaveBeenCalledWith("-".repeat(60));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Highest overall score"));
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

				expect(mockConsole.log).toHaveBeenCalledWith("Comparing: react vs vue vs angular");
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Package Comparison: react vs vue vs angular"));

				// Verify table header contains all three packages
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const headerRow = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Metric"));
				expect(headerRow).toBeDefined();
				expect(headerRow).toContain("react");
				expect(headerRow).toContain("vue");
				expect(headerRow).toContain("angular");
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
				expect(recommendation).toBeDefined();
				expect(recommendation).toContain("pkg2");
				expect(recommendation).toContain("92/100");
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

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith("\nNo packages found or analyzed");
				expect(mockConsole.log).toHaveBeenCalledWith("\nNot found: nonexistent1, nonexistent2");
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
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
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Package Comparison: react vs vue"));

				// Should mention missing package
				const logCalls = mockConsole.log.mock.calls.map((call: any[]) => call[0]);
				const missingNotice = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Not found or not analyzed"));
				expect(missingNotice).toBeDefined();
				expect(missingNotice).toContain("nonexistent");
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
				expect(headerRow).toBeDefined();
				expect(headerRow).toContain("react");
				expect(headerRow).not.toContain("missing-pkg");

				// Should show missing notice
				const missingNotice = logCalls.find((call: string) => call && typeof call === "string" && call.includes("Not found or not analyzed"));
				expect(missingNotice).toBeDefined();
				expect(missingNotice).toContain("missing-pkg");
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
				expect(starsRow).toBeDefined();
				expect(starsRow).toContain("1.0K"); // react
				expect(starsRow).toContain("N/A"); // vue
				expect(forksRow).toBeDefined();
				expect(issuesRow).toBeDefined();
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
				expect(downloadsRow).toBeDefined();
				expect(downloadsRow).toContain("50.0K"); // react
				expect(downloadsRow).toContain("N/A"); // vue
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
				expect(starsRow).toBeDefined();
				expect(starsRow).toContain("1.0K"); // react has stars
				expect(starsRow).toContain("N/A"); // vue missing stars
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

				expect(headerRow).toBeDefined();
				expect(headerRow).toContain("Metric");
				expect(headerRow).toContain("react");
				expect(headerRow).toContain("vue");
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
				expect(separators.length).toBeGreaterThan(0);
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

				expect(headerRow).toBeDefined();
				// The max width should accommodate "very-long-package-name"
				expect(headerRow).toContain("very-long-package-name");
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

				expect(overallRow).toBeDefined();
				expect(qualityRow).toBeDefined();
				expect(popularityRow).toBeDefined();
				expect(maintenanceRow).toBeDefined();
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
				expect(versionRow).toBeDefined();
				expect(versionRow).toContain("18.2.0");
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

				expect(starsRow).toBeDefined();
				expect(forksRow).toBeDefined();
				expect(issuesRow).toBeDefined();

				// Check that numbers are formatted (with K/M suffixes)
				expect(starsRow).toContain("1.0K");
				expect(forksRow).toContain("200");
				expect(issuesRow).toContain("10");
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
				expect(downloadsRow).toBeDefined();
				expect(downloadsRow).toContain("50.0K");
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

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: false,
					})
				);
			});

			it("should bypass cache when --no-cache flag is provided", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["--no-cache", "react", "vue"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						bypassCache: true,
					})
				);
			});

			it("should use correct cache key based on package names", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						cacheKey: "compare-react-vue",
					})
				);
			});

			it("should use correct TTL (6 hours)", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						ttl: 21600, // 6 hours
					})
				);
			});

			it("should use POST method for fetch", async () => {
				const mockData: NpmsMgetResponse = {
					react: createMockPackage("react", 0.95, "18.2.0"),
					vue: createMockPackage("vue", 0.92, "3.3.0"),
				};
				mockFetchWithCache.mockResolvedValue(mockData);
				const args = parseArgs(["react", "vue"]);

				await main(args, deps);

				expect(mockFetchWithCache).toHaveBeenCalledWith(
					expect.objectContaining({
						fetchOptions: expect.objectContaining({
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(["react", "vue"]),
						}),
					})
				);
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when less than 2 packages provided", async () => {
				const args = parseArgs(["react"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("npx tsx compare.ts <package1> <package2>"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should show usage message when no packages provided", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				const logCalls = mockConsole.log.mock.calls;
				const usageOutput = logCalls.map((call: any[]) => call[0]).join("\n");

				expect(usageOutput).toContain("Examples:");
				expect(usageOutput).toContain("npx tsx compare.ts react vue angular");
				expect(usageOutput).toContain("npx tsx compare.ts axios got node-fetch");
				expect(usageOutput).toContain("npx tsx compare.ts express koa fastify hapi");
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

		describe("error handling", () => {
			it("should handle network errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Network error"));
				const args = parseArgs(["react", "vue"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Network error");
				expect(mockProcess.exit).toHaveBeenCalledWith(1);
			});

			it("should handle timeout errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Request timeout"));
				const args = parseArgs(["react", "vue"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Request timeout");
			});

			it("should handle 500 errors from API", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Internal Server Error: 500"));
				const args = parseArgs(["react", "vue"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Internal Server Error: 500");
			});

			it("should handle rate limiting errors", async () => {
				mockFetchWithCache.mockRejectedValue(new Error("Too Many Requests: 429"));
				const args = parseArgs(["react", "vue"]);

				await expect(main(args, deps)).rejects.toThrow("process.exit called");

				expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Too Many Requests: 429");
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Test error message");
			expect(() => handleError(error, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "Test error message");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should log non-Error errors as strings", () => {
			expect(() => handleError("string error", { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "string error");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle null errors", () => {
			expect(() => handleError(null, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "null");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle undefined errors", () => {
			expect(() => handleError(undefined, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "undefined");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle numeric errors", () => {
			expect(() => handleError(404, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "404");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should handle object errors without message property", () => {
			const error = { code: 500, status: "error" };
			expect(() => handleError(error, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			// String(error) converts objects to "[object Object]"
			expect(mockConsole.error).toHaveBeenCalledWith("Error:", "[object Object]");
			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});

		it("should always call process.exit with code 1", () => {
			const error = new Error("Any error");
			expect(() => handleError(error, { console: mockConsole, process: mockProcess }))
				.toThrow("process.exit called");

			expect(mockProcess.exit).toHaveBeenCalledWith(1);
		});
	});
});
