# Claude Code Skills Marketplace

A curated marketplace of plugins, skills, commands, and agents for extending [Claude Code](https://claude.ai/code) capabilities.

## Quick Start

**1. Add this marketplace**

```bash
/plugin marketplace add Mearman/marketplace
```

**2. Install a plugin from the list below**

**3. Use the skill**

Ask: "Check if example.com is archived in the Wayback Machine"

<!-- AUTO-GENERATED PLUGINS START -->
## Available Plugins

### GitHub REST API

Tools for repository metadata, READMEs, user profiles, and rate limit checking

**Skills:** github-rate-limit, github-readme, github-repo, github-user

```bash
/plugin install github-api@mearman
```

<details>
<summary>View details</summary>

**Version:** 0.2.0

##### Skills

#### github-rate-limit

Check GitHub API rate limit status and remaining quota. Use when the user asks about API quota, rate limits, or wants to know how many requests are remaining.

#### github-readme

Fetch the README content from a GitHub repository. Use when the user asks for a repository README, documentation, or wants to read the repo's main documentation file.

#### github-repo

Get GitHub repository information including stars, forks, issues, languages, and metadata. Use when the user asks for repository details, GitHub stats, or repo information.

#### github-user

Get GitHub user profile information including repos, followers, and activity. Use when the user asks for GitHub user details, profile information, or developer stats.

</details>

### Gravatar Avatar URLs

Tools for generating avatar URLs from email addresses

**Skills:** gravatar-check, gravatar-download, gravatar-url

```bash
/plugin install gravatar@mearman
```

<details>
<summary>View details</summary>

**Version:** 0.2.0

##### Skills

#### gravatar-check

Check if a Gravatar exists for an email address. Use when the user wants to verify if someone has a Gravatar, check avatar availability, or validate email addresses against Gravatar's database.

#### gravatar-download

Download Gravatar avatar images to local files. Use when the user wants to save Gravatar images, download profile pictures, or create local avatar caches.

#### gravatar-url

Generate a Gravatar avatar URL from an email address. Use when the user asks for a Gravatar URL, wants to generate an avatar from an email, or needs profile image URLs for developers.

</details>

### npm Registry

Tools for searching packages, getting metadata, checking existence, and fetching download statistics

**Skills:** npm-downloads, npm-exists, npm-info, npm-search

```bash
/plugin install npm-registry@mearman
```

<details>
<summary>View details</summary>

**Version:** 0.2.0

##### Skills

#### npm-downloads

Get download statistics for an npm package over time. Use when the user asks for package download counts, popularity metrics, or usage statistics.

#### npm-exists

Check if an npm package name exists in the registry. Use when the user asks if a package name is available, wants to check package existence, or verify if a package is published.

#### npm-info

Get detailed metadata for an npm package including versions, dependencies, maintainers, and repository information. Use when the user asks for package details, version history, or package metadata.

#### npm-search

Search for npm packages by keyword, name, or description. Use when the user asks to search npm packages, find packages related to a topic, or discover packages for a specific purpose.

</details>

### NPMS Package Analysis

Tools for package quality analysis, comparison, and name suggestions

**Skills:** npms-analyze, npms-compare, npms-suggest

```bash
/plugin install npms-io@mearman
```

<details>
<summary>View details</summary>

**Version:** 0.2.0

##### Skills

#### npms-analyze

Analyze npm package quality using NPMS.io scores for quality, popularity, and maintenance. Use when the user asks for package quality analysis, NPMS scores, or package evaluation metrics.

#### npms-compare

Compare multiple npm packages side-by-side using NPMS.io quality scores. Use when the user asks to compare packages, evaluate alternatives, or choose between multiple options.

#### npms-suggest

Get npm package name suggestions and autocomplete from NPMS.io. Use when the user asks for package name suggestions, wants to autocomplete a package name, or search for packages by name pattern.

</details>

### Wayback Machine Archive

Tools for checking, submitting, listing, screenshotting, and cache management for archived URLs

**Skills:** wayback-cache, wayback-check, wayback-list, wayback-screenshot, wayback-submit

```bash
/plugin install wayback@mearman
```

<details>
<summary>View details</summary>

**Version:** 0.7.0

##### Skills

#### wayback-cache

Manage Wayback Machine API cache. Use when clearing cached data, checking cache status, or bypassing cache for fresh API responses. Applies to all wayback operations (check, list, screenshot).

#### wayback-check

Check if a URL is archived in the Wayback Machine. Use when the user asks to check archive status, verify if a page is saved, or find archived versions of a URL.

#### wayback-list

List Wayback Machine snapshots for a URL. Use when the user wants to see archive history, view all snapshots, find older versions, or browse archived copies of a webpage.

#### wayback-screenshot

Retrieve screenshots from the Wayback Machine. Use when the user wants to see how a webpage looked, get a visual snapshot, find archived screenshots, or view historical page appearance.

#### wayback-submit

Submit a URL to the Wayback Machine for archiving. Use when the user wants to archive a webpage, save a page to the Internet Archive, preserve a URL, or create a snapshot.

</details>
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
