# Argument Parsing Utilities

Simple command-line argument parser for plugin scripts.

## Features

- Parse flags (`--help`, `--no-cache`)
- Parse options (`--format=json`, `--limit=10`)
- Extract positional arguments
- Zero dependencies
- Type-safe with TypeScript

## Usage

```typescript
import { parseArgs } from "../../../lib/args";

const args = parseArgs(process.argv.slice(2));

// Check flags
if (args.flags.has("help")) {
  console.log("Usage: ...");
  process.exit(0);
}

// Get options with defaults
const format = args.options.get("format") ?? "json";
const limit = parseInt(args.options.get("limit") ?? "10");

// Get positional arguments
const url = args.positional[0];
if (!url) {
  console.error("Error: URL required");
  process.exit(1);
}
```

## API

### `parseArgs(argv: string[]): ParsedArgs`

Parse command-line arguments.

**Parameters:**
- `argv` - Arguments array (typically `process.argv.slice(2)`)

**Returns:** Object with:
- `flags: Set<string>` - Boolean flags
- `options: Map<string, string>` - Key-value options
- `positional: string[]` - Non-flag arguments

## Examples

```bash
$ node script.ts https://example.com --format=json --verbose
```

```typescript
const args = parseArgs(process.argv.slice(2));
// args.positional: ["https://example.com"]
// args.options: Map { "format" => "json" }
// args.flags: Set { "verbose" }
```

```bash
$ node script.ts foo bar --key=value --flag1 --flag2
```

```typescript
const args = parseArgs(process.argv.slice(2));
// args.positional: ["foo", "bar"]
// args.options: Map { "key" => "value" }
// args.flags: Set { "flag1", "flag2" }
```

## Pattern

Standard pattern for plugin scripts:

```typescript
import { parseArgs } from "../../../lib/args";

const args = parseArgs(process.argv.slice(2));

// Check for help flag
if (args.flags.has("help")) {
  console.log(`
Usage: tsx script.ts <url> [options]

Options:
  --format=<type>   Output format (json, yaml, text)
  --no-cache        Skip cache
  --verbose         Verbose output
  --help            Show this help
  `);
  process.exit(0);
}

// Extract required arguments
const url = args.positional[0];
if (!url) {
  console.error("Error: URL required");
  process.exit(1);
}

// Parse options
const noCache = args.flags.has("no-cache");
const verbose = args.flags.has("verbose");
const format = args.options.get("format") ?? "json";
```
