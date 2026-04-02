import { useState, useEffect } from 'react';
import { loadManifest } from './lib/manifest';
import type { DestinyItemDefinition, DestinyPlugSetDefinition } from './lib/manifest';
import { WeaponSearch } from './components/WeaponSearch';
import { PerkSelector } from './components/PerkSelector';
import { WishlistManager } from './components/WishlistManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { WishlistEntry } from './components/WishlistManager';
import { PlusCircle, Check, Layout, ListChecks, Info, Search, MousePointer2, Save, FileOutput, RefreshCcw } from 'lucide-react';
import './index.css';

type Language = 'en' | 'de';

const TRANSLATIONS = {
  en: {
    title: 'Wishlist Generator',
    subtitle: 'Destiny 2 God-Roll Creator',
    loading: 'Loading Manifest...',
    errorTitle: 'Error Loading Manifest',
    retryBtn: 'Retry manually',
    autoReload: 'Automatic reload in',
    seconds: 'seconds',
    myWishlist: 'My Wishlist',
    perkConfig: 'Perk Configuration',
    saveGodRoll: 'Save God-Roll',
    notesPlaceholder: 'Notes (e.g. PvP, Raid, etc.)',
    addBtn: 'Add to Wishlist',
    updateBtn: 'Update Entry',
    cancelBtn: 'Cancel',
    noWeaponSelected: 'Choose a weapon',
    langEn: 'English',
    langDe: 'Deutsch',
    langEnDesc: 'Standard metadata. Best for using the exported rolls in external apps like DIM or Little Light.',
    langDeDesc: 'Fully localized data. Ideal for reading perk effects and descriptions in your native language.',
    welcomeTitle: 'Welcome to the Wishlist Generator',
    welcomeSubtitle: 'The most powerful way to craft and export your Destiny 2 God-Roll wishlists.',
    step1Title: '1. Search for Weapons',
    step1Desc: 'Use the search bar in the header to find any weapon in the Destiny 2 database. We support both English and German names.',
    step2Title: '2. Select your Perks',
    step2Desc: 'Click on the perks you want for your God-Roll. You can select multiple perks per column to define your perfect roll.',
    step3Title: '3. Save to Wishlist',
    step3Desc: 'Add your selected combination to your personal wishlist on the left. You can add multiple rolls for the same weapon.',
    step4Title: '4. Export & Sync',
    step4Desc: 'Export your wishlist as a DIM-compatible text file or JSON for Little Light. Keep your rolls synced across all your apps.',
    hardReset: 'Reset App Data',
    hardResetConfirm: 'This will clear all cached manifest data and reload the app. Your wishlist will be preserved. Continue?'
  },
  de: {
    title: 'Wishlist Generator',
    subtitle: 'Destiny 2 God-Roll Creator',
    loading: 'Lade Manifest...',
    errorTitle: 'Fehler beim Laden des Manifests',
    retryBtn: 'Manuell neu versuchen',
    autoReload: 'Automatischer Reload in',
    seconds: 'Sekunden',
    myWishlist: 'Meine Wunschliste',
    perkConfig: 'Perk-Konfiguration',
    saveGodRoll: 'God-Roll speichern',
    notesPlaceholder: 'Notizen (z.B. PvP, Raid, etc.)',
    addBtn: 'Hinzufügen',
    updateBtn: 'Aktualisieren',
    cancelBtn: 'Abbrechen',
    noWeaponSelected: 'Wähle eine Waffe',
    langEn: 'English',
    langDe: 'Deutsch',
    langEnDesc: 'Standard-Metadaten. Am besten geeignet für den Export in Apps wie DIM oder Little Light.',
    langDeDesc: 'Vollständig lokalisierte Daten. Ideal, um Perk-Effekte und Beschreibungen auf Deutsch zu lesen.',
    welcomeTitle: 'Willkommen beim Wishlist Generator',
    welcomeSubtitle: 'Der einfachste Weg, um deine Destiny 2 God-Roll-Wunschlisten zu erstellen und zu exportieren.',
    step1Title: '1. Waffe suchen',
    step1Desc: 'Nutze die Suche im Header, um eine Waffe zu finden. Wir unterstützen deutsche und englische Namen gleichermaßen.',
    step2Title: '2. Perks wählen',
    step2Desc: 'Klicke auf die Perks, die dein God-Roll haben soll. Du kannst pro Spalte mehrere Perks auswählen.',
    step3Title: '3. Speichern',
    step3Desc: 'Füge deine Kombination zu deiner Wunschliste auf der linken Seite hinzu. Du kannst mehrere Rolls pro Waffe speichern.',
    step4Title: '4. Exportieren',
    step4Desc: 'Exportiere deine Liste als DIM-Textdatei oder JSON für Little Light. Nutze deine God-Rolls in all deinen Lieblings-Apps.',
    hardReset: 'App-Daten zurücksetzen',
    hardResetConfirm: 'Dies löscht alle gepufferten Manifest-Daten und lädt die App neu. Deine Wunschliste bleibt erhalten. Fortfahren?'
  }
};

