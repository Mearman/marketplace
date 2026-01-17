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
- Specific capabilities (e.g., "extract text and tables from PDF files")

Example: `"Use when the user asks to create a Dockerfile or containerize an application."`

**Good vs Bad descriptions:**
- ❌ Too vague: `"Helps with documents"` - doesn't give Claude enough information
- ✅ Specific: `"Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."`

A good description answers two questions:
1. **What does this Skill do?** List specific capabilities
2. **When should Claude use it?** Include trigger terms users would mention

## Skill Activation Reliability

**Critical Issue**: Skills do NOT activate reliably based on descriptions alone. Testing shows only ~20% activation rate with simple instruction hooks.

### The Problem

Claude Code skills are _supposed_ to activate autonomously based on their descriptions. In practice, skills often sit idle while Claude proceeds without using them, even when the task clearly matches the skill's purpose.

### Solutions

Research (200+ test runs across multiple configurations) identified two approaches that achieve 80-84% activation rates:

#### 1. Forced Eval Hook (84% success - RECOMMENDED)

Create `.claude/hooks/skill-forced-eval-hook.sh`:

```bash
#!/bin/bash
cat <<'EOF'
CRITICAL INSTRUCTION: Before proceeding with implementation, you MUST evaluate relevant skills.

Step 1 - EVALUATE: For each available skill, state:
- SKILL NAME: [name]
- RELEVANCE: YES/NO with brief reason

Step 2 - ACTIVATE: Use Skill(tool) IMMEDIATELY for all YES skills

Step 3 - IMPLEMENT: Only AFTER skill activation

CRITICAL: The evaluation is WORTHLESS unless you ACTIVATE the skills.
Do not skip to implementation without activating relevant skills first.
EOF
```

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/skill-forced-eval-hook.sh"
          }
        ]
      }
    ]
  }
}
```

**Why it works**: Creates a commitment mechanism - Claude must explicitly evaluate and commit before proceeding.

#### 2. LLM Eval Hook (80% success)

Uses Claude API to pre-evaluate skills. 10% cheaper/faster but can fail completely on some prompts. Requires API key setup.

### Recommendation

Use the **forced eval hook** for:
- Most consistent activation (84%)
- Pure client-side solution (no API calls)
- No external dependencies

Trade-off: Verbose output (Claude lists all skills with YES/NO reasoning).

### Testing Your Skills

To verify a skill activates:
1. Ask Claude to do a task matching the skill's description
2. Watch for the evaluation output (forced eval hook)
3. Confirm the skill is activated before implementation

For more details, see [Scott Spence's research on skill activation](https://scottspence.com/posts/how-to-make-claude-code-skills-activate-reliably).

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

## Plugin Components

### Hooks

Hooks are event-driven scripts that run in response to specific events during Claude Code operation.

#### Hook Types

| Event | When it fires | Common uses |
|-------|---------------|-------------|
| `UserPromptSubmit` | After user submits a prompt | Skill activation, prompt validation |
| `PreToolUse` | Before a tool is called | Input validation, security checks |
| `PostToolUse` | After a tool completes | Output processing, notifications |
| `Stop` | When Claude stops | Cleanup, logging |

#### Hook Configuration

Create `.claude/hooks/hook-name.sh`:
```bash
#!/bin/bash
# Your hook logic here
echo "Additional instruction or validation"
```

Register in `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/security-check.sh",
            "once": true
          }
        ]
      }
    ]
  }
}
```

**Key options:**
- `matcher`: Regex pattern matching tool names
- `once`: Run only once per session, then auto-remove

#### Plugin Hooks

Plugins can define scoped hooks in `hooks/hooks.json`:
```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
        }
      ]
    }
  ]
}
```

### Agents

Custom subagents provide specialized contexts for specific tasks.

#### Agent Definition

Create `.claude/agents/agent-name.md`:
```markdown
---
name: code-reviewer
description: Review code for quality and best practices
skills: pr-review, security-check
---

# Code Reviewer

