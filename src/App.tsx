import { useState, useEffect, useMemo } from 'react';
import { loadManifest } from './lib/manifest';
import type { DestinyItemDefinition, DestinyPlugSetDefinition, ReleaseMap } from './lib/manifest';
import { WeaponSearch } from './components/WeaponSearch';
import { PerkSelector } from './components/PerkSelector';
import { WishlistManager } from './components/WishlistManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { WishlistEntry } from './components/WishlistManager';
import { PlusCircle, Check, Search, Save, FileOutput, Settings2, Monitor, Moon, Sun, AlertTriangle, RefreshCcw, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import './index.css';

type Language = 'en' | 'de';
type Theme = 'light' | 'dark' | 'system';
declare const __APP_COMMIT__: string;

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
    saveGodRoll: 'Tags & Info',
    notesPlaceholder: 'Notes (Optional)',
    entryNamePlaceholder: 'Roll Name (Optional)',
    entryDescriptionPlaceholder: 'Description (Optional)',
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
    step1Desc: 'Use the search bar in the header to find any weapon by name or its unique ID. We support both English and German.',
    step2Title: '2. Select your Perks',
    step2Desc: 'Click on the perks you want for your God-Roll. You can select multiple perks per column to define your perfect roll.',
    step3Title: '3. Save to Wishlist',
    step3Desc: 'Add your selected combination to your personal wishlist on the left. You can add multiple rolls for the same weapon.',
    step4Title: '4. Export & Sync',
    step4Desc: 'Export your wishlist as a DIM-compatible text file or JSON for Little Light. Keep your rolls synced across all your apps.',
    hardReset: 'Reset all Data',
    hardResetConfirm: 'This will DELETE ALL DATA (wishlist, settings, cache) and reload the app. This cannot be undone. Continue?',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    themeSystem: 'System',
    searchPlaceholder: 'Weapon search (Name or Id)...',
    exportDIM: 'Export DIM',
    exportLL: 'Export Little Light',
    exportCSV: 'Export CSV',
    exportInternal: 'Export JSON',
    importBtn: 'Import JSON',
    wishlistNameLabel: 'Wishlist Name',
    wishlistDescLabel: 'Wishlist Description',
    sourceLabel: 'Source',
    archetypeLabel: 'Archetype',
    welcomeFeatures: 'Features & Tips',
    featureManifest: 'Direct Sync: Uses the live Bungie Manifest for up-to-date data.',
    featureExports: 'Smart Export: Supports DIM (notes & tags), CSV, and LittleLight.',
    featureOffline: 'Offline Support: Once loaded, you can manage your rolls offline.',
    featurePrivacy: 'Privacy First: No cloud storage; all data stays in your browser.',
    ammoPrimary: 'Primary',
    ammoSpecial: 'Special',
    ammoHeavy: 'Heavy',
    damageKinetic: 'Kinetic',
    damageArc: 'Arc',
    damageSolar: 'Solar',
    damageVoid: 'Void',
    damageStasis: 'Stasis',
    damageStrand: 'Strand',
    rarityExotic: 'Exotic',
    rarityLegendary: 'Legendary',
    rarityRare: 'Rare',
    rarityCommon: 'Common',
    filterAllRarities: 'All Rarities',
    filterAllTypes: 'All Types',
    tagsHeader: 'Tags & Info',
    addBtnShort: 'Add',
    updateBtnShort: 'Update'
  },
  de: {
    title: 'D2 Wishlist Generator',
    subtitle: 'Erstelle professionelle God-Roll Wunschlisten für Destiny 2.',
    howToTitle: 'Anleitung',
    step1: '1. Suche eine Waffe (Name oder ID), um den Konfigurator zu öffnen.',
    step2: '2. Wähle deine gewünschten Perks aus (z.B. Perks für PvE oder PvP).',
    step3: '3. Füge Name, Notizen oder Tags (GodPvE, Controller etc.) hinzu.',
    step4: '4. Exportiere deine gesamte Liste für DIM, Little Light oder CSV.',
    loading: 'Lade Metadaten...',
    errorTitle: 'Fehler beim Laden des Manifests',
    retryBtn: 'Manuell neu versuchen',
    autoReload: 'Automatischer Reload in',
    seconds: 'Sekunden',
    myWishlist: 'Meine Wunschliste',
    perkConfig: 'Perk-Konfiguration',
    saveGodRoll: 'Tags & Info',
    notesPlaceholder: 'Notizen (Optional)',
    entryNamePlaceholder: 'Roll-Name (Optional)',
    entryDescriptionPlaceholder: 'Beschreibung (Optional)',
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
    step1Title: '1. Nach Waffen suchen',
    step1Desc: 'Nutze die Suche im Header, um eine Waffe per Name oder ID zu finden. Wir unterstützen deutsche und englische Bezeichnungen.',
    step2Title: '2. Perks wählen',
    step2Desc: 'Klicke auf die Perks, die dein God-Roll haben soll. Du kannst pro Spalte mehrere Perks auswählen.',
    step3Title: '3. Speichern',
    step3Desc: 'Füge deine Kombination zu deiner Wunschliste auf der linken Seite hinzu. Du kannst mehrere Rolls pro Waffe speichern.',
    step4Title: '4. Exportieren',
    step4Desc: 'Exportiere deine Liste als DIM-Textdatei oder JSON für Little Light. Nutze deine God-Rolls in all deinen Lieblings-Apps.',
    hardReset: 'Alle Daten löschen',
    hardResetConfirm: 'Dies wird ALLE DATEN LÖSCHEN (Wunschliste, Einstellungen, Cache) und die App neu laden. Dies kann nicht rückgängig gemacht werden. Fortfahren?',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System',
    searchPlaceholder: 'Waffe suchen (Name oder Id)...',
    exportDIM: 'Export DIM',
    exportLL: 'Export Little Light',
    exportCSV: 'Export CSV',
    exportInternal: 'Export JSON',
    importBtn: 'Import JSON',
    wishlistNameLabel: 'Wunschlisten-Name',
    wishlistDescLabel: 'Wunschlisten-Beschreibung',
    sourceLabel: 'Quelle',
    archetypeLabel: 'Archetyp',
    welcomeFeatures: 'Funktionen & Tipps',
    featureManifest: 'Direkt-Sync: Nutzt das Live Bungie Manifest für aktuelle Daten.',
    featureExports: 'Smart Export: Unterstützt DIM (Notizen & Tags), CSV und LittleLight.',
    featureOffline: 'Offline-Support: Einmal geladen, kannst du deine Rolls offline verwalten.',
    featurePrivacy: 'Privatsphäre: Keine Cloud-Speicherung; alle Daten bleiben in deinem Browser.',
    ammoPrimary: 'Primär',
    ammoSpecial: 'Spezial',
    ammoHeavy: 'Schwer',
    damageKinetic: 'Kinetik',
    damageArc: 'Arkus',
    damageSolar: 'Solar',
    damageVoid: 'Leere',
    damageStasis: 'Stasis',
    damageStrand: 'Strang',
    rarityExotic: 'Exotisch',
    rarityLegendary: 'Legendär',
    rarityRare: 'Selten',
    rarityCommon: 'Gewöhnlich',
    filterAllRarities: 'Alle Seltenheiten',
    filterAllTypes: 'Alle Typen',
    tagsHeader: 'Tags & Info',
    addBtnShort: 'Hinzufügen',
    updateBtnShort: 'Aktualisieren'
  }
};

