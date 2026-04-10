import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DestinyItemDefinition, DestinyPlugSetDefinition, DestinySocketCategoryDefinition } from '../lib/manifest';

interface PerkSelectorProps {
  weapon: DestinyItemDefinition;
  items: Record<string, DestinyItemDefinition>;
  plugSets: Record<string, DestinyPlugSetDefinition>;
  socketCategories: Record<string, DestinySocketCategoryDefinition>;
  selectedPerks: number[];
  onTogglePerk: (hash: number) => void;
  lang?: 'en' | 'de';
}

// No longer using ID blacklisting as requested. All filtering is now content-based.

export function PerkSelector({ weapon, items, plugSets, socketCategories, selectedPerks, onTogglePerk, lang = 'en' }: PerkSelectorProps) {
  const [hoveredPerk, setHoveredPerk] = useState<any>(null);

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

  const isEnhancedPerk = (item: DestinyItemDefinition) => {
    if (!item) return false;

    // Official Bungie display style for enhanced perks
    if (item.tooltipNotifications?.some(n => n.displayStyle === "ui_display_style_enhanced_perk")) {
      return true;
    }

    const typeDisplayName = item.itemTypeDisplayName || '';
    // Specifically check for "Item: Enhanced" prefix to avoid false positives in names
    if (typeDisplayName.startsWith('Item: Enhanced') || typeDisplayName.startsWith('Item: Verbessert')) {
      return true;
    }

    // Category hash check for "Enhanced Perks" (2237026461)
    return item.itemCategoryHashes?.includes(2237026461) || false;
  };

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
      .filter((item): item is DestinyItemDefinition => {
        if (!item || !item.displayProperties) return false;
        const name = item.displayProperties.name || '';
        const lowerName = name.toLowerCase();
        const typeName = (item.itemTypeDisplayName || '').toLowerCase();

        // Name-based filters
        if (lowerName.includes('tracker') ||
          lowerName.includes('shader') ||
          lowerName.includes('memento') ||
          lowerName.includes('level') ||
          lowerName.includes('deepsight') ||
          lowerName.includes('tiefenblick') ||
          lowerName.includes('unknown perk') ||
          lowerName.includes('unbekannter perk') ||
          lowerName.includes('ornament')) return false;

        // Filter out Tier 1-9 / Stufe 1-9 masterworks
        // These are the intermediate progression steps we don't want to show.
        const tierMatch = lowerName.match(/(tier|stufe)\s+(\d+)/);
        if (tierMatch) {
          const tierValue = parseInt(tierMatch[2]);
          if (tierValue < 10) return false;
        }

        // Type-based filters (e.g. "Item: Intrinsic", "Item: Weapon Mod", etc.)
        if (typeName.includes('intrinsic') ||
          typeName.includes('inhärent') ||
          typeName.includes('intrinsisch') ||
          typeName.includes('shader') ||
          typeName.includes('weapon mod') ||
          typeName.includes('waffen-mod') ||
          typeName.includes('ornament') ||
          typeName.includes('flair')) return false;

        if (name === 'Classified' || name === 'Empty Mod Socket' || name === 'Default Shader' || name === 'Kill Tracker' || name === 'Unknown Perk' || !name.trim() || item.redacted) return false;

        return true;
      });
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
        const aEnhanced = isEnhancedPerk(a);
        const bEnhanced = isEnhancedPerk(b);
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
          const aEnhanced = isEnhancedPerk(a);
          const bEnhanced = isEnhancedPerk(b);
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

  return (
    <div className="card glass-panel">
      <div className="perk-grid">
        {perkColumns.map((col: any, colIdx: number) => {
          const firstPlug = col.plugs[0];
          let headerText = firstPlug?.itemTypeDisplayName?.replace(/^Item:\s*/i, '') || (lang === 'de' ? 'Perk' : 'Perk');

          // Rename to Masterworked if the column contains Masterwork/Tier items
          // Using regex for 'tier' to avoid matching 'Batterie' (DE) or 'Battery'
          const isMasterworkColumn = col.plugs.some((p: any) => {
            const pName = p.displayProperties?.name?.toLowerCase() || '';
            const pType = p.itemTypeDisplayName?.toLowerCase() || '';
            return pName.includes('masterwork') || pName.includes('meisterwerk') ||
              /\b(tier|stufe)\b/.test(pName) ||
              pType.includes('masterwork') || pType.includes('meisterwerk');
          });

          if (isMasterworkColumn) {
            headerText = lang === 'de' ? 'Meisterwerk' : 'Masterwork';
            // Exclusively filter for "Masterworked" or "Meisterwerk" and EXCLUDE "Tier/Stufe"
            col.plugs = col.plugs.filter((p: any) => {
              const pName = p.displayProperties?.name?.toLowerCase() || '';
              const hasKeyword = pName.includes('masterwork') || pName.includes('meisterwerk');
              const isLowTier = /\b(tier|stufe)\b/.test(pName) && !pName.includes('10'); // Keep Tier 10 if it exists
              return hasKeyword && !isLowTier;
            });
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
                const isEnhanced = isEnhancedPerk(perk);
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