function IntroView({ t }: { t: any }) {
  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <h2>{t.welcomeTitle}</h2>
        <p>{t.welcomeSubtitle}</p>
      </div>
      
      <div className="welcome-grid">
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-icon"><Search size={24} /></div>
          <h3>{t.step1Title}</h3>
          <p>{t.step1Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-icon"><MousePointer2 size={24} /></div>
          <h3>{t.step2Title}</h3>
          <p>{t.step2Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-icon"><Save size={24} /></div>
          <h3>{t.step3Title}</h3>
          <p>{t.step3Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-icon"><FileOutput size={24} /></div>
          <h3>{t.step4Title}</h3>
          <p>{t.step4Desc}</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('d2_wishlist_lang');
    return (saved === 'de' || saved === 'en') ? saved : 'en';
  });

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  const [items, setItems] = useState<Record<string, DestinyItemDefinition>>({});
  const [plugSets, setPlugSets] = useState<Record<string, DestinyPlugSetDefinition>>({});
  const [socketCategories, setSocketCategories] = useState<Record<string, any>>({});
  const [searchIndex, setSearchIndex] = useState<Record<number, { en: string; de: string }>>({});

  const [selectedWeapon, setSelectedWeapon] = useState<DestinyItemDefinition | null>(null);
  const [selectedPerks, setSelectedPerks] = useState<Set<number>>(new Set());
  const [wishlistEntries, setWishlistEntries] = useState<WishlistEntry[]>([]);
  const [notes, setNotes] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('d2_wishlist_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (error && error.includes('[RETRY]')) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            window.location.reload();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [error]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      setProgress(0);
      try {
        const data = await loadManifest(lang, (p) => setProgress(p));
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
  }, [lang]);

  const handleHardReset = () => {
    if (window.confirm(t.hardResetConfirm)) {
      indexedDB.deleteDatabase('manifest-cache'); // Generic way if locaf_orage is used
      localStorage.removeItem('manifest_version');
      window.location.reload();
    }
  };

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
        content = JSON.stringify({ source: 'Destiny 2 Wishlist Generator', version: '1.0', exportedAt: new Date().toISOString(), entries: wishlistEntries }, null, 2);
      } else if (format === 'littlelight') {
        content = JSON.stringify(wishlistEntries.map(entry => ({ itemHash: entry.itemHash, recommendedPerks: entry.perkHashes })), null, 2);
      } else if (format === 'dim') {
        content = wishlistEntries.map(entry => {
          const notesPart = entry.notes ? `//notes:${entry.notes}\n` : '';
          return `${notesPart}dimwishlist:item=${entry.itemHash}${entry.perkHashes.length > 0 ? `&perks=${entry.perkHashes.join(',')}` : ''}`;
        }).join('\n');
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
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
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
    const weapon = items[(entry.itemHash >>> 0).toString()];
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
        <h2 style={{ color: 'var(--text-primary)' }}>{t.loading}</h2>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    const isRetryable = error.includes('[RETRY]');
    const displayError = error.replace('[RETRY]', '').trim();

    return (
      <div className="loading-overlay">
        <h2 style={{ color: '#ef4444' }}>{t.errorTitle}</h2>
        <p style={{ maxWidth: '400px', textAlign: 'center' }}>{displayError}</p>
        
        {isRetryable ? (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>{t.autoReload} <strong style={{ color: 'var(--accent-color)' }}>{countdown}</strong> {t.seconds}...</p>
            <div className="progress-bar-container" style={{ width: '200px', height: '4px', margin: '1rem auto' }}>
              <div className="progress-bar-fill" style={{ width: `${(countdown / 10) * 100}%`, transition: 'width 1s linear' }}></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => window.location.reload()}>
              {t.retryBtn}
            </button>
            <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={handleHardReset}>
              <RefreshCcw size={18} /> {t.hardReset}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container">
        <header className="app-header">
          <div className="header-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div>
                <h1 className="app-title">{t.title}</h1>
                <p className="app-subtitle">{t.subtitle}</p>
              </div>
              <div className="header-search">
                <WeaponSearch items={items} searchIndex={searchIndex} onSelect={handleSelectWeapon} lang={lang} />
              </div>
            </div>
            
            <div className="header-actions">
              <div className="lang-toggle-container">
                <button 
                  className={`lang-btn ${lang === 'en' ? 'active' : ''}`} 
                  onClick={() => setLang('en')}
                >
                  EN
                </button>
                <button 
                  className={`lang-btn ${lang === 'de' ? 'active' : ''}`} 
                  onClick={() => setLang('de')}
                >
                  DE
                </button>
                <div className="lang-helper">
                  <Info size={16} />
                  <div className="lang-tooltip">
                    <p><strong>EN:</strong> {t.langEnDesc}</p>
                    <p><strong>DE:</strong> {t.langDeDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="main-layout">
          <section className="column-left">
            <div className="section-header">
              <ListChecks size={20} />
              <h2>{t.myWishlist} ({wishlistEntries.length})</h2>
            </div>
            <WishlistManager 
              entries={wishlistEntries}
              items={items}
              lang={lang}
              onExport={handleExport}
              onImport={handleImport}
              onRemove={(index) => setWishlistEntries(prev => prev.filter((_, i) => i !== index))}
              onSelectEntry={handleSelectEntry}
              labels={{
                 header: t.myWishlist,
                 importBtn: lang === 'de' ? 'Importieren' : 'Import JSON',
                 exportBtn: lang === 'de' ? 'Exportieren' : 'Export as'
              }}
            />
            {items && Object.keys(items).length > 0 && (
               <button className="btn-secondary" style={{ marginTop: 'auto', border: 'none', fontSize: '0.8rem', opacity: 0.5 }} onClick={handleHardReset}>
                 <RefreshCcw size={14} /> {t.hardReset}
               </button>
            )}
          </section>

          <section className="column-right">
            {selectedWeapon ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="section-header">
                  <Layout size={20} />
                  <h2>{t.perkConfig}</h2>
                </div>
                
                <PerkSelector 
                  weapon={selectedWeapon}
                  items={items}
                  plugSets={plugSets}
                  socketCategories={socketCategories}
                  selectedPerks={selectedPerks}
                  onTogglePerk={handleTogglePerk}
                  lang={lang}
                />
                
                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 className="card-title">{t.saveGodRoll}</h3>
                  <input 
                    type="text" 
                    className="input-primary" 
                    placeholder={t.notesPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleSaveEntry} style={{ flex: 1, justifyContent: 'center' }}>
                      {editingIndex !== null ? <><Check size={18} /> {t.updateBtn}</> : <><PlusCircle size={18} /> {t.addBtn}</>}
                    </button>
                    <button className="btn-secondary" onClick={() => { setSelectedWeapon(null); setEditingIndex(null); }} style={{ flex: 1, justifyContent: 'center' }}>
                      {t.cancelBtn}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <IntroView t={t} />
            )}
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
