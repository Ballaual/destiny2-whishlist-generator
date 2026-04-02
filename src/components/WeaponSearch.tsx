import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

interface WeaponSearchProps {
  items: Record<string, DestinyItemDefinition>;
  searchIndex: Record<number, { en: string; de: string }>;
  onSelect: (item: DestinyItemDefinition) => void;
  lang?: 'en' | 'de';
}

export function WeaponSearch({ items, searchIndex, onSelect, lang = 'en' }: WeaponSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DestinyItemDefinition[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    
    const matches: DestinyItemDefinition[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const hashStr in searchIndex) {
      const hash = parseInt(hashStr, 10);
      const names = searchIndex[hash];
      const item = items[hashStr];

      if (item && item.itemType === 3) {
        if (
          names.en.toLowerCase().includes(lowerQuery) || 
          names.de.toLowerCase().includes(lowerQuery) || 
          hashStr === query
        ) {
          matches.push(item);
          if (matches.length >= 15) break; // Smaller result set for header
        }
      }
    }
    setResults(matches);
    setIsOpen(true);
  }, [query, items, searchIndex]);

  return (
    <div className="search-container" style={{ position: 'relative' }} ref={wrapperRef}>
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="header-search-input"
          placeholder={lang === 'de' ? "Waffe suchen (DE/EN)..." : "Search weapon (EN/DE)..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-results glass-panel">
          {results.map(item => {
            if (!item || !item.displayProperties) return null;
            const names = searchIndex[item.hash];
            const primaryName = lang === 'de' ? (names?.de || names?.en) : (names?.en || names?.de);
            const secondaryName = lang === 'de' ? names?.en : names?.de;

            return (
              <button 
                key={item.hash} 
                className="search-result-item" 
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <img 
                  src={`https://www.bungie.net${item.displayProperties.icon}`} 
                  alt={primaryName} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="item-details">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                    <span className="item-name">{primaryName}</span>
                    {secondaryName && secondaryName !== primaryName && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({secondaryName})</span>
                    )}
                  </div>
                  <span className="item-type">{item.itemTypeDisplayName} • {item.hash}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
