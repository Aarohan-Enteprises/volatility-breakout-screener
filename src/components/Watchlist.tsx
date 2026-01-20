'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, Search } from 'lucide-react';

interface WatchlistProps {
  watchlist: string[];
  allSymbols: string[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function Watchlist({ watchlist, allSymbols, onAdd, onRemove }: WatchlistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out symbols already in watchlist
  const availableSymbols = allSymbols.filter(s => !watchlist.includes(s));

  // Filter by search
  const filteredSymbols = search
    ? availableSymbols.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : availableSymbols;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    onAdd(symbol);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Manage Watchlist</h2>

      {/* Dropdown Select */}
      <div className="relative mb-6" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white hover:border-gray-600 transition-colors"
        >
          <span className="text-gray-400">Select symbol to add...</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search symbols..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Symbol List */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredSymbols.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  {search ? 'No symbols found' : 'All symbols already added'}
                </div>
              ) : (
                filteredSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-800 transition-colors text-sm"
                  >
                    <span>{symbol}</span>
                    <Plus className="w-4 h-4 text-gray-500" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Current Watchlist ({watchlist.length})</h3>
        </div>

        {watchlist.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-gray-900 rounded-lg border border-gray-800">
            No symbols in watchlist. Use the dropdown above to add symbols.
          </div>
        ) : (
          <div className="grid gap-2">
            {watchlist.map((symbol) => (
              <div
                key={symbol}
                className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
              >
                <span className="font-semibold">{symbol}</span>
                <button
                  onClick={() => onRemove(symbol)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Remove from watchlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
