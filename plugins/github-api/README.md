# GitHub REST API (github-api)

GitHub REST API: Tools for repository metadata, READMEs, user profiles, and rate limit checking

**Version:** v0.2.0
**Install:** `/plugin install github-api@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Check GitHub API Rate Limit

Check your current GitHub API rate limit status and remaining requests.

## Usage

```bash
npx tsx scripts/rate-limit.ts [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--token=TOKEN` | GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var) |
| `--no-cache` | Bypass cache and fetch fresh data from API |

### Output

```
GitHub API Rate Limit Status
-----------------------------

Core API:
  Limit: 5,000 requests/hour
  Used: 1,234 requests
  Remaining: 3,766 requests
  Resets in: 23 minutes

Search API:
  Limit: 30 requests/minute
  Used: 5 requests
  Remaining: 25 requests
  Resets in: 45 seconds

Authentication: Authenticated (your_token_here)
```

## Script Execution (Preferred)

```bash
npx tsx scripts/rate-limit.ts [options]
```

Options:
- `--token=TOKEN` - GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the github-api plugin directory: `~/.claude/plugins/cache/github-api/`

## Rate Limit API

```
GET https://api.github.com/rate_limit
```

## Response Format

The response contains rate limit information for different API categories:

```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "used": 1234,
      "remaining": 3766,
      "reset": 1697376000
    },
    "search": {
      "limit": 30,
      "used": 5,
      "remaining": 25,
      "reset": 1697372400
    }
  },
  "rate": {
    "limit": 5000,
    "used": 1234,
    "remaining": 3766,
    "reset": 1697376000
  }
}
```

## Rate Limit Categories

### Core API
- **Endpoints**: Most GitHub REST API endpoints
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour
- **Reset**: Hourly

### Search API
- **Endpoints**: Search endpoints (e.g., code search, repo search)
- **Unauthenticated**: 10 requests/minute
- **Authenticated**: 30 requests/minute
- **Reset**: Every minute

## Rate Limits by Authentication

| Authentication Type | Core API | Search API |
|---------------------|----------|------------|
| None (Unauthenticated) | 60/hour | 10/minute |
| Personal Access Token | 5,000/hour | 30/minute |
| OAuth App | 5,000/hour | 30/minute |
| GitHub App Installation | 5,000/hour | 30/minute |

## Authentication

To check your authenticated rate limit, provide a GitHub Personal Access Token:

**Via environment variable:**
```bash
export GITHUB_TOKEN=your_token_here
npx tsx scripts/rate-limit.ts
```

**Via command-line option:**
```bash
npx tsx scripts/rate-limit.ts --token=your_token_here
```

Create a token at: https://github.com/settings/tokens

## Caching

Rate limit status is cached for 5 minutes. Rate limits reset frequently, so short cache times provide near-real-time accuracy while improving performance.

Use the `--no-cache` flag to bypass the cache.

## Best Practices

1. **Check before bulk operations**: Run this script before making many API calls
2. **Use authentication**: Authenticated requests have 80x more quota
3. **Handle rate limits**: Implement exponential backoff when limits are approached
4. **Cache responses**: Use caching to reduce redundant API calls

## Rate Limit Exhaustion

When you exceed your rate limit:

```
HTTP 403 Forbidden
{
  "message": "API rate limit exceeded for xxx.xxx.xxx.xxx.",
  "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
}
```

**Solutions:**
1. Wait for the quota to reset (shown in the output)
2. Authenticate with a Personal Access Token
3. Use conditional requests with `If-None-Match` headers
4. Implement caching to reduce redundant requests

## Related

- Use `github-repo` to get repository information (consumes core quota)
- Use `github-readme` to fetch READMEs (consumes core quota)
- Use `github-user` to get user profiles (consumes core quota)

## Error Handling

**Authentication errors**: Verify your token is valid and not expired.

**Network errors**: Check your internet connection and try again.

**Invalid response**: The GitHub API may be temporarily unavailable.

## Use Cases

### Before Bulk Operations
Check quota before running many API calls:
```bash
npx tsx scripts/rate-limit.ts --token=$GITHUB_TOKEN
```

### Monitor Usage
Track API usage during development:
```bash
npx tsx scripts/rate-limit.ts
```

### Debug Rate Limit Issues
Diagnose rate limit problems:
```bash
npx tsx scripts/rate-limit.ts --no-cache
```

## Notes

- Rate limits are per IP address for unauthenticated requests
- Rate limits are per authenticated user/token
- Different API categories have different rate limits
- The `reset` timestamp is Unix epoch time in seconds
- Rate limits reset at the top of each hour/minute

# Get GitHub Repository README

Fetch and decode the README content from a GitHub repository.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/readme.ts <repository> [options]
```

