import localforage from 'localforage';

const BUNGIE_ROOT = 'https://www.bungie.net';
const MANIFEST_API = `${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`;

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
  redacted?: boolean;
  itemCategoryHashes?: number[];
  inventory?: {
    tierType: number;
    maxStackSize: number;
  };
  itemTypeDisplayName?: string;
  sockets?: {
    socketEntries: readonly DestinyItemSocketEntryDefinition[];
    socketCategories: readonly {
      socketCategoryHash: number;
      socketIndices: readonly number[];
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

// Map of hashes to names in different languages
export type SearchIndex = Record<number, { en: string; de: string }>;

export async function fetchWithProgress(url: string, onProgress?: (progress: number) => void): Promise<any> {
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
            throw new Error(`Connection Error: Make sure your browser has access to ${url}.`);
        }
        throw err;
    }
}

const SCHEMA_VERSION = 'v2';

export async function loadManifest(
  onProgress?: (progress: number) => void
): Promise<{ 
    items: Record<string, DestinyItemDefinition>, 
    plugSets: Record<string, DestinyPlugSetDefinition>,
    socketCategories: Record<string, DestinySocketCategoryDefinition>,
    searchIndex: SearchIndex 
}> {
  
  // Step 1: Check cache & Schema
  const cachedSchema = await manifestCache.getItem<string>('schema_version');
  if (cachedSchema !== SCHEMA_VERSION) {
    console.log("Manifest Schema Outdated. Clearing cache...");
    await manifestCache.clear();
    await manifestCache.setItem('schema_version', SCHEMA_VERSION);
  }

  let items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
  let plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
  let socketCategories = await manifestCache.getItem<Record<string, DestinySocketCategoryDefinition>>('socketCategories');
  let searchIndex = await manifestCache.getItem<SearchIndex>('searchIndex');
  let cachedVersion = await manifestCache.getItem<string>('version');

  // Step 2: Fetch current manifest version from Bungie
  let rootResponse;
  try {
    rootResponse = await fetch(MANIFEST_API);
  } catch (e: any) {
    throw new Error(`Connection Error: Bungie API is unreachable. This might be a temporary network issue. [RETRY]`);
  }

  if (!rootResponse.ok) {
     const isRetryable = rootResponse.status === 500 || rootResponse.status === 502 || rootResponse.status === 504;
     const retrySuffix = isRetryable ? ' [RETRY]' : '';
     throw new Error(`Bungie Manifest API is currently unavailable (Status: ${rootResponse.status}).${retrySuffix}`);
  }
  
  const manifestRoot = await rootResponse.json();
  if (!manifestRoot || !manifestRoot.Response) {
     const isMaintenance = manifestRoot?.ErrorCode === 5 || manifestRoot?.ErrorCode === 4;
     const errorMsg = isMaintenance ? 'Bungie API is down for maintenance.' : `Bungie API returned an error (ErrorCode: ${manifestRoot?.ErrorCode || 'Unknown'}).`;
     const retrySuffix = (!isMaintenance && manifestRoot?.ErrorCode !== 404) ? ' [RETRY]' : '';
     throw new Error(`${errorMsg}${retrySuffix}`);
  }

  const currentVersion = manifestRoot.Response.version;
  const pathsEn = manifestRoot.Response.jsonWorldComponentContentPaths.en;
  const pathsDe = manifestRoot.Response.jsonWorldComponentContentPaths.de;

  // Step 3: Compare versions or check if missing
  if (!items || !plugSets || !socketCategories || !searchIndex || cachedVersion !== currentVersion) {
    await manifestCache.clear();
    await manifestCache.setItem('version', currentVersion);

    const itemsEnUrl = `${BUNGIE_ROOT}${pathsEn.DestinyInventoryItemDefinition}`;
    const plugSetsUrl = `${BUNGIE_ROOT}${pathsEn.DestinyPlugSetDefinition}`;
    const socketCategoriesUrl = `${BUNGIE_ROOT}${pathsEn.DestinySocketCategoryDefinition}`;
    
    // Using Lite definition for German just for names
    const itemsDeUrl = `${BUNGIE_ROOT}${pathsDe.DestinyInventoryItemLiteDefinition}`;

    try {
      if(onProgress) onProgress(1); // Handshake ok
      
      // Load English Full
      const newItemsEn = await fetchWithProgress(itemsEnUrl, (p) => {
        if(onProgress) onProgress(1 + (p * 0.6)); // 60% of total
      });

      // Load German Lite
      const newItemsDe = await fetchWithProgress(itemsDeUrl, (p) => {
        if(onProgress) onProgress(61 + (p * 0.15)); // 15% of total
      });
      
      // Load PlugSets
      const newPlugSets = await fetchWithProgress(plugSetsUrl, (p) => {
        if(onProgress) onProgress(76 + (p * 0.15)); // 15% of total
      });

      // Load SocketCategories
      const newSocketCategories = await fetchWithProgress(socketCategoriesUrl, (p) => {
        if(onProgress) onProgress(91 + (p * 0.09)); // 9% of total
      });

      // Build normalized dictionaries and search index
      const normalizedItems: Record<string, DestinyItemDefinition> = {};
      const normalizedPlugSets: Record<string, DestinyPlugSetDefinition> = {};
      const normalizedSocketCategories: Record<string, DestinySocketCategoryDefinition> = {};
      const newSearchIndex: SearchIndex = {};

      for (const hash in newItemsEn) {
          const unsignedHash = (parseInt(hash, 10) >>> 0).toString();
          const itemEn = newItemsEn[hash];
          const itemDe = newItemsDe[hash];
          normalizedItems[unsignedHash] = itemEn;

          if (itemEn.displayProperties?.name) {
              newSearchIndex[parseInt(unsignedHash, 10)] = {
                  en: itemEn.displayProperties.name,
                  de: itemDe?.displayProperties?.name || itemEn.displayProperties.name
              };
          }
      }

      for (const hash in newPlugSets) {
          normalizedPlugSets[(parseInt(hash, 10) >>> 0).toString()] = newPlugSets[hash];
      }

      for (const hash in newSocketCategories) {
          normalizedSocketCategories[(parseInt(hash, 10) >>> 0).toString()] = newSocketCategories[hash];
      }

      await manifestCache.setItem('items', normalizedItems);
      await manifestCache.setItem('plugSets', normalizedPlugSets);
      await manifestCache.setItem('socketCategories', normalizedSocketCategories);
      await manifestCache.setItem('searchIndex', newSearchIndex);

      if(onProgress) onProgress(100);
      return { 
          items: normalizedItems, 
          plugSets: normalizedPlugSets, 
          socketCategories: normalizedSocketCategories,
          searchIndex: newSearchIndex 
      };
    } catch (e: any) {
      throw new Error(`Failed to load manifest from Bungie: ${e.message}`);
    }
  }

  return { items, plugSets, socketCategories, searchIndex };
}

export async function getManifestData() {
    const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
    const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
    const socketCategories = await manifestCache.getItem<Record<string, DestinySocketCategoryDefinition>>('socketCategories');
    return { items, plugSets, socketCategories };
}
