#!/usr/bin/env npx tsx
/**
 * Submit a URL to the Wayback Machine for archiving (SPN2 API)
 * Usage: npx tsx submit.ts <url> [options]
 *
 * Options:
 *   --no-raw              Include Wayback toolbar in archived URL
 *   --key=ACCESS:SECRET   Use API authentication for higher rate limits
 *   --capture-outlinks    Also archive linked pages
 *   --capture-screenshot  Generate PNG screenshot
 *   --skip-if-recent=30d  Skip if archived within timeframe (e.g., 30d, 1h)
 */

import {
	API,
	SPN2Response,
	buildArchiveUrl,
	formatTimestamp,
	getAuthHeaders,
	isSPN2Response,
	parseArgs,
	sleep,
	type ParsedArgs,
} from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface Dependencies {
	console: Console;
	process: NodeJS.Process;
}

// ============================================================================
// Error Handler
// ============================================================================

export const handleError = (
	error: unknown,
	_url: string,
	deps: Pick<Dependencies, "console" | "process">
): void => {
	const message = error instanceof Error ? error.message : String(error);
	deps.console.error("\nError:", message);
	deps.process.exit(1);
};

// ============================================================================
// Main Function
// ============================================================================

export const main = async (args: ParsedArgs, deps: Dependencies): Promise<void> => {
	const { flags, options, positional } = args;

	const noRaw = flags.has("no-raw");
	const captureOutlinks = flags.has("capture-outlinks");
	const captureScreenshot = flags.has("capture-screenshot");
	const apiKey = options.get("key");
	const skipIfRecent = options.get("skip-if-recent");
	const url = positional[0];

	if (!url) {
		deps.console.log(`Usage: npx tsx submit.ts <url> [options]

Options:
  --no-raw              Include Wayback toolbar in archived URL
  --key=ACCESS:SECRET   Use API authentication for higher rate limits
  --capture-outlinks    Also archive linked pages
  --capture-screenshot  Generate PNG screenshot
  --skip-if-recent=30d  Skip if archived within timeframe (e.g., 30d, 1h)

Examples:
  npx tsx submit.ts https://example.com
  npx tsx submit.ts https://example.com --key=abc123:secret456
  npx tsx submit.ts https://example.com --capture-screenshot --skip-if-recent=1d`);
		deps.process.exit(1);
	}

	deps.console.log(`Submitting: ${url}`);

	// Build form data
	const formData = new URLSearchParams();
	formData.append("url", url);
	if (captureOutlinks) formData.append("capture_outlinks", "1");
	if (captureScreenshot) formData.append("capture_screenshot", "1");
	if (skipIfRecent) formData.append("if_not_archived_within", skipIfRecent);

	const headers = {
		...getAuthHeaders(apiKey),
		"Content-Type": "application/x-www-form-urlencoded",
	};

	if (apiKey) {
		deps.console.log("  Using authenticated SPN2 API");
	} else {
		deps.console.log("  Using anonymous mode (lower rate limits)");
	}

	try {
		const response = await fetch(API.save, {
			method: "POST",
			headers,
			body: formData.toString(),
		});

		const rawData: unknown = await response.json();
		if (!isSPN2Response(rawData)) {
			throw new Error("Invalid SPN2 response format");
		}
		const data: SPN2Response = rawData;

		if (data.job_id) {
			deps.console.log(`  Job ID: ${data.job_id}`);

			// Poll for completion
			let status: SPN2Response = data;
			let attempts = 0;
			const maxAttempts = 30;

			while (status.status !== "success" && status.status !== "error" && attempts < maxAttempts) {
				await sleep(2000);
				attempts++;

				const statusResponse = await fetch(
					API.saveStatus(data.job_id),
					{ headers: getAuthHeaders(apiKey) }
				);
				const rawStatus: unknown = await statusResponse.json();
				if (!isSPN2Response(rawStatus)) {
					throw new Error("Invalid SPN2 status response format");
				}
				status = rawStatus;

				if (status.status === "pending") {
					deps.process.stdout.write(".");
				}
			}
			deps.console.log();

			if (status.status === "success" && status.timestamp) {
				const modifier = noRaw ? "" : "id_";
				const archiveUrl = buildArchiveUrl(status.timestamp, status.original_url || url, modifier);

				deps.console.log("✓ Archived");
				deps.console.log(`  Timestamp: ${formatTimestamp(status.timestamp)} (just now)`);
				deps.console.log(`  URL: ${archiveUrl}`);

				if (status.screenshot) {
					deps.console.log(`  Screenshot: ${status.screenshot}`);
				}
			} else if (status.status === "error") {
				deps.console.log("✗ Failed to archive");
				deps.console.log(`  Error: ${status.status_ext || status.message || "Unknown error"}`);
				deps.process.exit(1);
			} else {
				deps.console.log("⏳ Job still processing");
				deps.console.log(`  Check status: ${API.saveStatus(data.job_id)}`);
			}
		} else if (data.message) {
			deps.console.log("✗ Failed to archive");
			deps.console.log(`  Error: ${data.message}`);
			deps.process.exit(1);
		} else {
			deps.console.log("✗ Unexpected response");
			deps.console.log(JSON.stringify(data, null, 2));
			deps.process.exit(1);
		}
	} catch (error) {
		handleError(error, url, deps);
	}
};

// ============================================================================
// CLI Execution
// ============================================================================

const defaultDeps: Dependencies = {
	console,
	process,
};

if (import.meta.url === `file://${process.argv[1]}`) {
	main(parseArgs(process.argv.slice(2)), defaultDeps).catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error("\nError:", message);
		process.exit(1);
	});
}
