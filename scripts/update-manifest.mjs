#!/usr/bin/env node

/**
 * Destiny 2 Manifest Update Script
 * 
 * Fetches the latest manifest from Bungie API and writes optimized, pre-built
 * JSON files to public/manifest/. Only downloads if the manifest version changed.
 * 
 * Optimization: Strips all non-essential data. Only keeps weapons (itemType 3)
 * and perk/plug items referenced by PlugSets, with only the fields the app needs.
 * This reduces file size from ~155MB to ~15MB per language.
 * Also fetches DestinySeasonDefinition (EN+DE) to generate releases.json
 * mapping release trait IDs (e.g. "releases.v950") to season names for display.
 * 
 * Usage: node scripts/update-manifest.mjs [--force]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_DIR = path.join(ROOT, 'public', 'manifest');
const VERSION_FILE = path.join(MANIFEST_DIR, 'version.json');

const BUNGIE_ROOT = 'https://www.bungie.net';
const FORCE = process.argv.includes('--force');

async function fetchJSON(url) {
  console.log(`  ↓ Fetching: ${url}`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.ErrorCode && data.ErrorCode !== 1) {
    throw new Error(`Bungie API Error: ${data.ErrorCode} ${data.ErrorStatus} - ${data.Message}`);
  }
  return data;
}

/**
 * Strip a weapon item to only the fields the app needs.
 */
function stripWeapon(item) {
  const stripped = {
    hash: item.hash,
    itemType: item.itemType,
    itemSubType: item.itemSubType,
    classType: item.classType,
    displayProperties: item.displayProperties ? {
      name: item.displayProperties.name || '',
      description: item.displayProperties.description || '',
      icon: item.displayProperties.icon || '',
      hasIcon: !!item.displayProperties.hasIcon,
    } : undefined,
    itemTypeDisplayName: item.itemTypeDisplayName,
    screenshot: item.screenshot,
    flavorText: item.flavorText,
    displaySource: item.displaySource,
    defaultDamageTypeHash: item.defaultDamageTypeHash,
    redacted: item.redacted,
    itemCategoryHashes: item.itemCategoryHashes,
  };

  // Season hash – indicates which season the weapon was released in
  if (item.seasonHash != null) stripped.seasonHash = item.seasonHash;

  // Release trait IDs – e.g. ["releases.v950.core"] – used to derive release version
  if (item.traitIds?.length > 0) {
    const releaseTraits = item.traitIds.filter((t) => t.startsWith('releases.'));
    if (releaseTraits.length > 0) stripped.traitIds = releaseTraits;
  }

  // Damage type fields used by App.tsx
  if (item.damageType != null) stripped.damageType = item.damageType;
  if (item.defaultDamageType != null) stripped.defaultDamageType = item.defaultDamageType;
  if (item.damageTypeHash != null) stripped.damageTypeHash = item.damageTypeHash;
  if (item.damageTypeHashes) stripped.damageTypeHashes = item.damageTypeHashes;
  if (item.ammoType != null) stripped.ammoType = item.ammoType;

  // Equipping block (ammoType, damageTypeHash)
  if (item.equippingBlock) {
    stripped.equippingBlock = {};
    if (item.equippingBlock.ammoType != null) stripped.equippingBlock.ammoType = item.equippingBlock.ammoType;
    if (item.equippingBlock.damageTypeHash != null) stripped.equippingBlock.damageTypeHash = item.equippingBlock.damageTypeHash;
  }

  // Tooltip notifications (enhanced perk detection)
  if (item.tooltipNotifications?.length > 0) {
    stripped.tooltipNotifications = item.tooltipNotifications.map(n => ({
      displayString: n.displayString,
      displayStyle: n.displayStyle,
    }));
  }

  // Inventory (tier, ammo)
  if (item.inventory) {
    stripped.inventory = {
      tierType: item.inventory.tierType,
      tierTypeName: item.inventory.tierTypeName,
      ammoType: item.inventory.ammoType,
    };
  }

  // Sockets (full – needed for perk columns)
  if (item.sockets) {
    stripped.sockets = {
      socketEntries: item.sockets.socketEntries?.map(entry => {
        const se = {
          socketTypeHash: entry.socketTypeHash,
          singleInitialItemHash: entry.singleInitialItemHash,
        };
        if (entry.reusablePlugItems?.length > 0) se.reusablePlugItems = entry.reusablePlugItems;
        if (entry.randomizedPlugSetHash) se.randomizedPlugSetHash = entry.randomizedPlugSetHash;
        if (entry.reusablePlugSetHash) se.reusablePlugSetHash = entry.reusablePlugSetHash;
        return se;
      }),
      socketCategories: item.sockets.socketCategories,
    };
  }

  return stripped;
}

/**
 * Strip a perk/plug item to only the fields the app needs.
 */
