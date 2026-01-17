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
	parseArgs,
	sleep,
} from "./utils";

const main = async () => {
	const { flags, options, positional } = parseArgs(process.argv.slice(2));

	const noRaw = flags.has("no-raw");
	const captureOutlinks = flags.has("capture-outlinks");
	const captureScreenshot = flags.has("capture-screenshot");
	const apiKey = options.get("key");
	const skipIfRecent = options.get("skip-if-recent");
	const url = positional[0];

	if (!url) {
		console.log(`Usage: npx tsx submit.ts <url> [options]

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
		process.exit(1);
	}

	console.log(`Submitting: ${url}`);

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
		console.log("  Using authenticated SPN2 API");
	} else {
		console.log("  Using anonymous mode (lower rate limits)");
	}

	try {
		const response = await fetch(API.save, {
			method: "POST",
			headers,
			body: formData.toString(),
		});

		const data: SPN2Response = await response.json();

		if (data.job_id) {
			console.log(`  Job ID: ${data.job_id}`);

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
				status = await statusResponse.json();

				if (status.status === "pending") {
					process.stdout.write(".");
				}
			}
			console.log();

			if (status.status === "success" && status.timestamp) {
				const modifier = noRaw ? "" : "id_";
				const archiveUrl = buildArchiveUrl(status.timestamp, status.original_url || url, modifier);

				console.log("✓ Archived");
				console.log(`  Timestamp: ${formatTimestamp(status.timestamp)} (just now)`);
				console.log(`  URL: ${archiveUrl}`);

				if (status.screenshot) {
					console.log(`  Screenshot: ${status.screenshot}`);
				}
			} else if (status.status === "error") {
				console.log("✗ Failed to archive");
				console.log(`  Error: ${status.status_ext || status.message || "Unknown error"}`);
				process.exit(1);
			} else {
				console.log("⏳ Job still processing");
				console.log(`  Check status: ${API.saveStatus(data.job_id)}`);
			}
		} else if (data.message) {
			console.log("✗ Failed to archive");
			console.log(`  Error: ${data.message}`);
			process.exit(1);
		} else {
			console.log("✗ Unexpected response");
			console.log(JSON.stringify(data, null, 2));
			process.exit(1);
		}
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

main();
