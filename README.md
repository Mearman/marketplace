# Claude Code Skills Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/code).

## Quick Start

```bash
# Add this marketplace
/plugin marketplace add Mearman/marketplace
```

<!-- AUTO-GENERATED PLUGINS START -->
## Available Plugins

| Plugin | Description | Skills | Install |
|--------|-------------|--------|---------|
| `github-api` | GitHub REST API tools for repository metadata, READMEs, user profiles, and rate limit checking | github-rate-limit, github-readme, github-repo, github-user | `/plugin install github-api@mearman` |
| `gravatar` | Gravatar tools for generating avatar URLs from email addresses | gravatar-url | `/plugin install gravatar@mearman` |
| `npm-registry` | npm registry tools for searching packages, getting metadata, checking existence, and fetching download statistics | npm-downloads, npm-exists, npm-info, npm-search | `/plugin install npm-registry@mearman` |
| `npms-io` | NPMS.io tools for package quality analysis, comparison, and name suggestions | npms-analyze, npms-compare, npms-suggest | `/plugin install npms-io@mearman` |
| `wayback` | Wayback Machine tools for checking, submitting, listing, screenshotting, and cache management for archived URLs | wayback-cache, wayback-check, wayback-list, wayback-screenshot, wayback-submit | `/plugin install wayback@mearman` |

## Plugin Details

<details>
<summary><b>github-api</b> (4 skills) - GitHub REST API tools for repository metadata, READMEs, user profiles, and rate limit checking</summary>

#### Skills

### github-rate-limit

Check GitHub API rate limit status and remaining quota. Use when the user asks about API quota, rate limits, or wants to know how many requests are remaining.

### github-readme

Fetch the README content from a GitHub repository. Use when the user asks for a repository README, documentation, or wants to read the repo's main documentation file.

### github-repo

Get GitHub repository information including stars, forks, issues, languages, and metadata. Use when the user asks for repository details, GitHub stats, or repo information.

### github-user

Get GitHub user profile information including repos, followers, and activity. Use when the user asks for GitHub user details, profile information, or developer stats.

**Version:** 0.2.0
**Install:** `/plugin install github-api@mearman`

</details>

<details>
<summary><b>gravatar</b> (1 skill) - Gravatar tools for generating avatar URLs from email addresses</summary>

#### Skills

### gravatar-url

Generate a Gravatar avatar URL from an email address. Use when the user asks for a Gravatar URL, wants to generate an avatar from an email, or needs profile image URLs for developers.

**Version:** 0.2.0
**Install:** `/plugin install gravatar@mearman`

</details>

<details>
<summary><b>npm-registry</b> (4 skills) - npm registry tools for searching packages, getting metadata, checking existence, and fetching download statistics</summary>

#### Skills

### npm-downloads

Get download statistics for an npm package over time. Use when the user asks for package download counts, popularity metrics, or usage statistics.

### npm-exists

Check if an npm package name exists in the registry. Use when the user asks if a package name is available, wants to check package existence, or verify if a package is published.

### npm-info

Get detailed metadata for an npm package including versions, dependencies, maintainers, and repository information. Use when the user asks for package details, version history, or package metadata.

### npm-search

Search for npm packages by keyword, name, or description. Use when the user asks to search npm packages, find packages related to a topic, or discover packages for a specific purpose.

**Version:** 0.2.0
**Install:** `/plugin install npm-registry@mearman`

</details>

<details>
<summary><b>npms-io</b> (3 skills) - NPMS.io tools for package quality analysis, comparison, and name suggestions</summary>

#### Skills

### npms-analyze

Analyze npm package quality using NPMS.io scores for quality, popularity, and maintenance. Use when the user asks for package quality analysis, NPMS scores, or package evaluation metrics.

### npms-compare

Compare multiple npm packages side-by-side using NPMS.io quality scores. Use when the user asks to compare packages, evaluate alternatives, or choose between multiple options.

### npms-suggest

Get npm package name suggestions and autocomplete from NPMS.io. Use when the user asks for package name suggestions, wants to autocomplete a package name, or search for packages by name pattern.

**Version:** 0.2.0
**Install:** `/plugin install npms-io@mearman`

</details>

<details>
<summary><b>wayback</b> (5 skills) - Wayback Machine tools for checking, submitting, listing, screenshotting, and cache management for archived URLs</summary>

#### Skills

### wayback-cache

Manage Wayback Machine API cache. Use when clearing cached data, checking cache status, or bypassing cache for fresh API responses. Applies to all wayback operations (check, list, screenshot).

### wayback-check

Check if a URL is archived in the Wayback Machine. Use when the user asks to check archive status, verify if a page is saved, or find archived versions of a URL.

### wayback-list

List Wayback Machine snapshots for a URL. Use when the user wants to see archive history, view all snapshots, find older versions, or browse archived copies of a webpage.

### wayback-screenshot

Retrieve screenshots from the Wayback Machine. Use when the user wants to see how a webpage looked, get a visual snapshot, find archived screenshots, or view historical page appearance.

### wayback-submit

Submit a URL to the Wayback Machine for archiving. Use when the user wants to archive a webpage, save a page to the Internet Archive, preserve a URL, or create a snapshot.

**Version:** 0.7.0
**Install:** `/plugin install wayback@mearman`

</details>
<!-- AUTO-GENERATED PLUGINS END -->

## Usage

<details>
<summary>Installation & Updates</summary>

### Install Plugin
```bash
/plugin install wayback@mearman
```

### Update Marketplace
```bash
# Update all marketplaces
/plugin marketplace update

# Update specific marketplace
/plugin marketplace update mearman
```

### Update Plugins
```bash
# Update specific plugin
/plugin update wayback@mearman

# Or use shorthand (assumes @mearman)
/plugin update wayback

# Update all plugins
/plugin update
```

</details>

## Documentation

<details>
<summary>Developer Documentation</summary>

- [AGENTS.md](AGENTS.md) - Repository guidance for contributors
- [CHANGELOG.md](CHANGELOG.md) - Release notes and version history

</details>