Options:
- `--token=TOKEN` - GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the github-api plugin directory: `~/.claude/plugins/cache/github-api/`

## README API

```
GET https://api.github.com/repos/{owner}/{repo}/readme
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `owner` | Yes | Repository owner (user or organization) |
| `repo` | Yes | Repository name |

### Examples

Get README content:
```
https://api.github.com/repos/facebook/react/readme
```

## Response Format

The response contains README metadata and base64-encoded content:

- **`name`** - README filename (e.g., "README.md")
- **`path`** - Path to the README
- **`sha`** - Git SHA for the file
- **`size`** - File size in bytes
- **`url`** - API URL for the file
- **`html_url`** - GitHub URL to view the README
- **`content`** - Base64-encoded content
- **`encoding`** - Encoding type (always "base64")

## README Detection

GitHub automatically detects and prioritizes README files in this order:
1. `README.md`
2. `README.markdown`
3. `README.rst`
4. `README.asciidoc`
5. `README.textile`
6. `README.creole`
7. `README`

The API returns the first matching file found.

## URL Format Support

The script accepts various URL formats:
- `owner/repo` (simple format)
- `https://github.com/owner/repo`
- `git+https://github.com/owner/repo`
- `git@github.com:owner/repo`
- `ssh://git@github.com/owner/repo`

## Authentication

README access follows GitHub visibility rules:
- **Public repositories**: No authentication required
- **Private repositories**: Valid token with `repo` scope required

To access private repositories, provide a GitHub Personal Access Token:

**Via environment variable:**
```bash
export GITHUB_TOKEN=your_token_here
npx tsx scripts/readme.ts private/repo
```

**Via command-line option:**
```bash
npx tsx scripts/readme.ts private/repo --token=your_token_here
```

## Caching

README content is cached for 1 hour. READMEs change relatively infrequently, so this provides a good balance between freshness and performance.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `github-repo` to get repository metadata
- Use `github-user` to get owner profile information
- Use `github-rate-limit` to check your remaining API quota

## Error Handling

**No README found**: Not all repositories have READMEs. The API will return 404 if no README file exists.

**Repository not found**: Verify the owner and repository name are correct.

**Private repository**: Authentication required for private repositories. Provide a valid token.

**Rate limit exceeded**: Use a Personal Access Token for higher rate limits.

## Use Cases

### Package Documentation
Read package documentation from source:
```bash
npx tsx scripts/readme.ts facebook/react
npx tsx scripts/readme.ts vercel/next.js
```

### Quick Reference
Get quick reference for a repository:
```bash
npx tsx scripts/readme.ts nodejs/node
```

### Private Repository Docs
Access private repository documentation:
```bash
npx tsx scripts/readme.ts mycompany/private-repo --token=$GITHUB_TOKEN
```

## Notes

- README content is base64-encoded and decoded automatically
- Large READMEs are fully displayed
- Markdown and other markup formats are displayed in raw form
- For rendered Markdown, use the HTML URL provided in the output

# Get GitHub Repository Information

Retrieve detailed information about a GitHub repository.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/repo.ts <repository> [options]
```

Options:
- `--token=TOKEN` - GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the github-api plugin directory: `~/.claude/plugins/cache/github-api/`

## Repository API

```
GET https://api.github.com/repos/{owner}/{repo}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `owner` | Yes | Repository owner (user or organization) |
| `repo` | Yes | Repository name |

### Examples

Get repository information:
```
https://api.github.com/repos/facebook/react
```

## Response Format

The response contains comprehensive repository metadata:

- **`id`** - Repository ID
- **`name`** - Repository name
- **`full_name`** - Owner/repo (e.g., "facebook/react")
- **`owner`** - Owner object (login, id, avatar_url, type, etc.)
- **`description`** - Repository description
- **`private`** - Whether the repository is private
- **`fork`** - Whether this is a fork
- **`created_at`** - Creation timestamp
- **`updated_at`** - Last update timestamp
- **`pushed_at`** - Last push timestamp
- **`homepage`** - Homepage URL
- **`size`** - Repository size in kilobytes
- **`stargazers_count`** - Number of stars
- **`watchers_count`** - Number of watchers
- **`language`** - Primary programming language
- **`languages_url`** - URL to get all languages
- **`has_issues`** - Whether issues are enabled
- **`has_projects`** - Whether projects are enabled
- **`has_wiki`** - Whether wiki is enabled
- **`has_pages`** - Whether GitHub Pages is enabled
- **`forks_count`** - Number of forks
- **`open_issues_count`** - Number of open issues
- **`license`** - License information
- **`topics`** - Repository topics
- **`default_branch`** - Default branch name

## URL Format Support

