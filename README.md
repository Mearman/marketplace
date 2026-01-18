# Claude Code Skills Marketplace

[Claude Code](https://claude.ai/code) supports distributing [plugins](https://code.claude.com/docs/en/plugins) via **[Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)** - Git repositories that catalog plugins from various sources (GitHub, Git URLs, local paths). Plugins extend Claude Code with [skills](https://code.claude.com/docs/en/skills), [slash commands](https://code.claude.com/docs/en/slash-commands), [hooks](https://code.claude.com/docs/en/hooks), [custom agents](https://code.claude.com/docs/en/sub-agents), and protocol servers ([MCP](https://code.claude.com/docs/en/mcp), [LSP](https://code.claude.com/docs/en/plugins-reference#lsp-servers)).

This repository is a marketplace maintained by [@Mearman](https://github.com/Mearman), containing tools for web APIs, package registries, security scanning, and archival services.

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

### CVE Search v0.3.0

Tools for searching vulnerabilities by CVE ID, product name, or vendor, with detailed vulnerability information and dependency auditing

```bash
/plugin install cve-search@mearman
```

##### Skills

<details>
<summary>CVE Dependency Audit</summary>

Automatically scan your project's dependencies and identify known Common Vulnerabilities and Exposures (CVEs). Supports Node.js, Python, Ruby, Go, and Maven projects.


```bash
npx tsx scripts/audit.ts [directory] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `directory` | No | Directory to scan (default: current directory) |

### Options

| Option | Description |
|--------|-------------|
| `--severity=<level>` | Filter by severity: `critical`, `high`, `medium`, `low` |
| `--no-cache` | Bypass cache and fetch fresh data |
| `--json` | Output results as JSON |

### Output

```
🔍 Scanning for dependencies in /home/user/myproject...

Found dependency files: package.json, requirements.txt

Scanning 45 dependencies for CVEs...

📊 Audit Results

Total vulnerabilities found: 8
  🔴 Critical: 1 | 🟠 High: 2 | 🟡 Medium: 4 | 🔵 Low: 1

Showing 3 critical/high vulnerabilities:

🔴 CVE-2023-4567 (Critical - 9.8)
  Package: lodash < 4.17.21
  Fixed in: 4.17.21
  https://nvd.nist.gov/vuln/detail/CVE-2023-4567

🟠 CVE-2023-8901 (High - 7.5)
  Package: axios < 1.6.0
  Fixed in: 1.6.0
  https://nvd.nist.gov/vuln/detail/CVE-2023-8901
```


</details>

<details>
<summary>CVE Vulnerability Lookup</summary>

Search for Common Vulnerabilities and Exposures (CVEs) with detailed information including severity scores, affected software, and references.


```bash
npx tsx scripts/lookup.ts [cve-id | --product <name>] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `cve-id` | No*| Search by CVE ID (e.g., CVE-2024-1086) |
| `--product` | No* | Search for CVEs affecting a product |

*Either `cve-id` or `--product` must be provided

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data |
| `--limit=<n>` | Limit results for product search (default: 10) |

### Output

CVE ID Search Output:
```
📋 CVE-2024-1086
Severity: HIGH (7.8)
Published: 2024-01-15 12:30
Modified: 2024-01-20 08:45

Summary:
  A buffer overflow vulnerability in Linux kernel network stack...

CVSS v3.1: 7.8 (CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H)

Affected Software:
  1. Linux Kernel - Versions 5.15 to 6.6, 6.7-rc1 to 6.7
     Versions: 5.15.0, 5.16.0, 6.0.0, 6.1.0, 6.2.0 ... and 15 more

Weaknesses: CWE-120 (Buffer Copy without Checking Size of Input)

References:
  1. https://nvd.nist.gov/vuln/detail/CVE-2024-1086
  2. https://www.cisa.gov/news-events/alerts/2024/01/15/...
  3. https://github.com/advisories/GHSA-...
```


</details>

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


```bash
npx tsx scripts/readme.ts <repository> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `repository` | Yes | Repository in format `owner/repo` or full GitHub URL |

### Options

| Option | Description |
|--------|-------------|
| `--token=TOKEN` | GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
README.md from facebook/react
-----------------------------
Size: 12.3 KB
URL: https://github.com/facebook/react/blob/main/README.md

# README Contents

[decoded README content displayed here]
```


</details>

<details>
<summary>Get GitHub Repository Information</summary>

Retrieve detailed information about a GitHub repository.


```bash
npx tsx scripts/repo.ts <repository> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `repository` | Yes | Repository in format `owner/repo` or full GitHub URL |

### Options

| Option | Description |
|--------|-------------|
| `--token=TOKEN` | GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
facebook/react
----------------
Description: A declarative, efficient, and flexible JavaScript library for building user interfaces.
Created: 2013-05-24
Updated: 2023-10-15
Pushed: 2023-10-15

Statistics:
  Stars: 213,456
  Forks: 45,678
  Open issues: 1,234
  Watchers: 7,890

Details:
  Language: TypeScript
  License: MIT
  Private: No
  Fork: No
  Default branch: main

Features:
  Issues: Enabled
  Projects: Enabled
  Wiki: Enabled
  Pages: Disabled
```


</details>

<details>
<summary>Get GitHub User Profile</summary>

Retrieve detailed information about a GitHub user or organization.


```bash
npx tsx scripts/user.ts <username> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `username` | Yes | GitHub username |

### Options

| Option | Description |
|--------|-------------|
| `--token=TOKEN` | GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
torvalds (Linus Torvalds)
--------------------------
Bio: Creator of Linux
Location: Portland, OR
Company: Linux Foundation

Account:
  Type: User
  Created: 2010-08-19
  Updated: 2023-10-01
  Hireable: Yes

Statistics:
  Public repos: 12
  Public gists: 5
  Followers: 156,789
  Following: 0

Links:
  Profile: https://github.com/torvalds
  Blog: https://lkml.org/
  Avatar: https://avatars.githubusercontent.com/u/102402?v=4
```


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


```bash
npx tsx scripts/check.ts <email> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `email` | Yes | Email address to check for Gravatar |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from Gravatar |

### Output

When Gravatar exists:
```
Checking: user@example.com

✓ Gravatar exists
  Hash: b48bf4373d7b7374351c0544f36f7fc3
  URL: https://www.gravatar.com/avatar/b48bf4373d7b7374351c0544f36f7fc3
  Profile: https://www.gravatar.com/b48bf4373d7b7374351c0544f36f7fc3
```

When no Gravatar found:
```
Checking: nonexistent@example.com

✗ No Gravatar found
  Hash: abc123def456789...
  This email does not have a Gravatar image.
  A default image will be shown.
```


</details>

<details>
<summary>Download Gravatar Images</summary>

Download Gravatar avatar images to local files.


```bash
npx tsx scripts/download.ts <email> <output-file> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `email` | Yes | Email address |
| `output-file` | Yes | Path where image will be saved |

### Options

| Option | Description |
|--------|-------------|
| `--size=N` | Image size in pixels (default: 200, max: 2048) |
| `--default=TYPE` | Default image type: mp, identicon, monsterid, wavatar, retro, robohash, blank |
| `--rating=LEVEL` | Rating level: g, pg, r, x (default: g) |
| `--no-cache` | Bypass cache and fetch fresh data |

### Output

```
Email: user@example.com
Output: avatar.jpg
Hash: b48bf4373d7b7374351c0544f36f7fc3

✓ Downloaded successfully
  Size: 12.4 KB
  File: avatar.jpg
```


</details>

<details>
<summary>Generate Gravatar URL</summary>

Generate a Gravatar avatar URL from an email address.


```bash
npx tsx scripts/url.ts <email> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `email` | Yes | Email address |

### Options

| Option | Description |
|--------|-------------|
| `--size=N` | Image size in pixels (default: 80, max: 2048) |
| `--default=TYPE` | Default image type: mp, identicon, monsterid, wavatar, retro, robohash, blank (default: mp) |
| `--rating=LEVEL` | Rating level: g, pg, r, x (default: g) |
| `--force-default` | Force the default image even if user has a Gravatar |

### Output

```
Email: user@example.com
Hash: b48bf4373d7b7374351c0544f36f7fc3
URL: https://www.gravatar.com/avatar/b48bf4373d7b7374351c0544f36f7fc3?s=80&d=mp&r=g
```


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


```bash
npx tsx scripts/downloads.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--period=PERIOD` | Time period: last-week, last-month, last-year (default: last-month) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Downloads for react (last-month)
--------------------------------
Period: 2023-10-01 to 2023-10-31 (31 days)
Total downloads: 15,234,567
Average per day: 491,438
Peak day: 2023-10-15 (678,234 downloads)
```


</details>

<details>
<summary>Check npm Package Existence</summary>

Check if a package name exists in the npm registry.


```bash
npx tsx scripts/exists.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name to check (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

Package exists:
```
✓ Package "react" exists
  URL: https://www.npmjs.com/package/react
  Published: Yes
```

Package does not exist:
```
✗ Package "my-awesome-pkg-12345" does not exist
  The name is available for use
```


</details>

<details>
<summary>Get npm Package Information</summary>

Retrieve detailed metadata for a specific npm package.


```bash
npx tsx scripts/info.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
react
------
Description: React is a JavaScript library for building user interfaces.
Latest: 18.2.0
License: MIT
Homepage: https://react.dev
Repository: https://github.com/facebook/react

Versions (last 5):
  18.2.0 - Published 2022-06-14
  18.1.0 - Published 2022-04-26
  18.0.0 - Published 2022-03-29
  17.0.2 - Published 2021-03-10
  17.0.1 - Published 2020-12-20

Maintainers:
  - @hzoo
  - @acdlite
```


</details>

<details>
<summary>Search npm Registry</summary>

Search the npm registry for packages by keyword, name, or description.


```bash
npx tsx scripts/search.ts <query> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search query (can be package name, keyword, or description text) |

### Options

| Option | Description |
|--------|-------------|
| `--size=N` | Number of results to return (default: 20, max: 250) |
| `--from=N` | Offset for pagination (default: 0) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Found 1,234 packages for "http"

1. express (4.18.2)
   Fast, unopinionated, minimalist web framework
   Score: 0.98 (quality: 0.95, popularity: 1.0, maintenance: 0.99)
   https://www.npmjs.com/package/express

2. axios (1.6.0)
   Promise based HTTP client for the browser and node.js
   Score: 0.97 (quality: 0.94, popularity: 1.0, maintenance: 0.98)
   https://www.npmjs.com/package/axios
```


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


```bash
npx tsx scripts/analyze.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-sensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
react - Package Analysis
-------------------------

Quality Scores:
  Overall: 98/100
  Quality: 95/100
  Popularity: 100/100
  Maintenance: 99/100

Package Information:
  Version: 18.2.0
  Description: A declarative, efficient, and flexible JavaScript library...
  Published: 2013-05-24

npm Statistics:
  Week: 2,345,678 downloads
  Month: 9,876,543 downloads
  Year: 98,765,432 downloads

GitHub Activity:
  Stars: 213,456
  Forks: 45,678
  Open Issues: 1,234
  Contributors: 1,567
  Latest Commit: 2 days ago

Project Health:
  ✓ Has contributing guide
  ✓ Has license
  ✓ Has security policy
```


</details>

<details>
<summary>Compare npm Packages (NPMS.io)</summary>

Compare multiple npm packages side-by-side using NPMS.io quality scores.


```bash
npx tsx scripts/compare.ts <package1> <package2> [package3...] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package1` | Yes | First package to compare |
| `package2` | Yes | Second package to compare |
| `package3...` | No | Additional packages to compare |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Package Comparison: react vs vue vs angular
-------------------------------------------

┌──────────────┬──────────┬──────────┬──────────┐
│ Metric       │ react    │ vue      │ angular  │
├──────────────┼──────────┼──────────┼──────────┤
│ Overall      │ 98/100   │ 95/100   │ 92/100   │
│ Quality      │ 95/100   │ 93/100   │ 90/100   │
│ Popularity   │ 100/100  │ 97/100   │ 95/100   │
│ Maintenance  │ 99/100   │ 96/100   │ 91/100   │
├──────────────┼──────────┼──────────┼──────────┤
│ Version      │ 18.2.0   │ 3.3.4    │ 16.2.0   │
│ Stars        │ 213K     │ 204K     │ 92K      │
│ Forks        │ 45K      │ 34K      │ 25K      │
│ Issues       │ 1.2K     │ 890      │ 1.5K     │
│ Downloads/Mo │ 9.8M     │ 3.2M     │ 2.1M     │
└──────────────┴──────────┴──────────┴──────────┘
```


</details>

<details>
<summary>Get npm Package Name Suggestions (NPMS.io)</summary>

Get package name suggestions and autocomplete from NPMS.io based on a search query.


```bash
npx tsx scripts/suggest.ts <query> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search query (minimum 2 characters) |

### Options

| Option | Description |
|--------|-------------|
| `--size=N` | Number of suggestions to return (default: 25, max: 250) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Suggestions for "react" (25 results)
------------------------------------

1. react
   Score: 1000000
   URL: https://www.npmjs.com/package/react

2. react-dom
   Score: 950000
   URL: https://www.npmjs.com/package/react-dom

3. react-redux
   Score: 923000
   URL: https://www.npmjs.com/package/react-redux

...

Top 10 suggestions:
  react, react-dom, react-redux, react-router, react-scripts,
  react-native, react-hook-form, react-query, react-test-renderer
```


</details>

### PyPI JSON API v0.2.2

Tools for querying Python package metadata, release information, and statistics from the Python Package Index

```bash
/plugin install pypi-json@mearman
```

##### Skills

<details>
<summary>PyPI Package Information</summary>

Retrieve comprehensive metadata for Python packages from the Python Package Index (PyPI).


```bash
npx tsx scripts/info.ts <package-name> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `package-name` | Yes | The exact package name (case-insensitive) |

### Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache and fetch fresh data from PyPI |
| `--releases` | Show detailed release history and file information |
| `--files` | Show distribution files for the latest release |

### Output

```
django
==================================================
Latest Version: 5.0.1
License: BSD
Author: Django Software Foundation

Summary:
A high-level Python web framework that encourages rapid development and clean,
pragmatic design.

Project URLs:
  Documentation: https://docs.djangoproject.com/
  Repository: https://github.com/django/django
  Bug Tracker: https://code.djangoproject.com/

Python Requirement: >=3.10

Dependencies (latest):
  - asgiref >=3.6.0,<4
  - sqlparse >=0.2.2
```

Run from the pypi-json plugin directory: `~/.claude/plugins/cache/pypi-json/`


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


```bash
# Clear all cache before checking a URL
npx tsx scripts/cache.ts clear
npx tsx scripts/check.ts https://example.com

# Clear cache, then list snapshots
npx tsx scripts/cache.ts clear
npx tsx scripts/list.ts https://example.com 20

# Check cache status
npx tsx scripts/cache.ts status
```


</details>

<details>
<summary>Check Wayback Machine Archive Status</summary>

Check if a URL has been archived by the Internet Archive's Wayback Machine.


```bash
npx tsx scripts/check.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to check |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in archived URL |
| `--timestamp=DATE` | Find snapshot closest to date (YYYYMMDD or YYYYMMDDhhmmss) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

When archived:
```
✓ Archived
  Timestamp: January 1, 2024 (3 days ago)
  URL: https://web.archive.org/web/20240101120000id_/https://example.com
```

When not archived:
```
✗ Not archived
  Consider using wayback-submit to archive this URL.
```


</details>

<details>
<summary>List Wayback Machine Snapshots</summary>

Retrieve a list of archived snapshots for a URL from the Wayback Machine CDX API.


```bash
npx tsx scripts/list.ts <url> [limit] [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to search for |
| `limit` | No | Max number of results (default: unlimited) |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in URLs |
| `--with-screenshots` | Cross-reference to show which captures have screenshots (📷) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
January 1, 2024 (3 days ago)
  https://web.archive.org/web/20240101120000id_/https://example.com

December 15, 2023 (20 days ago)
  https://web.archive.org/web/20231215100000id_/https://example.com

Total: 2 snapshot(s)
```


</details>

<details>
<summary>Retrieve Wayback Machine Screenshots</summary>

Access existing screenshots stored by the Wayback Machine.


```bash
npx tsx scripts/screenshot.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | The URL to find screenshots for |

### Options

| Option | Description |
|--------|-------------|
| `--timestamp=DATE` | Get screenshot from specific capture (YYYYMMDDhhmmss) |
| `--list` | List available screenshots for URL |
| `--download=PATH` | Download screenshot to file |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
Screenshots for: https://example.com/

January 15, 2024 12:34 (3 days ago)
  https://web.archive.org/web/20240115123456im_/https://example.com/

December 1, 2023 08:00 (46 days ago)
  https://web.archive.org/web/20231201080000im_/https://example.com/

Total: 2 screenshot(s)
```


</details>

<details>
<summary>Submit URL to Wayback Machine</summary>

Submit a URL to the Internet Archive's Wayback Machine using the Save Page Now 2 (SPN2) API.


```bash
npx tsx scripts/submit.ts <url> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `url` | Yes | URL to archive |

### Options

| Option | Description |
|--------|-------------|
| `--no-raw` | Include Wayback toolbar in archived URL |
| `--key=ACCESS:SECRET` | Use API authentication (get keys at https://archive.org/account/s3.php) |

### Output

When submission succeeds:
```
✓ Archive submitted successfully
  Job ID: spn2-abc123...
  Check status: https://web.archive.org/save/status/spn2-abc123...

  Waiting for capture...
  ✓ Capture complete
  URL: https://web.archive.org/web/20240115123456id_/https://example.com
```


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
