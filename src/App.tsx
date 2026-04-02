import { useState, useEffect } from 'react';
import { loadManifest } from './lib/manifest';
import type { DestinyItemDefinition, DestinyPlugSetDefinition } from './lib/manifest';
import { WeaponSearch } from './components/WeaponSearch';
import { PerkSelector } from './components/PerkSelector';
import { WishlistManager } from './components/WishlistManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { WishlistEntry } from './components/WishlistManager';
import { PlusCircle, Database, Check, Layout, ListChecks } from 'lucide-react';
import './index.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Record<string, DestinyItemDefinition>>({});
  const [plugSets, setPlugSets] = useState<Record<string, DestinyPlugSetDefinition>>({});
  const [socketCategories, setSocketCategories] = useState<Record<string, any>>({});
  const [searchIndex, setSearchIndex] = useState<Record<number, { en: string; de: string }>>({});

  const [selectedWeapon, setSelectedWeapon] = useState<DestinyItemDefinition | null>(null);
  const [selectedPerks, setSelectedPerks] = useState<Set<number>>(new Set());
  const [wishlistEntries, setWishlistEntries] = useState<WishlistEntry[]>([]);
  const [notes, setNotes] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const data = await loadManifest((p) => setProgress(p));
        if (data) {
          setItems(data.items || {});
          setPlugSets(data.plugSets || {});
          setSocketCategories(data.socketCategories || {});
          setSearchIndex(data.searchIndex || {});
        }
      } catch (err: any) {
        console.error("Manifest Load Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleTogglePerk = (hash: number) => {
    setSelectedPerks(prev => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  };

  const handleSelectWeapon = (weapon: DestinyItemDefinition) => {
    console.log("Weapon Selected:", weapon.displayProperties?.name, weapon.hash);
    setSelectedWeapon(weapon);
    setSelectedPerks(new Set());
    setNotes('');
    setEditingIndex(null);
  };

  const handleSaveEntry = () => {
    if (!selectedWeapon) return;
    
    if (editingIndex !== null) {
      const newEntries = [...wishlistEntries];
      newEntries[editingIndex] = {
        itemHash: selectedWeapon.hash,
        perkHashes: Array.from(selectedPerks),
        notes: notes.trim()
      };
      setWishlistEntries(newEntries);
      setEditingIndex(null);
    } else {
      setWishlistEntries(prev => [...prev, {
        itemHash: selectedWeapon.hash,
        perkHashes: Array.from(selectedPerks),
        notes: notes.trim()
      }]);
    }
    
    setSelectedWeapon(null);
    setSelectedPerks(new Set());
    setNotes('');
  };

  const handleExport = (format: string) => {
    if (wishlistEntries.length === 0) return;

    let content = '';
    let mimeType = 'application/json';
    let fileName = 'destiny2_wishlist.json';

    try {
      if (format === 'internal') {
        const internalData = {
          source: 'Destiny 2 Wishlist Generator',
          version: '1.0',
          exportedAt: new Date().toISOString(),
          entries: wishlistEntries
        };
        content = JSON.stringify(internalData, null, 2);
      } else if (format === 'littlelight') {
        const llData = wishlistEntries.map(entry => ({
          itemHash: entry.itemHash,
          recommendedPerks: entry.perkHashes
        }));
        content = JSON.stringify(llData, null, 2);
      } else if (format === 'dim') {
        const lines = [];
        for (const entry of wishlistEntries) {
          if (entry.notes) {
            lines.push(`//notes:${entry.notes}`);
          }
          const itemPart = `item=${entry.itemHash}`;
          const perksPart = entry.perkHashes.length > 0 ? `&perks=${entry.perkHashes.join(',')}` : '';
          lines.push(`dimwishlist:${itemPart}${perksPart}`);
        }
        content = lines.join('\n');
        mimeType = 'text/plain';
        fileName = 'destiny2_wishlist.txt';
      }

      if (!content) return;
      
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Export Error:', err);
    }
  };

  const handleImport = (entries: WishlistEntry[]) => {
    setWishlistEntries(prev => {
      const combined = [...prev];
      for (const entry of entries) {
        const exists = combined.some(e => e.itemHash === entry.itemHash && JSON.stringify(e.perkHashes.sort()) === JSON.stringify(entry.perkHashes.sort()));
        if (!exists) combined.push(entry);
      }
      return combined;
    });
  };

  const handleSelectEntry = (entry: WishlistEntry) => {
    const weapon = items[entry.itemHash];
    if (weapon) {
      setSelectedWeapon(weapon);
      setSelectedPerks(new Set(entry.perkHashes));
      setNotes(entry.notes || '');
      setEditingIndex(wishlistEntries.indexOf(entry));
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <h2 style={{ color: 'var(--text-primary)' }}>Loading Manifest...</h2>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-overlay">
        <h2 style={{ color: '#ef4444' }}>Error Loading Manifest</h2>
        <p>{error}</p>
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container">
        <header className="app-header">
          <div className="header-top">
            <div>
              <h1 className="app-title">Wishlist Generator</h1>
              <p className="app-subtitle">Destiny 2 God-Roll Creator</p>
            </div>
            <div className="header-search">
              <WeaponSearch items={items} searchIndex={searchIndex} onSelect={handleSelectWeapon} />
            </div>
          </div>
        </header>

        <main className="main-layout">
          <section className="column-left">
            <div className="section-header">
              <ListChecks size={20} />
              <h2>My Wishlist ({wishlistEntries.length})</h2>
            </div>
            <WishlistManager 
              entries={wishlistEntries}
              items={items}
              onExport={handleExport}
              onImport={handleImport}
              onRemove={(index) => setWishlistEntries(prev => prev.filter((_, i) => i !== index))}
              onSelectEntry={handleSelectEntry}
            />
          </section>

          <section className="column-right">
            {selectedWeapon ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="section-header">
                  <Layout size={20} />
                  <h2>Perk Configuration</h2>
                </div>
                
                <PerkSelector 
                  weapon={selectedWeapon}
                  items={items}
                  plugSets={plugSets}
                  socketCategories={socketCategories}
                  selectedPerks={selectedPerks}
                  onTogglePerk={handleTogglePerk}
                />
                
                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 className="card-title">Save God-Roll</h3>
                  <input 
                    type="text" 
                    className="input-primary" 
                    placeholder="Notes (e.g. PvP, Raid, etc.)" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleSaveEntry} style={{ flex: 1, justifyContent: 'center' }}>
                      {editingIndex !== null ? <><Check size={18} /> Update</> : <><PlusCircle size={18} /> Add</>}
                    </button>
                    <button className="btn-secondary" onClick={() => { setSelectedWeapon(null); setEditingIndex(null); }} style={{ flex: 1, justifyContent: 'center' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card glass-panel empty-state">
                <Database size={48} style={{ marginBottom: '1rem' }} />
                <h3>Choose a weapon</h3>
                <p>Search in the header to start building your wishlist entries.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
