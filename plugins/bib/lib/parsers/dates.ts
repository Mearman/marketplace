/**
 * Date parsing and serialization utilities.
 *
 * Handles conversion between:
 * - BibTeX format: {year = {2024}, month = mar}
 * - RIS format: PY - 2024/03/15
 * - CSL JSON format: {"date-parts": [[2024, 3, 15]]}
 *
 * Supports:
 * - Year-only dates
 * - Year-month dates
 * - Full dates (year-month-day)
 * - Date ranges
 * - Circa/approximate dates
 * - Seasons
 */

import type { DateVariable } from "../types.js";

/**
 * Month name to number mapping (BibTeX month macros)
 */
const MONTH_NAMES: Record<string, number> = {
	jan: 1,
	january: 1,
	feb: 2,
	february: 2,
	mar: 3,
	march: 3,
	apr: 4,
	april: 4,
	may: 5,
	jun: 6,
	june: 6,
	jul: 7,
	july: 7,
	aug: 8,
	august: 8,
	sep: 9,
	september: 9,
	oct: 10,
	october: 10,
	nov: 11,
	november: 11,
	dec: 12,
	december: 12,
};

/**
 * Month number to BibTeX macro mapping
 */
const MONTH_MACROS: Record<number, string> = {
	1: "jan",
	2: "feb",
	3: "mar",
	4: "apr",
	5: "may",
	6: "jun",
	7: "jul",
	8: "aug",
	9: "sep",
	10: "oct",
	11: "nov",
	12: "dec",
};

/**
 * Parse a date string into CSL DateVariable format.
 *
 * Supports formats:
 * - "2024" - Year only
 * - "2024-03" - Year-month
 * - "2024-03-15" - Full date
 * - "2024/03/15" - Slash format (RIS)
 * - "March 2024" - Natural language
 * - "2024-03-15/2024-03-20" - Date range
 *
 * @param dateStr - Date string to parse
 * @returns CSL DateVariable object
 */
export function parseDate(dateStr: string): DateVariable {
	if (!dateStr || dateStr.trim() === "") {
		return {};
	}

	const trimmed = dateStr.trim();

	// Try RIS slash format first: YYYY/MM/DD or YYYY/MM
	const risMatch = trimmed.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/);
	if (risMatch) {
		const year = parseInt(risMatch[1], 10);
		const month = parseInt(risMatch[2], 10);
		const day = risMatch[3] ? parseInt(risMatch[3], 10) : undefined;

		return createDateVariable(year, month, day, trimmed);
	}

	// Check for date range (contains / but didn't match RIS format)
	if (trimmed.includes("/")) {
		return parseDateRange(trimmed);
	}

	// Try ISO format: YYYY-MM-DD or YYYY-MM or YYYY
	const isoMatch = trimmed.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
	if (isoMatch) {
		const year = parseInt(isoMatch[1], 10);
		const month = isoMatch[2] ? parseInt(isoMatch[2], 10) : undefined;
		const day = isoMatch[3] ? parseInt(isoMatch[3], 10) : undefined;

		return createDateVariable(year, month, day, trimmed);
	}

	// Try natural language: "March 2024" or "15 March 2024"
	const naturalMatch = trimmed.match(/^(?:(\d{1,2})\s+)?(\w+)\s+(\d{4})$/i);
	if (naturalMatch) {
		const day = naturalMatch[1] ? parseInt(naturalMatch[1], 10) : undefined;
		const monthName = naturalMatch[2].toLowerCase();
		const year = parseInt(naturalMatch[3], 10);
		const month = MONTH_NAMES[monthName];

		if (month) {
			return createDateVariable(year, month, day, trimmed);
		}
	}

	// Fallback: just a year?
	const yearMatch = trimmed.match(/^(\d{4})$/);
	if (yearMatch) {
		const year = parseInt(yearMatch[1], 10);
		return createDateVariable(year, undefined, undefined, trimmed);
	}

	// Could not parse - store as raw
	return { raw: trimmed };
}

/**
 * Parse a date range string.
 *
 * Format: "2024-03-15/2024-03-20" or "2024/2025"
 */
function parseDateRange(rangeStr: string): DateVariable {
	const parts = rangeStr.split("/");

	if (parts.length !== 2) {
		return { raw: rangeStr };
	}

	const start = parseDate(parts[0]);
	const end = parseDate(parts[1]);

	if (start["date-parts"] && end["date-parts"]) {
		return {
			"date-parts": [start["date-parts"][0], end["date-parts"][0]],
			raw: rangeStr,
		};
	}

	return { raw: rangeStr };
}

