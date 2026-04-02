import localforage from 'localforage';

const BUNGIE_ROOT = 'https://www.bungie.net';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export type SearchIndex = Record<number, { en: string; de: string }>;

export interface ManifestData {
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  socketCategories: Record<string, DestinySocketCategoryDefinition>;
  searchIndex: SearchIndex;
}

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
            throw new Error(`Connection Error: Make sure your browser has access to ${url}.`);
        }
        throw err;
    }
}

const SCHEMA_VERSION = 'v4';

export async function loadManifest(
  lang: 'en' | 'de' = 'en',
  onProgress?: (progress: number) => void,
  onStatus?: (status: string) => void
): Promise<ManifestData> {
    try {
      const cachedVersion = await manifestCache.getItem('manifest_version');
      const cachedLang = await manifestCache.getItem('manifest_lang');
      
      if (cachedVersion === SCHEMA_VERSION && cachedLang === lang) {
          onStatus?.(lang === 'de' ? 'Lade Cache...' : 'Loading Cache...');
          const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
          const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
          const socketCategories = await manifestCache.getItem<Record<string, DestinySocketCategoryDefinition>>('socketCategories');
          const searchIndex = await manifestCache.getItem<SearchIndex>('searchIndex');

          if (items && plugSets && socketCategories && searchIndex) {
              console.log(`[Manifest v4] Loaded from cache (${lang}). Items: ${Object.keys(items).length}, PlugSets: ${Object.keys(plugSets).length}`);
              return { items, plugSets, socketCategories, searchIndex };
          }
          console.warn("[Manifest v4] Cache partial or corrupt. Refetching...");
      }

      console.log(`[Manifest v4] Initializing fresh download (${lang})...`);
      onStatus?.(lang === 'de' ? 'Initialisiere Download...' : 'Initializing download...');
      await manifestCache.clear();
      if(onProgress) onProgress(5);

      onStatus?.(lang === 'de' ? 'Hole Manifest-Metadaten...' : 'Fetching manifest metadata...');
      const response = await fetch(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`);
      if (!response.ok) throw new Error(`[RETRY] Bungie Manifest API unreachable (Status: ${response.status})`);
      
      const manifestMetadata = await response.json();
      const mainPaths = manifestMetadata.Response.jsonWorldComponentContentPaths[lang];
      const secondaryPaths = lang === 'en' ? manifestMetadata.Response.jsonWorldComponentContentPaths['de'] : manifestMetadata.Response.jsonWorldComponentContentPaths['en'];

      const itemsMainUrl = `${BUNGIE_ROOT}${mainPaths.DestinyInventoryItemDefinition}`;
      const itemsSecondaryUrl = `${BUNGIE_ROOT}${secondaryPaths.DestinyInventoryItemLiteDefinition || secondaryPaths.DestinyInventoryItemDefinition}`;
      const plugSetsMainUrl = `${BUNGIE_ROOT}${mainPaths.DestinyPlugSetDefinition}`;
      const socketCatsUrl = `${BUNGIE_ROOT}${mainPaths.DestinySocketCategoryDefinition}`;

      if(onProgress) onProgress(10);

      onStatus?.(lang === 'de' ? 'Lade Datenbank-Komponenten...' : 'Downloading database components...');
      const [itemsMainRaw, itemsSecondaryRaw, plugSetsRaw, socketCatsRaw] = await Promise.all([
          fetchWithProgress<any>(itemsMainUrl, (p) => {
              onProgress?.(10 + p * 0.4);
              if (p > 0 && p < 100) onStatus?.(lang === 'de' ? `Lade Items... (${Math.round(p)}%)` : `Downloading Items... (${Math.round(p)}%)`);
          }),
          fetchWithProgress<any>(itemsSecondaryUrl, (p) => onProgress?.(50 + p * 0.1)),
          fetchWithProgress<any>(plugSetsMainUrl, (p) => {
              onProgress?.(60 + p * 0.2);
              if (p > 0 && p < 100) onStatus?.(lang === 'de' ? `Lade Perks... (${Math.round(p)}%)` : `Downloading Perks... (${Math.round(p)}%)`);
          }),
          fetchWithProgress<any>(socketCatsUrl, (p) => onProgress?.(80 + p * 0.1)),
      ]);

      onStatus?.(lang === 'de' ? 'Normalisiere Daten...' : 'Normalizing data...');

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
          manifestCache.setItem('manifest_version', SCHEMA_VERSION),
          manifestCache.setItem('manifest_lang', lang)
      ]);

      if(onProgress) onProgress(100);
      return { 
          items: normalizedItems, 
          plugSets: normalizedPlugSets, 
          socketCategories: normalizedSocketCategories,
          searchIndex: newSearchIndex 
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
