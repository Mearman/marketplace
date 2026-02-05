---
name: merge
description: Merge multiple JSON files
argument-hint: --files <file1> <file2> ... [--output <path>]
allowed-tools:
  - mcp__plugin_json_tools_json_server__merge
---

# Merge JSON Files

Combine multiple JSON files using different merge strategies.

## Usage

**Merge and display:**
```
/json-tools:merge --files base.json overrides.json
```

**Merge to file:**
```
/json-tools:merge --files config.json local.json --output merged.json
```

**Merge with strategy:**
```
/json-tools:merge --files file1.json file2.json --strategy deep --output result.json
```

## Instructions for Claude

When the user invokes this command:

1. **Parse arguments**: Extract files list, optional output path, optional strategy
2. **Validate files**: Ensure all files exist and are valid JSON
3. **Explain strategy** if not specified:
   - `deep` (default): Recursive merge, arrays concatenated
   - `shallow`: Top-level properties only
   - `concat`: Concatenate arrays (only works if all files are arrays)
4. **Execute merge**: Use `mcp__plugin_json_tools_json_server__merge`
5. **Display result**:
   - If no output file: Show merged result
   - If output file: Confirm write and show summary

## Merge Strategies

### Deep Merge (default)
Recursively merges objects, concatenates arrays:
```json
// file1.json
{"a": {"x": 1}, "b": [1, 2]}

// file2.json
{"a": {"y": 2}, "b": [3]}

// Result
{"a": {"x": 1, "y": 2}, "b": [1, 2, 3]}
```

### Shallow Merge
Only merges top-level properties:
```json
// file1.json
{"a": {"x": 1}, "b": [1, 2]}

// file2.json
{"a": {"y": 2}, "c": 3}

// Result
{"a": {"y": 2}, "b": [1, 2], "c": 3}
```

### Concat
Concatenates arrays (all files must be arrays):
```json
// file1.json
[1, 2, 3]

// file2.json
[4, 5]

// Result
[1, 2, 3, 4, 5]
```

## Common Use Cases

**Merge configurations:**
```
/json-tools:merge --files base-config.json env-config.json --output config.json
```

**Combine data files:**
```
/json-tools:merge --files data/*.json --strategy concat --output all-data.json
```

**Override settings:**
```
/json-tools:merge --files defaults.json user-settings.json
```

## Tips

- Later files override earlier ones in conflicts
- Deep merge is safest for nested objects
- Use concat strategy for combining arrays
- Preview result before specifying output file