/**
 * Create DateVariable from components
 */
function createDateVariable(
	year: number,
	month?: number,
	day?: number,
	raw?: string
): DateVariable {
	const dateParts: number[] = [year];

	if (month !== undefined) {
		dateParts.push(month);
	}

	if (day !== undefined && month !== undefined) {
		dateParts.push(day);
	}

	const result: DateVariable = {
		"date-parts": [dateParts],
	};

	if (raw) {
		result.raw = raw;
	}

	return result;
}

/**
 * Parse BibTeX date fields (separate year/month/day).
 *
 * @param year - Year field value
 * @param month - Month field value (number or name)
 * @param day - Day field value
 * @returns CSL DateVariable
 */
export function parseBibTeXDate(
	year?: string | number,
	month?: string | number,
	day?: string | number
): DateVariable | undefined {
	if (!year) {
		return undefined;
	}

	const yearNum = typeof year === "string" ? parseInt(year, 10) : year;

	if (isNaN(yearNum)) {
		return { raw: String(year) };
	}

	let monthNum: number | undefined;

	if (month) {
		if (typeof month === "number") {
			monthNum = month;
		} else {
			// Try parsing as number first
			const parsed = parseInt(month, 10);
			if (!isNaN(parsed)) {
				monthNum = parsed;
			} else {
				// Try parsing as month name
				monthNum = MONTH_NAMES[month.toLowerCase()];
			}
		}
	}

	let dayNum: number | undefined;

	if (day) {
		dayNum = typeof day === "string" ? parseInt(day, 10) : day;
		if (isNaN(dayNum)) {
			dayNum = undefined;
		}
	}

	return createDateVariable(yearNum, monthNum, dayNum);
}

/**
 * Serialize DateVariable to ISO format string.
 *
 * @param date - CSL DateVariable
 * @returns ISO date string (YYYY-MM-DD or YYYY-MM or YYYY)
 */
export function serializeDate(date: DateVariable): string {
	if (!date || !date["date-parts"] || date["date-parts"].length === 0) {
		return date?.raw || "";
	}

	const dateParts = date["date-parts"][0];

	if (!dateParts || dateParts.length === 0) {
		return date.raw || "";
	}

	const year = dateParts[0];
	const month = dateParts[1];
	const day = dateParts[2];

	if (day !== undefined && month !== undefined) {
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	} else if (month !== undefined) {
		return `${year}-${String(month).padStart(2, "0")}`;
	} else {
		return String(year);
	}
}

/**
 * Serialize DateVariable to BibTeX format (separate year/month).
 *
 * @param date - CSL DateVariable
 * @returns Object with year and month fields
 */
export function serializeBibTeXDate(date: DateVariable): {
  year?: string;
  month?: string;
  day?: string;
} {
	if (!date || !date["date-parts"] || date["date-parts"].length === 0) {
		return {};
	}

	const dateParts = date["date-parts"][0];

	if (!dateParts || dateParts.length === 0) {
		return {};
	}

	const result: { year?: string; month?: string; day?: string } = {};

	result.year = String(dateParts[0]);

	if (dateParts[1] !== undefined) {
		// Use BibTeX month macro
		result.month = MONTH_MACROS[dateParts[1]] || String(dateParts[1]);
	}

	if (dateParts[2] !== undefined) {
		result.day = String(dateParts[2]);
	}

	return result;
}

/**
 * Serialize DateVariable to RIS format.
 *
 * Format: YYYY/MM/DD or YYYY/MM or YYYY
 *
 * @param date - CSL DateVariable
 * @returns RIS date string
 */
export function serializeRISDate(date: DateVariable): string {
	if (!date || !date["date-parts"] || date["date-parts"].length === 0) {
		return date?.raw || "";
	}

	const dateParts = date["date-parts"][0];

	if (!dateParts || dateParts.length === 0) {
		return date.raw || "";
	}

	const year = dateParts[0];
	const month = dateParts[1];
	const day = dateParts[2];

	if (day !== undefined && month !== undefined) {
		return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
	} else if (month !== undefined) {
		return `${year}/${String(month).padStart(2, "0")}`;
	} else {
		return String(year);
	}
}

/**
 * Get current year (for default date values)
 */
export function getCurrentYear(): number {
	return new Date().getFullYear();
}
