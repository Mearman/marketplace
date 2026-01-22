# JSON Schema Validation (json-schema)

JSON Schema Validation: Tools for validating JSON schemas themselves, validating JSON files against schemas, and auto-validating files against their $schema reference

**Version:** v0.1.0
**Install:** `/plugin install json-schema@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Validate JSON Against Embedded $schema

Validate a JSON file against the schema referenced in its `$schema` property. This is useful for self-describing JSON documents that declare their own schema.

## Usage

```bash
npx tsx scripts/check.ts <json-file> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `json-file` | Yes | Path to the JSON file with `$schema` property |

### Options

| Option | Description |
|--------|-------------|
| `--all-errors` | Report all errors, not just the first |
| `--no-cache` | Bypass cache when fetching remote schemas |
| `--strict` | Enable strict mode validation |
| `--verbose` | Show detailed validation output |
| `--format` | Output format: text (default), json |

### Output

Valid JSON:
```
Valid
  Schema: https://json-schema.org/draft/2020-12/schema
  File: my-schema.json
```

Invalid JSON:
```
Invalid (2 errors)
  Schema: ./schemas/config.schema.json
  1. /settings/timeout: must be number
  2. /settings/retries: must be >= 0
```

No schema reference:
```
Error: No $schema property found in config.json
  Hint: Use schema-validate to validate against a specific schema
```

## Script Execution

```bash
npx tsx scripts/check.ts config.json
npx tsx scripts/check.ts config.json --all-errors
npx tsx scripts/check.ts config.json --no-cache --verbose
```

Run from the json-schema plugin directory: `~/.claude/plugins/cache/json-schema/`

## Schema Resolution

The `$schema` property can reference:

1. **Remote URLs** - Fetched and cached (24h TTL)
   ```json
   { "$schema": "https://json-schema.org/draft/2020-12/schema" }
   ```

2. **Local file paths** - Resolved relative to the JSON file
   ```json
   { "$schema": "./schemas/config.schema.json" }
   ```

3. **Absolute paths**
   ```json
   { "$schema": "/Users/joe/schemas/config.schema.json" }
   ```

## Common $schema Values

| Schema URI | Description |
|------------|-------------|
| `https://json-schema.org/draft/2020-12/schema` | JSON Schema Draft 2020-12 |
| `https://json-schema.org/draft/2019-09/schema` | JSON Schema Draft 2019-09 |
| `http://json-schema.org/draft-07/schema#` | JSON Schema Draft 7 |
| `http://json-schema.org/draft-06/schema#` | JSON Schema Draft 6 |
| `http://json-schema.org/draft-04/schema#` | JSON Schema Draft 4 |

## Caching

Remote schemas are cached for 24 hours using the OS temporary directory. Use `--no-cache` to bypass caching and fetch fresh schemas.

## Related Skills

- Use `schema-meta` to validate that a schema is well-formed
- Use `schema-validate` to validate JSON against an arbitrary schema file

# Validate JSON Schema (Meta-Validation)

Validate that a JSON Schema document is itself a valid schema according to the JSON Schema specification.

## Usage

```bash
npx tsx scripts/meta-validate.ts <schema-file> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `schema-file` | Yes | Path to the JSON Schema file to validate |

### Options

| Option | Description |
|--------|-------------|
| `--draft=VERSION` | JSON Schema draft version (draft-04, draft-06, draft-07, 2019-09, 2020-12). Default: auto-detect |
| `--strict` | Enable strict mode (additional validation rules) |
| `--verbose` | Show detailed validation information |

### Output

Valid schema:
```
Valid JSON Schema (draft-2020-12)
  Keywords: 5
  Definitions: 2
```

Invalid schema:
```
Invalid JSON Schema
  Error: "type" must be a string or array
  Path: /properties/name/type
```

## Script Execution

```bash
npx tsx scripts/meta-validate.ts schema.json
npx tsx scripts/meta-validate.ts schema.json --draft=draft-07
npx tsx scripts/meta-validate.ts schema.json --strict --verbose
```

Run from the json-schema plugin directory: `~/.claude/plugins/cache/json-schema/`

## Draft Version Detection

The script auto-detects the JSON Schema draft version from:
1. The `$schema` keyword in the document
2. Falls back to draft-2020-12 if not specified

Supported drafts:
- `draft-04` - JSON Schema Draft 4
- `draft-06` - JSON Schema Draft 6
- `draft-07` - JSON Schema Draft 7
- `2019-09` - JSON Schema Draft 2019-09
- `2020-12` - JSON Schema Draft 2020-12 (default)

## Strict Mode

When `--strict` is enabled, additional validations are performed:
- Disallow unknown keywords
- Require `$schema` declaration
- Validate format assertions by default

## Related Skills

- Use `schema-validate` to validate JSON data against a schema
- Use `schema-check` to validate a JSON file against its embedded `$schema`

# Validate JSON Against Schema

Validate JSON data files against a JSON Schema definition.

## Usage

```bash
npx tsx scripts/validate.ts <json-file> --schema=<schema-file> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `json-file` | Yes | Path to the JSON file to validate |

### Options

| Option | Description |
|--------|-------------|
| `--schema=FILE` | Path to the JSON Schema file (required) |
| `--all-errors` | Report all errors, not just the first |
| `--strict` | Enable strict mode validation |
| `--verbose` | Show detailed validation output |
| `--format` | Output format: text (default), json |

### Output

Valid JSON:
```
Valid
  Schema: user-schema.json
  File: user.json
```

Invalid JSON:
```
Invalid (3 errors)
  1. /email: must match format "email"
  2. /age: must be >= 0
  3. /name: must be string
```

## Script Execution

```bash
npx tsx scripts/validate.ts data.json --schema=schema.json
npx tsx scripts/validate.ts data.json --schema=schema.json --all-errors
npx tsx scripts/validate.ts data.json --schema=schema.json --format=json
```

Run from the json-schema plugin directory: `~/.claude/plugins/cache/json-schema/`

## Batch Validation

Validate multiple files against the same schema using glob patterns:

```bash
# Validate all JSON files in a directory
for f in data/*.json; do npx tsx scripts/validate.ts "$f" --schema=schema.json; done
```

## JSON Output Format

When using `--format=json`:

```json
{
  "valid": false,
  "file": "user.json",
  "schema": "user-schema.json",
  "errors": [
    {
      "path": "/email",
      "message": "must match format \"email\"",
      "keyword": "format"
    }
  ]
}
```

## Error Messages

Common validation errors:
- `must be string` - Type mismatch
- `must match format "..."` - Format validation failed
- `must be >= N` / `must be <= N` - Number range violation
- `must NOT have additional properties` - Unknown property
- `must have required property '...'` - Missing required field
- `must match pattern "..."` - String pattern mismatch

## Related Skills

- Use `schema-meta` to validate that a schema is well-formed
- Use `schema-check` to validate a JSON file against its embedded `$schema`

<!-- AUTO-GENERATED CONTENT END -->