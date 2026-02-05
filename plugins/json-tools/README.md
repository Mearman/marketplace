# json-tools (json-tools)

json-toolsJSON file manipulation toolkit with query, transform, edit, validate, and format capabilities using TypeScript

**Version:** v0.1.0
**Install:** `/plugin install json-tools@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

Provides comprehensive guidance on JSON file manipulation patterns, simple path query syntax, transformation strategies, validation approaches, and safe editing workflows.

## Simple Path Query Syntax

### Basic Path Expressions

**Property access:**
- `name` - Direct property
- `user.name` - Nested property (dot notation)
- `config.server.host` - Deep nesting

**Array access:**
- `items[0]` - First element
- `items[1]` - Second element
- `users[5].name` - Property of array element

**Wildcards:**
- `users[*]` - All array elements
- `users[*].email` - Property from all array elements
- `*.id` - All id properties at current level
- `data.*.value` - All value properties in data object

### Complex Paths

**Mixed notation:**
```
users[0].orders[*].items[0].price
```
Price of first item in all orders of first user.

**Wildcard mapping:**
```
products[*].tags[*]
```
All tags from all products (flattened).

**Nested wildcards:**
```
categories[*].items[*].name
```
Names of all items in all categories.

### What's NOT Supported

For complex filtering logic, use TypeScript transform scripts instead:

**Filtering by condition** (NOT supported in paths):
```typescript
// Use transform script instead of path queries
export default (data: any) => {
  return data.users.filter(u => u.age > 18);
};
```

**Recursive descent** (NOT supported):
```
// NOT: $..email (find all emails anywhere)
// Instead: Use specific paths or transform scripts
```

**Array slicing** (NOT supported):
```
// NOT: items[0:5] (first 5 items)
// Instead: Use transform script with slice()
```

## Transformation Patterns

### Data Filtering

**Remove inactive items:**
```typescript
export default (data: any) => {
  data.items = data.items.filter((item: any) => item.active);
  return data;
};
```

**Filter by date:**
```typescript
export default (data: any) => {
  const cutoff = new Date('2024-01-01');
  data.records = data.records.filter((r: any) =>
    new Date(r.date) >= cutoff
  );
  return data;
};
```

### Data Mapping

**Transform structure:**
```typescript
export default (data: any) => ({
  version: "2.0",
  items: data.items.map((item: any) => ({
    id: item.itemId,
    name: item.itemName,
    price: item.cost * 1.1, // Add 10% markup
  }))
});
```

**Normalize data:**
```typescript
export default (data: any) => {
  data.users = data.users.map((user: any) => ({
    ...user,
    email: user.email.toLowerCase(),
    name: user.name.trim(),
  }));
  return data;
};
```

### Data Aggregation

**Add computed fields:**
```typescript
export default (data: any) => {
  data.summary = {
    totalItems: data.items.length,
    totalValue: data.items.reduce((sum: number, item: any) =>
      sum + item.price, 0
    ),
    averagePrice: data.items.reduce((sum: number, item: any) =>
      sum + item.price, 0) / data.items.length,
  };
  return data;
};
```

**Group by category:**
```typescript
export default (data: any) => {
  const grouped = data.items.reduce((acc: any, item: any) => {
    const category = item.category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});
  return { categories: grouped };
};
```

### Data Migration

**Version upgrade:**
```typescript
export default (data: any) => {
  // Migrate from v1 to v2 format
  if (data.version === "1.0") {
    return {
      version: "2.0",
      config: {
        ...data.settings,
        newField: "default",
      },
      data: data.items,
    };
  }
  return data;
};
```

**Rename properties:**
```typescript
export default (data: any) => {
  return {
    ...data,
    items: data.items.map((item: any) => ({
      id: item.itemId,      // Rename itemId -> id
      title: item.name,     // Rename name -> title
      cost: item.price,     // Rename price -> cost
    }))
  };
};
```

## Schema Validation Strategies

### Design JSON Schemas

**Basic structure:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number", "minimum": 0 }
  },
  "required": ["name"]
}
```

**Array validation:**
```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "value": { "type": "number" }
        },
        "required": ["id", "value"]
      },
      "minItems": 1
    }
  }
}
```