function IntroView({ t, lang }: { t: any, lang: string }) {
  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <h2>{t.welcomeTitle}</h2>
        <p>{t.welcomeSubtitle}</p>
      </div>

      <div className="welcome-grid">
        {/* Card 1: Features & Highlights */}
        <div className="card glass-panel welcome-card" style={{ gridColumn: 'span 1' }}>
          <div className="welcome-card-header">
            <div className="welcome-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Check size={24} /></div>
            <h3 style={{ margin: 0 }}>{lang === 'de' ? 'Features' : 'Features'}</h3>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', gap: '0.75rem' }}><Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> {t.featureManifest}</li>
            <li style={{ display: 'flex', gap: '0.75rem' }}><Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> {t.featureExports}</li>
            <li style={{ display: 'flex', gap: '0.75rem' }}><Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> {t.featureOffline}</li>
            <li style={{ display: 'flex', gap: '0.75rem' }}><Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> {t.featurePrivacy}</li>
          </ul>
        </div>

        {/* Card 2: Configuration (Steps 1 & 2) */}
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><Search size={24} /></div>
            <h3 style={{ margin: 0 }}>{lang === 'de' ? 'Waffen & Perks' : 'Discovery & Crafting'}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', fontSize: '0.85rem' }}>
            <p><strong>{lang === 'de' ? 'Waffen suchen' : 'Search for Weapons'}:</strong> {t.step1Desc}</p>
            <p><strong>{lang === 'de' ? 'Perks wählen' : 'Select your Perks'}:</strong> {t.step2Desc}</p>
          </div>
        </div>

        {/* Card 3: Wishlist Management (Step 3) */}
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}><Save size={24} /></div>
            <h3 style={{ margin: 0 }}>{lang === 'de' ? 'Verwalten & Organisieren' : 'Manage & Organize'}</h3>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            <p>{t.step3Desc}</p>
            <p style={{ marginTop: '0.5rem', opacity: 0.7, fontStyle: 'italic' }}>
              {lang === 'de'
                ? 'Tipp: Nutze Roll-Namen und Notizen, um deine Favoriten (z.B. "PvP Godroll") schnell wiederzufinden.'
                : 'Tip: Use Roll Names and Notes to quickly identify your favorites like "PvP Godroll".'}
            </p>
          </div>
        </div>

        {/* Card 4: Export (Step 4) */}
        <div className="card glass-panel welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}><FileOutput size={24} /></div>
            <h3 style={{ margin: 0 }}>{lang === 'de' ? 'Export & Sync' : 'Export & Sync'}</h3>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            <p>{t.step4Desc}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>

              <span className="tag-btn" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>DIM</span>
              <span className="tag-btn" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>Little Light</span>
              <span className="tag-btn" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>CSV</span>
            </div>
          </div>
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
  const [releases, setReleases] = useState<ReleaseMap>({});

  const [selectedWeaponHash, setSelectedWeaponHash] = useState<number | null>(() => {
    const saved = localStorage.getItem('d2_wishlist_selected_hash');
    return saved ? parseInt(saved, 10) : null;
  });
  const selectedWeapon = selectedWeaponHash ? items[(selectedWeaponHash >>> 0).toString()] : null;

  const [selectedPerks, setSelectedPerks] = useState<number[]>(() => {
    const saved = localStorage.getItem('d2_wishlist_selected_perks');
    return saved ? JSON.parse(saved) : [];
  });

  // Compute perk-to-column mapping for column-aware ordering
  const perkToColumn = useMemo(() => {
    if (!selectedWeapon?.sockets?.socketEntries) return new Map<number, number>();
    const map = new Map<number, number>();
    selectedWeapon.sockets.socketEntries.forEach((entry: any, idx: number) => {
      const hashes: number[] = [];
      const getSet = (hash: any) => {
        if (!hash) return null;
        return plugSets[(hash >>> 0).toString()] || plugSets[hash.toString()];
      };
      if (entry.randomizedPlugSetHash) {
        const set = getSet(entry.randomizedPlugSetHash);
        if (set?.reusablePlugItems) hashes.push(...set.reusablePlugItems.map((p: any) => p.plugItemHash));
      }
      if (entry.reusablePlugSetHash) {
        const set = getSet(entry.reusablePlugSetHash);
        if (set?.reusablePlugItems) hashes.push(...set.reusablePlugItems.map((p: any) => p.plugItemHash));
      }
      if (entry.reusablePlugItems) {
        hashes.push(...entry.reusablePlugItems.map((p: any) => p.plugItemHash));
      }
      if (entry.singleInitialItemHash) {
        hashes.push(entry.singleInitialItemHash);
      }
      for (const h of hashes) {
        if (!map.has(h)) map.set(h, idx);
      }
    });
    return map;
  }, [selectedWeapon, plugSets]);

  // Group selected perks by column for the sortable list
  // Uses the same header logic as PerkSelector for 1:1 matching
  const selectedPerksGrouped = useMemo(() => {
    const groups: Map<number, number[]> = new Map();
    for (const hash of selectedPerks) {
      const col = perkToColumn.get(hash) ?? -1;
      if (!groups.has(col)) groups.set(col, []);
      groups.get(col)!.push(hash);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([colIdx, hashes]) => {
        const firstPerk = items[(hashes[0] >>> 0).toString()];
        let header = firstPerk?.itemTypeDisplayName?.replace(/^Item:\s*/i, '') || (lang === 'de' ? 'Perk' : 'Perk');

        // Masterwork detection – same logic as PerkSelector
        const isMasterworkColumn = hashes.some(h => {
          const p = items[(h >>> 0).toString()];
          const pName = p?.displayProperties?.name?.toLowerCase() || '';
          const pType = p?.itemTypeDisplayName?.toLowerCase() || '';
          return pName.includes('masterwork') || pName.includes('meisterwerk') ||
            /\b(tier|stufe)\b/.test(pName) ||
            pType.includes('masterwork') || pType.includes('meisterwerk');
        });
        if (isMasterworkColumn) {
          header = lang === 'de' ? 'Meisterwerk' : 'Masterwork';
        }

        return { columnIndex: colIdx, header, hashes };
      });
  }, [selectedPerks, perkToColumn, items, lang]);
  const [wishlistEntries, setWishlistEntries] = useState<WishlistEntry[]>(() => {
    const saved = localStorage.getItem('d2_wishlist_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('d2_wishlist_notes') || '';
  });
  const [entryName, setEntryName] = useState(() => {
    return localStorage.getItem('d2_wishlist_entry_name') || '';
  });
  const [entryDescription, setEntryDescription] = useState(() => {
    return localStorage.getItem('d2_wishlist_entry_description') || '';
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
    localStorage.setItem('d2_wishlist_selected_perks', JSON.stringify(selectedPerks));
  }, [selectedPerks]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_notes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_entry_name', entryName);
  }, [entryName]);

  useEffect(() => {
    localStorage.setItem('d2_wishlist_entry_description', entryDescription);
  }, [entryDescription]);

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
    // Clean up reset query param if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('reset')) {
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    async function init() {
      setLoading(true);
      setError(null);
      setProgress(0);

      // Simulated progress ticker — advances slowly while loading,
      // so the bar always visibly moves even without content-length headers.
      let simProgress = 0;
      const ticker = setInterval(() => {
        simProgress = Math.min(simProgress + 1, 90);
        setProgress(simProgress);
      }, 80);

      try {
        // Real progress from manifest (may override simulated value if content-length is available)
        const data = await loadManifest(lang, (p) => {
          if (p > simProgress) {
            simProgress = p;
            setProgress(p);
          }
        }, (s) => setStatus(s));
        clearInterval(ticker);
        setProgress(100);
        if (data) {
          console.log(`[App] DATA VERIFIED (${lang}): ${Object.keys(data.items).length} items`);
          setItems(data.items || {});
          setPlugSets(data.plugSets || {});
          setSocketCategories(data.socketCategories || {});
          setSearchIndex(data.searchIndex || {});
          setReleases(data.releases || {});
        }
      } catch (err: any) {
        clearInterval(ticker);
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
      localStorage.clear();
      sessionStorage.clear();

      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      } else {
        window.indexedDB.deleteDatabase('manifest-cache');
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  const handleTogglePerk = (hash: number) => {
    setSelectedPerks(prev => {
      if (prev.includes(hash)) {
        return prev.filter(h => h !== hash);
      } else {
        return [...prev, hash];
      }
    });
  };

  // Drag & Drop state for per-column sortable perk list
  const [dragInfo, setDragInfo] = useState<{ columnIndex: number; fromIdx: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ columnIndex: number; overIdx: number } | null>(null);

  const handlePerkDragStart = (columnIndex: number, idx: number) => {
    setDragInfo({ columnIndex, fromIdx: idx });
  };

  const handlePerkDragOver = (e: React.DragEvent, columnIndex: number, idx: number) => {
    e.preventDefault();
    if (dragInfo && dragInfo.columnIndex === columnIndex) {
      setDragOverInfo({ columnIndex, overIdx: idx });
    }
  };

  const handlePerkDragEnd = () => {
    if (dragInfo && dragOverInfo && dragInfo.columnIndex === dragOverInfo.columnIndex && dragInfo.fromIdx !== dragOverInfo.overIdx) {
      const colIdx = dragInfo.columnIndex;
      setSelectedPerks(prev => {
        const columnPerks = prev.filter(h => perkToColumn.get(h) === colIdx);
        const [moved] = columnPerks.splice(dragInfo.fromIdx, 1);
        columnPerks.splice(dragOverInfo.overIdx, 0, moved);
        // Rebuild flat array replacing column perks in-place
        const result: number[] = [];
        let cIdx = 0;
        for (const h of prev) {
          if (perkToColumn.get(h) === colIdx) {
            result.push(columnPerks[cIdx++]);
          } else {
            result.push(h);
          }
        }
        return result;
      });
    }
    setDragInfo(null);
    setDragOverInfo(null);
  };

  const handleMovePerkInColumn = (columnIndex: number, perkIndex: number, direction: 'up' | 'down') => {
    setSelectedPerks(prev => {
      const columnPerks = prev.filter(h => perkToColumn.get(h) === columnIndex);
      const toIndex = direction === 'up' ? perkIndex - 1 : perkIndex + 1;
      if (toIndex < 0 || toIndex >= columnPerks.length) return prev;
      [columnPerks[perkIndex], columnPerks[toIndex]] = [columnPerks[toIndex], columnPerks[perkIndex]];
      // Rebuild flat array
      const result: number[] = [];
      let cIdx = 0;
      for (const h of prev) {
        if (perkToColumn.get(h) === columnIndex) {
          result.push(columnPerks[cIdx++]);
        } else {
          result.push(h);
        }
      }
      return result;
    });
  };

  const handleRemovePerk = (hash: number) => {
    setSelectedPerks(prev => prev.filter(h => h !== hash));
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectWeapon = (weapon: DestinyItemDefinition) => {
    setSelectedWeaponHash(weapon.hash);
    setSelectedPerks([]);
    setNotes('');
    setEntryName('');
    setEntryDescription('');
    setEditingIndex(null);
  };

  const handleSaveEntry = () => {
    if (!selectedWeapon) return;

    if (editingIndex !== null) {
      const newEntries = [...wishlistEntries];
      newEntries[editingIndex] = {
        itemHash: selectedWeapon.hash,
        perkHashes: [...selectedPerks],
        notes: notes.trim(),
        tags: selectedTags,
        name: entryName.trim(),
        description: entryDescription.trim()
      };
      setWishlistEntries(newEntries);
      setEditingIndex(null);
    } else {
      setWishlistEntries(prev => [...prev, {
        itemHash: selectedWeapon.hash,
        perkHashes: [...selectedPerks],
        notes: notes.trim(),
        tags: selectedTags,
        name: entryName.trim(),
        description: entryDescription.trim()
      }]);
    }

    setSelectedWeaponHash(null);
    setSelectedPerks([]);
    setSelectedTags([]);
    setNotes('');
    setEntryName('');
    setEntryDescription('');
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
            return {
              name: entry.name || "",
              description: entry.description || entry.notes || "",
              hash: entry.itemHash,
              plugs: entry.perkHashes.map(h => [h]),
              tags: entry.tags && entry.tags.length > 0 ? entry.tags : []
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
          const comments = [];
          if (entry.name) comments.push(entry.name);
          if (entry.description) comments.push(entry.description);
          if (entry.notes) comments.push(entry.notes);

          const tagsStr = entry.tags && entry.tags.length > 0 ? entry.tags.map(t => t.toLowerCase()).join(',') : "";
          const notesStr = tagsStr ? `tags:${tagsStr}${comments.length ? `, ${comments.join(' - ')}` : ''}` : (comments.length ? comments.join(' - ') : '');

          const commentPrefix = entry.name ? `${entry.name} [${weaponName}]` : weaponName;
          return `// ${commentPrefix}${tagsStr ? ` (${tagsStr})` : ''}\n//notes: ${notesStr}\ndimwishlist:item=${entry.itemHash}${entry.perkHashes.length > 0 ? `&perks=${entry.perkHashes.join(',')}` : ''}`;
        }).join('\n\n');
        content = header + entries;
        mimeType = 'text/plain';
        fileName = `dim_${safeName}.txt`;
      } else if (format === 'csv') {
        const header = 'Weapon,Hash,Perks,PerkHashes,Tags,Notes,Name,Description\n';
        const rows = wishlistEntries.map(entry => {
          const weapon = items[(entry.itemHash >>> 0).toString()];
          const weaponName = weapon?.displayProperties?.name || "Unknown Weapon";
          const perkNames = entry.perkHashes.map(h => {
            const p = items[(h >>> 0).toString()];
            return p?.displayProperties?.name || h.toString();
          });
          const perksStr = perkNames.join(' | ');
          const perkHashesStr = entry.perkHashes.join('|');
          const tagsStr = entry.tags?.join(' | ') || '';
          const notesStr = entry.notes?.replace(/"/g, '""') || '';
          const nameStr = entry.name?.replace(/"/g, '""') || '';
          const descStr = entry.description?.replace(/"/g, '""') || '';
          return `"${weaponName}","${entry.itemHash}","${perksStr}","${perkHashesStr}","${tagsStr}","${notesStr}","${nameStr}","${descStr}"`;
        }).join('\n');
        content = header + rows;
        mimeType = 'text/csv';
        fileName = `csv_${safeName}.csv`;
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

  const handleImport = (data: { entries: WishlistEntry[], name?: string, description?: string }) => {
    if (data.name) setWishlistName(data.name);
    if (data.description) setWishlistDescription(data.description);

    setWishlistEntries(prev => {
      const combined = [...prev];
      for (const entry of data.entries) {
        const exists = combined.some(e => e.itemHash === entry.itemHash && JSON.stringify(e.perkHashes.sort()) === JSON.stringify(entry.perkHashes.sort()));
        if (!exists) combined.push(entry);
      }
      return combined;
    });
  };

  const handleSelectEntry = (entry: WishlistEntry) => {
    setSelectedWeaponHash(entry.itemHash);
    setSelectedPerks([...entry.perkHashes]);
    setSelectedTags(entry.tags || []);
    setNotes(entry.notes || '');
    setEntryName(entry.name || '');
    setEntryDescription(entry.description || '');
    setEditingIndex(wishlistEntries.indexOf(entry));
  };

  const handleCopyEntry = (index: number) => {
    const entryToCopy = wishlistEntries[index];
    if (entryToCopy) {
      setWishlistEntries(prev => {
        const newEntries = [...prev];
        const copy = { ...entryToCopy };
        newEntries.splice(index + 1, 0, copy);
        return newEntries;
      });
    }
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
            <button className="btn-secondary btn-hover-effect" style={{ marginTop: '1.5rem' }} onClick={handleHardReset}>
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
              <div
                onClick={() => { setSelectedWeaponHash(null); setEditingIndex(null); }}
                style={{ cursor: 'pointer' }}
                title={lang === 'de' ? 'Zur Startseite' : 'Back to Home'}
              >
                <h1 className="app-title">{t.title}</h1>
              </div>
              <div className="header-search">
                <WeaponSearch items={items} searchIndex={searchIndex} onSelect={handleSelectWeapon} lang={lang} />
              </div>
            </div>

            <div className="header-actions">
              <button
                className="btn-danger"
                title={t.hardReset}
                onClick={handleHardReset}
                style={{ marginRight: '0.5rem', padding: '0.4rem 0.6rem' }}
              >
                <AlertTriangle size={16} />
              </button>

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
            <div className="wishlist-manager-container" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <WishlistManager
                entries={wishlistEntries}
                items={items}
                lang={lang}
                onExport={handleExport}
                onImport={handleImport}
                onRemove={(index) => setWishlistEntries(prev => prev.filter((_, i) => i !== index))}
                onCopy={handleCopyEntry}
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
                searchIndex={searchIndex}
              />
            </div>
          </section>

          <section className="column-right">
            {selectedWeapon ? (() => {
              const getRarityInfo = () => {
                const tier = selectedWeapon.inventory?.tierType;
                if (tier === 6) return { name: t.rarityExotic, color: '#ceb02a', bg: '#ceb02a', border: '#eab308' };
                if (tier === 5) return { name: t.rarityLegendary, color: '#522f60', bg: '#522f60', border: '#a855f7' };
                if (tier === 4) return { name: t.rarityRare, color: '#366496', bg: '#366496', border: '#3b82f6' };
                return { name: t.rarityCommon, color: '#37474f', bg: '#37474f', border: '#94a3b8' };
              };

              const getAmmoTypeInfo = () => {
                const type = selectedWeapon.inventory?.ammoType ??
                  (selectedWeapon as any).ammoType ??
                  (selectedWeapon as any).equippingBlock?.ammoType;

                if (type === 1) return { label: t.ammoPrimary, color: 'var(--text-primary)', icon: '●' };
                if (type === 2) return { label: t.ammoSpecial, color: '#22c55e', icon: '■' };
                if (type === 3) return { label: t.ammoHeavy, color: '#a855f7', icon: '◆' };

                const typeName = (selectedWeapon.itemTypeDisplayName || "").toLowerCase();
                if (typeName.includes('grenade launcher') || typeName.includes('sniper') || typeName.includes('shotgun') || typeName.includes('fusion')) {
                  return { label: t.ammoSpecial, color: '#22c55e', icon: '■' };
                }
                if (typeName.includes('rocket') || typeName.includes('sword') || typeName.includes('linear')) {
                  return { label: t.ammoHeavy, color: '#a855f7', icon: '◆' };
                }
                return { label: t.ammoPrimary, color: 'var(--text-primary)', icon: '●' };
              };

              const getDamageTypeInfo = () => {
                const weapon = selectedWeapon as any;
                const hash = selectedWeapon.defaultDamageTypeHash ||
                  weapon.damageTypeHash ||
                  weapon.equippingBlock?.damageTypeHash ||
                  (weapon.damageTypeHashes && weapon.damageTypeHashes[0]);

                // Damage Type Mappings
                const damageMap: Record<number, any> = {
                  1847026147: { label: t.damageSolar, color: '#f97316', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png' },
                  2303181850: { label: t.damageArc, color: '#0ea5e9', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png' },
                  3454344768: { label: t.damageVoid, color: '#a855f7', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png' },
                  151347233: { label: t.damageStasis, color: '#526cf4', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c3e7981dc2aefd24fd3293482bf.png' },
                  3949783978: { label: t.damageStrand, color: '#2bca48', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png' },
                  3373582085: { label: t.damageKinetic, color: 'var(--text-primary)', icon: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_3385a924fd3ccb92c343ade19f19a370.png' }
                };

                if (hash && damageMap[hash]) return damageMap[hash];

                // Fallbacks for Enums (Bungie damageType enum)
                const typeEnum = weapon.damageType || weapon.defaultDamageType;
                if (typeEnum === 3) return damageMap[1847026147]; // Solar
                if (typeEnum === 2) return damageMap[2303407701]; // Arc
                if (typeEnum === 4) return damageMap[3453347170]; // Void
                if (typeEnum === 6) return damageMap[1513472331]; // Stasis
                if (typeEnum === 7) return damageMap[3949783973]; // Strand

                return damageMap[3357305091]; // Kinetic
              };

              const rarity = getRarityInfo();
              const ammo = getAmmoTypeInfo();
              const damage = getDamageTypeInfo();

              return (
                <div className="editor-layout">
                  <div className="editor-main" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="section-header">
                      <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Settings2 size={18} />
                      </div>
                      <h2>{t.perkConfig}</h2>
                    </div>
                    <PerkSelector
                      weapon={selectedWeapon}
                      items={items}
                      plugSets={plugSets}
                      socketCategories={socketCategories}
                      searchIndex={searchIndex}
                      selectedPerks={selectedPerks}
                      onTogglePerk={handleTogglePerk}
                      lang={lang}
                    />
                  </div>

                  <div className="editor-sticky-panel">
                    {selectedWeapon.screenshot && (
                      <div className="weapon-screenshot-container card glass-panel" style={{
                        padding: 0,
                        overflow: 'hidden',
                        height: '220px',
                        position: 'relative',
                        border: `2px solid ${rarity.color}33`,
                        boxShadow: `0 0 20px ${rarity.color}11`
                      }}>
                        <img
                          src={`https://www.bungie.net${selectedWeapon.screenshot}`}
                          alt="Weapon Screenshot"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}>
                          <div style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: 'white',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            letterSpacing: '-0.02em'
                          }}>
                            {selectedWeapon.displayProperties?.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6, color: 'white', fontWeight: 500 }}>
                            ID: {selectedWeapon.hash}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              background: rarity.bg,
                              border: `1px solid ${rarity.border || rarity.color}`,
                              boxShadow: `0 0 10px ${rarity.color}44`,
                              color: '#fff',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {rarity.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                              {selectedWeapon.itemTypeDisplayName}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--panel-border)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: damage.color }}>
                              <img src={damage.icon} alt="" style={{ width: '16px', height: '16px', filter: damage.label === t.damageKinetic ? 'invert(var(--kinetic-invert, 0))' : 'none' }} />
                              <span style={{ textTransform: 'uppercase' }}>{damage.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--panel-border)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: ammo.color }}>
                              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{ammo.icon}</span>
                              <span style={{ textTransform: 'uppercase' }}>{ammo.label}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                          {selectedWeapon.flavorText || selectedWeapon.displayProperties?.description}
                        </div>
                        {selectedWeapon.collectibleSource ? (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {selectedWeapon.collectibleSource}
                          </div>
                        ) : selectedWeapon.displaySource ? (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <strong>{t.sourceLabel}:</strong> {selectedWeapon.displaySource}
                          </div>
                        ) : null}

                        {/* Season / Release Badge from traitIds + releases.json */}
                        {(() => {
                          const weapon = selectedWeapon as any;
                          const releaseTrait: string | undefined = weapon.traitIds?.find((t: string) => t.startsWith('releases.'));
                          if (!releaseTrait) return null;
                          // Extract vXXX key: "releases.v950.core" -> "v950"
                          const vKey = releaseTrait.match(/releases\.(v\d+)/)?.[1];
                          if (!vKey) return null;
                          const rel = releases[vKey];
                          const seasonNum = rel?.seasonNumber;
                          const seasonName = rel ? (lang === 'de' ? rel.name_de : rel.name) : null;
                          return (
                            <div style={{
                              marginTop: '0.6rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: 'rgba(168, 85, 247, 0.12)',
                              border: '1px solid rgba(168, 85, 247, 0.25)',
                              borderRadius: '6px',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#c084fc',
                              letterSpacing: '0.03em',
                            }}>
                              <span style={{ fontSize: '0.8rem' }}>🗓</span>
                              <span>
                                {seasonNum ? `S${seasonNum}` : vKey}
                                {seasonName ? ` – ${seasonName}` : ''}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Sortable Selected Perks List - Grouped by Column */}
                      {selectedPerksGrouped.length > 0 && (
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                          <div className="selected-perks-header">
                            <h4>{lang === 'de' ? 'Ausgewählte Perks' : 'Selected Perks'}</h4>
                            <span className="selected-perks-count">{selectedPerks.length} {lang === 'de' ? 'ausgewählt' : 'selected'}</span>
                          </div>
                          <div className="selected-perks-list">
                            {selectedPerksGrouped.map(group => (
                              <div key={group.columnIndex}>
                                <div className="perk-column-header" style={{
                                  height: 'auto',
                                  minWidth: 'unset',
                                  maxWidth: 'unset',
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  marginBottom: '0.15rem',
                                  paddingTop: '0.4rem',
                                  fontSize: '0.7rem'
                                }}>
                                  {group.header}
                                </div>
                                {group.hashes.map((hash, idx) => {
                                  const perkItem = items[(hash >>> 0).toString()];
                                  if (!perkItem) return null;
                                  const perkName = perkItem.displayProperties?.name || 'Unknown';
                                  const typeDisplayName = (perkItem.itemTypeDisplayName || '').toLowerCase();
                                  const isEnhanced = perkItem.tooltipNotifications?.some((n: any) => n.displayStyle === "ui_display_style_enhanced_perk") ||
                                    typeDisplayName.includes('enhanced') || typeDisplayName.includes('verbessert') ||
                                    perkItem.itemCategoryHashes?.includes(2237026461) || false;
                                  const isDragging = dragInfo?.columnIndex === group.columnIndex && dragInfo?.fromIdx === idx;
                                  const isDragOver = dragOverInfo?.columnIndex === group.columnIndex && dragOverInfo?.overIdx === idx;

                                  return (
                                    <div
                                      key={hash}
                                      className={`selected-perk-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                                      draggable
                                      onDragStart={() => handlePerkDragStart(group.columnIndex, idx)}
                                      onDragOver={(e) => handlePerkDragOver(e, group.columnIndex, idx)}
                                      onDragEnd={handlePerkDragEnd}
                                      onDragLeave={() => setDragOverInfo(null)}
                                    >
                                      <span className="drag-handle"><GripVertical size={14} /></span>
                                      <span className="perk-order-num">{idx + 1}</span>
                                      {perkItem.displayProperties?.hasIcon && (
                                        <img
                                          className="perk-icon-small"
                                          src={`https://www.bungie.net${perkItem.displayProperties.icon}`}
                                          alt={perkName}
                                        />
                                      )}
                                      <span className={`perk-name-text ${isEnhanced ? 'enhanced' : ''}`}>
                                        {perkName}
                                      </span>
                                      <div className="selected-perk-actions">
                                        <button
                                          onClick={() => handleMovePerkInColumn(group.columnIndex, idx, 'up')}
                                          disabled={idx === 0}
                                          title={lang === 'de' ? 'Nach oben' : 'Move up'}
                                          style={{ opacity: idx === 0 ? 0.3 : 1 }}
                                        >
                                          <ChevronUp size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleMovePerkInColumn(group.columnIndex, idx, 'down')}
                                          disabled={idx === group.hashes.length - 1}
                                          title={lang === 'de' ? 'Nach unten' : 'Move down'}
                                          style={{ opacity: idx === group.hashes.length - 1 ? 0.3 : 1 }}
                                        >
                                          <ChevronDown size={14} />
                                        </button>
                                        <button
                                          className="remove-btn"
                                          onClick={() => handleRemovePerk(hash)}
                                          title={lang === 'de' ? 'Entfernen' : 'Remove'}
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const standardTags = ['GodPvE', 'GodPvP', 'PvE', 'PvP', 'Mouse', 'Controller'];
                        const standardTagsLower = standardTags.map(t => t.toLowerCase());
                        const extraTags = selectedTags.filter(t => !standardTagsLower.includes(t.toLowerCase()));
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {['GodPvE', 'GodPvP', 'PvE', 'PvP'].map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => handleToggleTag(tag)}
                                  className={`tag-btn tag-${tag.toLowerCase()} ${selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()) ? 'active' : ''}`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {['Mouse', 'Controller'].map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => handleToggleTag(tag)}
                                  className={`tag-btn tag-${tag.toLowerCase()} ${selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()) ? 'active' : ''}`}
                                >
                                  {tag}
                                </button>
                              ))}
                              {extraTags.map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => handleToggleTag(tag)}
                                  className={`tag-btn active`}
                                  title={lang === 'de' ? 'Tag entfernen' : 'Remove tag'}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  {tag}
                                  <span style={{ opacity: 0.7, fontSize: '0.9em', lineHeight: 1 }}>×</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input
                          type="text"
                          className="input-primary"
                          placeholder={t.entryNamePlaceholder}
                          value={entryName}
                          onChange={(e) => setEntryName(e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.8rem 1rem', height: '44px' }}
                        />
                        <input
                          type="text"
                          className="input-primary"
                          placeholder={t.notesPlaceholder}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.8rem 1rem', height: '44px' }}
                        />
                      </div>
                      <textarea
                        className="input-primary"
                        placeholder={t.entryDescriptionPlaceholder}
                        value={entryDescription}
                        onChange={(e) => setEntryDescription(e.target.value)}
                        style={{ fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', padding: '0.8rem 1rem', lineHeight: '1.5' }}
                      />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn-primary btn-hover-effect" onClick={handleSaveEntry} style={{ flex: 1, justifyContent: 'center' }}>
                          {editingIndex !== null ? <Check size={18} /> : <PlusCircle size={18} />}
                          <span style={{ marginLeft: '0.5rem' }}>{editingIndex !== null ? t.updateBtn : t.addBtn}</span>
                        </button>
                        <button className="btn-secondary btn-hover-effect" onClick={() => { setSelectedWeaponHash(null); setEditingIndex(null); }} style={{ flex: 1, justifyContent: 'center' }}>
                          {t.cancelBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <IntroView t={t} lang={lang} />
            )}
          </section>
        </main>
        <footer className="app-footer">
          <div className="footer-left">
            <span>© {new Date().getFullYear()} D2 Wishlist Generator by Ballaual#8995 / @ballaual</span>
          </div>
          <div className="footer-right">
            Build ID: <span className="build-id">{__APP_COMMIT__}</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
