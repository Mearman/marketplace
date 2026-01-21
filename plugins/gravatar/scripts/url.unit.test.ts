/**
 * Tests for gravatar url.ts script
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { main, handleError } from "./url.js";
import { parseArgs } from "./utils.js";
import { callsToArray } from "./test-helpers.js";

describe("url.ts", () => {
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
		};

		deps = {
			console: mockConsole,
			process: mockProcess,
		};
	});

	describe("main", () => {
		describe("successful URL generation", () => {
			it("should generate URL with default size", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				assert.strictEqual(callsToArray(mockConsole.log)[0][0], "Email: user@example.com");
				assert.match(callsToArray(mockConsole.log)[1][0], /Hash:/);
				assert.match(callsToArray(mockConsole.log)[2][0], /URL: https:\/\/www\.gravatar\.com\/avatar\//);
			});

			it("should generate URL with custom size", async () => {
				const args = parseArgs(["user@example.com", "--size=200"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[2][0], /URL: https:\/\/www\.gravatar\.com\/avatar\//);
				assert.match(callsToArray(mockConsole.log)[3][0], /size=200px/);
			});

			it("should generate URL with default image type", async () => {
				const args = parseArgs(["user@example.com", "--default=identicon"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[2][0], /URL: https:\/\/www\.gravatar\.com\/avatar\//);
				assert.match(callsToArray(mockConsole.log)[3][0], /default=identicon/);
			});

			it("should generate URL with rating level", async () => {
				const args = parseArgs(["user@example.com", "--rating=pg"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[2][0], /URL: https:\/\/www\.gravatar\.com\/avatar\//);
				assert.match(callsToArray(mockConsole.log)[3][0], /rating=pg/);
			});

			it("should display hash", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[1][0], /Hash: b58996c504c5638798eb6b511e6f49af/);
			});
		});

		describe("option validation", () => {
			it("should validate size option (max 2048)", async () => {
				const args = parseArgs(["user@example.com", "--size=2048"]);

				await main(args, deps);

				assert.match(callsToArray(mockConsole.log)[3][0], /size=2048px/);
			});

			it("should reject size over 2048", async () => {
				const args = parseArgs(["user@example.com", "--size=2049"]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(!logCalls.includes("size=2049"));
			});

			it("should reject negative size", async () => {
				const args = parseArgs(["user@example.com", "--size=-100"]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(!logCalls.includes("size=-100"));
			});

			it("should validate default image types", async () => {
				const validDefaults = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash", "blank"];

				for (const defaultType of validDefaults) {
					mock.reset();

					mockConsole = { log: mock.fn(), error: mock.fn() };
					mockProcess = {
						exit: mock.fn(() => {
							throw new Error("process.exit called");
						}),
					};
					deps = {
						console: mockConsole,
						process: mockProcess,
					};

					const args = parseArgs(["user@example.com", `--default=${defaultType}`]);
					await main(args, deps);

					const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
					assert.ok(logCalls.includes(`default=${defaultType}`));
				}
			});

			it("should reject invalid default image type", async () => {
				const args = parseArgs(["user@example.com", "--default=invalid"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.error)[0][0], /Invalid default type/);
				assert.match(callsToArray(mockConsole.error)[0][0], /mp, identicon, monsterid, wavatar, retro, robohash, blank/);
			});

			it("should validate rating levels", async () => {
				const validRatings = ["g", "pg", "r", "x"];

				for (const rating of validRatings) {
					mock.reset();

					mockConsole = { log: mock.fn(), error: mock.fn() };
					mockProcess = {
						exit: mock.fn(() => {
							throw new Error("process.exit called");
						}),
					};
					deps = {
						console: mockConsole,
						process: mockProcess,
					};

					const args = parseArgs(["user@example.com", `--rating=${rating}`]);
					await main(args, deps);

					const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
					assert.ok(logCalls.includes(`rating=${rating}`));
				}
			});

			it("should reject invalid rating level", async () => {
				const args = parseArgs(["user@example.com", "--rating=nc17"]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.error)[0][0], /Invalid rating level/);
				assert.match(callsToArray(mockConsole.error)[0][0], /g, pg, r, x/);
			});

			it("should combine multiple options", async () => {
				const args = parseArgs([
					"user@example.com",
					"--size=300",
					"--default=robohash",
					"--rating=pg",
				]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(logCalls.includes("size=300px"));
				assert.ok(logCalls.includes("default=robohash"));
				assert.ok(logCalls.includes("rating=pg"));
			});

			it("should handle force-default flag", async () => {
				const args = parseArgs(["user@example.com", "--force-default"]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(logCalls.includes("force-default"));
			});
		});

		describe("usage and validation", () => {
			it("should show usage message when no email provided", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				assert.match(callsToArray(mockConsole.log)[0][0], /Usage:/);
				assert.match(callsToArray(mockConsole.log)[0][0], /npx tsx url\.ts <email>/);
			});

			it("should include examples in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join("\n");
				assert.match(logCalls, /Examples:/);
				assert.match(logCalls, /npx tsx url\.ts user@example\.com/);
				assert.match(logCalls, /npx tsx url\.ts user@example\.com --size=200/);
			});

			it("should include all options in usage message", async () => {
				const args = parseArgs([]);

				await assert.rejects(async () => main(args, deps), { message: "process.exit called" });

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join("\n");
				assert.match(logCalls, /--size=N/);
				assert.match(logCalls, /--default=TYPE/);
				assert.match(logCalls, /--rating=LEVEL/);
				assert.match(logCalls, /--force-default/);
			});
		});

		describe("output formatting", () => {
			it("should display options when provided", async () => {
				const args = parseArgs([
					"user@example.com",
					"--size=400",
					"--default=identicon",
					"--rating=r",
					"--force-default",
				]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(logCalls.includes("Options:"));
				assert.ok(logCalls.includes("size=400px"));
				assert.ok(logCalls.includes("default=identicon"));
				assert.ok(logCalls.includes("rating=r"));
				assert.ok(logCalls.includes("force-default"));
			});

			it("should display default size when no options provided", async () => {
				const args = parseArgs(["user@example.com"]);

				await main(args, deps);

				const logCalls = callsToArray(mockConsole.log).map((call: any[]) => call[0]).join(" ");
				assert.ok(logCalls.includes("Options:"));
				assert.ok(logCalls.includes("size=80px"));
			});
		});
	});

	describe("handleError", () => {
		it("should log Error instance message", () => {
			const error = new Error("URL generation failed");
			assert.throws(() => handleError(error, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["Error:", "URL generation failed"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should log non-Error errors as strings", () => {
			assert.throws(() => handleError("string error", "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["Error:", "string error"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle null errors", () => {
			assert.throws(() => handleError(null, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["Error:", "null"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should handle undefined errors", () => {
			assert.throws(() => handleError(undefined, "user@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["Error:", "undefined"]);
			assert.strictEqual(callsToArray(mockProcess.exit)[0][0], 1);
		});

		it("should ignore email parameter in error (present for interface consistency)", () => {
			const error = new Error("Test error");
			assert.throws(() => handleError(error, "any-email@example.com", { console: mockConsole, process: mockProcess }), { message: "process.exit called" });

			assert.deepStrictEqual(callsToArray(mockConsole.error)[0], ["Error:", "Test error"]);
		});
	});
});
