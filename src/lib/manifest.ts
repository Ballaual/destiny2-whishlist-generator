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

const SCHEMA_VERSION = 'v3';

export async function loadManifest(
  lang: 'en' | 'de' = 'en',
  onProgress?: (progress: number) => void
): Promise<{ 
    items: Record<string, DestinyItemDefinition>, 
    plugSets: Record<string, DestinyPlugSetDefinition>,
    socketCategories: Record<string, DestinySocketCategoryDefinition>,
    searchIndex: SearchIndex 
}> {
  
  // Step 1: Check cache & Schema & Language
  const cachedSchema = await manifestCache.getItem<string>('schema_version');
  const cachedLang = await manifestCache.getItem<string>('current_lang');
  
  if (cachedSchema !== SCHEMA_VERSION || cachedLang !== lang) {
    console.log("Manifest Schema or Language Outdated. Clearing cache...");
    await manifestCache.clear();
    await manifestCache.setItem('schema_version', SCHEMA_VERSION);
    await manifestCache.setItem('current_lang', lang);
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
    await manifestCache.setItem('version', currentVersion);

    // Get URLs for the requested language (Full) and the other (Lite) for search
    const mainPaths = lang === 'en' ? pathsEn : pathsDe;
    const secondaryPaths = lang === 'en' ? pathsDe : pathsEn;

    const itemsMainUrl = `${BUNGIE_ROOT}${mainPaths.DestinyInventoryItemDefinition}`;
    const plugSetsMainUrl = `${BUNGIE_ROOT}${mainPaths.DestinyPlugSetDefinition}`;
    const socketCategoriesMainUrl = `${BUNGIE_ROOT}${mainPaths.DestinySocketCategoryDefinition}`;
    const itemsSecondaryUrl = `${BUNGIE_ROOT}${secondaryPaths.DestinyInventoryItemLiteDefinition}`;

    try {
      if(onProgress) onProgress(1);
      
      // Load Main Language Full
      const newItemsMain = await fetchWithProgress(itemsMainUrl, (p) => {
        if(onProgress) onProgress(1 + (p * 0.6)); // 60%
      });

      // Load Secondary Language Lite for Search
      const newItemsSecondary = await fetchWithProgress(itemsSecondaryUrl, (p) => {
        if(onProgress) onProgress(61 + (p * 0.15)); // 15%
      });
      
      // Load Main PlugSets
      const newPlugSets = await fetchWithProgress(plugSetsMainUrl, (p) => {
        if(onProgress) onProgress(76 + (p * 0.15)); // 15%
      });

      // Load Main SocketCategories
      const newSocketCategories = await fetchWithProgress(socketCategoriesMainUrl, (p) => {
        if(onProgress) onProgress(91 + (p * 0.09)); // 9%
      });

      // Build robust dictionaries with double-hash mapping
      const normalizedItems: Record<string, DestinyItemDefinition> = {};
      const normalizedPlugSets: Record<string, DestinyPlugSetDefinition> = {};
      const normalizedSocketCategories: Record<string, DestinySocketCategoryDefinition> = {};
      const newSearchIndex: SearchIndex = {};

      for (const rawHash in newItemsMain) {
          const itemMain = newItemsMain[rawHash];
          const itemSecondary = newItemsSecondary[rawHash];
          const unsignedHash = (parseInt(rawHash, 10) >>> 0).toString();
          
          // Double-map items
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
