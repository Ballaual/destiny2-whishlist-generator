import type { WishlistEntry } from '../components/WishlistManager';

export interface WishlistImportResult {
  entries: WishlistEntry[];
  name?: string;
  description?: string;
}

/**
 * Parses a D2WLG (Internal JSON) wishlist.
 */
export function parseD2WLG(content: string): WishlistImportResult {
  const data = JSON.parse(content);
  if (data.entries && Array.isArray(data.entries)) {
    return {
      entries: data.entries,
      name: data.name,
      description: data.description
    };
  }
  if (Array.isArray(data)) {
    return { entries: data };
  }
  throw new Error('Invalid D2WLG format');
}

/**
 * Parses a Little Light (JSON) wishlist.
 */
export function parseLittleLight(content: string): WishlistImportResult {
  const data = JSON.parse(content);
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid Little Light format');
  }

  const entries: WishlistEntry[] = data.data.map((item: any) => ({
    itemHash: item.hash,
    perkHashes: (item.plugs || []).flat(),
    name: item.name || '',
    description: item.description || '',
    tags: item.tags || []
  }));

  return {
    entries,
    name: data.name,
    description: data.description
  };
}

/**
 * Parses a DIM (Text) wishlist.
 */
export function parseDIM(content: string): WishlistImportResult {
  const lines = content.split(/\r?\n/);
  const entries: WishlistEntry[] = [];
  let name = '';
  let description = '';

  let currentEntry: Partial<WishlistEntry> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse header metadata
    if (line.startsWith('title:')) {
      name = line.replace('title:', '').trim();
      continue;
    }
    if (line.startsWith('description:')) {
      description = line.replace('description:', '').trim();
      continue;
    }

    // Parse comments for notes/tags/names (D2WLG specific metadata in DIM comments)
    if (line.startsWith('//')) {
      const comment = line.replace('//', '').trim();
      if (comment.startsWith('notes:')) {
        const notesContent = comment.replace('notes:', '').trim();
        // Check if it's our tagged format: "tags:pve,pvp, Roll Name - Desc"
        if (notesContent.startsWith('tags:')) {
            const parts = notesContent.split(', ');
            const tagsPart = parts[0].replace('tags:', '');
            currentEntry.tags = tagsPart.split(',').filter(Boolean);
            if (parts.length > 1) {
                currentEntry.notes = parts.slice(1).join(', ');
            }
        } else {
            currentEntry.notes = notesContent;
        }
      } else {
          // Check if it's the "Roll Name [Weapon Name]" format
          const match = comment.match(/^(.*?)\s*\[.*?\]/);
          if (match) {
              currentEntry.name = match[1].trim();
          }
      }
      continue;
    }

    // Parse the actual item line
    if (line.startsWith('dimwishlist:item=')) {
      const parts = line.split('&');
      const itemHashStr = parts[0].replace('dimwishlist:item=', '');
      const itemHash = parseInt(itemHashStr, 10);

      let perkHashes: number[] = [];
      const perksPart = parts.find(p => p.startsWith('perks='));
      if (perksPart) {
        perkHashes = perksPart.replace('perks=', '').split(',').map(h => parseInt(h, 10)).filter(h => !isNaN(h));
      }

      const entry: WishlistEntry = {
        itemHash,
        perkHashes,
        notes: currentEntry.notes,
        tags: currentEntry.tags,
        name: currentEntry.name
      };
      entries.push(entry);
      currentEntry = {}; // reset for next item
    }
  }

  return { entries, name, description };
}

/**
 * Parses a CSV wishlist.
 */
export function parseCSV(content: string): WishlistImportResult {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV is empty');

  const header = lines[0].toLowerCase().split(',');
  const entries: WishlistEntry[] = [];

  // Identify column indices
  const hashIdx = header.indexOf('hash');
  const perksIdx = header.indexOf('perks');
  const perkHashesIdx = header.indexOf('perkhashes'); // Our new column
  const tagsIdx = header.indexOf('tags');
  const notesIdx = header.indexOf('notes');
  const nameIdx = header.indexOf('name');
  const descIdx = header.indexOf('description');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Basic CSV split (handles quotes)
    const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!row || hashIdx === -1) continue;

    const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';

    const itemHash = parseInt(clean(row[hashIdx]), 10);
    if (isNaN(itemHash)) continue;

    let perkHashes: number[] = [];
    if (perkHashesIdx !== -1 && row[perkHashesIdx]) {
        perkHashes = clean(row[perkHashesIdx]).split('|').map(h => parseInt(h, 10)).filter(h => !isNaN(h));
    } else if (perksIdx !== -1 && row[perksIdx]) {
        // Fallback: try to resolve names (best effort)
        const perkNames = clean(row[perksIdx]).split('|').map(n => n.trim());
        // Since we don't have a reliable way to map name -> hash efficiently here without a full index,
        // often the CSV contains hashes if the name wasn't found (see current export logic).
        perkHashes = perkNames.map(n => parseInt(n, 10)).filter(h => !isNaN(h));
    }

    entries.push({
      itemHash,
      perkHashes,
      tags: tagsIdx !== -1 ? clean(row[tagsIdx]).split('|').map(t => t.trim()).filter(Boolean) : [],
      notes: notesIdx !== -1 ? clean(row[notesIdx]) : '',
      name: nameIdx !== -1 ? clean(row[nameIdx]) : '',
      description: descIdx !== -1 ? clean(row[descIdx]) : ''
    });
  }

  return { entries };
}

export async function parseImportFile(
  content: string, 
  filename: string
): Promise<WishlistImportResult> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    try {
      const data = JSON.parse(content);
      if (data.data && Array.isArray(data.data)) return parseLittleLight(content);
      return parseD2WLG(content);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  if (ext === 'csv') {
    return parseCSV(content);
  }

  if (ext === 'txt' || content.includes('dimwishlist:')) {
    return parseDIM(content);
  }

  throw new Error('Unsupported file format');
}
