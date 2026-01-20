# Gravatar Avatar URLs (gravatar)

Gravatar Avatar URLs: Tools for generating avatar URLs from email addresses

**Version:** v0.2.0
**Install:** `/plugin install gravatar@mearman`

<!-- AUTO-GENERATED CONTENT START -->

## Skills

# Check Gravatar Availability

Check if a Gravatar avatar exists for an email address.

## Script Execution (Preferred)

```bash
npx tsx scripts/check.ts <email> [options]
```

Options:
- `--no-cache` - Bypass cache and fetch fresh data

Run from the gravatar plugin directory: `~/.claude/plugins/cache/gravatar/`

## How It Works

Uses a HEAD request with `d=404` parameter to check if a Gravatar exists:
- If Gravatar exists: Returns 200 OK
- If no Gravatar: Returns 404 Not Found

Results are cached for 24 hours to avoid redundant API calls.

## Usage

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

## Examples

Check if developer has Gravatar:
```bash
npx tsx scripts/check.ts beau@dentedreality.com.au
```

Bypass cache for fresh check:
```bash
npx tsx scripts/check.ts user@example.com --no-cache
```

## Use Cases

### Validate Email Addresses
Check if an email is associated with a Gravatar profile:
```bash
npx tsx scripts/check.ts contact@company.com
```

### Bulk User Verification
Check multiple team members:
```bash
for email in dev1@company.com dev2@company.com; do
  npx tsx scripts/check.ts "$email"
done
```

### Conditional Avatar Display
Verify Gravatar exists before displaying avatar in UI:
```bash
npx tsx scripts/check.ts user@example.com && echo "Show Gravatar" || echo "Show default"
```

## Caching

Results are cached for 24 hours. Since Gravatars change infrequently, caching improves performance while maintaining accuracy.

Use `--no-cache` when you need real-time verification.

## Exit Codes

- `0` - Success (Gravatar exists or check completed)
- `1` - Error (invalid usage or network error)

Note: A "No Gravatar found" result is still exit code 0 - it's a successful check that returned no avatar.

## Related

- Use `gravatar-url` skill to generate Gravatar URLs
- Use `gravatar-download` skill to download Gravatar images
- Combine with GitHub/npm user lookups to check developer avatars

# Download Gravatar Images

Download Gravatar avatar images to local files.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/download.ts <email> <output-file> [options]
```

Options:
- `--size=N` - Image size in pixels (default: 200, max: 2048)
- `--default=TYPE` - Default image type: mp, identicon, monsterid, wavatar, retro, robohash, blank
- `--rating=LEVEL` - Rating level: g, pg, r, x (default: g)
- `--no-cache` - Bypass cache and fetch fresh data

Run from the gravatar plugin directory: `~/.claude/plugins/cache/gravatar/`

## How It Works

1. Generates Gravatar URL with specified parameters
2. Downloads image using cached HTTP request
3. Saves image to specified file path
4. Caches downloaded images for 24 hours

## Examples

Basic download (200px PNG):
```bash
npx tsx scripts/download.ts user@example.com avatar.png
```

Large avatar (800px):
```bash
npx tsx scripts/download.ts user@example.com large-avatar.jpg --size=800
```

Download with fallback to identicon:
```bash
npx tsx scripts/download.ts newuser@example.com avatar.png --default=identicon
```

Force fresh download:
```bash
npx tsx scripts/download.ts user@example.com avatar.png --no-cache
```

## Image Size Options

| Size | Use Case | File Size (approx) |
|------|----------|-------------------|
| 80 | Small thumbnails | 2-4 KB |
| 200 | Profile avatars (default) | 8-15 KB |
| 400 | Large profile images | 20-35 KB |
| 800 | High-resolution displays | 50-90 KB |
| 2048 | Maximum quality | 200-400 KB |

## Default Image Types

When no Gravatar exists, these defaults are used:

| Type | Description |
|------|-------------|
| `mp` | Mystery Person (simple silhouette) |
| `identicon` | Geometric pattern based on email hash |
| `monsterid` | Unique monster generated from email |
| `wavatar` | Unique face generated from email |
| `retro` | 8-bit arcade-style face |
| `robohash` | Unique robot generated from email |
| `blank` | Transparent PNG |

## Use Cases

### Team Avatar Cache
Download avatars for all team members:
```bash
for email in dev1@company.com dev2@company.com dev3@company.com; do
  npx tsx scripts/download.ts "$email" "avatars/${email}.png" --size=400
