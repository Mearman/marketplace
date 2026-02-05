---
name: format
description: Format and prettify JSON files
argument-hint: --file <path> [--indent <n>] [--sort-keys]
allowed-tools:
  - mcp__plugin_json_tools_json_server__format
---

# Format JSON Files

Format and prettify JSON files with consistent indentation and optional key sorting.

## Usage

**Basic formatting (2-space indent):**
```
/json-tools:format --file data.json
```

**Custom indentation:**
```
/json-tools:format --file data.json --indent 4
```

**Sort keys alphabetically:**
```
/json-tools:format --file data.json --sort-keys true
```

**Format multiple files:**
```
/json-tools:format --files *.json --indent 2 --sort-keys true
```

## Instructions for Claude

When the user invokes this command:

1. **Parse arguments**: Extract file(s), indent size (default: 2), sortKeys flag
2. **Execute format**: Use `mcp__plugin_json_tools_json_server__format`
3. **Report results**: Confirm formatting complete, note backup location
4. **Handle multiple files**: Format each and report summary

## Options

### Indentation
- Default: 2 spaces
- Common values: 2, 4
- Use tabs: Not supported (use spaces)

### Sort Keys
- When enabled: Recursively sorts all object keys alphabetically
- Useful for: Diffs, version control, consistent output
- Note: Changes key order, which may affect semantics in some cases

## Examples

**Before formatting:**
```json
{"name":"Alice","age":30,"city":"NYC"}
```

**After formatting (indent: 2):**
```json
{
  "name": "Alice",
  "age": 30,
  "city": "NYC"
}
```

**After formatting (indent: 2, sort-keys: true):**
```json
{
  "age": 30,
  "city": "NYC",
  "name": "Alice"
}
```

## Common Use Cases

**Clean up minified JSON:**
```
/json-tools:format --file minified.json
```

**Prepare for version control:**
```
/json-tools:format --files src/**/*.json --sort-keys true
```

**Standardize formatting:**
```
/json-tools:format --files config/*.json --indent 2
```

## Tips

- Backups are created by default
- Sort keys for better diffs in version control
- Use consistent indentation across projects (2 or 4 spaces)
- Formatting doesn't change data, only presentation
