#!/usr/bin/env tsx
/**
 * Syncs plugin versions and descriptions from individual plugin.json files to marketplace.json.
 *
 * Usage:
 *   pnpm sync-versions        # Update marketplace.json with plugin data
 *   pnpm validate             # Check if data is in sync (CI mode)
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const pluginsDir = join(rootDir, 'plugins');
const marketplacePath = join(rootDir, '.claude-plugin', 'marketplace.json');

interface PluginJson {
  name: string;
  version: string;
  description: string;
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

function getPluginDirectories(): string[] {
  return readdirSync(pluginsDir).filter((name) => {
    const pluginPath = join(pluginsDir, name);
    return statSync(pluginPath).isDirectory();
  });
}

function readPluginVersion(pluginName: string): PluginJson | null {
  const pluginJsonPath = join(pluginsDir, pluginName, '.claude-plugin', 'plugin.json');
  try {
    const content = readFileSync(pluginJsonPath, 'utf-8');
    return JSON.parse(content) as PluginJson;
  } catch {
    console.error(`Warning: Could not read ${pluginJsonPath}`);
    return null;
  }
}

function readMarketplace(): MarketplaceJson {
  const content = readFileSync(marketplacePath, 'utf-8');
  return JSON.parse(content) as MarketplaceJson;
}

function writeMarketplace(marketplace: MarketplaceJson): void {
  const content = JSON.stringify(marketplace, null, 2) + '\n';
  writeFileSync(marketplacePath, content, 'utf-8');
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const pluginDirs = getPluginDirectories();
  const marketplace = readMarketplace();

  let hasChanges = false;
  const mismatches: string[] = [];

  for (const pluginDir of pluginDirs) {
    const pluginJson = readPluginVersion(pluginDir);
    if (!pluginJson) continue;

    const marketplacePlugin = marketplace.plugins.find((p) => p.name === pluginJson.name);
    if (!marketplacePlugin) {
      console.log(`Plugin "${pluginJson.name}" not found in marketplace.json`);
      continue;
    }

    // Sync version
    if (marketplacePlugin.version !== pluginJson.version) {
      mismatches.push(
        `${pluginJson.name} version: marketplace=${marketplacePlugin.version}, plugin=${pluginJson.version}`
      );

      if (!checkOnly) {
        marketplacePlugin.version = pluginJson.version;
        hasChanges = true;
      }
    }

    // Sync description
    if (marketplacePlugin.description !== pluginJson.description) {
      mismatches.push(
        `${pluginJson.name} description: marketplace and plugin differ`
      );

      if (!checkOnly) {
        marketplacePlugin.description = pluginJson.description;
        hasChanges = true;
      }
    }
  }

  if (checkOnly) {
    if (mismatches.length > 0) {
      console.error('Mismatches found:');
      mismatches.forEach((m) => console.error(`  - ${m}`));
      console.error('\nRun "pnpm sync-versions" to fix.');
      process.exit(1);
    }
    console.log('All plugin data is in sync.');
    return;
  }

  if (hasChanges) {
    writeMarketplace(marketplace);
    console.log('Updated marketplace.json with plugin data:');
    mismatches.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log('All plugin data is already in sync.');
  }
}

main();
