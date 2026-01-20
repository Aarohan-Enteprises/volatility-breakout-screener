// Delta Exchange Client-Side API - Direct browser calls

import { Candle, TIMEFRAMES, VolatilityAnalysis } from './types';
import { analyzeVolatility } from './indicators';

// Delta Exchange India API base URL
const DELTA_API_BASE = 'https://api.india.delta.exchange';

// Cache for symbols
let symbolsCache: string[] = [];
let symbolsCacheTime = 0;
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Candle storage for real-time updates
// Structure: { "BTCUSD": { "1m": Candle[], "5m": Candle[] } }
const candleStore: Map<string, Map<string, Candle[]>> = new Map();
const MAX_CANDLES = 250; // Keep last 250 candles per symbol/timeframe

// Timeframe to resolution mapping
const TIMEFRAME_TO_RESOLUTION: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

// Timeframe to seconds mapping
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

/**
 * Align timestamp to candle boundary (start of candle period)
 * This ensures we fetch complete candles only
 */
function alignToCandelBoundary(timestamp: number, timeframe: string): number {
  const tfSeconds = TIMEFRAME_SECONDS[timeframe] || 3600;

  if (timeframe === '1w') {
    // Align to Monday 00:00 UTC
    // JavaScript getDay(): 0 = Sunday, 1 = Monday, etc.
    const date = new Date(timestamp * 1000);
    const day = date.getUTCDay();
    // Calculate days since last Monday (if Sunday, go back 6 days; if Monday, 0 days; etc.)
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    return Math.floor(date.getTime() / 1000);
  }

  if (timeframe === '1d') {
    // Align to UTC midnight (00:00 UTC)
    const date = new Date(timestamp * 1000);
    date.setUTCHours(0, 0, 0, 0);
    return Math.floor(date.getTime() / 1000);
  }

  // For intraday timeframes (1m, 5m, 15m, 30m, 1h, 4h)
  // Simply floor to the interval boundary
  return Math.floor(timestamp / tfSeconds) * tfSeconds;
}

/**
 * Fetch all available symbols from Delta Exchange
 */
