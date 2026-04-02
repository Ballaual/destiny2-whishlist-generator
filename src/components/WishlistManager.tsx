import { useRef, useState } from 'react';
import { Download, Upload, Trash2, FileJson, FileText, Smartphone } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

export interface WishlistEntry {
  itemHash: number;
  perkHashes: number[];
  notes?: string;
}

export type ExportFormat = 'internal' | 'dim' | 'littlelight';

interface WishlistManagerProps {
  entries: WishlistEntry[];
  items: Record<string, DestinyItemDefinition>;
  onExport: (format: ExportFormat) => void;
  onImport: (entries: WishlistEntry[]) => void;
  onRemove: (index: number) => void;
  onSelectEntry: (entry: WishlistEntry) => void;
}

export function WishlistManager({ entries, items, onExport, onImport, onRemove, onSelectEntry }: WishlistManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('internal');
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportError('Please select a .json file exported by this generator.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Strict validation for our internal format
        if (data.source !== 'Destiny 2 Wishlist Generator' || !Array.isArray(data.entries)) {
          setImportError('Invalid format. This file was not exported by this generator or is corrupted.');
          return;
        }

        const imported: WishlistEntry[] = data.entries.map((entry: any) => ({
          itemHash: entry.itemHash,
          perkHashes: Array.isArray(entry.perkHashes) ? entry.perkHashes : [],
          notes: entry.notes || ''
        }));

        setImportError(null);
        onImport(imported);
      } catch (err) {
        setImportError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="card-title">Wishlist Manager</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn-secondary ${exportFormat === 'internal' ? 'selected' : ''}`} 
            onClick={() => setExportFormat('internal')}
            style={{ flex: 1, borderColor: exportFormat === 'internal' ? 'var(--accent-color)' : 'var(--panel-border)' }}
          >
            <FileJson size={16} /> JSON (Internal)
          </button>
          <button 
            className={`btn-secondary ${exportFormat === 'dim' ? 'selected' : ''}`} 
            onClick={() => setExportFormat('dim')}
            style={{ flex: 1, borderColor: exportFormat === 'dim' ? 'var(--accent-color)' : 'var(--panel-border)' }}
          >
            <FileText size={16} /> DIM (.txt)
          </button>
          <button 
            className={`btn-secondary ${exportFormat === 'littlelight' ? 'selected' : ''}`} 
            onClick={() => setExportFormat('littlelight')}
            style={{ flex: 1, borderColor: exportFormat === 'littlelight' ? 'var(--accent-color)' : 'var(--panel-border)' }}
          >
            <Smartphone size={16} /> Little Light
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => onExport(exportFormat)} disabled={entries.length === 0} style={{ flex: 2, justifyContent: 'center' }}>
            <Download size={18} /> Export as {exportFormat === 'internal' ? 'Internal JSON' : exportFormat === 'dim' ? 'DIM TXT' : 'Little Light JSON'}
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, justifyContent: 'center' }}>
            <Upload size={18} /> Import JSON
          </button>
        </div>

        {importError && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {importError}
          </div>
        )}

        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Current Entries ({entries.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {entries.map((entry, idx) => {
              const weaponDef = items[entry.itemHash];
              return (
                <div key={idx} className="search-result-item" style={{ justifyContent: 'space-between', borderRadius: '8px', padding: '0.5rem 1rem' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flex: 1 }}
                    onClick={() => onSelectEntry(entry)}
                  >
                    {weaponDef?.displayProperties?.icon && (
                      <img 
                        src={`https://www.bungie.net${weaponDef.displayProperties.icon}`} 
                        alt="icon" 
                        style={{ width: '32px', height: '32px' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{weaponDef?.displayProperties?.name || `Unknown (${entry.itemHash})`}</div>
                      {entry.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{entry.notes}</div>}
                    </div>
                  </div>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.4rem', color: '#ef4444', borderColor: 'transparent', width: 'auto' }}
                    onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                    title="Remove Entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
