# NPMS Package Analysis (npms-io)

NPMS Package Analysis: Tools for package quality analysis, comparison, and name suggestions

**Version:** v0.2.0
**Install:** `/plugin install npms-io@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Analyze npm Package Quality (NPMS.io)

Analyze an npm package using NPMS.io quality, popularity, and maintenance scores.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/analyze.ts <package-name> [options]
```

Options:
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npms-io plugin directory: `~/.claude/plugins/cache/npms-io/`

## Package Analysis API

```
GET https://api.npms.io/v2/package/{package}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `package` | Yes | The exact package name (case-sensitive) |

### Examples

Get package analysis:
```
https://api.npms.io/v2/package/react
```

## Response Format

The response contains comprehensive package analysis:

### Metadata
- `name`, `version`, `description`, `keywords`
- Links (npm, homepage, repository, bugs)
- Author, maintainers, publishers
- Publication date

### npm Data
- `downloads` - Download counts over time
- `weekDownloads`, `monthDownloads`, `quarterDownloads`, `yearDownloads`

### GitHub Data
- `stars`, `forks`, `subscribers`
- `issues` (open, closed, total)
- `pull requests` (open, closed, total)
- `contributors`, `commitCount`
- `latestCommit` (sha, date, message)
- `recentReleases`, `firstRelease`, `latestRelease`
- Quality flags: participatesInCoc, hasCustomCodeOfConduct, hasOpenDiscussions, hasContributingGuide, hasLicense, hasSecurityPolicy

### Score (0-100)
- `final` - Overall score
- `quality` - Code quality assessment
- `popularity` - Community adoption
- `maintenance` - Project maintenance status

## Caching

Package analysis is cached for 6 hours. NPMS.io data updates relatively infrequently, and package metrics change slowly over time.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npms-compare` to compare multiple packages side-by-side
- Use `npms-suggest` to find similar packages by name
- Use `npm-info` for detailed package metadata
- Use `npm-downloads` for download statistics

## Error Handling

**Package not found**: The package may not exist in NPMS.io database. New packages may take time to be analyzed.

**Incomplete analysis**: Some packages may lack GitHub integration or download data, resulting in partial scores.

**Analysis pending**: Newly published packages may not have completed analysis. Check back later.

## Interpreting Scores

| Score Range | Quality Level | Recommendation |
|-------------|---------------|----------------|
| 90-100 | Excellent | Safe to use, well-maintained |
| 75-89 | Good | Generally reliable |
| 60-74 | Fair | Use with caution, review dependencies |
| 0-59 | Poor | Avoid, look for alternatives |

## Use Cases

### Package Selection
Compare alternatives before choosing:
```bash
npx tsx scripts/analyze.ts express
npx tsx scripts/analyze.ts koa
npx tsx scripts/analyze.ts fastify
```

### Dependency Health
Check your dependencies:
```bash
npx tsx scripts/analyze.ts lodash
npx tsx scripts/analyze.ts axios
```

### Research
Evaluate new packages:
```bash
npx tsx scripts/analyze.ts new-popular-package
```

## Notes

- NPMS.io is independent of npm, providing third-party quality assessment
- Analysis includes data from npm registry, GitHub, and other sources
- Scores are algorithmically calculated based on multiple factors
- Not all packages have complete GitHub integration data
- Scores update periodically as package activity changes

# Compare npm Packages (NPMS.io)

Compare multiple npm packages side-by-side using NPMS.io quality scores.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/compare.ts <package1> <package2> [package3...] [options]
```

Options:
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npms-io plugin directory: `~/.claude/plugins/cache/npms-io/`

## Package Comparison API

```
POST https://api.npms.io/v2/package/mget
Content-Type: application/json

["package1", "package2", "package3"]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `packages` | Yes | Array of package names (JSON array in POST body) |

### Examples

Compare packages:
```bash
curl -X POST https://api.npms.io/v2/package/mget \\
  -H "Content-Type: application/json" \\
  -d '["react", "vue", "angular"]'
```

## Response Format

The response contains analysis data for each requested package:

```json
{
  "react": { /* NpmsPackage */ },
  "vue": { /* NpmsPackage */ },
  "angular": { /* NpmsPackage */ }
}
```

Packages that don't exist or haven't been analyzed will have `null` values.

## Comparison Metrics

The comparison includes:

**Scores** (0-100)
- Overall, Quality, Popularity, Maintenance

**Package Info**
- Version, Description, Published date

**GitHub Stats**
- Stars, Forks, Open Issues, Contributors

**npm Stats**
- Monthly downloads

**Project Health**
- Contributing guide, License, Security policy

## Caching

