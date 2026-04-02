import { useState } from 'react';
import { Trash2, Copy, Download, Upload, FileText, Code, Smartphone, ChevronRight, Check, Table, Search, X } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

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
  onImport: (entries: WishlistEntry[]) => void;
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
}

export function WishlistManager({ 
  entries, items, lang, onExport, onImport, onRemove, onCopy, onSelectEntry, 
  wishlistName, onWishlistNameChange, wishlistDescription, onWishlistDescriptionChange, labels 
}: WishlistManagerProps) {
  const [exportFormat, setExportFormat] = useState('internal');
  const [filterText, setFilterText] = useState('');

  const filteredEntries = entries.filter((entry) => {
    if (!filterText.trim()) return true;
    const weapon = items[(entry.itemHash >>> 0).toString()];
    const query = filterText.toLowerCase();
    
    // Search Name, ID, Tags, Notes, Description
    return (
      (weapon?.displayProperties?.name.toLowerCase().includes(query)) ||
      (entry.name?.toLowerCase().includes(query)) ||
      (entry.itemHash.toString().includes(query)) ||
      (entry.notes?.toLowerCase().includes(query)) ||
      (entry.description?.toLowerCase().includes(query)) ||
      (entry.tags?.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.entries) {
          onImport(data.entries);
        } else if (Array.isArray(data)) {
          onImport(data);
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert(lang === 'de' ? 'Import fehlgeschlagen: Ungültiges Format.' : 'Import failed: Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  const formats = [
    { id: 'internal', name: 'D2WLG', icon: <Code size={14} /> },
    { id: 'littlelight', name: 'Little Light', icon: <Smartphone size={14} /> },
    { id: 'dim', name: 'DIM', icon: <FileText size={14} /> },
    { id: 'csv', name: 'CSV', icon: <Table size={14} /> },
  ];

  return (
    <div className="wishlist-manager" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
      <div className="wishlist-filter-wrapper" style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input 
          type="text" 
          className="input-primary" 
          placeholder={lang === 'de' ? 'Filter (Name, ID, Tags...)' : 'Filter (Name, ID, Tags...)'}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ padding: '0.5rem 2rem', fontSize: '0.8rem' }}
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

      <div className="wishlist-items glass-panel" style={{ flex: 1, minHeight: '150px', overflowY: 'auto', padding: '0.75rem' }}>
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {entry.name || weapon.displayProperties.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                        {entry.tags && entry.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {entry.tags.map(tag => (
                              <span key={tag} className="tag-pill" style={{ fontSize: '0.65rem' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <span style={{ display: 'block', width: '100%' }}>
                          {entry.perkHashes.length} Perks {(entry.notes || entry.description) && `• ${entry.notes || entry.description}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
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

      <div className="wishlist-actions card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'de' ? 'Wunschlisten Details' : 'Wishlist Details'}
          </div>
          <input 
            type="text" 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Name der Wunschliste (Optional)' : 'Wishlist Name (Optional)'}
            value={wishlistName}
            onChange={(e) => onWishlistNameChange(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem' }}
          />
          <textarea 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Beschreibung (Optional)' : 'Description (Optional)'}
            value={wishlistDescription}
            onChange={(e) => onWishlistDescriptionChange(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
           {lang === 'de' ? 'Format wählen' : 'Choose Format'}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {formats.map((f) => (
            <button 
              key={f.id}
              className={`btn-secondary ${exportFormat === f.id ? 'active' : ''}`} 
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
          <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            <Upload size={16} /> {labels.importBtn}
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button 
            className="btn-primary" 
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

