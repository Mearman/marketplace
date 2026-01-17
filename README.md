# Claude Code Skills Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/code).

## Usage

```bash
# Add this marketplace
/plugin marketplace add Mearman/marketplace

# Install a plugin
/plugin install wayback@mearman

# Update marketplace catalog (refresh available plugins)
/plugin marketplace update              # Updates all marketplaces
/plugin marketplace update mearman      # Updates specific marketplace

# Update plugins
/plugin update wayback                  # Updates specific plugin
/plugin update                          # Updates all plugins
```

## Plugins

| Plugin | Description |
|--------|-------------|
| `wayback` | Wayback Machine tools for checking, submitting, listing, and screenshotting archived URLs |
