import { useState } from 'react';
import { Trash2, Download, Upload, FileText, Code, Smartphone, ChevronRight, Check } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

export interface WishlistEntry {
  itemHash: number;
  perkHashes: number[];
  notes?: string;
}

interface WishlistManagerProps {
  entries: WishlistEntry[];
  items: Record<string, DestinyItemDefinition>;
  lang: 'en' | 'de';
  onExport: (format: string) => void;
  onImport: (entries: WishlistEntry[]) => void;
  onRemove: (index: number) => void;
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
  entries, items, lang, onExport, onImport, onRemove, onSelectEntry, 
  wishlistName, onWishlistNameChange, wishlistDescription, onWishlistDescriptionChange, labels 
}: WishlistManagerProps) {
  const [exportFormat, setExportFormat] = useState('dim');

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
    { id: 'dim', name: 'DIM', icon: <FileText size={14} /> },
    { id: 'internal', name: 'JSON', icon: <Code size={14} /> },
    { id: 'littlelight', name: 'Little Light', icon: <Smartphone size={14} /> },
  ];

  return (
    <div className="wishlist-manager" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="wishlist-items glass-panel" style={{ flex: 1, minHeight: '300px', overflowY: 'auto', padding: '1rem' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            {lang === 'de' ? 'Deine Wunschliste ist noch leer.' : 'Your wishlist is empty.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map((entry, idx) => {
              const weapon = items[(entry.itemHash >>> 0).toString()];
              if (!weapon) return null;

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
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{weapon.displayProperties.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {entry.perkHashes.length} Perks {entry.notes && `• ${entry.notes}`}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                      style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '0.4rem' }}
                      className="hover-danger"
                    >
                      <Trash2 size={16} />
                    </button>
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
            {lang === 'de' ? 'Wishlist Details' : 'Wishlist Details'}
          </div>
          <input 
            type="text" 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Name der Wunschliste' : 'Wishlist Name'}
            value={wishlistName}
            onChange={(e) => onWishlistNameChange(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem' }}
          />
          <textarea 
            className="input-primary" 
            placeholder={lang === 'de' ? 'Beschreibung' : 'Description'}
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
                gridColumn: f.id === 'littlelight' ? 'span 2' : 'span 1',
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
          <button 
            className="btn-primary" 
            onClick={() => onExport(exportFormat)} 
            style={{ fontSize: '0.85rem' }}
            disabled={entries.length === 0}
          >
            <Download size={16} /> {labels.exportBtn}
          </button>
          <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            <Upload size={16} /> {labels.importBtn}
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
}

