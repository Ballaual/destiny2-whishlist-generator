import localforage from 'localforage';

export const manifestCache = localforage.createInstance({
  name: 'Destiny2Manifest'
});

export interface DestinyItemDefinition {
  hash: number;
  itemType: number; 
  itemSubType: number;
  classType: number;
  displayProperties: {
    name: string;
    description: string;
    icon: string;
    hasIcon: boolean;
  };
  screenshot?: string;
  flavorText?: string;
  displaySource?: string;
  collectibleHash?: number;
  collectibleSource?: string;
  defaultDamageTypeHash?: number;
  redacted?: boolean;
  itemCategoryHashes?: number[];
  tooltipNotifications?: {
    displayString: string;
    displayStyle: string;
  }[];
  inventory?: {
    tierType: number;
    maxStackSize: number;
    isInstanceItem: boolean;
    tierTypeName: string;
    ammoType: number;
  };
  itemTypeDisplayName?: string;
  seasonHash?: number;
  traitIds?: string[];
  sockets?: {
    socketEntries: readonly DestinyItemSocketEntryDefinition[];
    socketCategories: readonly {
      socketCategoryHash: number;
      socketIndexes: readonly number[];
    }[];
  };
}

export interface DestinyItemSocketEntryDefinition {
  socketTypeHash: number;
  singleInitialItemHash: number;
  reusablePlugItems: readonly { plugItemHash: number }[];
  randomizedPlugSetHash?: number;
  reusablePlugSetHash?: number;
  preventInitializationOnVendorPurchase: boolean;
}

export interface DestinyPlugSetDefinition {
  hash: number;
  reusablePlugItems: readonly { plugItemHash: number }[];
}

export interface DestinySocketCategoryDefinition {
  hash: number;
  displayProperties: {
    name: string;
  };
}

export type SearchIndex = Record<number, { en: string; de: string }>;

export interface ReleaseDefinition {
  seasonNumber: number;
  name: string;
  name_de: string;
  startDate?: string;
}

export type ReleaseMap = Record<string, ReleaseDefinition>;

export interface ManifestData {
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  socketCategories: Record<string, DestinySocketCategoryDefinition>;
  searchIndex: SearchIndex;
  releases: ReleaseMap;
}

// Resolve the base URL for manifest files.
// In production (GitHub Pages), they live alongside the app.
// In dev, they're served from public/ by Vite.
const MANIFEST_BASE = `${import.meta.env.BASE_URL}manifest`;

export async function fetchWithProgress<T = any>(url: string, onProgress?: (progress: number) => void): Promise<T> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (total === 0 || !response.body) {
            const data = await response.json();
            if (onProgress) onProgress(100);
            return data;
        }

        const reader = response.body.getReader();
        let received = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                received += value.length;
                if (onProgress) onProgress((received / total) * 100);
            }
        }

        const chunksAll = new Uint8Array(received);
        let position = 0;
        for (const chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }

        const text = new TextDecoder("utf-8").decode(chunksAll);
        return JSON.parse(text);
    } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error(`Connection Error: Could not load manifest data. Please check your connection.`);
        }
        throw err;
    }
}

const SCHEMA_VERSION = 'v5'; // Bumped from v4 to invalidate old Bungie-fetched caches