done
```

### Profile Image Backup
Save user avatars locally:
```bash
npx tsx scripts/download.ts maintainer@project.org backup/maintainer.jpg --size=800
```

### Generate Placeholder Avatars
Create consistent default avatars:
```bash
npx tsx scripts/download.ts user1@example.com user1.png --default=identicon
npx tsx scripts/download.ts user2@example.com user2.png --default=identicon
```

### High-Resolution Display
Download retina-ready images:
```bash
npx tsx scripts/download.ts user@example.com avatar@2x.png --size=400
```

## Caching

Downloaded images are cached for 24 hours:
- Same email + parameters = cached file returned
- Different parameters = new download
- `--no-cache` = fresh download

This reduces API calls and bandwidth usage.

## Error Handling

The script will fail if:
- Email is missing or invalid format
- Output file path is missing
- Network errors occur
- Disk write fails

Error messages indicate the specific failure for troubleshooting.

## File Formats

Gravatar serves images in these formats:
- **JPG** - Smaller file size, good for photos
- **PNG** - Better for geometric/generated images (identicon, robohash)
- **WebP** - Modern format, smallest size (when supported)

The file extension in the output path determines the format saved.

## Related

- Use `gravatar-check` skill to verify Gravatar exists before downloading
- Use `gravatar-url` skill to generate URLs for web display
- Combine with npm/GitHub user data to download contributor avatars

# Generate Gravatar URL

Generate a Gravatar avatar URL from an email address.

## Usage

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

## Script Execution (Preferred)

```bash
npx tsx scripts/url.ts <email> [options]
```

Options:
- `--size=N` - Image size in pixels (default: 80, max: 2048)
- `--default=TYPE` - Default image type: mp, identicon, monsterid, wavatar, retro, robohash, blank (default: mp)
- `--rating=LEVEL` - Rating level: g, pg, r, x (default: g)
- `--force-default` - Force the default image even if user has a Gravatar

Run from the gravatar plugin directory: `~/.claude/plugins/cache/gravatar/`

## Gravatar URL Format

```
https://www.gravatar.com/avatar/{hash}?{parameters}
```

The hash is an MD5 hash of the lowercase, trimmed email address.

### URL Parameters

| Parameter | Description | Default | Options |
|-----------|-------------|---------|---------|
| `size` | Image size in pixels | 80 | 1-2048 |
| `default` | Default image when no Gravatar exists | mp | mp, identicon, monsterid, wavatar, retro, robohash, blank |
| `rating` | Content rating level | g | g, pg, r, x |
| `f` | Force default image | y (forced) | y |

### Default Image Types

| Type | Description |
|------|-------------|
| `mp` | Mystery Person (simple, cartoon-style silhouette) |
| `identicon` | Geometric pattern based on email hash |
| `monsterid` | Unique monster generated from email hash |
| `wavatar` | Unique face generated from email hash |
| `retro` | 8-bit arcade-style face |
| `robohash` | Unique robot generated from email hash |
| `blank` | Transparent PNG |

### Rating Levels

| Rating | Description |
|--------|-------------|
| `g` | Suitable for all audiences |
| `pg` | May contain rude gestures or mild violence |
| `r` | May contain harsh language, violence, or partial nudity |
| `x` | May contain explicit content |

## Examples

Basic Gravatar URL:
```bash
npx tsx scripts/url.ts user@example.com
```

Custom size (200px):
```bash
npx tsx scripts/url.ts user@example.com --size=200
```

Use identicon for default:
```bash
npx tsx scripts/url.ts user@example.com --default=identicon
```

Force default image (ignore user's Gravatar):
```bash
npx tsx scripts/url.ts user@example.com --force-default --default=robohash
```

## MD5 Hashing

Gravatar uses MD5 hash of the email address:
1. Convert email to lowercase
2. Trim whitespace
3. Compute MD5 hash
4. Use hex-encoded hash in URL

Example:
```
Email:   User@Example.COM
Step 1:  user@example.com
Step 2:  b48bf4373d7b7374351c0544f36f7fc3 (MD5)
URL:     https://www.gravatar.com/avatar/b48bf4373d7b7374351c0544f36f7fc3
```

## Profile URLs

Gravatar also provides profile pages:
```
https://www.gravatar.com/{hash}
```

Replace `/avatar/` with just the hash to get the profile page, which may contain additional information about the user.

## Related

- Use `gravatar-check` skill to verify if a Gravatar exists for an email
- Use `gravatar-download` skill to download Gravatar images to local files
- Use Gravatar profile URLs to get additional user information
- Combine with npm or GitHub author emails to display author avatars
- Use default images to provide consistent fallbacks

## Use Cases

### Developer Profiles
Generate avatar URLs for package maintainers:
```bash
npx tsx scripts/url.ts maintainer@npmjs.com
```

### Team Pages
Create consistent avatars for team members:
```bash
npx tsx scripts/url.ts dev1@company.com --default=identicon --size=200
npx tsx scripts/url.ts dev2@company.com --default=identicon --size=200
```

### User Comments
Display avatars for user comments:
```bash
npx tsx scripts/url.ts commenter@example.com --rating=pg
```

## Notes

- Gravatar images are served over HTTPS
- Images are cached by browsers and CDNs
- URL generation requires no API calls - it's deterministic
- Users must register on gravatar.com to set their avatar
- Unregistered emails will show the default image

<!-- AUTO-GENERATED CONTENT END -->