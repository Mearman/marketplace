# AGENTS.md

This file provides guidance when working with code in this repository.

## Repository Purpose

Claude Code plugin marketplace (`github.com/Mearman/marketplace`) distributing skills, commands, hooks, and agents.

## Architecture

```
.claude-plugin/marketplace.json     # Central catalog (name, source, version per plugin)
plugins/<plugin-name>/
├── .claude-plugin/plugin.json      # Plugin manifest (must match marketplace version)
├── skills/<skill>/SKILL.md         # Model-invoked (YAML frontmatter + instructions)
├── commands/<cmd>.md               # User-invoked slash commands
├── hooks/                          # Event-driven scripts
└── agents/                         # Custom subagents
```

## Version Sync Requirement

**Versions must match in two places:**
- `.claude-plugin/marketplace.json` → `plugins[].version`
- `plugins/<name>/.claude-plugin/plugin.json` → `version`

When updating a plugin, increment both. Users receive updates when marketplace version exceeds their installed version.

## Commit Message Conventions

**Format:** `type(scope): description`

For root-level documentation (AGENTS.md, README.md), use:
```bash
chore(docs): add skill organization best practices
chore(docs): fix typo in AGENTS.md
```

For plugin-specific changes:
```bash
feat(wayback): add screenshot support
fix(wayback): resolve cache expiration bug
chore(wayback): update dependencies
```

**Available types:** `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`

**Available scopes:** `marketplace`, `schemas`, `docs`, `ci`, `deps`, `release`, plus plugin names (e.g., `wayback`)

## Adding a Plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json`:
   ```json
   {"name": "<name>", "description": "...", "version": "0.1.0"}
   ```
2. Add components (skills/commands/hooks/agents)
3. Register in `.claude-plugin/marketplace.json`:
   ```json
   {"name": "<name>", "source": "./plugins/<name>", "description": "...", "version": "0.1.0"}
   ```

## Skill Description Writing

The `description` field in SKILL.md frontmatter determines when Claude invokes the skill. Write descriptions containing:
- Action verbs users would say ("create", "generate", "convert")
- Domain keywords ("dockerfile", "api", "test")
- Trigger phrases ("help me with", "show me how to")

Example: `"Use when the user asks to create a Dockerfile or containerize an application."`

## Skill Organization Best Practices

### Split vs Combine Skills

**Split skills when** different functionality would be triggered by different user requests. This improves:
- **Discovery accuracy** - Precise skill matching for specific intents
- **Domain separation** - Each skill covers a distinct domain
- **Context efficiency** - Only relevant documentation loads

**Example**: Cache management vs API operations
- ✅ **Split**: `wayback-cache` (manage cache) + `wayback-check` (check URL archive status)
- ❌ **Combined**: Single skill with `--clear-cache` flag mixed into operation scripts

When users say "clear cache" they want cache management, not URL checking. These are distinct intents.

**Keep skills combined** when:
- Functionality is tightly coupled (different steps of one workflow)
- Users would always use both together
- Splitting would require frequent chaining

### Progressive Disclosure

Keep SKILL.md under 500 lines. Split into supporting files when needed:
```
skills/my-skill/
├── SKILL.md              # Overview + quick start
├── reference.md          # Detailed API docs (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/
    └── helper.py          # Executed, not loaded into context
```

Reference files are linked from SKILL.md and only read when Claude needs them.

### Domain-Specific Organization

For multi-domain skills, organize by domain to avoid loading irrelevant context:
```
skills/analytics-skill/
├── SKILL.md              # Overview + navigation
└── reference/
    ├── finance.md        # Revenue, billing metrics
    ├── sales.md          # Opportunities, pipeline
    └── product.md        # API usage, features
```

When asking about sales, Claude only loads `sales.md`, not finance or marketing data.

## Commands

```bash
/plugin validate .                              # Validate marketplace structure
/plugin marketplace add Mearman/marketplace     # User: add this marketplace
/plugin install <plugin>@claude-code-skills     # User: install a plugin
```
