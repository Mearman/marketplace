/**
 * SchemaStore catalog management.
 *
 * Fetches and caches the SchemaStore.org catalog for automatic schema associations.
 */

const SCHEMASTORE_CATALOG_URL = "https://www.schemastore.org/api/json/catalog.json";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface SchemaStoreCatalog {
  name: string;
  description: string;
  fileMatch: string[];
  url: string;
  versions?: string[];
}

/**
 * Type guard for SchemaStore catalog entry.
 */
function isSchemaStoreCatalogEntry(value: unknown): value is SchemaStoreCatalog {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const entry = value as Record<string, unknown>;

	return (
		typeof entry.name === "string" &&
    typeof entry.description === "string" &&
    Array.isArray(entry.fileMatch) &&
    entry.fileMatch.every((item) => typeof item === "string") &&
    typeof entry.url === "string"
	);
}

/**
 * Type guard for SchemaStore catalog array.
 */
function isSchemaStoreCatalog(value: unknown): value is SchemaStoreCatalog[] {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every(isSchemaStoreCatalogEntry);
}

export interface CatalogCache {
  catalog: SchemaStoreCatalog[];
  timestamp: number;
}

let catalogCache: CatalogCache | null = null;

/**
 * Fetch the SchemaStore catalog from the official API.
 *
 * @param fetchImpl - Fetch implementation (for testing)
 * @returns Promise resolving to catalog entries
 */
export async function fetchSchemaStoreCatalog(
	fetchImpl: typeof fetch = fetch,
): Promise<SchemaStoreCatalog[]> {
	try {
		const response = await fetchImpl(SCHEMASTORE_CATALOG_URL);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Validate response data structure
		if (!isSchemaStoreCatalog(data)) {
			throw new Error("Invalid SchemaStore catalog response format");
		}

		// Filter out entries without fileMatch
		return data.filter((entry) => entry.fileMatch && entry.fileMatch.length > 0);
	} catch (error) {
		throw new Error(
			`Failed to fetch SchemaStore catalog: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get catalog from cache or fetch fresh data.
 *
 * @param fetchImpl - Fetch implementation (for testing)
 * @returns Promise resolving to catalog entries
 */
export async function getCatalog(
	fetchImpl: typeof fetch = fetch,
): Promise<SchemaStoreCatalog[]> {
	const now = Date.now();

	// Return cached catalog if still valid
	if (catalogCache && now - catalogCache.timestamp < CACHE_TTL) {
		return catalogCache.catalog;
	}

	// Fetch fresh catalog
	const catalog = await fetchSchemaStoreCatalog(fetchImpl);
	catalogCache = { catalog, timestamp: now };

	return catalog;
}

/**
 * Convert SchemaStore catalog to LSP schema associations format.
 *
 * @param catalog - SchemaStore catalog entries
 * @returns Record mapping file patterns to schema URIs
 */
export function catalogToAssociations(
	catalog: SchemaStoreCatalog[],
): Record<string, string[]> {
	const associations: Record<string, string[]> = {};

	for (const entry of catalog) {
		for (const pattern of entry.fileMatch) {
			if (!associations[pattern]) {
				associations[pattern] = [];
			}
			associations[pattern].push(entry.url);
		}
	}

	return associations;
}

/**
 * Find schema URI for a file from the SchemaStore catalog.
 *
 * @param filePath - File path to match
 * @param fetchImpl - Fetch implementation (for testing)
 * @returns Promise resolving to schema URIs (may be multiple)
 */
export async function findSchemaFromCatalog(
	filePath: string,
	fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
	const catalog = await getCatalog(fetchImpl);
	const fileName = filePath.split("/").pop() ?? "";
	const results: string[] = [];

	for (const entry of catalog) {
		for (const pattern of entry.fileMatch) {
			// Simple glob matching (supports * and ** wildcards)
			const regexPattern = pattern
				.replace(/\*\*/g, ".*")
				.replace(/\*/g, "[^/]*")
				.replace(/\?/g, "[^/]");
			const regex = new RegExp(`^${regexPattern}$`);

			if (regex.test(fileName) || regex.test(filePath)) {
				results.push(entry.url);
			}
		}
	}

	return results;
}

/**
 * Clear the cached catalog (useful for testing or forcing refresh).
 */
export function clearCatalogCache(): void {
	catalogCache = null;
}

/**
 * Get cache age in milliseconds.
 *
 * @returns Age of cached catalog, or -1 if no cache exists
 */
export function getCacheAge(): number {
	if (!catalogCache) {
		return -1;
	}
	return Date.now() - catalogCache.timestamp;
}
