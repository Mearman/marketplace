---
name: query
description: Query JSON files using simple path syntax
argument-hint: --file <path> --path <expression>
allowed-tools:
  - mcp__plugin_json_tools_json_server__query
  - mcp__plugin_json_tools_json_server__batch_query
---

# Query JSON Files

Use this command to query JSON files using simple path expressions (dot notation, array indices, wildcards).

## Usage

**Single file:**
```
/json-tools:query --file data.json --path "users[*].name"
```

**Multiple files:**
```
/json-tools:query --files config.json settings.json --path "version"
```

## Instructions for Claude

When the user invokes this command:

1. Parse the arguments to extract `file` or `files` and `path`
2. If single file: Use `mcp__plugin_json_tools_json_server__query` tool
3. If multiple files: Use `mcp__plugin_json_tools_json_server__batch_query` tool
4. Display results in a clear, readable format
5. If no matches found, inform the user
6. Provide helpful suggestions for path syntax if the query seems malformed

## Path Syntax Examples

- `users` - All users
- `users[0]` - First user
- `users[*].name` - All user names
- `config.timeout` - Nested property
- `items[0].tags[*]` - All tags in first item
- `*.id` - All id properties at current level

## Tips

- Always reference the json-manipulation skill for advanced patterns
- Explain the results to the user, don't just dump raw JSON
- Suggest next steps (edit, transform, etc.) based on the query results
