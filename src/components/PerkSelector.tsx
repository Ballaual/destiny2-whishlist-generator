import { Crosshair, Star } from 'lucide-react';
import type { DestinyItemDefinition, DestinyPlugSetDefinition, DestinySocketCategoryDefinition } from '../lib/manifest';

interface PerkSelectorProps {
  weapon: DestinyItemDefinition;
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  socketCategories: Record<string, DestinySocketCategoryDefinition>;
  selectedPerks: Set<number>;
  onTogglePerk: (hash: number) => void;
}

// Language-independent category hashes for weapon perks
const PERK_CATEGORY_HASHES = [
  4241352761, // Weapon Perks (Standard)
  4241085061, // WEAPON PERKS (Found by user)
  3705191010, // Intrinsic (Weapon Archetype)
  3956125808, // INTRINSIC TRAITS (Found by user)
  2216078230, // Origin Trait
  2611454766, // Additional Weapon Perks
  1362267390, // Alternate Perks
];

// Explicitly ignore these
const IGNORE_CATEGORY_HASHES = [
  2048505904, // Modifications
  2685412949, // WEAPON MODS (Found by user)
  267439160,  // Cosmetics
  2048875504, // WEAPON COSMETICS (Found by user)
  3532890696, // Masterwork
  1053423714, // Trackers
];

export function PerkSelector({ weapon, items, plugSets, socketCategories, selectedPerks, onTogglePerk }: PerkSelectorProps) {
  if (!weapon || !weapon.sockets) {
    return <div className="card glass-panel"><p>This weapon has no configurable perks.</p></div>;
  }

  const isEnhancedPerk = (item: DestinyItemDefinition) => {
    if (!item || !item.displayProperties) return false;
    const name = item.displayProperties.name || '';
    const isEnhancedName = name.includes('Enhanced') || name.includes('Verbesserter') || name.includes('Verbesserte') || name.includes('Verbessertes');
    const hasEnhancedCategory = item.itemCategoryHashes?.includes(2237026461);
    return isEnhancedName || hasEnhancedCategory;
  };

  const getPlugsForSocket = (entry: any) => {
    if (!entry) return [];
    
    let plugHashes: number[] = [];
    if (entry.randomizedPlugSetHash) {
      plugHashes = plugSets[entry.randomizedPlugSetHash]?.reusablePlugItems.map(p => p.plugItemHash) || [];
    } else if (entry.reusablePlugSetHash) {
      plugHashes = plugSets[entry.reusablePlugSetHash]?.reusablePlugItems.map(p => p.plugItemHash) || [];
    } else if (entry.reusablePlugItems) {
      plugHashes = entry.reusablePlugItems.map((p: any) => p.plugItemHash);
    }
    
    return plugHashes
      .map(hash => items[hash])
      .filter((item): item is DestinyItemDefinition => {
        if (!item || !item.displayProperties) return false;
        const name = item.displayProperties.name || '';
        // Filter out obviously non-perk items
        if (name === 'Empty Mod Socket' || name === 'Default Shader' || name === 'Kill Tracker' || name.includes('Ornament')) return false;
        // Hide shaders specifically
        if (item.itemCategoryHashes?.includes(41)) return false;
        return true;
      });
  };

  const validSocketIndices: number[] = [];
  if (weapon.sockets.socketCategories) {
    weapon.sockets.socketCategories.forEach(cat => {
      const catHash = cat.socketCategoryHash;
      if (!catHash) return;
      
      const isWhitelisted = PERK_CATEGORY_HASHES.includes(catHash);
      const isBlacklisted = IGNORE_CATEGORY_HASHES.includes(catHash);
      
      const catDef = socketCategories[catHash];
      const catName = (catDef?.displayProperties?.name || '').toUpperCase();
      
      const hasPerkKeyword = 
        catName.includes('PERK') || 
        catName.includes('TRAIT') || 
        catName.includes('EIGENSCHAFT') || 
        catName.includes('MAGAZIN') || 
        catName.includes('LAUF') || 
        catName.includes('MUZZLE') || 
        catName.includes('FRAME') || 
        catName.includes('GEHÄUSE') || 
        catName.includes('PLUG') ||
        catName.includes('ORIGIN');

      if ((isWhitelisted || hasPerkKeyword) && !isBlacklisted && cat.socketIndices) {
          validSocketIndices.push(...cat.socketIndices);
      }
    });
  }

  const perkColumns = validSocketIndices
    .map(idx => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
    .filter(col => col.plugs.length > 0);

  if (perkColumns.length === 0) {
    const availableCats = weapon.sockets.socketCategories?.map(c => {
        const def = socketCategories[c.socketCategoryHash];
        return `${def?.displayProperties?.name || 'Unknown'} (${c.socketCategoryHash})`;
    }).join(', ') || 'None';

    return (
      <div className="card glass-panel">
        <p>No perk variations available for this weapon.</p>
        {availableCats !== 'None' && (
          <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
            Found categories: {availableCats}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card glass-panel">
      <h2 className="card-title">
        <Crosshair size={24} /> {weapon.displayProperties.name}
      </h2>
      <div className="perk-grid">
        {perkColumns.map((col, colIdx) => (
          <div key={`${col.index}-${colIdx}`} className="perk-column">
            {col.plugs.map(perk => {
              if (!perk) return null;
              
              const isSelected = selectedPerks.has(perk.hash);
              const isEnhanced = isEnhancedPerk(perk);
              const perkName = perk.displayProperties?.name || '';
              const isMw = perkName.toLowerCase().includes('masterwork') || perk.itemType === 19;
              
              return (
                <button
                  key={perk.hash}
                  className={`perk-item ${isSelected ? 'selected' : ''} ${isMw ? 'masterwork' : ''} ${isEnhanced ? 'perk-enhanced' : ''}`}
                  onClick={() => onTogglePerk(perk.hash)}
                  title={perkName}
                >
                  {perk.displayProperties?.hasIcon && (
                    <img 
                      src={`https://www.bungie.net${perk.displayProperties.icon}`} 
                      alt={perkName} 
                    />
                  )}
                  {isEnhanced && <div className="enhanced-badge"><Star size={10} fill="#eab308" /></div>}
                  <div className="perk-tooltip">
                    <strong>{perkName}</strong>
                    {isEnhanced && <div style={{ color: '#eab308', fontSize: '0.7rem' }}>Enhanced</div>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