export async function loadManifest(
  lang: 'en' | 'de' = 'en',
  onProgress?: (progress: number) => void,
  onStatus?: (status: string) => void
): Promise<ManifestData> {
    try {
      // 1. Fetch the manifest version from the repo
      onStatus?.(lang === 'de' ? 'Prüfe Manifest-Version...' : 'Checking manifest version...');
      let remoteVersion: string | null = null;
      try {
        const versionRes = await fetch(`${MANIFEST_BASE}/version.json`);
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          remoteVersion = versionData.version;
        }
      } catch {
        console.warn('[Manifest] Could not fetch version.json, will force re-download.');
      }

      // 2. Check local cache
      const cachedVersion = await manifestCache.getItem('manifest_version');
      const cachedSchemaVersion = await manifestCache.getItem('manifest_schema_version');
      const cachedLang = await manifestCache.getItem('manifest_lang');
      
      if (cachedSchemaVersion === SCHEMA_VERSION && cachedLang === lang && cachedVersion && cachedVersion === remoteVersion) {
          onStatus?.(lang === 'de' ? 'Lade Cache...' : 'Loading Cache...');
          const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
          const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
          const socketCategories = await manifestCache.getItem<Record<string, DestinySocketCategoryDefinition>>('socketCategories');
          const searchIndex = await manifestCache.getItem<SearchIndex>('searchIndex');
          const releases = await manifestCache.getItem<ReleaseMap>('releases') || {};

          if (items && plugSets && socketCategories && searchIndex) {
              console.log(`[Manifest v5] Loaded from cache (${lang}). Version: ${cachedVersion}. Items: ${Object.keys(items).length}`);
              if (onProgress) onProgress(100);
              return { items, plugSets, socketCategories, searchIndex, releases };
          }
          console.warn("[Manifest v5] Cache partial or corrupt. Refetching...");
      }

      // 3. Download manifest files from the repo
      console.log(`[Manifest v5] Downloading manifest from repo (${lang})...`);
      onStatus?.(lang === 'de' ? 'Initialisiere Download...' : 'Initializing download...');
      await manifestCache.clear();
      if(onProgress) onProgress(5);

      const mainLang = lang;
      const secondaryLang = lang === 'en' ? 'de' : 'en';

      onStatus?.(lang === 'de' ? 'Lade Datenbank...' : 'Downloading database...');
      const [itemsMainRaw, itemsSecondaryRaw, plugSetsRaw, socketCatsRaw, releasesRaw] = await Promise.all([
          fetchWithProgress<any>(`${MANIFEST_BASE}/items_${mainLang}.json`, (p) => {
              onProgress?.(5 + p * 0.40);
              if (p > 0 && p < 100) onStatus?.(lang === 'de' ? `Lade Items (${mainLang.toUpperCase()})... (${Math.round(p)}%)` : `Downloading Items (${mainLang.toUpperCase()})... (${Math.round(p)}%)`);
          }),
          fetchWithProgress<any>(`${MANIFEST_BASE}/items_${secondaryLang}.json`, (p) => {
              onProgress?.(45 + p * 0.20);
              if (p > 0 && p < 100) onStatus?.(lang === 'de' ? `Lade Items (${secondaryLang.toUpperCase()})... (${Math.round(p)}%)` : `Downloading Items (${secondaryLang.toUpperCase()})... (${Math.round(p)}%)`);
          }),
          fetchWithProgress<any>(`${MANIFEST_BASE}/plugsets.json`, (p) => {
              onProgress?.(65 + p * 0.15);
              if (p > 0 && p < 100) onStatus?.(lang === 'de' ? `Lade Perks... (${Math.round(p)}%)` : `Downloading Perks... (${Math.round(p)}%)`);
          }),
          fetchWithProgress<any>(`${MANIFEST_BASE}/socket_categories.json`, (p) => {
              onProgress?.(80 + p * 0.05);
          }),
          fetchWithProgress<any>(`${MANIFEST_BASE}/releases.json`).catch(() => ({})),
      ]);

      onStatus?.(lang === 'de' ? 'Normalisiere Daten...' : 'Normalizing data...');

      // The repo files are raw Bungie responses (no .Response wrapper)
      const newItemsMain = itemsMainRaw?.Response || itemsMainRaw;
      const newItemsSecondary = itemsSecondaryRaw?.Response || itemsSecondaryRaw;
      const newPlugSets = plugSetsRaw?.Response || plugSetsRaw;
      const newSocketCategories = socketCatsRaw?.Response || socketCatsRaw;

      if (!newItemsMain || !newPlugSets || !newSocketCategories) {
          throw new Error("Critical manifest component failed to load.");
      }

      const normalizedItems: Record<string, DestinyItemDefinition> = {};
      const normalizedPlugSets: Record<string, DestinyPlugSetDefinition> = {};
      const normalizedSocketCategories: Record<string, DestinySocketCategoryDefinition> = {};
      const newSearchIndex: SearchIndex = {};

      for (const rawHash in newItemsMain) {
          const itemMain = newItemsMain[rawHash];
          const itemSecondary = (newItemsSecondary as any)[rawHash];
          const unsignedHash = (parseInt(rawHash, 10) >>> 0).toString();
          
          normalizedItems[rawHash] = itemMain;
          normalizedItems[unsignedHash] = itemMain;

          if (itemMain.displayProperties?.name) {
              const hashNum = parseInt(unsignedHash, 10);
              newSearchIndex[hashNum] = {
                  en: lang === 'en' ? itemMain.displayProperties.name : (itemSecondary?.displayProperties?.name || itemMain.displayProperties.name),
                  de: lang === 'de' ? itemMain.displayProperties.name : (itemSecondary?.displayProperties?.name || itemMain.displayProperties.name)
              };
          }
      }

      for (const rawHash in newPlugSets) {
          const plugSet = newPlugSets[rawHash];
          const unsignedHash = (parseInt(rawHash, 10) >>> 0).toString();
          normalizedPlugSets[rawHash] = plugSet;
          normalizedPlugSets[unsignedHash] = plugSet;
      }

      for (const rawHash in newSocketCategories) {
          const socketCat = newSocketCategories[rawHash];
          const unsignedHash = (parseInt(rawHash, 10) >>> 0).toString();
          normalizedSocketCategories[rawHash] = socketCat;
          normalizedSocketCategories[unsignedHash] = socketCat;
      }

      await Promise.all([
          manifestCache.setItem('items', normalizedItems),
          manifestCache.setItem('plugSets', normalizedPlugSets),
          manifestCache.setItem('socketCategories', normalizedSocketCategories),
          manifestCache.setItem('searchIndex', newSearchIndex),
          manifestCache.setItem('releases', releasesRaw || {}),
          manifestCache.setItem('manifest_version', remoteVersion || 'unknown'),
          manifestCache.setItem('manifest_schema_version', SCHEMA_VERSION),
          manifestCache.setItem('manifest_lang', lang)
      ]);

      if(onProgress) onProgress(100);
      return { 
          items: normalizedItems, 
          plugSets: normalizedPlugSets, 
          socketCategories: normalizedSocketCategories,
          searchIndex: newSearchIndex,
          releases: releasesRaw || {}
      };
    } catch (error: any) {
      console.error("[Manifest Error]", error);
      throw error;
    }
}

