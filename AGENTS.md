# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) agents when working with code in this repository.

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

## Commands

```bash
/plugin validate .                              # Validate marketplace structure
/plugin marketplace add Mearman/marketplace     # User: add this marketplace
/plugin install <plugin>@claude-code-skills     # User: install a plugin
```
