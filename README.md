# Claude Code Skills Marketplace

This is a [Claude Code](https://claude.ai/code) [Marketplace](https://code.claude.com/docs/en/plugin-marketplaces) repository: used to distribute [plugins](https://code.claude.com/docs/en/plugins) that extend Claude Code with [skills](https://code.claude.com/docs/en/skills), [slash commands](https://code.claude.com/docs/en/slash-commands), [hooks](https://code.claude.com/docs/en/hooks), [custom agents](https://code.claude.com/docs/en/sub-agents), and protocol servers ([MCP](https://code.claude.com/docs/en/mcp), [LSP](https://code.claude.com/docs/en/plugins-reference#lsp-servers)).

**How marketplaces work:**

1. Add a marketplace to your Claude Code installation (one-time setup)
2. Claude Code reads the marketplace catalog to discover available plugins
3. Install individual plugins selectively
4. Receive automatic updates when plugin versions change

## Quick Start

**1. Add this marketplace**

```bash
/plugin marketplace add Mearman/marketplace
```

**2. Install a plugin from the list below**

For example, to install the Wayback Machine Archive plugin:

```bash
/plugin install wayback@mearman
```

**3. Use the skill**

Ask: "Check if example.com is archived in the Wayback Machine"

<!-- AUTO-GENERATED PLUGINS START -->
## Available Plugins

### [bib](plugins/bib/) — v0.2.1

Bibliography manipulation plugin supporting BibTeX, BibLaTeX, RIS, EndNote XML, and CSL JSON formats: Convert, validate, merge, filter, and perform CRUD operations on bibliography files.

**Components:** 9 skills

```bash
/plugin install bib@mearman
```

### [cve-search](plugins/cve-search/) — v0.3.0

CVE Search: Tools for searching vulnerabilities by CVE ID, product name, or vendor, with detailed vulnerability information and dependency auditing

**Components:** 2 skills

```bash
/plugin install cve-search@mearman
```

### [github-api](plugins/github-api/) — v0.2.0

GitHub REST API: Tools for repository metadata, READMEs, user profiles, and rate limit checking

**Components:** 4 skills

```bash
/plugin install github-api@mearman
```

### [gravatar](plugins/gravatar/) — v0.2.1

Gravatar Avatar URLs: Tools for generating avatar URLs from email addresses

**Components:** 3 skills

```bash
/plugin install gravatar@mearman
```

### [json-lsp](plugins/json-lsp/) — v0.2.0

JSON Language Server: Provides validation, completion, hover, document symbols, and formatting for JSON and JSONC files with automatic schema association support

**Components:** LSP

```bash
/plugin install json-lsp@mearman
```

### [json-schema](plugins/json-schema/) — v0.2.0

JSON Schema Validation: Tools for validating JSON schemas themselves, validating JSON files against schemas, and auto-validating files against their $schema reference

**Components:** 3 skills

```bash
/plugin install json-schema@mearman
```

### [npm-registry](plugins/npm-registry/) — v0.2.0

npm Registry: Tools for searching packages, getting metadata, checking existence, and fetching download statistics

**Components:** 4 skills

```bash
/plugin install npm-registry@mearman
```

### [npms-io](plugins/npms-io/) — v0.2.0

NPMS Package Analysis: Tools for package quality analysis, comparison, and name suggestions

**Components:** 3 skills

```bash
/plugin install npms-io@mearman
```

### [pypi-json](plugins/pypi-json/) — v0.2.3

PyPI JSON API: Tools for querying Python package metadata, release information, and statistics from the Python Package Index

**Components:** 1 skill

```bash
/plugin install pypi-json@mearman
```

### [tex](plugins/tex/) — v0.2.1

texLaTeX manipulation, generation, and conversion tools

**Components:** 6 skills

```bash
/plugin install tex@mearman
```

### [wayback](plugins/wayback/) — v0.10.1

Wayback Machine Archive: Tools for checking, submitting, listing, screenshotting, and cache management for archived URLs

**Components:** 9 skills

```bash
/plugin install wayback@mearman
```
<!-- AUTO-GENERATED PLUGINS END -->

## Managing Plugins

### Marketplace Commands

#### Update all marketplaces

```bash
/plugin marketplace update
```

#### Update this marketplace specifically

```bash
/plugin marketplace update mearman
```

#### Remove this marketplace

```bash
/plugin marketplace remove mearman
```

### Plugin Commands

#### Update a specific plugin

```bash
/plugin update wayback@mearman
```

#### Shorthand (assumes @mearman)

```bash
/plugin update wayback
```

#### Update all installed plugins

```bash
/plugin update
```

#### Remove a plugin

```bash
/plugin uninstall wayback@mearman
```
