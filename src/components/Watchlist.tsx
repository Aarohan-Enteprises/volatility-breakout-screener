'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';

interface WatchlistProps {
  watchlist: string[];
  allSymbols: string[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function Watchlist({ watchlist, allSymbols, onAdd, onRemove }: WatchlistProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredSymbols, setFilteredSymbols] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.length > 0) {
      const query = input.toUpperCase();
      const filtered = allSymbols
        .filter(s => s.includes(query) && !watchlist.includes(s))
        .slice(0, 10);
      setFilteredSymbols(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredSymbols([]);
      setShowDropdown(false);
    }
  }, [input, allSymbols, watchlist]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = (symbol: string) => {
    onAdd(symbol);
    setInput('');
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = input.toUpperCase().trim();
    if (symbol && allSymbols.includes(symbol) && !watchlist.includes(symbol)) {
      handleAdd(symbol);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Manage Watchlist</h2>

      {/* Add Symbol Form */}
      <div className="relative mb-6" ref={dropdownRef}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search symbol (e.g., BTCUSD)"
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {/* Autocomplete Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-[100px] mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[250px] overflow-y-auto">
            {filteredSymbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => handleAdd(symbol)}
                className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="space-y-3">
        {watchlist.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-gray-900 rounded-lg border border-gray-800">
            No symbols in watchlist. Use the search above to add symbols.
          </div>
        ) : (
          watchlist.map((symbol) => (
            <div
              key={symbol}
              className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
            >
              <span className="font-semibold">{symbol}</span>
              <button
                onClick={() => onRemove(symbol)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-md transition-colors"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