export async function getManifestData() {
    const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
    const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
    const socketCategories = await manifestCache.getItem<Record<string, DestinySocketCategoryDefinition>>('socketCategories');
    return { 
      items: items || {}, 
      plugSets: plugSets || {}, 
      socketCategories: socketCategories || {} 
    };
}

/**
 * Helper to identify if a plug is a Masterwork (Tier/Meisterwerk).
 */
export function isMasterwork(hash: number, items: Record<string, DestinyItemDefinition>): boolean {
  const p = items[hash.toString()];
  if (!p) return false;
  const pName = p.displayProperties?.name?.toLowerCase() || '';
  const pType = p.itemTypeDisplayName?.toLowerCase() || '';
  return pName.includes('masterwork') || pName.includes('meisterwerk') ||
         /\b(tier|stufe)\b/.test(pName) ||
         pType.includes('masterwork') || pType.includes('meisterwerk');
}

/**
 * Groups a flat list of perk hashes into columns (sockets) based on the weapon's definition.
 */
export function groupPerksBySocket(
  itemHash: number, 
  flatPerkHashes: number[], 
  manifest: { 
    items: Record<string, DestinyItemDefinition>, 
    plugSets: Record<string, DestinyPlugSetDefinition> 
  }
): number[][] {
  const item = manifest.items[itemHash.toString()];
  if (!item?.sockets?.socketEntries) return flatPerkHashes.length > 0 ? [flatPerkHashes] : [];

  const perkToColumn = new Map<number, number>();
  item.sockets.socketEntries.forEach((entry, idx) => {
    const hashes: number[] = [];
    
    const getPlugSet = (hash: number | undefined) => {
      if (!hash) return null;
      return manifest.plugSets[hash.toString()];
    };

    if (entry.randomizedPlugSetHash) {
      const set = getPlugSet(entry.randomizedPlugSetHash);
      if (set?.reusablePlugItems) hashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }
    if (entry.reusablePlugSetHash) {
      const set = getPlugSet(entry.reusablePlugSetHash);
      if (set?.reusablePlugItems) hashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }
    if (entry.reusablePlugItems) {
      hashes.push(...entry.reusablePlugItems.map(p => p.plugItemHash));
    }
    if (entry.singleInitialItemHash) {
      hashes.push(entry.singleInitialItemHash);
    }
    
    for (const h of hashes) {
      if (!perkToColumn.has(h)) perkToColumn.set(h, idx);
    }
  });

  const groups: Map<number, number[]> = new Map();
  for (const h of flatPerkHashes) {
    const col = perkToColumn.get(h) ?? -1;
    if (!groups.has(col)) groups.set(col, []);
    groups.get(col)!.push(h);
  }

  return Array.from(groups.entries())
    .sort(([a, aHashes], [b, bHashes]) => {
      const aIsMw = aHashes.some(h => isMasterwork(h, manifest.items));
      const bIsMw = bHashes.some(h => isMasterwork(h, manifest.items));

      if (aIsMw && !bIsMw) return 1;
      if (!aIsMw && bIsMw) return -1;
      return a - b;
    })
    .map(([_, hashes]) => hashes);
}



