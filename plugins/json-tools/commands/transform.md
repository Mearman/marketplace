---
name: transform
description: Transform JSON files using TypeScript functions
argument-hint: --file <path> --script <transform.ts>
allowed-tools:
  - mcp__plugin_json_tools_json_server__transform
  - Write
---

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
