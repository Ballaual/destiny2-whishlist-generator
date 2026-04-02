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
  itemCategoryHashes?: number[];
  inventory?: {
    tierType: number;
    maxStackSize: number;
  };
  sockets?: {
    socketEntries: readonly DestinyItemSocketEntryDefinition[];
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

export async function loadManifest(
  onProgress?: (progress: number) => void
): Promise<{ items: Record<string, DestinyItemDefinition>, plugSets: Record<string, DestinyPlugSetDefinition> }> {
  
  // Step 1: Check cache
  let items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
  let plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
  let cachedVersion = await manifestCache.getItem<string>('version');

  // Step 2: Fetch current manifest version from Bungie
  const manifestRoot = await (await fetch(MANIFEST_API)).json();
  const currentVersion = manifestRoot.Response.version;
  const paths = manifestRoot.Response.jsonWorldComponentContentPaths.en;

  // Step 3: Compare versions or check if missing
  if (!items || !plugSets || cachedVersion !== currentVersion) {
    await manifestCache.clear();
    await manifestCache.setItem('version', currentVersion);

    const itemsUrl = `${BUNGIE_ROOT}${paths.DestinyInventoryItemLiteDefinition}`;
    const plugSetsUrl = `${BUNGIE_ROOT}${paths.DestinyPlugSetDefinition}`;

    try {
      if(onProgress) onProgress(5); // Started
      
      const newItems = await fetchWithProgress(itemsUrl, (p) => {
        if(onProgress) onProgress(5 + (p * 0.7)); 
      });
      await manifestCache.setItem('items', newItems);
      
      const newPlugSets = await fetchWithProgress(plugSetsUrl, (p) => {
        if(onProgress) onProgress(75 + (p * 0.25)); 
      });
      await manifestCache.setItem('plugSets', newPlugSets);

      return { items: newItems, plugSets: newPlugSets };
    } catch (e: any) {
      throw new Error(`Failed to load manifest from Bungie: ${e.message}`);
    }
  }

  return { items, plugSets };
}

export async function getManifestData() {
    const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
    const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
    return { items, plugSets };
}
