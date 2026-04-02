import { Crosshair } from 'lucide-react';
import type { DestinyItemDefinition, DestinyPlugSetDefinition } from '../lib/manifest';

interface PerkSelectorProps {
  weapon: DestinyItemDefinition;
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  selectedPerks: Set<number>;
  onTogglePerk: (hash: number) => void;
}

export function PerkSelector({ weapon, items, plugSets, selectedPerks, onTogglePerk }: PerkSelectorProps) {
  if (!weapon.sockets) {
    return <div className="card glass-panel"><p>This weapon has no configurable perks.</p></div>;
  }

  // Extract perk columns
  const getPlugsForSocket = (entry: any) => {
    let plugHashes: number[] = [];
    if (entry.randomizedPlugSetHash) {
      plugHashes = plugSets[entry.randomizedPlugSetHash]?.reusablePlugItems.map(p => p.plugItemHash) || [];
    } else if (entry.reusablePlugSetHash) {
      plugHashes = plugSets[entry.reusablePlugSetHash]?.reusablePlugItems.map(p => p.plugItemHash) || [];
    } else if (entry.reusablePlugItems) {
      plugHashes = entry.reusablePlugItems.map((p: any) => p.plugItemHash);
    }
    
    // Filter out invalid or missing items
    return plugHashes
      .map(hash => items[hash])
      .filter(item => item && item.displayProperties && item.displayProperties.name !== 'Empty Mod Socket');
  };

  const columns = weapon.sockets.socketEntries
    .map(entry => getPlugsForSocket(entry))
    .filter(plugs => plugs.length > 0);

  if (columns.length === 0) {
    return <div className="card glass-panel"><p>No perk variations available for this weapon.</p></div>;
  }

  return (
    <div className="card glass-panel">
      <h2 className="card-title">
        <Crosshair size={24} /> {weapon.displayProperties.name} Perks
      </h2>
      <div className="perk-grid">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="perk-column">
            {col.map(perk => {
              // Usually Masterwork item hashes are in a specific category or their name implies it,
              // but we can just use the selected tracking for all.
              const isSelected = selectedPerks.has(perk.hash);
              const isMw = perk.displayProperties.name.toLowerCase().includes('masterwork') || perk.itemType === 19; // 19 is mod/materwork typically
              
              return (
                <button
                  key={perk.hash}
                  className={`perk-item ${isSelected ? 'selected' : ''} ${isMw ? 'masterwork' : ''}`}
                  onClick={() => onTogglePerk(perk.hash)}
                >
                  {perk.displayProperties.hasIcon && (
                    <img 
                      src={`https://www.bungie.net${perk.displayProperties.icon}`} 
                      alt={perk.displayProperties.name} 
                    />
                  )}
                  <div className="perk-tooltip">
                    <strong>{perk.displayProperties.name}</strong>
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
