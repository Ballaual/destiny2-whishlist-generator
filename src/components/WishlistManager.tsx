import { useState } from 'react';
import { Trash2, Copy, Download, Upload, FileText, Code, Smartphone, ChevronRight, Check, Table, Search, X, Filter, ListChecks } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';
import { parseImportFile, type WishlistImportResult } from '../lib/importUtils';

export interface WishlistEntry {
  itemHash: number;
  perkHashes: number[];
  notes?: string;
  tags?: string[];
  name?: string;
  description?: string;
}


interface WishlistManagerProps {
  entries: WishlistEntry[];
  items: Record<string, DestinyItemDefinition>;
  lang: 'en' | 'de';
  onExport: (format: string) => void;
  onImport: (data: WishlistImportResult) => void;
  onRemove: (index: number) => void;
  onCopy: (index: number) => void;
  onSelectEntry: (entry: WishlistEntry) => void;
  wishlistName: string;
  onWishlistNameChange: (val: string) => void;
  wishlistDescription: string;
  onWishlistDescriptionChange: (val: string) => void;
  labels: {
    header: string;
    importBtn: string;
    exportBtn: string;
  };
  searchIndex?: Record<number, { en: string; de: string }>;
}


export function WishlistManager({ 
  entries, items, lang, onExport, onImport, onRemove, onCopy, onSelectEntry, 
  wishlistName, onWishlistNameChange, wishlistDescription, onWishlistDescriptionChange, labels,
  searchIndex
}: WishlistManagerProps) {
  const [exportFormat, setExportFormat] = useState('internal');
  const [filterText, setFilterText] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);

  // Extract unique types, rarities and tags for filters
  const uniqueTypes = Array.from(new Set(entries.map(e => items[(e.itemHash >>> 0).toString()]?.itemTypeDisplayName))).filter(Boolean).sort() as string[];
  const uniqueRarities = Array.from(new Set(entries.map(e => {
    const tier = items[(e.itemHash >>> 0).toString()]?.inventory?.tierType;
    if (tier === 6) return 'Exotic';
    if (tier === 5) return 'Legendary';
    if (tier === 4) return 'Rare';
    return 'Common';
  }))).sort();
  
  const uniqueTags = Array.from(new Set(entries.flatMap(e => e.tags || []))).filter(Boolean).sort();

  const getRarityLabel = (rarity: string) => {
    if (lang === 'de') {
      if (rarity === 'Exotic') return 'Exotisch';
      if (rarity === 'Legendary') return 'Legendär';
      if (rarity === 'Rare') return 'Selten';
      return 'Gewöhnlich';
    }
    return rarity;
  };

  const filteredEntries = entries.filter((entry) => {
    const weapon = items[(entry.itemHash >>> 0).toString()];
    const query = filterText.toLowerCase();
    
    // Text search
    const matchesText = !filterText.trim() || (
      (weapon?.displayProperties?.name.toLowerCase().includes(query)) ||
      (entry.name?.toLowerCase().includes(query)) ||
      (entry.itemHash.toString().includes(query)) ||
      (entry.notes?.toLowerCase().includes(query)) ||
      (entry.description?.toLowerCase().includes(query)) ||
      (searchIndex && searchIndex[entry.itemHash] && (
        searchIndex[entry.itemHash].en.toLowerCase().includes(query) ||
        searchIndex[entry.itemHash].de.toLowerCase().includes(query)
      ))
    );

    // Rarity filter
    const tier = weapon?.inventory?.tierType;
    const rarity = tier === 6 ? 'Exotic' : tier === 5 ? 'Legendary' : tier === 4 ? 'Rare' : 'Common';
    const matchesRarity = filterRarity === 'all' || rarity === filterRarity;

    // Type filter
    const matchesType = filterType === 'all' || weapon?.itemTypeDisplayName === filterType;

    // Tag filter
    const matchesTag = filterTag === 'all' || entry.tags?.includes(filterTag);

    return matchesText && matchesRarity && matchesType && matchesTag;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const result = await parseImportFile(content, file.name);
        onImport(result);
      } catch (err) {
        console.error('Import failed:', err);
        alert(lang === 'de' ? 'Import fehlgeschlagen: Ungültiges Format.' : 'Import failed: Invalid format.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    event.target.value = '';
  };

  const formats = [
    { id: 'internal', name: 'D2WLG', icon: <Code size={14} /> },
    { id: 'littlelight', name: 'Little Light', icon: <Smartphone size={14} /> },
    { id: 'dim', name: 'DIM', icon: <FileText size={14} /> },
    { id: 'csv', name: 'CSV', icon: <Table size={14} /> },
  ];

  return (
    <div className="wishlist-manager" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      <div 
        className="section-header" 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: 0, margin: 0, flexShrink: 0 }}
        onClick={() => setIsItemsExpanded(!isItemsExpanded)}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListChecks size={18} />
          </div>
          <h2 style={{ margin: 0 }}>
            {lang === 'de' ? 'Meine Wunschliste' : 'My Wishlist'} ({filteredEntries.length})
          </h2>
        </div>
        <ChevronRight size={18} style={{ transform: isItemsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }} />
      </div>

      <div 
        className="expandable-wishlist-content"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: isItemsExpanded ? '800px' : '0px', 
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isItemsExpanded ? 1 : 0,
          pointerEvents: isItemsExpanded ? 'auto' : 'none',
          gap: '0.4rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.1rem 0' }}>
            {lang === 'de' ? 'Wunschlisten Details' : 'Wishlist Details'}
          </h2>
          <input 
            type="text" 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Name der Wunschliste (Optional)' : 'Wishlist Name (Optional)'}
            value={wishlistName}
            onChange={(e) => onWishlistNameChange(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.8rem 1rem', height: '44px' }}
          />
          <textarea 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Beschreibung (Optional)' : 'Description (Optional)'}
            value={wishlistDescription}
            onChange={(e) => onWishlistDescriptionChange(e.target.value)}
            style={{ fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '0.8rem 1rem', lineHeight: '1.5' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', height: '40px', flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1, height: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="input-primary" 
              placeholder={lang === 'de' ? 'Waffe suchen (Name oder ID)...' : 'Search weapon (Name or ID)...'}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ width: '100%', height: '100%', padding: '0 2rem', fontSize: '0.85rem' }}
            />
            {filterText && (
              <button 
                onClick={() => setFilterText('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'active' : ''}`}
            style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 0 }}
            title={lang === 'de' ? 'Filter' : 'Filters'}
          >
            <Filter size={18} color={showFilters || (filterRarity !== 'all' || filterType !== 'all' || filterTag !== 'all') ? 'var(--accent-color)' : 'currentColor'} />
            {(filterRarity !== 'all' || filterType !== 'all' || filterTag !== 'all') && (
              <span style={{ position: 'absolute', top: '7px', right: '7px', width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%' }}></span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="filters-container" style={{ display: 'flex', gap: '0.5rem', animation: 'fadeIn 0.2s ease-out', flexShrink: 0 }}>
            <select 
              className="input-primary" 
              value={filterRarity} 
              onChange={(e) => setFilterRarity(e.target.value)}
              style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
            >
              <option value="all">{lang === 'de' ? 'Alle Seltenheiten' : 'All Rarities'}</option>
              {uniqueRarities.map(r => (
                <option key={r} value={r}>{getRarityLabel(r)}</option>
              ))}
            </select>
            <select 
              className="input-primary" 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
            >
              <option value="all">{lang === 'de' ? 'Alle Typen' : 'All Types'}</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select 
              className="input-primary" 
              value={filterTag} 
              onChange={(e) => setFilterTag(e.target.value)}
              style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
            >
              <option value="all">{lang === 'de' ? 'Alle Tags' : 'All Tags'}</option>
              {uniqueTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div 
          className="wishlist-items custom-scrollbar" 
          style={{ 
            flex: '1 1 auto', 
            maxHeight: '560px', 
            minHeight: '100px',
            overflowY: 'auto',
            paddingRight: '6px',
            scrollbarGutter: 'stable'
          }}
        >
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '0.85rem' }}>
            {filterText ? (lang === 'de' ? 'Keine Ergebnisse.' : 'No results.') : (lang === 'de' ? 'Deine Wunschliste ist noch leer.' : 'Your wishlist is empty.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredEntries.map((entry) => {
              const weapon = items[(entry.itemHash >>> 0).toString()];
              if (!weapon) return null;
              const idx = entries.indexOf(entry); // Key to real index for copy/remove

              return (
                <div 
                  key={`${entry.itemHash}-${idx}`} 
                  className="wishlist-entry card glass-panel"
                  style={{ padding: '0.75rem', cursor: 'pointer', border: '1px solid var(--panel-border)', transition: 'all 0.2s' }}
                  onClick={() => onSelectEntry(entry)}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {weapon.displayProperties?.hasIcon && (
                      <img 
                        src={`https://www.bungie.net${weapon.displayProperties.icon}`} 
                        alt={weapon.displayProperties.name} 
                        style={{ width: '40px', height: '40px', borderRadius: '6px' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.name || (weapon.displayProperties?.name)}
                      </div>
                      <div className="entry-metadata" style={{ position: 'relative', minHeight: '1.3rem' }}>
                        <div className="wishlist-entry-default-meta" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.perkHashes.length} Perks {(entry.notes || entry.description) && `• ${entry.notes || entry.description}`}
                        </div>


                        {entry.tags && entry.tags.length > 0 && (
                          <div className="wishlist-entry-tags" style={{ gap: '0.25rem', flexWrap: 'wrap' }}>
                            {entry.tags.map(tag => (
                                <span 
                                  key={tag} 
                                  className={`tag-btn active tag-${tag.toLowerCase()}`} 
                                  style={{ 
                                    padding: '0.15rem 0.5rem', 
                                    fontSize: '0.7rem', 
                                    height: 'auto', 
                                    cursor: 'default' 
                                  }}
                                >
                                  {tag}
                                </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="entry-actions" style={{ display: 'flex', gap: '0.25rem', opacity: 0, transition: 'opacity 0.2s' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCopy(idx); }}
                        style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '0.4rem' }}
                        className="hover-primary"
                        title={lang === 'de' ? 'Kopieren' : 'Copy'}
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                        style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '0.4rem' }}
                        className="hover-danger"
                        title={lang === 'de' ? 'Löschen' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <div className="wishlist-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0, marginTop: isItemsExpanded ? 'auto' : '0.25rem', paddingTop: '1.25rem', paddingBottom: '0.25rem', paddingLeft: '2px', paddingRight: '2px', borderTop: '1px solid var(--panel-border)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
           {lang === 'de' ? 'Format wählen' : 'Choose Format'}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {formats.map((f) => (
            <button 
              key={f.id}
              className={`btn-secondary btn-hover-effect ${exportFormat === f.id ? 'active' : ''}`} 
              onClick={() => setExportFormat(f.id)}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.5rem', 
                border: exportFormat === f.id ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
                background: exportFormat === f.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {f.icon}
                {f.name}
              </div>
              {exportFormat === f.id && <Check size={12} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
          <label className="btn-secondary btn-hover-effect" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            <Upload size={16} /> {labels.importBtn}
            <input type="file" accept=".json,.txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button 
            className="btn-primary btn-hover-effect" 
            onClick={() => onExport(exportFormat)} 
            style={{ fontSize: '0.85rem' }}
            disabled={entries.length === 0}
          >
            <Download size={16} /> {labels.exportBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

