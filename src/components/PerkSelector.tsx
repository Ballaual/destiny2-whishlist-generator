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
  4241352761, // Weapon Perks
  3705191010, // Intrinsic
  2216078230, // Origin Trait
  2611454766, // Additional Weapon Perks
  1362267390, // Alternate Perks
];

// Explicitly ignore these
const IGNORE_CATEGORY_HASHES = [
  2048505904, // Modifications
  267439160,  // Cosmetics
  3532890696, // Masterwork
  1053423714, // Trackers
];

export function PerkSelector({ weapon, items, plugSets, socketCategories, selectedPerks, onTogglePerk }: PerkSelectorProps) {
  if (!weapon.sockets) {
    return <div className="card glass-panel"><p>This weapon has no configurable perks.</p></div>;
  }

  const isEnhancedPerk = (item: DestinyItemDefinition) => {
    if (!item.displayProperties) return false;
    const name = item.displayProperties.name;
    const isEnhancedName = name.includes('Enhanced') || name.includes('Verbesserter') || name.includes('Verbesserte') || name.includes('Verbessertes');
    const hasEnhancedCategory = item.itemCategoryHashes?.includes(2237026461);
    return isEnhancedName || hasEnhancedCategory;
  };

  const getPlugsForSocket = (entry: any) => {
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
      .filter(item => {
        if (!item || !item.displayProperties) return false;
        const name = item.displayProperties.name;
        // Filter out obviously non-perk items
        if (name === 'Empty Mod Socket' || name === 'Default Shader' || name === 'Kill Tracker' || name.includes('Ornament')) return false;
        // Hide shaders specifically
        if (item.itemCategoryHashes?.includes(41)) return false;
        return true;
      });
  };

  const validSocketIndices: number[] = [];
  weapon.sockets.socketCategories.forEach(cat => {
    const isWhitelisted = PERK_CATEGORY_HASHES.includes(cat.socketCategoryHash);
    const isBlacklisted = IGNORE_CATEGORY_HASHES.includes(cat.socketCategoryHash);
    
    if (isWhitelisted && !isBlacklisted) {
        validSocketIndices.push(...cat.socketIndices);
    }
  });

  const perkColumns = validSocketIndices
    .map(idx => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
    .filter(col => col.plugs.length > 0);

  if (perkColumns.length === 0) {
    // Debug fallback: if everything was filtered, let's see what categories we had
    const availableCats = weapon.sockets.socketCategories.map(c => {
        const def = socketCategories[c.socketCategoryHash];
        return `${def?.displayProperties?.name || 'Unknown'} (${c.socketCategoryHash})`;
    }).join(', ');

    return (
      <div className="card glass-panel">
        <p>No perk variations available for this weapon.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Found categories: {availableCats}
        </p>
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
              const isSelected = selectedPerks.has(perk.hash);
              const isEnhanced = isEnhancedPerk(perk);
              const isMw = perk.displayProperties.name.toLowerCase().includes('masterwork') || perk.itemType === 19;
              
              return (
                <button
                  key={perk.hash}
                  className={`perk-item ${isSelected ? 'selected' : ''} ${isMw ? 'masterwork' : ''} ${isEnhanced ? 'perk-enhanced' : ''}`}
                  onClick={() => onTogglePerk(perk.hash)}
                  title={perk.displayProperties.name}
                >
                  {perk.displayProperties.hasIcon && (
                    <img 
                      src={`https://www.bungie.net${perk.displayProperties.icon}`} 
                      alt={perk.displayProperties.name} 
                    />
                  )}
                  {isEnhanced && <div className="enhanced-badge"><Star size={10} fill="#eab308" /></div>}
                  <div className="perk-tooltip">
                    <strong>{perk.displayProperties.name}</strong>
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
