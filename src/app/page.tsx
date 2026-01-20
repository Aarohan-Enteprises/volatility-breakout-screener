'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import { ScreenerTable } from '@/components/ScreenerTable';
import { AlertsLog } from '@/components/AlertsLog';
import { Watchlist } from '@/components/Watchlist';
import { Legend } from '@/components/Legend';
import {
  ScreenerData,
  Alert,
  DEFAULT_WATCHLIST,
  TIMEFRAMES,
  VolatilityAnalysis,
} from '@/lib/types';
import { fetchSymbols, analyzeMultipleSymbols } from '@/lib/delta-client';

type Tab = 'screener' | 'watchlist' | 'settings';

const STORAGE_KEYS = {
  WATCHLIST: 'vbs_watchlist',
  ALERTS: 'vbs_alerts',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('screener');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [screenerData, setScreenerData] = useState<ScreenerData>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const previousDataRef = useRef<ScreenerData>({});

  // Load from localStorage on mount
  useEffect(() => {
    const savedWatchlist = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    const savedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);

    if (savedWatchlist) {
      try {
        setWatchlist(JSON.parse(savedWatchlist));
      } catch {
        setWatchlist(DEFAULT_WATCHLIST);
      }
    } else {
      setWatchlist(DEFAULT_WATCHLIST);
    }

    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch {
        setAlerts([]);
      }
    }
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
    }
  }, [watchlist]);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts.slice(0, 50)));
  }, [alerts]);

  // Fetch symbols directly from Delta Exchange
  useEffect(() => {
    async function loadSymbols() {
      try {
        const symbols = await fetchSymbols();
        setAllSymbols(symbols);
      } catch (error) {
        console.error('Failed to fetch symbols:', error);
      }
    }
    loadSymbols();
  }, []);

  // Check for alerts
  const checkForAlerts = useCallback((newData: ScreenerData) => {
    const previousData = previousDataRef.current;
    const newAlerts: Alert[] = [];

    for (const symbol of Object.keys(newData)) {
      for (const tf of TIMEFRAMES) {
        const current = newData[symbol]?.[tf] as VolatilityAnalysis | undefined;
        const previous = previousData[symbol]?.[tf] as VolatilityAnalysis | undefined;

        if (!current || current.status !== 'OK') continue;

        // Check for breakout
        if (current.signal && (!previous || previous.signal !== current.signal)) {
          newAlerts.push({
            id: `${symbol}-${tf}-${Date.now()}`,
            type: 'breakout',
            signal: current.signal,
            symbol,
            timeframe: tf,
            price: current.price || 0,
            squeezeBars: current.squeezeBars,
            timestamp: Date.now(),
          });
        }
        // Check for squeeze entry
        else if (
          (current.squeezeState === 'SQUEEZE' || current.squeezeState === 'TIGHT_SQUEEZE') &&
          (!previous || previous.squeezeState === 'NORMAL')
        ) {
          newAlerts.push({
            id: `${symbol}-${tf}-${Date.now()}`,
            type: 'squeeze_entry',
            squeezeState: current.squeezeState,
            symbol,
            timeframe: tf,
            price: current.price || 0,
            timestamp: Date.now(),
          });
        }
        // Check for tight squeeze
        else if (
          current.squeezeState === 'TIGHT_SQUEEZE' &&
          previous?.squeezeState === 'SQUEEZE'
        ) {
          newAlerts.push({
            id: `${symbol}-${tf}-${Date.now()}`,
            type: 'tight_squeeze',
            symbol,
            timeframe: tf,
            price: current.price || 0,
            squeezeBars: current.squeezeBars,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
    }

    previousDataRef.current = newData;
  }, []);

  // Fetch screener data directly from Delta Exchange
  const fetchData = useCallback(async () => {
    if (watchlist.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await analyzeMultipleSymbols(watchlist, TIMEFRAMES);
      checkForAlerts(data);
      setScreenerData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [watchlist, checkForAlerts]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handlers
  const handleAddSymbol = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    setScreenerData(prev => {
      const newData = { ...prev };
      delete newData[symbol];
      return newData;
    });
  };

  const handleClearAlerts = () => {
    setAlerts([]);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500" />
              Volatility Breakout Screener
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Bollinger Bands + ATR | Delta Exchange
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <span className="px-3 py-1 text-xs bg-gray-800 border border-green-500/30 text-green-400 rounded-full">
              Live
            </span>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 mb-6 border-b border-gray-800">
          {(['screener', 'watchlist', 'settings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <main>
          {activeTab === 'screener' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Volatility Analysis</h2>
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <Legend />

              <ScreenerTable
                data={screenerData}
                timeframes={TIMEFRAMES}
                isLoading={isLoading}
                onSymbolClick={handleAddSymbol}
              />

              <AlertsLog alerts={alerts} onClear={handleClearAlerts} />
            </div>
          )}

          {activeTab === 'watchlist' && (
            <Watchlist
              watchlist={watchlist}
              allSymbols={allSymbols}
              onAdd={handleAddSymbol}
              onRemove={handleRemoveSymbol}
            />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>

              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">
                    Indicator Parameters
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Bollinger Bands Period
                      </label>
                      <input
                        type="number"
                        defaultValue={20}
                        className="w-full max-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Bollinger Bands Std Dev
                      </label>
                      <input
                        type="number"
                        defaultValue={2}
                        step={0.5}
                        className="w-full max-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        ATR Period
                      </label>
                      <input
                        type="number"
                        defaultValue={14}
                        className="w-full max-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">
                    Squeeze Thresholds
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Squeeze Percentile (%)
                      </label>
                      <input
                        type="number"
                        defaultValue={20}
                        className="w-full max-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Tight Squeeze Percentile (%)
                      </label>
                      <input
                        type="number"
                        defaultValue={10}
                        className="w-full max-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                  </div>
                </div>

                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-600 text-sm">
          Data from Delta Exchange | Auto-refresh: 60s
        </footer>
      </div>
    </div>
  );
}
