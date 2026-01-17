/**
 * Shared helper utilities
 *
 * Common formatting and utility functions used across plugins.
 *
 * @example
 * import { formatNumber, sleep } from "../../../lib/helpers";
 *
 * console.log(formatNumber(1234567)); // "1.2M"
 * await sleep(1000); // Wait 1 second
 */

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the duration
 */
export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format a number with K/M suffixes
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.2M", "5.3K", "42")
 */
export const formatNumber = (num: number): string => {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
};

/**
 * Format a timestamp string as human-readable age
 * @param ts - Timestamp string in format YYYYMMDDHHMMSS
 * @returns Human-readable age (e.g., "2 days ago", "1 month ago")
 */
export const formatAge = (ts: string): string => {
	// Parse timestamp in format YYYYMMDDHHMMSS
	const parseTimestamp = (timestamp: string): Date => {
		return new Date(
			parseInt(timestamp.slice(0, 4)),
			parseInt(timestamp.slice(4, 6)) - 1,
			parseInt(timestamp.slice(6, 8)),
			parseInt(timestamp.slice(8, 10) || "0"),
			parseInt(timestamp.slice(10, 12) || "0"),
			parseInt(timestamp.slice(12, 14) || "0")
		);
	};

	const date = parseTimestamp(ts);
	const diff = Date.now() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days < 0) return "in the future";
	if (days === 0) return "today";
	if (days === 1) return "1 day ago";
	if (days < 30) return `${days} days ago`;
	const months = Math.floor(days / 30);
	if (months === 1) return "1 month ago";
	if (months < 12) return `${months} months ago`;
	const years = Math.floor(months / 12);
	return years === 1 ? "1 year ago" : `${years} years ago`;
};

/**
 * Format a date as YYYY-MM-DD HH:MM
 * @param date - Date object or timestamp
 * @returns Formatted date string
 */
export const formatDate = (date: Date | number): string => {
	const d = typeof date === "number" ? new Date(date) : date;
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const hour = String(d.getHours()).padStart(2, "0");
	const min = String(d.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day} ${hour}:${min}`;
};
