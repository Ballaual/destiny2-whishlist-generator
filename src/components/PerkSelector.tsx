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

// Explicitly ignore these - anything else will be shown if it contains plugs
const BLACKLIST_CATEGORY_HASHES = [
  2048505904, // Modifications
  2685412949, // WEAPON MODS
  267439160,  // Cosmetics
  2048875504, // WEAPON COSMETICS
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
    
    // Combine all potential sources
    if (entry.randomizedPlugSetHash) {
      const set = plugSets[(entry.randomizedPlugSetHash >>> 0).toString()];
      if (set?.reusablePlugItems) plugHashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }
    
    if (entry.reusablePlugSetHash) {
      const set = plugSets[(entry.reusablePlugSetHash >>> 0).toString()];
      if (set?.reusablePlugItems) plugHashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }
    
    if (entry.reusablePlugItems && entry.reusablePlugItems.length > 0) {
      plugHashes.push(...entry.reusablePlugItems.map((p: any) => p.plugItemHash));
    }
    
    if (entry.singleInitialItemHash) {
      plugHashes.push(entry.singleInitialItemHash);
    }
    
    return Array.from(new Set(plugHashes))
      .map(hash => items[(hash >>> 0).toString()])
      .filter((item): item is DestinyItemDefinition => {
        if (!item || !item.displayProperties) return false;
        const name = item.displayProperties.name || '';
        
        if (!name || name === 'Classified' || name === 'Empty Mod Socket' || name === 'Default Shader' || name === 'Kill Tracker' || name.includes('Ornament')) return false;
        if (item.itemCategoryHashes?.includes(41)) return false; // Shaders
        if (item.itemCategoryHashes?.includes(59)) return false; // Mods
        if (item.redacted) return false;
        
        return true;
      });
  };

  const validSocketIndices: number[] = [];
  if (weapon.sockets.socketCategories) {
    weapon.sockets.socketCategories.forEach(cat => {
      const catHash = cat.socketCategoryHash;
      if (!catHash) return;
      
      const isBlacklisted = BLACKLIST_CATEGORY_HASHES.includes(catHash);
      if (!isBlacklisted && cat.socketIndices) {
          validSocketIndices.push(...cat.socketIndices);
      }
    });
  }

  // Try whitelisted categories first, but if that yields nothing, try EVERYTHING
  let perkColumns = validSocketIndices
    .map(idx => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
    .filter(col => col.plugs.length > 0);
  
  if (perkColumns.length === 0) {
    perkColumns = weapon.sockets.socketEntries
      .map((_, idx) => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
      .filter(col => col.plugs.length > 0)
      .slice(0, 15); // Safety limit
  }

  if (perkColumns.length === 0) {
    const debugInfo = weapon.sockets.socketCategories?.map(c => {
        const def = socketCategories[(c.socketCategoryHash >>> 0).toString()];
        return `${def?.displayProperties?.name || 'Unknown'} (${c.socketCategoryHash})`;
    }).join(' | ') || 'None';

    return (
      <div className="card glass-panel">
        <p>No perk variations available for this weapon.</p>
        <p style={{ fontSize: '0.7rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Debug: {debugInfo}
        </p>
      </div>
    );
  }

  return (
    <div className="card glass-panel">
      <h2 className="card-title">
        <Crosshair size={24} /> {weapon.displayProperties?.name || 'Weapon Perks'}
      </h2>
      <div className="perk-grid">
        {perkColumns.map((col: any, colIdx: number) => (
          <div key={`${col.index}-${colIdx}`} className="perk-column">
            {col.plugs.map((perk: any) => {
              if (!perk) return null;
              
              const isSelected = selectedPerks.has(perk.hash);
              const isEnhanced = isEnhancedPerk(perk);
              const perkName = perk.displayProperties?.name || 'Unknown Perk';
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
