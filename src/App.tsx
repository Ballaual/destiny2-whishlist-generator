import { useState, useEffect } from 'react';
import { loadManifest } from './lib/manifest';
import type { DestinyItemDefinition, DestinyPlugSetDefinition } from './lib/manifest';
import { WeaponSearch } from './components/WeaponSearch';
import { PerkSelector } from './components/PerkSelector';
import { WishlistManager } from './components/WishlistManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { WishlistEntry } from './components/WishlistManager';
import { PlusCircle, Check, Layout, ListChecks, Search, MousePointer2, Save, FileOutput, RefreshCcw, Sun, Moon, Monitor } from 'lucide-react';
import './index.css';

type Language = 'en' | 'de';
type Theme = 'light' | 'dark' | 'system';

const TRANSLATIONS = {
  en: {
    title: 'D2 Wishlist Generator',
    loading: 'Loading Manifest...',
    errorTitle: 'Error Loading Manifest',
    retryBtn: 'Retry manually',
    autoReload: 'Automatic reload in',
    seconds: 'seconds',
    myWishlist: 'My Wishlist',
    perkConfig: 'Perk Configuration',
    saveGodRoll: 'Save God-Roll',
    notesPlaceholder: 'Notes (e.g. PvP, Raid, etc.)',
    addBtn: 'Add',
    updateBtn: 'Update',
    cancelBtn: 'Cancel',
    noWeaponSelected: 'Choose a weapon',
    langEn: 'English',
    langDe: 'Deutsch',
    langEnDesc: 'Standard metadata. Best for using the exported rolls in external apps like DIM or Little Light.',
    langDeDesc: 'Fully localized data. Ideal for reading perk effects and descriptions in your native language.',
    welcomeTitle: 'Welcome to the Destiny 2 Wishlist Generator',
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
    hardResetConfirm: 'This will DELETE ALL DATA (wishlist, settings, cache) and reload the app. This cannot be undone. Continue?',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System'
  },
  de: {
    title: 'D2 Wishlist Generator',
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
    welcomeTitle: 'Willkommen beim Destiny 2 Wunschlisten Generator',
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
    hardResetConfirm: 'Dies wird ALLE DATEN LÖSCHEN (Wunschliste, Einstellungen, Cache) und die App neu laden. Dies kann nicht rückgängig gemacht werden. Fortfahren?',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System'
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
          <div className="welcome-card-header">
            <div className="welcome-card-icon"><Search size={24} /></div>
            <h3>{t.step1Title}</h3>
          </div>
          <p>{t.step1Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon"><MousePointer2 size={24} /></div>
            <h3>{t.step2Title}</h3>
          </div>
          <p>{t.step2Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon"><Save size={24} /></div>
            <h3>{t.step3Title}</h3>
          </div>
          <p>{t.step3Desc}</p>
        </div>
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon"><FileOutput size={24} /></div>
            <h3>{t.step4Title}</h3>
          </div>
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

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('d2_wishlist_theme');
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  const [items, setItems] = useState<Record<string, DestinyItemDefinition>>({});
  const [plugSets, setPlugSets] = useState<Record<string, DestinyPlugSetDefinition>>({});
  const [socketCategories, setSocketCategories] = useState<Record<string, any>>({});
  const [searchIndex, setSearchIndex] = useState<Record<number, { en: string; de: string }>>({});

  const [selectedWeaponHash, setSelectedWeaponHash] = useState<number | null>(() => {
    const saved = localStorage.getItem('d2_wishlist_selected_hash');
    return saved ? parseInt(saved, 10) : null;
  });
  const selectedWeapon = selectedWeaponHash ? items[(selectedWeaponHash >>> 0).toString()] : null;

  const [selectedPerks, setSelectedPerks] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('d2_wishlist_selected_perks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [wishlistEntries, setWishlistEntries] = useState<WishlistEntry[]>(() => {
    const saved = localStorage.getItem('d2_wishlist_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('d2_wishlist_notes') || '';
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [wishlistName, setWishlistName] = useState(() => {
    return localStorage.getItem('d2_wishlist_name') || '';
  });
  const [wishlistDescription, setWishlistDescription] = useState(() => {
    return localStorage.getItem('d2_wishlist_description') || '';
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('d2_wishlist_selected_tags');
    return saved ? JSON.parse(saved) : [];
  });

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('d2_wishlist_lang', lang);
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      root.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');

      const handleChange = () => {
        root.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('d2_wishlist_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_entries', JSON.stringify(wishlistEntries));
  }, [wishlistEntries]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_name', wishlistName);
  }, [wishlistName]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_description', wishlistDescription);
  }, [wishlistDescription]);

  useEffect(() => {
    if (selectedWeaponHash) localStorage.setItem('d2_wishlist_selected_hash', selectedWeaponHash.toString());
    else localStorage.removeItem('d2_wishlist_selected_hash');
  }, [selectedWeaponHash]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_selected_perks', JSON.stringify(Array.from(selectedPerks)));
  }, [selectedPerks]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_notes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_selected_tags', JSON.stringify(selectedTags));
  }, [selectedTags]);

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

  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      setProgress(0);
      try {
        const data = await loadManifest(lang, (p) => setProgress(p), (s) => setStatus(s));
        if (data) {
          console.log(`[App] DATA VERIFIED (${lang}): ${Object.keys(data.items).length} items`);
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

  const handleHardReset = async () => {
    if (window.confirm(t.hardResetConfirm)) {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Delete IndexedDB
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      } else {
        window.indexedDB.deleteDatabase('manifest-cache');
      }

      // Clear Caches (Service Workers)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // Final reload bypassing cache
      window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
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

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectWeapon = (weapon: DestinyItemDefinition) => {
    setSelectedWeaponHash(weapon.hash);
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
        notes: notes.trim(),
        tags: selectedTags
      };
      setWishlistEntries(newEntries);
      setEditingIndex(null);
    } else {
      setWishlistEntries(prev => [...prev, {
        itemHash: selectedWeapon.hash,
        perkHashes: Array.from(selectedPerks),
        notes: notes.trim(),
        tags: selectedTags
      }]);
    }

    setSelectedWeaponHash(null);
    setSelectedPerks(new Set());
    setSelectedTags([]);
    setNotes('');
  };

  const handleExport = (format: string) => {
    if (wishlistEntries.length === 0) return;
    let content = '';
    let mimeType = 'application/json';
    const safeName = (wishlistName || 'D2WLG').trim().toLowerCase().replace(/\s+/g, '_');
    let fileName = `d2wlg_${safeName}.json`;

    try {
      if (format === 'internal') {
        content = JSON.stringify({ source: 'D2WLG', name: wishlistName, description: wishlistDescription, version: '1.0', exportedAt: new Date().toISOString(), entries: wishlistEntries }, null, 2);
      } else if (format === 'littlelight') {
        const littleLightData = {
          name: wishlistName || 'D2WLG',
          description: wishlistDescription || 'Exported from D2WLG',
          data: wishlistEntries.map(entry => {
            const weapon = items[(entry.itemHash >>> 0).toString()];
            return {
              name: weapon?.displayProperties?.name || "",
              description: entry.notes || "",
              hash: entry.itemHash,
              plugs: entry.perkHashes.map(h => [h]),
              tags: entry.tags && entry.tags.length > 0 ? entry.tags : ["GodPVE"]
            };
          })
        };
        content = JSON.stringify(littleLightData, null, 2);
        fileName = `littlelight_${safeName}.json`;
      } else if (format === 'dim') {
        const header = `title:${wishlistName || 'D2WLG'}\ndescription:${wishlistDescription || 'Exported from D2WLG'}\n\n`;
        const entries = wishlistEntries.map(entry => {
          const weapon = items[(entry.itemHash >>> 0).toString()];
          const weaponName = weapon?.displayProperties?.name || "Unknown Weapon";
          const tagsStr = entry.tags && entry.tags.length > 0 ? entry.tags.map(t => t.toLowerCase()).join(',') : "god-pve";
          const notes = entry.notes ? `tags:${tagsStr}, ${entry.notes}` : `tags:${tagsStr}`;

          return `// ${weaponName} (${tagsStr})\n//notes: ${notes}\ndimwishlist:item=${entry.itemHash}${entry.perkHashes.length > 0 ? `&perks=${entry.perkHashes.join(',')}` : ''}`;
        }).join('\n\n');
        content = header + entries;
        mimeType = 'text/plain';
        fileName = `d2wlg_dim_${safeName}.txt`;
      } else if (format === 'csv') {
        const header = 'Name,Hash,Perks,Tags,Notes\n';
        const rows = wishlistEntries.map(entry => {
          const weapon = items[(entry.itemHash >>> 0).toString()];
          const weaponName = weapon?.displayProperties?.name || "Unknown Weapon";
          const perkNames = entry.perkHashes.map(h => {
            const p = items[(h >>> 0).toString()];
            return p?.displayProperties?.name || h.toString();
          });
          const perksStr = perkNames.join(' | ');
          const tagsStr = entry.tags?.join(' | ') || '';
          const notesStr = entry.notes?.replace(/"/g, '""') || '';
          return `"${weaponName}","${entry.itemHash}","${perksStr}","${tagsStr}","${notesStr}"`;
        }).join('\n');
        content = header + rows;
        mimeType = 'text/csv';
        fileName = `d2wlg_${safeName}.csv`;
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
    setSelectedWeaponHash(entry.itemHash);
    setSelectedPerks(new Set(entry.perkHashes));
    setSelectedTags(entry.tags || []);
    setNotes(entry.notes || '');
    setEditingIndex(wishlistEntries.indexOf(entry));
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t.loading}</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '1rem' }}>
          {status}
        </div>
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
              </div>
              <div className="header-search">
                <WeaponSearch items={items} searchIndex={searchIndex} onSelect={handleSelectWeapon} lang={lang} />
              </div>
            </div>

            <div className="header-actions">
              <div className="lang-toggle-container" style={{ marginRight: '0.5rem' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                  <button
                    className={`lang-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                    title={t.themeLight}
                    style={{ padding: '0.4rem' }}
                  >
                    <Sun size={14} />
                  </button>
                  <button
                    className={`lang-btn ${theme === 'system' ? 'active' : ''}`}
                    onClick={() => setTheme('system')}
                    title={t.themeSystem}
                    style={{ padding: '0.4rem' }}
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    className={`lang-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                    title={t.themeDark}
                    style={{ padding: '0.4rem' }}
                  >
                    <Moon size={14} />
                  </button>
                </div>
              </div>

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
            <div className="wishlist-sidebar-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <WishlistManager
                entries={wishlistEntries}
                items={items}
                lang={lang}
                onExport={handleExport}
                onImport={handleImport}
                onRemove={(index) => setWishlistEntries(prev => prev.filter((_, i) => i !== index))}
                onSelectEntry={handleSelectEntry}
                wishlistName={wishlistName}
                onWishlistNameChange={setWishlistName}
                wishlistDescription={wishlistDescription}
                onWishlistDescriptionChange={setWishlistDescription}
                labels={{
                  header: t.myWishlist,
                  importBtn: lang === 'de' ? 'Importieren' : 'Import',
                  exportBtn: lang === 'de' ? 'Exportieren' : 'Export'
                }}
              />
              <button
                className="btn-secondary"
                style={{ border: 'none', fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onClick={handleHardReset}
              >
                <RefreshCcw size={12} /> {t.hardReset}
              </button>
            </div>
          </section>

          <section className="column-right">
            {selectedWeapon ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="section-header">
                  <Layout size={20} />
                  <h2>{t.perkConfig}</h2>
                </div>

                {selectedWeapon.screenshot && (
                  <div className="weapon-screenshot-container card glass-panel" style={{ padding: 0, overflow: 'hidden', height: '180px' }}>
                    <img
                      src={`https://www.bungie.net${selectedWeapon.screenshot}`}
                      alt="Weapon Screenshot"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                    />
                  </div>
                )}

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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {['GodPvE', 'GodPvP', 'PvE', 'PvP'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
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
                    <button className="btn-secondary" onClick={() => { setSelectedWeaponHash(null); setEditingIndex(null); }} style={{ flex: 1, justifyContent: 'center' }}>
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
