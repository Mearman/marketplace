/**
 * Tests for wayback submit.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import * as assert from "node:assert";
import { main, handleError } from "./submit.js";
import { parseArgs } from "./utils.js";
import { callsToArray } from "./test-helpers.js";

// Mock fetch
let mockGlobalFetch: any;

describe("submit.ts", () => {
	let mockConsole: any;
	let mockProcess: any;
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
			stdout: {
				write: mock.fn(),
			},
		};

		// Mock global fetch
		mockGlobalFetch = mock.fn();
		globalThis.fetch = mockGlobalFetch;

		deps = {
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful submission", () => {
			it("should submit URL successfully", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
						original_url: "https://example.com",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["https://example.com"]);

				await main(args, deps);

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => call[0] === "Submitting: https://example.com"));
				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("Job ID: job123")));
				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("✓ Archived")));
			});

			it("should use authenticated API with --key flag", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["--key=access:secret", "https://example.com"]);

				await main(args, deps);

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => call[0] === "  Using authenticated SPN2 API"));
			});

			it("should use --no-raw flag", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["--no-raw", "https://example.com"]);

				await main(args, deps);

				// Should not contain "id_/" modifier in URL
				const logCalls = callsToArray(mockConsole.log).map((c: any[]) => c[0]).join(" ");
				assert.ok(!logCalls.includes("id_/"));
			});

			it("should include capture-outlinks in form data", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["--capture-outlinks", "https://example.com"]);

				await main(args, deps);

				const fetchCall = callsToArray(mockGlobalFetch)[0];
				const body = fetchCall[1]?.body;
				assert.ok(body && typeof body === "string" && body.includes("capture_outlinks=1"));
			});

			it("should include capture-screenshot in form data", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
						screenshot: "https://example.com/screenshot.png",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["--capture-screenshot", "https://example.com"]);

				await main(args, deps);

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("Screenshot:")));
			});

			it("should include skip-if-recent in form data", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "success",
						timestamp: "20240101120000",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["--skip-if-recent=30d", "https://example.com"]);

				await main(args, deps);

				const fetchCall = callsToArray(mockGlobalFetch)[0];
				const body = fetchCall[1]?.body;
				assert.ok(body && typeof body === "string" && body.includes("if_not_archived_within=30d"));
			});

			// @ts-expect-error - Type assertion issue with TestOptions
			it("should handle job that completes with error status", async () => {
				mockGlobalFetch = mock.fn(async () => ({
					ok: true,
					json: async () => ({
						job_id: "job123",
						status: "error",
						status_ext: "Blocked by robots.txt",
					}),
				}));
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ Failed to archive")));
				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("Blocked by robots.txt")));
			}, { timeout: 10000 });

			it("should handle unexpected API response", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						unknown_field: "unexpected",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ Unexpected response")));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no URL provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("Usage:")));
				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("npx tsx submit.ts <url>")));
			});
		});

		describe("error handling", () => {
			it("should handle API errors", async () => {
				const mockResponse = {
					ok: true,
					json: async () => ({
						message: "Invalid URL",
					}),
				};
				mockGlobalFetch = mock.fn(async () => mockResponse);
				globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(callsToArray(mockConsole.log).some((call: any[]) => typeof call[0] === "string" && call[0].includes("✗ Failed to archive")));
			});

			it("should handle network errors", async () => {
				mockGlobalFetch = mock.fn(async () => { throw new Error("Network error"); });
			globalThis.fetch = mockGlobalFetch;

				const args = parseArgs(["https://example.com"]);

				await assert.rejects(() => main(args, deps), { message: "process.exit called" });

				assert.ok(callsToArray(mockConsole.error).some((call: any[]) => call[0] === "\nError:" && call[1] === "Network error"));
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("Submission failed");
			assert.throws(() => handleError(error, "https://example.com", deps), { message: "process.exit called" });

			assert.ok(callsToArray(mockConsole.error).some((call: any[]) => call[0] === "\nError:" && call[1] === "Submission failed"));
			assert.strictEqual(callsToArray(mockProcess.exit)[0]?.[0], 1);
		});

		it("should ignore url parameter", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-url", deps), { message: "process.exit called" });

			assert.ok(callsToArray(mockConsole.error).some((call: any[]) => call[0] === "\nError:" && call[1] === "Test error"));
		});
	});
});