**Enum and patterns:**
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"]
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "phone": {
      "type": "string",
      "pattern": "^\\d{3}-\\d{3}-\\d{4}$"
    }
  }
}
```

### Validation Workflow

1. **Define schema** for your data structure
2. **Validate before edits** to catch issues early
3. **Validate after edits** to ensure correctness
4. **Store schemas** in version control alongside data

### Common Validation Scenarios

**Configuration validation:**
- Ensure required fields present
- Validate value ranges
- Check format of URLs, emails, etc.

**API response validation:**
- Verify response structure
- Check data types
- Ensure required fields exist

**Data migration validation:**
- Validate source data before transform
- Validate transformed data against new schema
- Ensure no data loss

## Safe Editing Workflows

### Pre-Edit Checklist

1. **Backup verification:**
   - Auto-backup is enabled by default
   - Backups stored as `.bak` files
   - Check backup location before destructive operations

2. **Dry-run testing:**
   - Always use `--dry-run true` for new operations
   - Review changes before applying
   - Verify path matches expected locations

3. **Validation:**
   - Validate JSON before editing
   - Validate after editing to ensure correctness
   - Use schemas to enforce constraints

### Destructive Operations

**Delete operations:**
```
1. Query first: See what will be deleted
2. Dry-run: Preview deletion
3. Confirm: Verify backup created
4. Execute: Apply deletion
```

**Batch operations:**
```
1. Test on single file first
2. Dry-run on all files
3. Review each file's changes
4. Apply to all files
5. Validate all results
```

### Recovery from Mistakes

**Restore from backup:**
```bash
# Backups are `.bak` files in same directory
cp data.json.bak data.json
```

**Revert specific change:**
1. Query backup file for original value
2. Set original value in current file
3. Validate result

### Best Practices

**For simple edits:**
- Use `set` operation with explicit paths
- Avoid wildcards unless necessary
- Validate path with query first

**For complex transformations:**
- Write TypeScript transform script
- Test on copy of data first
- Use dry-run to preview result
- Keep transform scripts in version control

**For batch operations:**
- Test on single file first
- Use explicit file lists (avoid `*` until tested)
- Check each result
- Keep backups until verified

## Merge Strategies

### Deep Merge
- **Use when:** Merging configuration files with nested objects
- **Behavior:** Recursively merges objects, concatenates arrays
- **Example:** Base config + environment-specific overrides

### Shallow Merge
- **Use when:** Top-level property replacement needed
- **Behavior:** Only merges first level, later values win
- **Example:** Simple key-value configurations

### Concat
- **Use when:** Combining array-based files
- **Behavior:** Flattens all arrays into single array
- **Example:** Merging multiple data files

### Merge Order Matters

Files are merged left-to-right:
```
file1.json + file2.json + file3.json
```
- `file3` values override `file2`
- `file2` values override `file1`

Place most general config first, most specific last.

## Performance Considerations

### Large Files

**Query optimization:**
- Use specific paths: `users[0].name` instead of `*[*].name`
- Access nested data directly: `config.server.host` instead of wildcards
- For complex filtering, use transform scripts instead of repeated queries

**Transform optimization:**
- Process in chunks for very large files
- Use streaming for files over 100MB
- Consider splitting into multiple files

**Batch operations:**
- Process files in parallel when possible
- Use specific file lists, not wildcards
- Monitor memory usage for many files

## Common Patterns

### Configuration Management

**Base + Override pattern:**
```
1. Base config (defaults)
2. Environment config (dev/staging/prod)
3. Local overrides (optional)

