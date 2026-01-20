// Types for Volatility Breakout Screener

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BollingerBands {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
  width: (number | null)[];
  widthPct: (number | null)[];
  percentB: (number | null)[];
}

export interface ATRData {
  atr: (number | null)[];
  atrPct: (number | null)[];
}

export type SqueezeState = 'TIGHT_SQUEEZE' | 'SQUEEZE' | 'NORMAL' | 'EXPANSION' | 'N/A';
export type BreakoutSignal = 'BULLISH_BREAKOUT' | 'BEARISH_BREAKOUT' | null;

export interface VolatilityAnalysis {
  status: 'OK' | 'INSUFFICIENT_DATA' | 'ERROR';
  symbol?: string;
  timeframe?: string;
  price: number | null;
  bbWidthPct: number | null;
  bbWidthPercentile: number | null;
  atrPct: number | null;
  atrPercentile: number | null;
  squeezeState: SqueezeState;
  squeezeBars: number;
  signal: BreakoutSignal;
  volumeSurge: boolean;
  bbUpper: number | null;
  bbLower: number | null;
  bbMiddle: number | null;
  bbPercentB: number | null;
  volumeRatio: number | null;
  timestamp: number | null;
}

export interface SymbolData {
  [timeframe: string]: VolatilityAnalysis;
}

export interface ScreenerData {
  [symbol: string]: SymbolData;
}

export interface Alert {
  id: string;
  type: 'breakout' | 'squeeze_entry' | 'tight_squeeze';
  signal?: BreakoutSignal;
  squeezeState?: SqueezeState;
  symbol: string;
  timeframe: string;
  price: number;
  squeezeBars?: number;
  timestamp: number;
}

export interface Settings {
  bbPeriod: number;
  bbStdDev: number;
  atrPeriod: number;
  squeezeThreshold: number;
  tightSqueezeThreshold: number;
  visibleTimeframes: string[];
  refreshInterval: number;
}

export const DEFAULT_SETTINGS: Settings = {
  bbPeriod: 20,
  bbStdDev: 2,
  atrPeriod: 14,
  squeezeThreshold: 20,
  tightSqueezeThreshold: 10,
  visibleTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
  refreshInterval: 60000,
};

export const DEFAULT_WATCHLIST = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'DOGEUSD'];

export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
