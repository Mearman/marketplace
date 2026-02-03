/**
 * JSON Language Server
 *
 * Provides validation, completion, hover, document symbols, and formatting
 * for JSON and JSONC files with automatic schema association support.
 */

import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	CompletionItem,
	CompletionList,
	TextDocumentPositionParams,
	Hover,
	DocumentSymbol,
	DocumentSymbolParams,
	Range,
	SymbolKind,
	TextEdit,
	DocumentLink,
	DocumentLinkParams,
	DocumentFormattingParams,
	DocumentRangeFormattingParams,
} from "vscode-languageserver/node";

import {
	TextDocument as LSPTextDocument,
} from "vscode-languageserver-textdocument";
import {
	getLanguageService,
	LanguageService,
	JSONDocument,
} from "vscode-json-languageservice";

import { toLSPAssociations } from "./schemas/associations";
import { getCatalog, catalogToAssociations } from "./schemas/catalog";

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create text document manager
const documents = new TextDocuments<LSPTextDocument>(LSPTextDocument);

// JSON language service
let jsonLanguageService: LanguageService;

// Schema configuration
const schemaAssociations: Record<string, string[]> = {};

// JSON document cache
const jsonDocumentsCache: Map<string, JSONDocument> = new Map();

/**
 * Initialize the language server.
 */
connection.onInitialize(
	async (): Promise<InitializeResult> => {
		connection.console.log("Initializing JSON Language Server...");

		// Create JSON language service
		jsonLanguageService = getLanguageService({
			schemaRequestService: async (uri: string): Promise<string> => {
				connection.console.log(`Fetching schema: ${uri}`);

				// File URI
				if (uri.startsWith("file://")) {
					const fs = await import("node:fs");
					const filePath = uri.replace("file://", "");
					try {
						return await fs.promises.readFile(filePath, "utf-8");
					} catch (error) {
						connection.console.error(`Failed to read schema file: ${filePath}`);
						throw error;
					}
				}

				// HTTP/HTTPS URL
				if (uri.startsWith("http://") || uri.startsWith("https://")) {
					try {
						const response = await fetch(uri);
						if (!response.ok) {
							throw new Error(`HTTP ${response.status}: ${response.statusText}`);
						}
						return await response.text();
					} catch (error) {
						connection.console.error(`Failed to fetch schema URL: ${uri}`);
						throw error;
					}
				}

				throw new Error(`Unsupported schema URI: ${uri}`);
			},
			workspaceContext: {
				resolveRelativePath: (
					relativePath: string,
					resource: string,
				): string => {
					// Resolve relative to the current document
					const resourcePath = resource.replace(/^file:\/\//, "");
					const resourceDir = resourcePath.split("/").slice(0, -1).join("/");

					if (relativePath.startsWith("/")) {
						return `file://${relativePath}`;
					}
					return `file:///${resourceDir}/${relativePath}`;
				},
			},
		});

		// Load schema associations
		await loadSchemaAssociations();

		connection.console.info(
			`Loaded ${Object.keys(schemaAssociations).length} schema associations`,
		);

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,

				// Completion
				completionProvider: {
					resolveProvider: true,
					triggerCharacters: ["\"", ":", ":"],
				},

				// Hover
				hoverProvider: true,

				// Document symbols
				documentSymbolProvider: true,

				// Formatting
				documentFormattingProvider: true,
				documentRangeFormattingProvider: true,

				// Document links
				documentLinkProvider: {
					resolveProvider: false,
				},
			},
		};
	},
);

/**
 * Load schema associations from built-in and SchemaStore catalog.
 */