The script accepts various URL formats:
- `owner/repo` (simple format)
- `https://github.com/owner/repo`
- `git+https://github.com/owner/repo`
- `git@github.com:owner/repo`
- `ssh://git@github.com/owner/repo`

All formats are automatically parsed to extract owner and repo.

## Authentication

GitHub API rate limits:
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

To increase your rate limit, provide a GitHub Personal Access Token:

**Via environment variable:**
```bash
export GITHUB_TOKEN=your_token_here
npx tsx scripts/repo.ts facebook/react
```

**Via command-line option:**
```bash
npx tsx scripts/repo.ts facebook/react --token=your_token_here
```

Create a token at: https://github.com/settings/tokens

## Caching

Repository metadata is cached for 30 minutes. Repository information changes relatively infrequently, so this provides good freshness while improving performance.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `github-readme` to fetch the repository README
- Use `github-user` to get owner profile information
- Use `github-rate-limit` to check your remaining API quota

## Error Handling

**Repository not found**: Verify the owner and repository name are correct. Private repositories require authentication with appropriate access.

**Rate limit exceeded**: Use a Personal Access Token to increase your quota, or wait for the quota to reset (hourly).

**Authentication errors**: Ensure your token is valid and has the necessary permissions (for private repos).

## Use Cases

### Package Research
Get GitHub information for npm packages:
```bash
npx tsx scripts/repo.ts facebook/react
npx tsx scripts/repo.ts vercel/next.js
```

### Repository Stats
Check popularity and activity:
```bash
npx tsx scripts/repo.ts nodejs/node --token=$GITHUB_TOKEN
```

### License Information
Check repository license:
```bash
npx tsx scripts/repo.ts microsoft/typescript
```

# Get GitHub User Profile

Retrieve detailed information about a GitHub user or organization.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/user.ts <username> [options]
```

Options:
- `--token=TOKEN` - GitHub Personal Access Token (optional, overrides GITHUB_TOKEN env var)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the github-api plugin directory: `~/.claude/plugins/cache/github-api/`

## User API

```
GET https://api.github.com/users/{username}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `username` | Yes | GitHub username |

### Examples

Get user information:
```
https://api.github.com/users/torvalds
```

## Response Format

The response contains comprehensive user profile metadata:

- **`login`** - Username
- **`id`** - User ID
- **`node_id`** - Node ID
- **`avatar_url`** - Avatar image URL
- **`gravatar_id`** - Gravatar ID
- **`url`** - API URL for the user
- **`html_url`** - GitHub profile URL
- **`type`** - User type ("User" or "Organization")
- **`site_admin`** - Whether the user is a GitHub admin
- **`name`** - Display name
- **`company`** - Company
- **`blog`** - Blog/website URL
- **`location`** - Location
- **`email`** - Email address
- **`hireable`** - Whether seeking employment
- **`bio`** - Profile bio
- **`public_repos`** - Number of public repositories
- **`public_gists`** - Number of public gists
- **`followers`** - Number of followers
- **`following`** - Number of following
- **`created_at`** - Account creation timestamp
- **`updated_at`** - Last profile update timestamp

## Authentication

User profile data access:
- **Public profiles**: No authentication required for basic information
- **Private information**: Authentication may be required for email addresses and other private details
- **Rate limits**: Higher limits with authentication (5,000/hr vs 60/hr)

Provide a GitHub Personal Access Token:

**Via environment variable:**
```bash
export GITHUB_TOKEN=your_token_here
npx tsx scripts/user.ts username
```

**Via command-line option:**
```bash
npx tsx scripts/user.ts username --token=your_token_here
```

## Caching

User profiles are cached for 1 hour. Profile information changes relatively infrequently, so this provides good freshness while improving performance.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `github-repo` to get detailed repository information
- Use `github-readme` to fetch repository documentation
- Use `github-rate-limit` to check your remaining API quota

## Error Handling

**User not found**: Verify the username is correct. Usernames are case-insensitive but must be exact otherwise.

**Organization vs User**: The API returns the same data structure for both users and organizations. Check the `type` field.

**Rate limit exceeded**: Use a Personal Access Token for higher rate limits, or wait for the quota to reset (hourly).

## Use Cases

### Developer Research
Get information about package maintainers:
```bash
npx tsx scripts/user.ts zce
npx tsx scripts/user.ts sindresorhus
```

### Company Profiles
Check organization profiles:
```bash
npx tsx scripts/user.ts facebook
npx tsx scripts/user.ts microsoft
```

### Follower Analysis
Check follower counts and activity:
```bash
npx tsx scripts/user.ts gaearon
```

## Notes

- Email addresses are only returned if visible on the user's profile
- Private information requires authentication with appropriate scopes
- Organization profiles have similar structure but different data fields
- Avatar URLs can be used directly in HTML `<img>` tags

<!-- AUTO-GENERATED CONTENT END -->