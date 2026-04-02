import localforage from 'localforage';

const MANIFEST_URLS = {
  items: 'https://unpkg.com/@d2api/manifest-data@latest/json/DestinyInventoryItemLiteDefinition.json',
  plugSets: 'https://unpkg.com/@d2api/manifest-data@latest/json/DestinyPlugSetDefinition.json'
};

export const manifestCache = localforage.createInstance({
  name: 'Destiny2Manifest'
});

export type ManifestState = {
  loading: boolean;
  progress: number;
  error: string | null;
  itemsReady: boolean;
  plugSetsReady: boolean;
};

// Extremely basic typing for the parts of the Bungie Manifest we care about
export interface DestinyItemDefinition {
  hash: number;
  itemType: number; // 3 means Weapon
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
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (total === 0 || !response.body) {
    // Fallback if no content-length
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
}

export async function loadManifest(
  onProgress?: (progress: number) => void
): Promise<{ items: Record<string, DestinyItemDefinition>, plugSets: Record<string, DestinyPlugSetDefinition> }> {
  
  let items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
  let plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');

  if (!items || !plugSets) {
    // Clear old cache if it exists securely before re-downloading
    await manifestCache.clear();

    const fetchItems = async () => {
      const data = await fetchWithProgress(MANIFEST_URLS.items, (p) => {
        if(onProgress) onProgress(p * 0.7); // Let items be 70% of total progress for UI
      });
      await manifestCache.setItem('items', data);
      return data;
    };

    const fetchPlugSets = async () => {
      const data = await fetchWithProgress(MANIFEST_URLS.plugSets, (p) => {
        if(onProgress) onProgress(70 + (p * 0.3)); // Plug sets are remaining 30%
      });
      await manifestCache.setItem('plugSets', data);
      return data;
    };

    try {
      // Execute sequentially to avoid memory spikes with large JSON blobs
      if (!items) items = await fetchItems();
      if (!plugSets) plugSets = await fetchPlugSets();
    } catch (e: any) {
      throw new Error(`Failed to load manifest: ${e.message}`);
    }
  } else {
    // If loaded from cache, just set progress to 100
    if (onProgress) onProgress(100);
  }

  return { items: items as Record<string, unknown> as Record<string, DestinyItemDefinition>, plugSets: plugSets as Record<string, unknown> as Record<string, DestinyPlugSetDefinition> };
}

export async function getManifestData() {
    const items = await manifestCache.getItem<Record<string, DestinyItemDefinition>>('items');
    const plugSets = await manifestCache.getItem<Record<string, DestinyPlugSetDefinition>>('plugSets');
    return { items, plugSets };
}