Merge order: base → env → local
```

**Validation workflow:**
```
1. Validate base config
2. Merge with overrides
3. Validate merged result
4. Deploy
```

### Data Pipeline

**Extract-Transform-Load:**
```
1. Query: Extract relevant data
2. Transform: Apply TypeScript transformation
3. Validate: Check against schema
4. Load: Write to destination
```

### Version Migration

**Safe migration:**
```
1. Query current version
2. Backup original
3. Transform to new version
4. Validate against new schema
5. Test with application
6. Deploy
```

## Troubleshooting

### Query Returns Nothing

1. **Test incrementally:** Build path step by step
2. **Verify data structure:** Query with empty path or root property first
3. **Check syntax:** Ensure brackets and dots are correct
4. **Try wildcards:** Use `*` to see what's available

### Edit Doesn't Work

1. **Query first:** Verify path matches
2. **Check data type:** Ensure value type matches
3. **Review backup:** Compare before/after
4. **Validate JSON:** Ensure file is valid

### Transform Fails

1. **Check script syntax:** Ensure TypeScript is valid
2. **Test function:** Ensure function exported
3. **Handle edge cases:** Check for null/undefined
4. **Review error message:** TypeScript errors are specific

## Examples by Use Case

### API Response Processing

**Extract user emails:**
```
data.users[*].email
```

**Filter active accounts:**
Use a transform script for filtering:
```typescript
export default (data: any) => {
  return data.data.users.filter(u => u.status === "active" && u.verified);
};
```

### Configuration Updates

**Update API endpoint:**
```
Operation: set
Path: config.apiEndpoint
Value: "https://api.example.com"
```

**Enable feature flag:**
Use a transform script for conditional updates:
```typescript
export default (data: any) => {
  const feature = data.features.find(f => f.name === "newFeature");
  if (feature) feature.enabled = true;
  return data;
};
```

### Data Migration

**Transform user format:**
```typescript
export default (data: any) => ({
  version: "2.0",
  users: data.users.map((u: any) => ({
    userId: u.id,
    profile: {
      name: u.name,
      email: u.email,
    },
    metadata: {
      createdAt: u.created,
      active: u.status === "active",
    }
  }))
});
```

---

Reference these patterns when helping users with JSON manipulation tasks. Always suggest the safest approach (query → dry-run → validate → execute) for destructive operations.

## Commands

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

# Transform JSON with TypeScript

Transform JSON files using custom TypeScript transformation functions.

## Usage

**Basic transform:**
```
/json-tools:transform --file data.json --script transform.ts
```

**Transform to new file:**
```
/json-tools:transform --file input.json --script transform.ts --output result.json
```

**Dry-run (preview result):**
```
/json-tools:transform --file data.json --script transform.ts --dry-run true
```

## Instructions for Claude

When the user invokes this command:

1. **Check for script file**:
   - If script doesn't exist, offer to create it
   - Ask user what transformation they want
   - Use Write tool to create the TypeScript transformation script

2. **Script template** (if creating):
   ```typescript
   // Transform function: receives JSON data, returns transformed data
   export default function transform(data: any): any {
     // User's transformation logic here
     return data;
   }
   ```

3. **Execute transform**:
   - Use `mcp__plugin_json_tools_json_server__transform` with file and script paths
   - Use `--dry-run true` first to show the result
   - Ask for confirmation before writing

4. **Handle result**:
   - Show preview of transformed data
   - Report backup location if created
   - Suggest validation if schema available

## Transform Script Format

**Required signature:**
```typescript
export default function transform(data: any): any {
  // Your transformation logic
  return transformedData;
}
```

**Or async:**
```typescript
export default async function transform(data: any): Promise<any> {
  // Async transformation logic
  return transformedData;
}
```

## Example Transforms

**Filter array:**
```typescript
export default (data: any) => {
  data.users = data.users.filter((u: any) => u.active);
  return data;
};
```

**Map values:**
```typescript
export default (data: any) => {
  data.items = data.items.map((item: any) => ({
    ...item,
    price: item.price * 1.1 // 10% increase
  }));
  return data;
};
```

**Restructure:**
```typescript
export default (data: any) => ({
  version: "2.0",
  timestamp: new Date().toISOString(),
  data: data.items,
  count: data.items.length
});
```

## Tips

- Offer to create transform scripts for users
- Always run dry-run first for complex transforms
- Suggest common transformations based on data structure
- TypeScript provides type safety during execution

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

## MCP

```json
{
  "json-server": {
    "command": "npx",
    "args": [
      "-y",
      "tsx",
      "${CLAUDE_PLUGIN_ROOT}/server/server.ts"
    ],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

<!-- AUTO-GENERATED CONTENT END -->