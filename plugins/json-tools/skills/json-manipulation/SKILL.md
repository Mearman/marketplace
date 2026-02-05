---
name: JSON Manipulation Patterns
description: Use when the user needs help with path queries, JSON transformations, schema validation, or safe JSON editing workflows. Triggered by questions about JSON operations, data extraction, file merging, or validation strategies.
version: 1.0.0
---

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
