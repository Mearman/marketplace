#!/usr/bin/env tsx
/**
 * Bumps plugin versions based on conventional commits since last release.
 * Called by semantic-release via @semantic-release/exec.
 *
 * Usage: tsx scripts/bump-plugin-versions.ts
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const pluginsDir = join(rootDir, 'plugins');
const marketplacePath = join(rootDir, '.claude-plugin', 'marketplace.json');

interface PluginJson {
  $schema?: string;
  name: string;
  description: string;
  version: string;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
}

interface MarketplaceJson {
  $schema: string;
  name: string;
  owner: { name: string };
  metadata: { description: string };
  plugins: MarketplacePlugin[];
}

function getPluginNames(): string[] {
  return readdirSync(pluginsDir).filter((name) => {
    const pluginPath = join(pluginsDir, name);
    return statSync(pluginPath).isDirectory();
  });
}

function getLastTag(): string | null {
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag: string | null): string[] {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  try {
    const output = execSync(`git log ${range} --pretty=format:"%s" 2>/dev/null`, { encoding: 'utf-8' });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(message: string): { type: string; scope: string | null; breaking: boolean } | null {
  // Match: type(scope): description or type(scope)!: description
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*.+/);
  if (!match) return null;

  return {
    type: match[1],
    scope: match[2] || null,
    breaking: match[3] === '!' || message.includes('BREAKING CHANGE'),
  };
}

function determineBumpType(type: string, breaking: boolean): 'major' | 'minor' | 'patch' {
  if (breaking) return 'major';
  if (type === 'feat') return 'minor';
  return 'patch';
}

function bumpVersion(version: string, bumpType: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function readPluginJson(pluginName: string): PluginJson {
  const path = join(pluginsDir, pluginName, '.claude-plugin', 'plugin.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writePluginJson(pluginName: string, data: PluginJson): void {
  const path = join(pluginsDir, pluginName, '.claude-plugin', 'plugin.json');
  // Remove $schema as it's not recognized by Claude Code
  const { $schema, ...cleanData } = data;
  writeFileSync(path, JSON.stringify(cleanData, null, 2) + '\n', 'utf-8');
}

function readMarketplace(): MarketplaceJson {
  return JSON.parse(readFileSync(marketplacePath, 'utf-8'));
}

function writeMarketplace(data: MarketplaceJson): void {
  writeFileSync(marketplacePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function main(): void {
  const pluginNames = getPluginNames();
  const lastTag = getLastTag();
  const commits = getCommitsSinceTag(lastTag);

  console.log(`Last tag: ${lastTag || '(none)'}`);
  console.log(`Commits since tag: ${commits.length}`);

  // Determine bumps needed per plugin
  const bumps = new Map<string, 'major' | 'minor' | 'patch'>();

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (!parsed || !parsed.scope) continue;

    // Check if scope is a plugin name
    if (!pluginNames.includes(parsed.scope)) continue;

    // Skip non-releasable commit types
    if (!['feat', 'fix', 'perf'].includes(parsed.type) && !parsed.breaking) continue;

    const bumpType = determineBumpType(parsed.type, parsed.breaking);
    const existing = bumps.get(parsed.scope);

    // Keep the highest bump type
    if (!existing || bumpType === 'major' || (bumpType === 'minor' && existing === 'patch')) {
      bumps.set(parsed.scope, bumpType);
    }
  }

  if (bumps.size === 0) {
    console.log('No plugin version bumps needed.');
    return;
  }

  // Apply bumps
  const marketplace = readMarketplace();

  for (const [pluginName, bumpType] of bumps) {
    const pluginJson = readPluginJson(pluginName);
    const oldVersion = pluginJson.version;
    const newVersion = bumpVersion(oldVersion, bumpType);

    console.log(`Bumping ${pluginName}: ${oldVersion} → ${newVersion} (${bumpType})`);

    // Update plugin.json
    pluginJson.version = newVersion;
    writePluginJson(pluginName, pluginJson);

    // Update marketplace.json
    const marketplacePlugin = marketplace.plugins.find((p) => p.name === pluginName);
    if (marketplacePlugin) {
      marketplacePlugin.version = newVersion;
    }
  }

  writeMarketplace(marketplace);
  console.log('Plugin versions updated.');
}

main();