export async function fetchSymbols(): Promise<string[]> {
  const now = Date.now();

  // Return cached if still valid
  if (symbolsCache.length > 0 && (now - symbolsCacheTime) < CACHE_DURATION) {
    return symbolsCache;
  }

  try {
    const response = await fetch(`${DELTA_API_BASE}/v2/products`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.result || [];

    // Filter symbols - only USD pairs, exclude options
    const symbols = products
      .map((p: { symbol?: string }) => p.symbol)
      .filter((s: string) => s && !s.includes('C-') && !s.includes('P-') && !s.includes('MV-') && !s.includes('_'))
      .filter((s: string) => s.includes('USD'))
      .sort();

    symbolsCache = [...new Set(symbols)] as string[];
    symbolsCacheTime = now;

    return symbolsCache;

  } catch {
    return symbolsCache.length > 0 ? symbolsCache : ['BTCUSD', 'ETHUSD', 'SOLUSD'];
  }
}

/**
 * Fetch historical candles for a symbol
 * Uses aligned time boundaries to ensure complete candles only
 */
export async function fetchCandles(
  symbol: string,
  timeframe: string,
  numCandles = 200
): Promise<Candle[]> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tfSeconds = TIMEFRAME_SECONDS[timeframe] || 3600;
  const resolution = TIMEFRAME_TO_RESOLUTION[timeframe] || '1h';

  // Align end time to the start of current candle (excludes incomplete candle)
  const end = alignToCandelBoundary(nowSeconds, timeframe);

  // Calculate start time: go back numCandles from the aligned end
  const start = end - (tfSeconds * numCandles);

  try {
    const url = `${DELTA_API_BASE}/v2/history/candles?symbol=${symbol}&resolution=${resolution}&start=${start}&end=${end}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const ohlcData = data.result || [];

    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      return [];
    }

    // Parse and validate candles
    const candles: Candle[] = ohlcData
      .map((c: { time?: number; open?: string | number; high?: string | number; low?: string | number; close?: string | number; volume?: string | number }) => ({
        time: c.time || 0,
        open: parseFloat(String(c.open)),
        high: parseFloat(String(c.high)),
        low: parseFloat(String(c.low)),
        close: parseFloat(String(c.close)),
        volume: parseFloat(String(c.volume)),
      }))
      .filter((c: Candle) => c.volume > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      .sort((a: Candle, b: Candle) => a.time - b.time);

    // Remove outliers using MAD
    if (candles.length > 10) {
      const closes = candles.map(c => c.close).sort((a, b) => a - b);
      const median = closes[Math.floor(closes.length / 2)];
      const deviations = candles.map(c => Math.abs(c.close - median));
      const sortedDeviations = [...deviations].sort((a, b) => a - b);
      const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

      if (mad > 0) {
        const threshold = 10 * mad;
        return candles.filter(c => Math.abs(c.close - median) <= threshold);
      }
    }

    return candles;

  } catch {
    return [];
  }
}

/**
 * Analyze a single symbol across specified timeframes
 */
export async function analyzeSymbol(
  symbol: string,
  timeframes: string[] = TIMEFRAMES
): Promise<Record<string, ReturnType<typeof analyzeVolatility>>> {
  const results: Record<string, ReturnType<typeof analyzeVolatility>> = {};

  const promises = timeframes.map(async (tf) => {
    const candles = await fetchCandles(symbol, tf);
    const analysis = analyzeVolatility(candles);
    return { tf, analysis };
  });

  const analyses = await Promise.all(promises);

  for (const { tf, analysis } of analyses) {
    results[tf] = analysis;
  }

  return results;
}

/**
 * Analyze multiple symbols - processes in batches to avoid overwhelming the API
 */
export async function analyzeMultipleSymbols(
  symbols: string[],
  timeframes: string[] = TIMEFRAMES
): Promise<Record<string, Record<string, ReturnType<typeof analyzeVolatility>>>> {
  const results: Record<string, Record<string, ReturnType<typeof analyzeVolatility>>> = {};

  // Process in batches of 5
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const analysis = await analyzeSymbol(symbol, timeframes);
      return { symbol, analysis };
    });

    const batchResults = await Promise.all(promises);

    for (const { symbol, analysis } of batchResults) {
      results[symbol] = analysis;
    }
  }

  return results;
}

// ============================================================
// Candle Store Management for WebSocket Real-time Updates
// ============================================================

/**
 * Store candles for a symbol/timeframe (called after initial REST fetch)
 */
export function storeCandles(symbol: string, timeframe: string, candles: Candle[]): void {
  if (!candleStore.has(symbol)) {
    candleStore.set(symbol, new Map());
  }
  const symbolMap = candleStore.get(symbol)!;
  // Keep only the last MAX_CANDLES
  symbolMap.set(timeframe, candles.slice(-MAX_CANDLES));
}

/**
 * Get stored candles for a symbol/timeframe
 */
export function getStoredCandles(symbol: string, timeframe: string): Candle[] | null {
  return candleStore.get(symbol)?.get(timeframe) || null;
}

/**
 * Update candles with a new candle from WebSocket
 * - If candle time matches last candle, update it (candle in progress)
 * - If candle time is newer, append it (new candle)
 * Returns true if this created a new candle (for alert checking)
 */
export function updateCandle(symbol: string, timeframe: string, newCandle: Candle): boolean {
  const candles = getStoredCandles(symbol, timeframe);
  if (!candles || candles.length === 0) {
    return false;
  }

  const lastCandle = candles[candles.length - 1];

  // Same candle - update in place (candle still forming)
  if (newCandle.time === lastCandle.time) {
    candles[candles.length - 1] = newCandle;
    return false;
  }

  // New candle - append and trim
  if (newCandle.time > lastCandle.time) {
    candles.push(newCandle);
    // Keep only last MAX_CANDLES
    if (candles.length > MAX_CANDLES) {
      candles.shift();
    }
    return true; // New candle created
  }

  return false;
}

/**
 * Analyze from stored candles (used after WebSocket update)
 */
export function analyzeFromStore(symbol: string, timeframe: string): VolatilityAnalysis | null {
  const candles = getStoredCandles(symbol, timeframe);
  if (!candles) return null;
  return analyzeVolatility(candles);
}

/**
 * Fetch and store candles for initial load
 */
export async function fetchAndStoreCandles(
  symbol: string,
  timeframe: string,
  numCandles = 200
): Promise<Candle[]> {
  const candles = await fetchCandles(symbol, timeframe, numCandles);
  if (candles.length > 0) {
    storeCandles(symbol, timeframe, candles);
  }
  return candles;
}

/**
 * Initialize candle store for multiple symbols/timeframes
 * Returns analysis results for all
 */
export async function initializeCandleStore(
  symbols: string[],
  timeframes: string[] = TIMEFRAMES
): Promise<Record<string, Record<string, VolatilityAnalysis>>> {
  const results: Record<string, Record<string, VolatilityAnalysis>> = {};

  // Process in batches of 5
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    const promises = batch.map(async (symbol) => {
      const symbolResults: Record<string, VolatilityAnalysis> = {};

      // Fetch all timeframes in parallel for this symbol
      const tfPromises = timeframes.map(async (tf) => {
        const candles = await fetchAndStoreCandles(symbol, tf);
        const analysis = analyzeVolatility(candles);
        return { tf, analysis };
      });

      const tfResults = await Promise.all(tfPromises);
      for (const { tf, analysis } of tfResults) {
        symbolResults[tf] = analysis;
      }

      return { symbol, symbolResults };
    });

    const batchResults = await Promise.all(promises);
    for (const { symbol, symbolResults } of batchResults) {
      results[symbol] = symbolResults;
    }
  }

  return results;
}

/**
 * Clear candle store for a symbol (when removed from watchlist)
 */
export function clearSymbolFromStore(symbol: string): void {
  candleStore.delete(symbol);
}

/**
 * Clear entire candle store
 */
export function clearCandleStore(): void {
  candleStore.clear();
}
