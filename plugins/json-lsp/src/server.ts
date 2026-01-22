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
let schemaAssociations: Record<string, string[]> = {};

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
						return fs.promises.readFile(filePath, "utf-8");
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
		connection.console.warn(
			`Failed to load SchemaStore catalog, using built-in associations only: ${error}`,
		);
	}
}

/**
 * Handle configuration changes.
 */
connection.onNotification(
	DidChangeConfigurationNotification.type,
	async () => {
		// Reload schema associations if settings changed
		await loadSchemaAssociations();

		// Clear JSON document cache
		jsonDocumentsCache.clear();

		// Re-validate all open documents
		for (const doc of documents.all()) {
			validateDocument(doc);
		}
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

	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
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
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
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

		return symbols.map((symbol) => {
			// Handle both SymbolInformation and DocumentSymbol types
			const isSymbolInformation = "location" in symbol;
			const range = isSymbolInformation
				? (symbol as unknown as { location: { range: Range } }).location.range
				: (symbol as unknown as DocumentSymbol).range;
			const docSymbol = symbol as unknown as DocumentSymbol;

			return {
				name: symbol.name,
				kind: symbol.kind === SymbolKind.Property ? SymbolKind.Property : SymbolKind.Object,
				range: range,
				selectionRange: docSymbol.selectionRange ?? range,
				children: docSymbol.children?.map(
					(child: DocumentSymbol): DocumentSymbol => ({
						name: child.name,
						kind: child.kind === SymbolKind.Property ? SymbolKind.Property : SymbolKind.Object,
						range: child.range,
						selectionRange: child.selectionRange,
					}),
				),
			};
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

	return jsonLanguageService.findLinks(document, jsonDoc) ?? [];
});

// Listen for document events
documents.listen(connection);

// Start the connection
connection.listen();
