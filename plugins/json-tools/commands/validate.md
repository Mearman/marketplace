---
name: validate
description: Validate JSON files against schemas
argument-hint: --file <path> --schema <schema.json>
allowed-tools:
  - mcp__plugin_json_tools_json_server__validate
---

# Validate JSON Against Schema

Validate JSON files against JSON Schema definitions using Zod.

## Usage

**Basic validation:**
```
/json-tools:validate --file data.json --schema schema.json
```

**Batch validation:**
```
/json-tools:validate --files *.json --schema common-schema.json
```

## Instructions for Claude

When the user invokes this command:

1. **Parse arguments**: Extract file path and schema path
2. **Check files exist**: Verify both file and schema are readable
3. **Execute validation**: Use `mcp__plugin_json_tools_json_server__validate`
4. **Report results**:
   - If valid: Confirm success
   - If invalid: Show errors with paths and messages in readable format
5. **Suggest fixes**: Based on validation errors, suggest how to fix the data

## Validation Results

**Success:**
```
✓ Validation passed
File: data.json conforms to schema.json
```

**Failure:**
```
✗ Validation failed

Errors:
- Path: users.0.email
  Message: Invalid email format

- Path: config.timeout
  Message: Expected number, received string
```

## JSON Schema Support

The validator uses **Zod 4 with fromJsonSchema**, supporting:
- JSON Schema Draft 7
- All standard types (string, number, boolean, array, object, null)
- Format validation (email, uri, date-time, etc.)
- Pattern matching (regex)
- Enum values
- Required properties
- Min/max constraints

## Common Use Cases

**Validate configuration:**
```
/json-tools:validate --file config.json --schema config-schema.json
```

**Validate API response:**
```
/json-tools:validate --file api-response.json --schema api-schema.json
```

**Validate before deployment:**
```
/json-tools:validate --files dist/*.json --schema manifest-schema.json
```

## Tips

- Keep schemas in a `schemas/` directory for organization
- Use validation after editing to ensure correctness
- Zod provides helpful error messages with specific paths
- Validation errors show exactly where and why data is invalid
