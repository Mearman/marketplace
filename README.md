# Claude Code Skills Marketplace

A curated marketplace of plugins, skills, commands, and agents for extending [Claude Code](https://claude.ai/code) capabilities.

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

### GitHub REST API v0.2.0

Tools for repository metadata, READMEs, user profiles, and rate limit checking

```bash
/plugin install github-api@mearman
```

##### Skills

<details>
<summary>Check GitHub API Rate Limit</summary>

Check your current GitHub API rate limit status and remaining requests.

</details>

<details>
<summary>Get GitHub Repository README</summary>

Fetch and decode the README content from a GitHub repository.

</details>

<details>
<summary>Get GitHub Repository Information</summary>

Retrieve detailed information about a GitHub repository.

</details>

<details>
<summary>Get GitHub User Profile</summary>

Retrieve detailed information about a GitHub user or organization.

</details>

### Gravatar Avatar URLs v0.2.0

Tools for generating avatar URLs from email addresses

```bash
/plugin install gravatar@mearman
```

##### Skills

<details>
<summary>Check Gravatar Availability</summary>

Check if a Gravatar avatar exists for an email address.

</details>

<details>
<summary>Download Gravatar Images</summary>

Download Gravatar avatar images to local files.

</details>

<details>
<summary>Generate Gravatar URL</summary>

Generate a Gravatar avatar URL from an email address.

</details>

### npm Registry v0.2.0

Tools for searching packages, getting metadata, checking existence, and fetching download statistics

```bash
/plugin install npm-registry@mearman
```

##### Skills

<details>
<summary>Get npm Download Statistics</summary>

Retrieve download statistics for an npm package over a specified time period.

</details>

<details>
<summary>Check npm Package Existence</summary>

Check if a package name exists in the npm registry.

</details>

<details>
<summary>Get npm Package Information</summary>

Retrieve detailed metadata for a specific npm package.

</details>

<details>
<summary>Search npm Registry</summary>

Search the npm registry for packages by keyword, name, or description.

</details>

### NPMS Package Analysis v0.2.0

Tools for package quality analysis, comparison, and name suggestions

```bash
/plugin install npms-io@mearman
```

##### Skills

<details>
<summary>Analyze npm Package Quality (NPMS.io)</summary>

Analyze an npm package using NPMS.io quality, popularity, and maintenance scores.

</details>

<details>
<summary>Compare npm Packages (NPMS.io)</summary>

Compare multiple npm packages side-by-side using NPMS.io quality scores.

</details>

<details>
<summary>Get npm Package Name Suggestions (NPMS.io)</summary>

Get package name suggestions and autocomplete from NPMS.io based on a search query.

</details>

### Wayback Machine Archive v0.7.0

Tools for checking, submitting, listing, screenshotting, and cache management for archived URLs

```bash
/plugin install wayback@mearman
```

##### Skills

<details>
<summary>Wayback Cache Management</summary>

Manage the OS tmpdir-based cache for Wayback Machine API responses.

</details>

<details>
<summary>Check Wayback Machine Archive Status</summary>

Check if a URL has been archived by the Internet Archive's Wayback Machine.

</details>

<details>
<summary>List Wayback Machine Snapshots</summary>

Retrieve a list of archived snapshots for a URL from the Wayback Machine CDX API.

</details>

<details>
<summary>Retrieve Wayback Machine Screenshots</summary>

Access existing screenshots stored by the Wayback Machine.

</details>

<details>
<summary>Submit URL to Wayback Machine</summary>

Submit a URL to the Internet Archive's Wayback Machine using the Save Page Now 2 (SPN2) API.

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
