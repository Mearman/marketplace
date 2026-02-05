---
name: edit
description: Edit JSON files (set, delete, add operations)
argument-hint: --file <path> --operation <set|delete|add> --path <jsonpath>
allowed-tools:
  - mcp__plugin_json_tools_json_server__set
  - mcp__plugin_json_tools_json_server__delete
  - mcp__plugin_json_tools_json_server__add
  - mcp__plugin_json_tools_json_server__batch_edit
---

# Edit JSON Files

Edit JSON files with set, delete, and add operations.

## Usage

**Set a value:**
```
/json-tools:edit --file data.json --operation set --path "$.user.name" --value "Alice"
```

**Delete a path:**
```
/json-tools:edit --file data.json --operation delete --path "$.deprecated"
```

**Add to array:**
```
/json-tools:edit --file data.json --operation add --path "$.users" --value {"name": "Bob"}
```

**Add to object:**
```
/json-tools:edit --file data.json --operation add --path "$.config" --key "timeout" --value 5000
```

**Batch edit (multiple files):**
```
/json-tools:edit --files *.json --operation set --path "$.version" --value "2.0.0"
```

## Instructions for Claude

When the user invokes this command:

1. **Parse arguments**: Extract file(s), operation, path, value (if needed), key (if adding to object)
2. **Safety check**:
   - Ask for confirmation if editing multiple files
   - Use `--dry-run true` flag first to show what would change
3. **Execute operation**:
   - `set`: Use `mcp__plugin_json_tools_json_server__set`
   - `delete`: Use `mcp__plugin_json_tools_json_server__delete`
   - `add`: Use `mcp__plugin_json_tools_json_server__add`
   - Multiple files: Use `mcp__plugin_json_tools_json_server__batch_edit`
4. **Handle backup**: Backups are created by default (`.bak` files)
5. **Report results**: Show what changed, backup location if created
6. **Error handling**: If operation fails, suggest fixes or alternatives

## Safety Features

- **Auto-backup**: Enabled by default (creates `.bak` files)
- **Dry-run**: Use `--dry-run true` to preview changes
- **Validation**: JSON validity checked after edits

## Common Operations

**Update version:**
```
--operation set --path "$.version" --value "2.0.0"
```

**Remove deprecated fields:**
```
--operation delete --path "$..deprecated"
```

**Add new config option:**
```
--operation add --path "$.config" --key "newOption" --value true
```

## Tips

- Always use dry-run for destructive operations
- Backups are in the same directory with `.bak` extension
- JSONPath supports filters: `$.users[?(@.active == false)]`