async function loadSchemaAssociations(): Promise<void> {
	// Start with built-in associations
	const builtIn = toLSPAssociations();
	for (const [pattern, uris] of Object.entries(builtIn)) {
		schemaAssociations[pattern] = uris;
	}

	// Try to load SchemaStore catalog
	try {
		const catalog = await getCatalog();
		const catalogAssociations = catalogToAssociations(catalog);

		// Merge catalog associations (catalog takes precedence)
		for (const [pattern, uris] of Object.entries(catalogAssociations)) {
			schemaAssociations[pattern] = uris;
		}

		connection.console.info(
			`Loaded SchemaStore catalog with ${catalog.length} entries`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		connection.console.warn(
			`Failed to load SchemaStore catalog, using built-in associations only: ${errorMessage}`,
		);
	}
}

/**
 * Handle configuration changes.
 */
connection.onNotification(
	DidChangeConfigurationNotification.type,
	() => {
		// Reload schema associations if settings changed
		void loadSchemaAssociations().then(() => {
			// Clear JSON document cache
			jsonDocumentsCache.clear();

			// Re-validate all open documents
			for (const doc of documents.all()) {
				void validateDocument(doc);
			}
		});
	},
);

/**
 * Get JSON document for a text document.
 */
function getJSONDocument(textDocument: LSPTextDocument): JSONDocument {
	let jsonDoc = jsonDocumentsCache.get(textDocument.uri);
	if (!jsonDoc) {
		jsonDoc = jsonLanguageService.parseJSONDocument(textDocument);
		jsonDocumentsCache.set(textDocument.uri, jsonDoc);
	}
	return jsonDoc;
}

/**
 * Validate a JSON document.
 */
async function validateDocument(textDocument: LSPTextDocument): Promise<void> {
	const jsonDoc = getJSONDocument(textDocument);

	const diagnostics = await jsonLanguageService.doValidation(
		textDocument,
		jsonDoc,
		undefined,
	);

	void connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

/**
 * Handle document changes.
 */
documents.onDidChangeContent(
	async (change: { document: LSPTextDocument }): Promise<void> => {
		// Clear JSON document cache for this document
		jsonDocumentsCache.delete(change.document.uri);
		await validateDocument(change.document);
	},
);

documents.onDidClose((event: { document: LSPTextDocument }): void => {
	void connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	jsonDocumentsCache.delete(event.document.uri);
});

/**
 * Handle completion requests.
 */
connection.onCompletion(
	async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionList | undefined> => {
		const document = documents.get(textDocumentPosition.textDocument.uri);
		if (!document) {
			return undefined;
		}

		const jsonDoc = getJSONDocument(document);

		const result = await jsonLanguageService.doComplete(
			document,
			textDocumentPosition.position,
			jsonDoc,
		);
		return (result === null ? undefined : result);
	},
);

/**
 * Resolve completion item (additional detail).
 */
connection.onCompletionResolve(
	async (item: CompletionItem): Promise<CompletionItem> => {
		return jsonLanguageService.doResolve(item);
	},
);

/**
 * Handle hover requests.
 */
connection.onHover(
	async (textDocumentPosition: TextDocumentPositionParams): Promise<Hover | undefined> => {
		const document = documents.get(textDocumentPosition.textDocument.uri);
		if (!document) {
			return undefined;
		}

		const jsonDoc = getJSONDocument(document);

		const result = await jsonLanguageService.doHover(
			document,
			textDocumentPosition.position,
			jsonDoc,
		);

		return result ?? undefined;
	},
);

/**
 * Type guard to check if symbol is a DocumentSymbol (has range, no location).
 */
function isDocumentSymbol(
	symbol: { name: string; kind: SymbolKind } & Record<string, unknown>
): symbol is DocumentSymbol {
	return "range" in symbol && !("location" in symbol);
}

/**
 * Type guard for SymbolInformation-like objects.
 */
interface SymbolInfoLike extends Record<string, unknown> {
	name: string;
	kind: SymbolKind;
	location: { range: Range };
}

function isSymbolInformation(
	symbol: { name: string; kind: SymbolKind } & Record<string, unknown>
): symbol is SymbolInfoLike {
	return "location" in symbol &&
		typeof symbol.location === "object" &&
		symbol.location !== null &&
		"range" in symbol.location;
}

/**
 * Helper to convert a DocumentSymbol to our normalized format.
 */
function convertDocumentSymbol(symbol: DocumentSymbol): DocumentSymbol {
	return {
		name: symbol.name,
		kind: symbol.kind === SymbolKind.Property ? SymbolKind.Property : SymbolKind.Object,
		range: symbol.range,
		selectionRange: symbol.selectionRange,
		children: symbol.children?.map(convertDocumentSymbol),
	};
}

/**
 * Handle document symbol requests.
 */
connection.onDocumentSymbol(
	async (params: DocumentSymbolParams): Promise<DocumentSymbol[] | undefined> => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return undefined;
		}

		const jsonDoc = getJSONDocument(document);

		const symbols = jsonLanguageService.findDocumentSymbols(document, jsonDoc);

		// findDocumentSymbols returns SymbolInformation[] | DocumentSymbol[]
		if (symbols.length === 0) {
			return [];
		}

		// Map each symbol - they could be either type
		return symbols.map((symbol) => {
			// Check if it's a DocumentSymbol (has range property directly)
			if (isDocumentSymbol(symbol)) {
				return convertDocumentSymbol(symbol);
			}

			// It must be a SymbolInformation (has location.range)
			// This is guaranteed by the vscode-json-languageservice return type
			if (isSymbolInformation(symbol)) {
				return {
					name: symbol.name,
					kind: symbol.kind === SymbolKind.Property ? SymbolKind.Property : SymbolKind.Object,
					range: symbol.location.range,
					selectionRange: symbol.location.range,
				};
			}

			// This should be unreachable - throw to satisfy TypeScript
			throw new Error("Unexpected symbol type from findDocumentSymbols");
		});
	},
);

/**
 * Handle document formatting requests.
 */
connection.onDocumentFormatting(
	async (params: DocumentFormattingParams): Promise<TextEdit[] | undefined> => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return undefined;
		}

		return jsonLanguageService.format(document, undefined, params.options);
	},
);

/**
 * Handle document range formatting requests.
 */
connection.onDocumentRangeFormatting(
	async (params: DocumentRangeFormattingParams): Promise<TextEdit[] | undefined> => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return undefined;
		}

		return jsonLanguageService.format(document, params.range, params.options);
	},
);

/**
 * Handle document link requests.
 */
connection.onDocumentLinks(async (params: DocumentLinkParams): Promise<DocumentLink[]> => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return [];
	}

	const jsonDoc = getJSONDocument(document);

	const links = jsonLanguageService.findLinks(document, jsonDoc);
	return links;
});

// Listen for document events
documents.listen(connection);

// Start the connection
connection.listen();