Comparison results are cached for 6 hours. Package metrics change slowly, so cached data remains accurate for extended periods.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npms-analyze` for detailed analysis of a single package
- Use `npms-suggest` to find packages by name pattern
- Use `npm-search` to find packages by keyword

## Error Handling

**Some packages not found**: The comparison will show available data for found packages and note which ones were missing.

**All packages not found**: Verify package names are correct. New packages may take time to be analyzed.

**Rate limiting**: NPMS.io may rate limit excessive requests. Cache results to reduce API calls.

## Interpreting Comparisons

### Overall Score
Choose the package with the highest overall score if all other factors are equal.

### Quality vs Popularity
- **Higher quality**: Better code, documentation, maintenance
- **Higher popularity**: More community adoption, support

### Maintenance Score
Higher scores indicate active development and recent updates.

### Download Counts
Higher downloads indicate wider adoption but not necessarily better quality.

## Use Cases

### Framework Selection
Compare JavaScript frameworks:
```bash
npx tsx scripts/compare.ts react vue angular
```

### Library Alternatives
Compare similar libraries:
```bash
npx tsx scripts/compare.ts axios got node-fetch
```

### State Management
Compare state management solutions:
```bash
npx tsx scripts/compare.ts redux zustand pinia
```

### CSS Solutions
Compare CSS-in-JS libraries:
```bash
npx tsx scripts/compare.ts styled-components emotion linaria
```

## Tips for Comparison

1. **Consider use case**: The best package depends on your specific requirements
2. **Check maintenance**: Prefer packages with higher maintenance scores
3. **Look at ecosystem**: Consider available plugins and community support
4. **Review dependencies**: Check if the package has healthy dependencies
5. **Verify licensing**: Ensure licenses are compatible with your project

## Notes

- NPMS.io provides independent, third-party analysis
- Scores are algorithmically calculated from multiple sources
- Comparison is most useful for packages serving similar purposes
- GitHub and npm data may be incomplete for some packages
- New packages may not have completed initial analysis

# Get npm Package Name Suggestions (NPMS.io)

Get package name suggestions and autocomplete from NPMS.io based on a search query.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/suggest.ts <query> [options]
```

Options:
- `--size=N` - Number of suggestions to return (default: 25, max: 250)
- `--no-cache` - Bypass cache and fetch fresh data from API

Run from the npms-io plugin directory: `~/.claude/plugins/cache/npms-io/`

## Suggestions API

```
GET https://api.npms.io/v2/search/suggestions?q={query}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `q` | Yes | Search query (minimum 2 characters) |

### Examples

Get suggestions:
```
https://api.npms.io/v2/search/suggestions?q=react
```

Scoped packages:
```
https://api.npms.io/v2/search/suggestions?q=@babel
```

## Response Format

The response contains an array of package suggestions:

```json
[
  {
    "name": "react",
    "score": 1000000,
    "searchScore": 1000000
  },
  {
    "name": "react-dom",
    "score": 950000,
    "searchScore": 950000
  }
]
```

**Fields:**
- `name` - Package name
- `score` - Package quality score (higher is better)
- `searchScore` - Relevance to the search query (higher is better)

## Search Query Requirements

- **Minimum length**: 2 characters
- **Case sensitivity**: Search is case-insensitive
- **Partial matching**: Matches package names containing the query
- **Scoped packages**: Include `@scope/` prefix to search within a scope

## Caching

Suggestions are cached for 1 hour. The package registry changes relatively slowly, and suggestion results remain stable for reasonable periods.

Use the `--no-cache` flag to bypass the cache.

## Related

- Use `npms-analyze` to analyze specific package quality
- Use `npms-compare` to compare multiple packages
- Use `npm-search` for full-text search by keyword and description

## Search Patterns

### Exact Name
Find exact package name:
```bash
npx tsx scripts/suggest.ts react
```

### Prefix Match
Find packages starting with a prefix:
```bash
npx tsx scripts/suggest.ts react-
```

### Scoped Packages
Search within a scope:
```bash
npx tsx scripts/suggest.ts @babel/
npx tsx scripts/suggest.ts @types/react
```

### Partial Match
Find packages containing a term:
```bash
npx tsx scripts/suggest.ts express
npx tsx scripts/suggest.ts router
```

## Use Cases

### Package Discovery
Discover packages when you know part of the name:
```bash
npx tsx scripts/suggest.ts redux
```

### Autocomplete
Implement autocomplete for package input:
```bash
npx tsx scripts/suggest.ts --size=10 reac
```

### Find Alternatives
Find related packages by name pattern:
```bash
npx tsx scripts/suggest.ts router
```

### Scope Exploration
Explore packages in a specific scope:
```bash
npx tsx scripts/suggest.ts @babel/
npx tsx scripts/suggest.ts @types/
```

## Tips

1. **Be specific**: Longer queries produce more relevant results
2. **Use prefixes**: Add `-` to find packages with specific prefixes
3. **Explore scopes**: Use `@scope/` to browse scoped packages
4. **Check quality**: Use `npms-analyze` to review package quality before using
5. **Compare options**: Use `npms-compare` to evaluate multiple packages

## Limitations

- Only searches package names (not descriptions or keywords)
- Minimum 2 character query required
- Maximum 250 results per request
- Results sorted by relevance and quality score

## Difference from npm-search

| Feature | npms-suggest | npm-search |
|---------|--------------|------------|
| Searches | Package names only | Names, descriptions, keywords |
| Speed | Very fast (name-only) | Slower (full-text) |
| Results | Name-based matches | Semantic matches |
| Best for | Autocomplete, name discovery | General package search |

## Notes

- NPMS.io suggestions are optimized for name matching and autocomplete
- Results include both quality and relevance scores
- Use for quick package name lookups when building CLIs or tools
- For comprehensive search, combine with `npm-search`

<!-- AUTO-GENERATED CONTENT END -->