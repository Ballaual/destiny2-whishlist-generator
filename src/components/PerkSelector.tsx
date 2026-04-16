import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { isMasterwork, isEnhancedPerk, isValidWishlistPlug } from '../lib/manifest';
import type { DestinyItemDefinition, DestinyPlugSetDefinition, DestinySocketCategoryDefinition, SearchIndex } from '../lib/manifest';

interface PerkSelectorProps {
  weapon: DestinyItemDefinition;
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  socketCategories: Record<string, DestinySocketCategoryDefinition>;
  searchIndex?: SearchIndex;
  selectedPerks: number[];
  onTogglePerk: (hash: number) => void;
  lang?: 'en' | 'de';
}

// No longer using ID blacklisting as requested. All filtering is now content-based.

export function PerkSelector({ weapon, items, plugSets, socketCategories, searchIndex, selectedPerks, onTogglePerk, lang = 'en' }: PerkSelectorProps) {
  const [hoveredPerk, setHoveredPerk] = useState<any>(null);
  const [perkSearch, setPerkSearch] = useState('');

  const handleMouseEnter = (e: React.MouseEvent, perk: any, isEnhanced: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredPerk({
      name: perk.displayProperties?.name || 'Unknown Perk',
      hash: perk.hash,
      isEnhanced,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleMouseLeave = () => {
    setHoveredPerk(null);
  };
  if (!weapon || !weapon.sockets) {
    return <div className="card glass-panel"><p>{lang === 'de' ? 'Diese Waffe hat keine konfigurierbaren Perks.' : 'This weapon has no configurable perks.'}</p></div>;
  }

  const getPlugsForSocket = (entry: any) => {
    if (!entry) return [];

    let plugHashes: number[] = [];

    const getSet = (hash: any) => {
      if (!hash) return null;
      const sHash = hash.toString();
      const uHash = (hash >>> 0).toString();
      const set = plugSets[uHash] || plugSets[sHash] || plugSets[hash as any];
      if (!set && hash > 0) {
        console.warn(`[Wishlist Refresh] PlugSet ${hash} not found in manifest.`);
      }
      return set;
    };

    const getItem = (hash: any) => {
      if (!hash) return null;
      const sHash = hash.toString();
      const uHash = (hash >>> 0).toString();
      return items[uHash] || items[sHash] || items[hash as any];
    }

    // Combine all potential sources
    if (entry.randomizedPlugSetHash) {
      const set = getSet(entry.randomizedPlugSetHash);
      if (set?.reusablePlugItems) plugHashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }

    if (entry.reusablePlugSetHash) {
      const set = getSet(entry.reusablePlugSetHash);
      if (set?.reusablePlugItems) plugHashes.push(...set.reusablePlugItems.map(p => p.plugItemHash));
    }

    if (entry.reusablePlugItems && entry.reusablePlugItems.length > 0) {
      plugHashes.push(...entry.reusablePlugItems.map((p: any) => p.plugItemHash));
    }

    if (entry.singleInitialItemHash) {
      plugHashes.push(entry.singleInitialItemHash);
    }

    return Array.from(new Set(plugHashes))
      .map(hash => getItem(hash))
      .filter((item): item is DestinyItemDefinition => isValidWishlistPlug(item));
  };

  const blockedSocketIndices = new Set<number>();
  const validSocketIndices: number[] = [];

  if (weapon.sockets.socketCategories) {
    weapon.sockets.socketCategories.forEach(cat => {
      const catHash = cat.socketCategoryHash;
      if (!catHash) return;

      if (cat.socketIndices) {
        validSocketIndices.push(...cat.socketIndices);
      }
    });
  }

  // Try categorized extraction first
  let filteredIndices = validSocketIndices.filter(idx => !blockedSocketIndices.has(idx));

  let perkColumns = filteredIndices
    .map(idx => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
    .filter(col => col.plugs.length > 0)
      .map(col => ({
        ...col,
        plugs: [...col.plugs].sort((a, b) => {
          const aEnhanced = isEnhancedPerk(a.hash, items);
          const bEnhanced = isEnhancedPerk(b.hash, items);
          if (aEnhanced === bEnhanced) return 0;
          return aEnhanced ? 1 : -1;
        })
      }));

  // SUPER-EXTRACTOR FALLBACK: If no perks found via categories, scan EVERYTHING except blacklisted
  if (perkColumns.length === 0) {
    console.warn(`[PerkSelector] No perks found in standard categories for ${weapon.displayProperties?.name}. Engaging Super-Extractor...`);
    perkColumns = weapon.sockets.socketEntries
      .map((_, idx) => ({ index: idx, plugs: getPlugsForSocket(weapon.sockets!.socketEntries[idx]) }))
      .filter((col, idx) => col.plugs.length > 0 && !blockedSocketIndices.has(idx))
      .map(col => ({
        ...col,
        plugs: [...col.plugs].sort((a, b) => {
          const aEnhanced = isEnhancedPerk(a.hash, items);
          const bEnhanced = isEnhancedPerk(b.hash, items);
          if (aEnhanced === bEnhanced) return 0;
          return aEnhanced ? 1 : -1;
        })
      }))
      .slice(0, 12); // Limit to first 12 columns for safety
  }

  if (perkColumns.length === 0) {
    const debugInfo = weapon.sockets.socketCategories?.map(c => {
      const uHash = (c.socketCategoryHash >>> 0).toString();
      const def = socketCategories[uHash] || socketCategories[c.socketCategoryHash.toString()];
      return `${def?.displayProperties?.name || 'Unknown'} (${c.socketCategoryHash})`;
    }).join(' | ') || 'None';

    return (
      <div className="card glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>No perk variations available for this weapon.</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Debug Categories: {debugInfo}
        </p>
      </div>
    );
  }

  const perkSearchLower = perkSearch.trim().toLowerCase();

  const visibleColumns = useMemo(() => {
    if (!perkSearchLower) return perkColumns;
    return perkColumns.map(col => ({
      ...col,
      plugs: col.plugs.filter((p: any) => {
        const primaryName = (p.displayProperties?.name || '').toLowerCase();
        if (primaryName.includes(perkSearchLower)) return true;
        // Also search the alternate language name from the search index
        if (searchIndex) {
          const entry = searchIndex[p.hash >>> 0];
          if (entry) {
            const altName = (lang === 'de' ? entry.en : entry.de).toLowerCase();
            if (altName.includes(perkSearchLower)) return true;
          }
        }
        return false;
      })
    })).filter(col => col.plugs.length > 0);
  }, [perkColumns, perkSearchLower, searchIndex, lang]);

  return (
    <div className="card glass-panel">
      {/* Perk Search */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
        <input
          id="perk-search-input"
          type="text"
          className="input-primary"
          placeholder={lang === 'de' ? 'Perk suchen...' : 'Search perks...'}
          value={perkSearch}
          onChange={e => setPerkSearch(e.target.value)}
          style={{ width: '100%', padding: '0.55rem 2.25rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
        />
        {perkSearch && (
          <button
            onClick={() => setPerkSearch('')}
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-secondary)', padding: 0, lineHeight: 1 }}
            title={lang === 'de' ? 'Suche leeren' : 'Clear search'}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {perkSearchLower && visibleColumns.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem', fontSize: '0.85rem' }}>
          {lang === 'de' ? 'Kein Perk gefunden.' : 'No perks found.'}
        </div>
      )}
      <div className="perk-grid">
        {visibleColumns.map((col: any, colIdx: number) => {
          const firstPlug = col.plugs[0];
          let headerText = firstPlug?.itemTypeDisplayName?.replace(/^Item:\s*/i, '') || (lang === 'de' ? 'Perk' : 'Perk');

          // Rename to Masterworked if the column contains Masterwork/Tier items
          const isMasterworkColumn = col.plugs.some((p: any) => isMasterwork(p.hash, items));
          const isCatalystColumn = col.plugs.some((p: any) => {
            const pName = (p.displayProperties?.name || '').toLowerCase();
            return pName.includes('catalyst') || pName.includes('katalysator');
          });

          if (isMasterworkColumn) {
            headerText = lang === 'de' ? 'Meisterwerk' : 'Masterwork';
            // Exclusively filter for "Masterworked" or "Meisterwerk" and EXCLUDE "Tier/Stufe"
            col.plugs = col.plugs.filter((p: any) => isMasterwork(p.hash, items));
          } else if (isCatalystColumn) {
            headerText = lang === 'de' ? 'Katalysator' : 'Catalyst';
          }

          return (
            <div key={`${col.index}-${colIdx}`} className="perk-column">
              <div className="perk-column-header" title={firstPlug?.itemTypeDisplayName}>
                {headerText}
              </div>
              {col.plugs.map((perk: any) => {
                if (!perk) return null;

                const isSelected = selectedPerks.includes(perk.hash);
                const columnPlugHashes = col.plugs.map((p: any) => p.hash);
                const selectedInColumn = selectedPerks.filter((h: number) => columnPlugHashes.includes(h));
                const perColumnIndex = selectedInColumn.indexOf(perk.hash);
                const isEnhanced = isEnhancedPerk(perk.hash, items);
                const perkName = perk.displayProperties?.name || 'Unknown Perk';
                const isMw = perkName.toLowerCase().includes('masterwork') || perk.itemType === 19;

                return (
                  <button
                    key={perk.hash}
                    className={`perk-item ${isSelected ? 'selected' : ''} ${isMw ? 'masterwork' : ''} ${isEnhanced ? 'perk-enhanced' : ''}`}
                    onClick={() => onTogglePerk(perk.hash)}
                    onMouseEnter={(e) => handleMouseEnter(e, perk, isEnhanced)}
                    onMouseLeave={handleMouseLeave}
                    title={perkName}
                  >
                    {perk.displayProperties?.hasIcon && (
                      <img
                        src={`https://www.bungie.net${perk.displayProperties.icon}`}
                        alt={perkName}
                      />
                    )}
                    {isSelected && (
                      <span className="perk-order-badge">{perColumnIndex + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {hoveredPerk && createPortal(
        <div
          className={`perk-tooltip visible`}
          style={{
            left: hoveredPerk.x,
            top: hoveredPerk.y
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {hoveredPerk.name}
          </div>
          <div style={{ opacity: 0.7, fontSize: '0.7rem' }}>{hoveredPerk.hash}</div>
          {hoveredPerk.isEnhanced && <div style={{ color: '#eab308', fontSize: '0.7rem' }}>Enhanced</div>}
        </div>,
        document.body
      )}
    </div>
  );
}