function stripPerk(item) {
  const stripped = {
    hash: item.hash,
    itemType: item.itemType,
    displayProperties: item.displayProperties ? {
      name: item.displayProperties.name || '',
      icon: item.displayProperties.icon || '',
      hasIcon: !!item.displayProperties.hasIcon,
    } : undefined,
    itemTypeDisplayName: item.itemTypeDisplayName,
  };

  if (item.tooltipNotifications?.length > 0) {
    stripped.tooltipNotifications = item.tooltipNotifications.map(n => ({
      displayStyle: n.displayStyle,
    }));
  }

  if (item.itemCategoryHashes?.length > 0) stripped.itemCategoryHashes = item.itemCategoryHashes;
  if (item.redacted) stripped.redacted = item.redacted;

  return stripped;
}

/**
 * Build an optimized items file: only weapons + referenced perks.
 */
function buildOptimizedItems(rawItems, plugSetsRaw) {
  // 1. Collect all perk hashes referenced by any plug set
  const perkHashes = new Set();
  const plugSets = plugSetsRaw?.Response || plugSetsRaw;
  for (const hash in plugSets) {
    const ps = plugSets[hash];
    if (ps.reusablePlugItems) {
      for (const p of ps.reusablePlugItems) {
        perkHashes.add(p.plugItemHash);
        // Also add unsigned version
        perkHashes.add(p.plugItemHash >>> 0);
      }
    }
  }

  // 2. Also collect perk hashes from weapon socket entries (reusablePlugItems, singleInitialItemHash)
  const items = rawItems?.Response || rawItems;
  for (const hash in items) {
    const item = items[hash];
    if (item.itemType === 3 && item.sockets?.socketEntries) {
      for (const entry of item.sockets.socketEntries) {
        if (entry.singleInitialItemHash) {
          perkHashes.add(entry.singleInitialItemHash);
          perkHashes.add(entry.singleInitialItemHash >>> 0);
        }
        if (entry.reusablePlugItems) {
          for (const p of entry.reusablePlugItems) {
            perkHashes.add(p.plugItemHash);
            perkHashes.add(p.plugItemHash >>> 0);
          }
        }
      }
    }
  }

  console.log(`  Found ${perkHashes.size} unique perk hashes.`);

  // 3. Build optimized output
  const optimized = {};
  let weaponCount = 0;
  let perkCount = 0;
  let skippedCount = 0;

  for (const hash in items) {
    const item = items[hash];
    
    if (item.itemType === 3) {
      // Weapon
      optimized[hash] = stripWeapon(item);
      weaponCount++;
    } else if (perkHashes.has(parseInt(hash, 10)) || perkHashes.has(parseInt(hash, 10) >>> 0)) {
      // Perk referenced by a plug set
      optimized[hash] = stripPerk(item);
      perkCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`  Kept: ${weaponCount} weapons, ${perkCount} perks. Stripped: ${skippedCount} items.`);

  // Validation: fail if we didn't find any weapons or perks
  if (weaponCount === 0 || perkCount === 0) {
    throw new Error(`Sanity check failed: found ${weaponCount} weapons and ${perkCount} perks. Aborting update.`);
  }

  return optimized;
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   D2 Wishlist Generator – Manifest Sync  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // 1. Fetch manifest metadata from Bungie
  console.log('[1/6] Fetching manifest metadata from Bungie...');
  const metaRes = await fetchJSON(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`);
  const manifest = metaRes.Response;

  if (!manifest) {
    throw new Error('Bungie Manifest API returned no data.');
  }

  const bungieVersion = manifest.version;
  console.log(`  Bungie manifest version: ${bungieVersion}`);

  // 2. Check if we already have this version
  let currentVersion = null;
  if (fs.existsSync(VERSION_FILE)) {
    try {
      const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
      currentVersion = versionData.version;
      console.log(`  Local manifest version:  ${currentVersion}`);
    } catch {
      console.log('  Local version file corrupt, will re-download.');
    }
  } else {
    console.log('  No local manifest found.');
  }

  if (currentVersion === bungieVersion && !FORCE) {
    console.log('');
    console.log('✓ Manifest is up to date. No download needed.');
    process.exit(0);
  }

  if (FORCE && currentVersion === bungieVersion) {
    console.log('  --force flag set, re-downloading anyway.');
  }

  // 3. Ensure output directory exists
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });

  // 4. Download all components
  console.log('');
  const enPaths = manifest.jsonWorldComponentContentPaths['en'];
  const dePaths = manifest.jsonWorldComponentContentPaths['de'];

  console.log('[2/7] Downloading PlugSets...');
  const plugSetsRaw = await fetchJSON(`${BUNGIE_ROOT}${enPaths.DestinyPlugSetDefinition}`);

  console.log('[3/7] Downloading EN items...');
  const itemsEnRaw = await fetchJSON(`${BUNGIE_ROOT}${enPaths.DestinyInventoryItemDefinition}`);

  console.log('[4/7] Downloading DE items...');
  const itemsDeRaw = await fetchJSON(`${BUNGIE_ROOT}${dePaths.DestinyInventoryItemDefinition}`);

  console.log('[5/7] Downloading SocketCategories...');
  const socketCatsRaw = await fetchJSON(`${BUNGIE_ROOT}${enPaths.DestinySocketCategoryDefinition}`);

  console.log('[6/7] Downloading Season Definitions (EN + DE)...');
  const [seasonsEnRaw, seasonsDeRaw] = await Promise.all([
    fetchJSON(`${BUNGIE_ROOT}${enPaths.DestinySeasonDefinition}`),
    fetchJSON(`${BUNGIE_ROOT}${dePaths.DestinySeasonDefinition}`),
  ]);

  // 5. Build releases.json: vXXX -> season info
  // Bungie doesn't expose the vXXX -> seasonNumber mapping directly, so we define it once here.
  // All display names and dates are sourced from Bungie API DestinySeasonDefinition.
  const V_TO_SEASON = {
    v300: 1, v310: 2, v320: 3,
    v400: 4, v410: 5, v420: 6, v450: 7, v460: 8, v470: 9, v480: 10, v490: 11,
    v500: 12, v510: 13, v520: 14, v530: 15, v540: 16,
    v600: 17, v610: 18, v620: 19, v630: 19,
    v700: 20, v710: 21, v720: 22, v730: 23,
    v800: 24, v810: 25, v820: 26,
    v900: 27, v910: 27,
    v950: 28,
  };

  // Build season hash -> definition lookup from Bungie data
  const seasonsEn = seasonsEnRaw?.Response || seasonsEnRaw;
  const seasonsDe = seasonsDeRaw?.Response || seasonsDeRaw;
  const seasonByNumber = {};
  for (const hash in seasonsEn) {
    const s = seasonsEn[hash];
    const sDe = seasonsDe[hash];
    if (!s || s.redacted || !s.seasonNumber) continue;
    const num = s.seasonNumber;
    const name = s.displayProperties?.name || `Season ${num}`;
    const nameDe = sDe?.displayProperties?.name || name;
    const startSec = s.startTimeInSeconds;
    // Keep the most recent definition per season number (some seasons have duplicates)
    if (!seasonByNumber[num] || startSec > (seasonByNumber[num].startTimeInSeconds || 0)) {
      seasonByNumber[num] = { number: num, name, name_de: nameDe, startTimeInSeconds: startSec };
    }
  }

  // Build final releases map: vXXX -> season info
  const releasesOutput = {};
  for (const [v, seasonNum] of Object.entries(V_TO_SEASON)) {
    const season = seasonByNumber[seasonNum];
    releasesOutput[v] = {
      seasonNumber: seasonNum,
      name: season?.name || `Season ${seasonNum}`,
      name_de: season?.name_de || `Saison ${seasonNum}`,
      ...(season?.startTimeInSeconds ? { startDate: new Date(season.startTimeInSeconds * 1000).toISOString().split('T')[0] } : {}),
    };
  }
  console.log(`  Built releases map: ${Object.keys(releasesOutput).length} entries.`);

  // 6. Optimize and write files
  console.log('');
  console.log('[7/7] Optimizing and writing manifest files...');

  console.log('  --- EN Items ---');
  const optimizedEn = buildOptimizedItems(itemsEnRaw, plugSetsRaw);
  console.log('  --- DE Items ---');
  const optimizedDe = buildOptimizedItems(itemsDeRaw, plugSetsRaw);

  // PlugSets: keep as-is (already small ~7MB)
  const plugSets = plugSetsRaw?.Response || plugSetsRaw;
  const socketCats = socketCatsRaw?.Response || socketCatsRaw;

  const writeJSON = (filename, data) => {
    const filePath = path.join(MANIFEST_DIR, filename);
    const json = JSON.stringify(data, null, 1);
    
    // Check if content is actually different
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf-8');
      if (existing === json) {
        console.log(`  – ${filename} (unchanged)`);
        return;
      }
    }

    fs.writeFileSync(filePath, json, 'utf-8');
    const sizeMB = (Buffer.byteLength(json, 'utf-8') / 1024 / 1024).toFixed(1);
    console.log(`  ✓ ${filename} (${sizeMB} MB)`);
  };

  writeJSON('items_en.json', optimizedEn);
  writeJSON('items_de.json', optimizedDe);
  writeJSON('plugsets.json', plugSets);
  writeJSON('releases.json', releasesOutput);
  writeJSON('socket_categories.json', socketCats);

  // 7. Write version file ONLY if it changed
  console.log('');
  if (currentVersion !== bungieVersion || FORCE) {
    const versionData = {
      version: bungieVersion,
    };
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2), 'utf-8');
    console.log(`✓ version.json updated to ${bungieVersion}`);
  } else {
    console.log('✓ Manifest content updated but version string remains the same.');
  }

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log(`✓ Manifest sync complete.`);
  console.log('══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('');
  console.error('✗ Manifest update failed:', err.message);
  process.exit(1);
});
