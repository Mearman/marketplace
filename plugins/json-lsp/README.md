# JSON Language Server (json-lsp)

JSON Language Server: Provides validation, completion, hover, document symbols, and formatting for JSON and JSONC files with automatic schema association support

**Version:** v0.1.0
**Install:** `/plugin install json-lsp@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## LSP

```json
{
  "json": {
    "command": "npx",
    "args": [
      "tsx",
      "${CLAUDE_PLUGIN_ROOT}/src/server.ts"
    ],
    "extensionToLanguage": {
      ".json": "json",
      ".jsonc": "jsonc"
    }
  }
}
```

<!-- AUTO-GENERATED CONTENT END -->