import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { DestinyItemDefinition } from '../lib/manifest';

interface WeaponSearchProps {
  items: Record<string, DestinyItemDefinition>;
  onSelect: (item: DestinyItemDefinition) => void;
}

export function WeaponSearch({ items, onSelect }: WeaponSearchProps) {
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
    
    // Convert items object to array and filter for weapons (itemType === 3)
    // To make it performant, we limit results
    const matches = [];
    const lowerQuery = query.toLowerCase();
    
    for (const hash in items) {
      const item = items[hash];
      if (item.itemType === 3 && item.displayProperties?.name) {
        if (item.displayProperties.name.toLowerCase().includes(lowerQuery) || hash.toString() === query) {
          matches.push(item);
          if (matches.length >= 25) break;
        }
      }
    }
    setResults(matches);
    setIsOpen(true);
  }, [query, items]);

  return (
    <div className="card glass-panel" style={{ position: 'relative' }} ref={wrapperRef}>
      <h2 className="card-title">
        <Search size={24} /> Search Weapon
      </h2>
      <input
        type="text"
        className="input-primary"
        placeholder="Enter weapon name or ID (e.g., Fatebringer)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setIsOpen(true) }}
      />

      {isOpen && results.length > 0 && (
        <div className="search-results glass-panel">
          {results.map(item => (
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
                <span className="item-name">{item.displayProperties.name}</span>
                <span className="item-type">{item.displayProperties.description?.slice(0, 50)}... • {item.hash}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
