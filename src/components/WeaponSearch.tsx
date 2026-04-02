import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

interface WeaponSearchProps {
  items: Record<string, DestinyItemDefinition>;
  searchIndex: Record<number, { en: string; de: string }>;
  onSelect: (item: DestinyItemDefinition) => void;
}

export function WeaponSearch({ items, searchIndex, onSelect }: WeaponSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DestinyItemDefinition[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    
    // Search in index
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
          if (matches.length >= 25) break;
        }
      }
    }
    setResults(matches);
    setIsOpen(true);
  }, [query, items, searchIndex]);

  return (
    <div className="card glass-panel" style={{ position: 'relative' }} ref={wrapperRef}>
      <h2 className="card-title">
        <Search size={24} /> Search Weapon
      </h2>
      <input
        type="text"
        className="input-primary"
        placeholder="Name (DE/EN) or ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setIsOpen(true) }}
      />

      {isOpen && results.length > 0 && (
        <div className="search-results glass-panel">
          {results.map(item => {
            const names = searchIndex[item.hash];
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
                  alt={item.displayProperties.name} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="item-details">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                    <span className="item-name">{names?.de || item.displayProperties.name}</span>
                    {names?.en && names.en !== names.de && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({names.en})</span>
                    )}
                  </div>
                  <span className="item-type">{item.displayProperties.description?.slice(0, 50)}... • {item.hash}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