You are a code review specialist...
```

#### Subagent Features

- **Skills inheritance**: List `skills` to inject into subagent context
- **Scoped execution**: Runs in isolated context with own conversation history
- **Tool restrictions**: Limit available tools via `allowed-tools`

### MCP Servers

Model Context Protocol servers connect Claude Code to external tools and data sources.

Configure in `.mcp.json`:
```json
{
  "server-name": {
    "command": "/path/to/server",
    "args": ["--port", "8080"],
    "env": {
      "API_KEY": "${YOUR_API_KEY}"
    }
  }
}
```

**Variables:**
- `${CLAUDE_PLUGIN_ROOT}`: Plugin installation directory
- Environment variables: `${YOUR_VAR}`

### LSP Servers

Language Server Protocol integration provides code intelligence.

Configure in `.lsp.json`:
```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

## Progressive Disclosure

For complex skills, use progressive disclosure to keep SKILL.md focused while providing comprehensive documentation.

### Structure

```
skills/my-skill/
├── SKILL.md              # Overview + quick start (loaded immediately)
├── reference.md          # Detailed API docs (loaded on demand)
├── examples.md           # Usage examples (loaded on demand)
└── scripts/
    └── helper.py          # Utility script (executed, not loaded)
```

### Implementation

In SKILL.md, link to supporting files:
```markdown
## Quick Start

[Brief overview and common tasks]

## Additional Resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)

## Utility Scripts

To validate input, run:
```bash
python scripts/helper.py input.txt
```
```

**Benefits:**
- Main SKILL.md stays concise and scannable
- Reference docs load only when needed
- Scripts execute without loading into context
- Reduces token usage for common operations

## Domain-Specific Organization

For multi-domain skills, organize by domain to avoid loading irrelevant context:

```
skills/analytics-skill/
├── SKILL.md              # Overview + navigation
└── reference/
    ├── finance.md        # Revenue, billing metrics
    ├── sales.md          # Opportunities, pipeline
    └── product.md        # API usage, features
```

When users ask about sales analytics, only `sales.md` loads, not finance or product data.

## Troubleshooting

### Skills Not Activating

**Symptom**: Claude doesn't use skills even when task matches description.

**Solutions:**
1. Check description is specific (see Skill Description Writing above)
2. Implement forced eval hook (see Skill Activation Reliability)
3. Restart Claude Code after adding skills
4. Clear plugin cache: `rm -rf ~/.claude/plugins/cache`

### Plugin Installation Failures

**Symptom**: Marketplace works but plugin won't install.

**Check:**
- Plugin source path is correct and accessible
- `plugin.json` exists and has valid JSON
- For private repos, auth tokens are set (`GITHUB_TOKEN`, `GITLAB_TOKEN`)

### Hook Not Firing

**Symptom**: Hook script exists but doesn't execute.

**Solutions:**
1. Verify script is executable: `chmod +x hooks/script.sh`
2. Check hook event name matches (case-sensitive)
3. Test hook manually: `./hooks/script.sh`
4. Check `.claude/settings.json` syntax

## References

### Official Documentation

- [Agent Skills](https://code.claude.com/docs/en/skills) - Complete guide to creating, managing, and sharing Skills
- [Create plugins](https://code.claude.com/docs/en/plugins) - Plugin development with slash commands, agents, hooks, Skills, and MCP servers
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) - Building and hosting plugin marketplaces

### Research & Best Practices

- [How to Make Claude Code Skills Activate Reliably](https://scottspence.com/posts/how-to-make-claude-code-skills-activate-reliably) - Comprehensive testing showing forced eval hooks achieve 84% skill activation vs 20% baseline

### Key Insights from Research

**Skill Activation Problem:**
- Baseline activation rate: ~20% with simple descriptions
- Skills often sit idle despite matching task context
- Simple instruction hooks are insufficient

**Proven Solutions:**
1. **Forced eval hook**: 84% success rate - creates commitment mechanism
2. **LLM eval hook**: 80% success rate - API-based pre-evaluation

**Testing Methodology:**
- 200+ test runs across 5 prompt types
- Multiple hook configurations compared
- Metrics: pass rates, latency, costs per prompt

