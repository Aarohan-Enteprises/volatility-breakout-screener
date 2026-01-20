// Technical Indicators for Volatility Breakout Screener

import {
  Candle,
  BollingerBands,
  ATRData,
  SqueezeState,
  BreakoutSignal,
  VolatilityAnalysis,
  DEFAULT_SETTINGS
} from './types';

const CONFIG = {
  BB_PERIOD: DEFAULT_SETTINGS.bbPeriod,
  BB_STD_DEV: DEFAULT_SETTINGS.bbStdDev,
  ATR_PERIOD: DEFAULT_SETTINGS.atrPeriod,
  SQUEEZE_PERCENTILE_THRESHOLD: DEFAULT_SETTINGS.squeezeThreshold,
  TIGHT_SQUEEZE_PERCENTILE_THRESHOLD: DEFAULT_SETTINGS.tightSqueezeThreshold,
  BREAKOUT_PERCENTILE_THRESHOLD: 70,
  LOOKBACK_PERIOD: 100,
  SQUEEZE_LOOKBACK_BARS: 10,
  VOLUME_SURGE_MULTIPLIER: 1.5,
};

// Simple Moving Average
function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// Exponential Moving Average
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else if (i < period - 1) {
      const slice = data.slice(0, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / (i + 1));
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const emaVal = (data[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(emaVal);
    }
  }
  return result;
}

// Standard Deviation
function stdDev(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      result.push(Math.sqrt(variance));
    }
  }
  return result;
}

// Bollinger Bands
export function calculateBollingerBands(
  candles: Candle[],
  period = CONFIG.BB_PERIOD,
  stdDevMultiplier = CONFIG.BB_STD_DEV
): BollingerBands {
  const closes = candles.map(c => c.close);
  const middle = sma(closes, period);
  const std = stdDev(closes, period);

  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: (number | null)[] = [];
  const widthPct: (number | null)[] = [];
  const percentB: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const m = middle[i];
    const s = std[i];

    if (m === null || s === null) {
      upper.push(null);
      lower.push(null);
      width.push(null);
      widthPct.push(null);
      percentB.push(null);
    } else {
      const u = m + (stdDevMultiplier * s);
      const l = m - (stdDevMultiplier * s);
      const w = u - l;

      upper.push(u);
      lower.push(l);
      width.push(w);
      widthPct.push((w / m) * 100);
      percentB.push((closes[i] - l) / (u - l));
    }
  }

  return { middle, upper, lower, width, widthPct, percentB };
}

// True Range
function trueRange(candles: Candle[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(candles[i].high - candles[i].low);
    } else {
      const tr1 = candles[i].high - candles[i].low;
      const tr2 = Math.abs(candles[i].high - candles[i - 1].close);
      const tr3 = Math.abs(candles[i].low - candles[i - 1].close);
      result.push(Math.max(tr1, tr2, tr3));
    }
  }
  return result;
}

// ATR (Average True Range)
export function calculateATR(candles: Candle[], period = CONFIG.ATR_PERIOD): ATRData {
  const tr = trueRange(candles);
  const atrValues = ema(tr, period);
  const closes = candles.map(c => c.close);

  const atrPct = atrValues.map((atr, i) => {
    if (atr === null || closes[i] === 0) return null;
    return (atr / closes[i]) * 100;
  });

  return { atr: atrValues, atrPct };
}

// Percentile Rank (rolling)
function percentileRank(data: (number | null)[], lookback = CONFIG.LOOKBACK_PERIOD): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null || i < lookback - 1) {
      result.push(null);
    } else {
      const window = data.slice(Math.max(0, i - lookback + 1), i + 1).filter((x): x is number => x !== null);
      if (window.length < 2) {
        result.push(null);
      } else {
        const current = data[i] as number;
        const countLess = window.filter(x => x < current).length;
        result.push((countLess / (window.length - 1)) * 100);
      }
    }
  }
  return result;
}

// Volume Ratio
function volumeRatio(candles: Candle[], period = 20): (number | null)[] {
  const volumes = candles.map(c => c.volume);
  const smaVolume = sma(volumes, period);

  return volumes.map((vol, i) => {
    const avg = smaVolume[i];
    if (avg === null || avg === 0) return null;
    return vol / avg;
  });
}

// Detect Squeeze State
function detectSqueezeState(bbWidthPercentile: number | null): SqueezeState {
  if (bbWidthPercentile === null) return 'N/A';

  if (bbWidthPercentile < CONFIG.TIGHT_SQUEEZE_PERCENTILE_THRESHOLD) {
    return 'TIGHT_SQUEEZE';
  } else if (bbWidthPercentile < CONFIG.SQUEEZE_PERCENTILE_THRESHOLD) {
    return 'SQUEEZE';
  } else if (bbWidthPercentile > CONFIG.BREAKOUT_PERCENTILE_THRESHOLD) {
    return 'EXPANSION';
  }
  return 'NORMAL';
}

// Count consecutive squeeze bars
function countSqueezeBars(squeezeStates: SqueezeState[]): number {
  let count = 0;
  for (let i = squeezeStates.length - 1; i >= 0; i--) {
    if (squeezeStates[i] === 'SQUEEZE' || squeezeStates[i] === 'TIGHT_SQUEEZE') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// Check if was in squeeze recently
function wasInSqueezeRecently(squeezeStates: SqueezeState[], lookback = CONFIG.SQUEEZE_LOOKBACK_BARS): boolean {
  const recentStates = squeezeStates.slice(-lookback - 1, -1);
  return recentStates.some(s => s === 'SQUEEZE' || s === 'TIGHT_SQUEEZE');
}

// Detect Breakout Signal
interface BreakoutResult {
  signal: BreakoutSignal;
  squeezeBars: number;
  volumeSurge: boolean;
  inSqueezeRecently: boolean;
}

function detectBreakout(
  candles: Candle[],
  bb: BollingerBands,
  squeezeStates: SqueezeState[],
  volumeRatios: (number | null)[]
): BreakoutResult {
  if (candles.length < 2) {
    return { signal: null, squeezeBars: 0, volumeSurge: false, inSqueezeRecently: false };
  }

  const lastIdx = candles.length - 1;
  const prevIdx = lastIdx - 1;

  const current = candles[lastIdx];
  const previous = candles[prevIdx];

  const inSqueezeRecently = wasInSqueezeRecently(squeezeStates);
  const squeezeBars = countSqueezeBars(squeezeStates.slice(0, -1));
  const volRatio = volumeRatios[lastIdx];
  const volumeSurge = volRatio !== null && volRatio >= CONFIG.VOLUME_SURGE_MULTIPLIER;

  let signal: BreakoutSignal = null;

  const currUpper = bb.upper[lastIdx];
  const prevUpper = bb.upper[prevIdx];
  const currLower = bb.lower[lastIdx];
  const prevLower = bb.lower[prevIdx];

  // Bullish Breakout
  if (currUpper !== null && prevUpper !== null &&
      current.close > currUpper &&
      previous.close <= prevUpper &&
      inSqueezeRecently) {
    signal = 'BULLISH_BREAKOUT';
  }
  // Bearish Breakout
  else if (currLower !== null && prevLower !== null &&
           current.close < currLower &&
           previous.close >= prevLower &&
           inSqueezeRecently) {
    signal = 'BEARISH_BREAKOUT';
  }

  return { signal, squeezeBars, volumeSurge, inSqueezeRecently };
}

// Round helper
function round(value: number | null, decimals: number): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Complete Volatility Analysis
export function analyzeVolatility(candles: Candle[]): VolatilityAnalysis {
  const minPeriod = Math.max(CONFIG.BB_PERIOD, CONFIG.ATR_PERIOD, 20);

  if (!candles || candles.length < minPeriod) {
    return {
      status: 'INSUFFICIENT_DATA',
      price: null,
      bbWidthPct: null,
      bbWidthPercentile: null,
      atrPct: null,
      atrPercentile: null,
      squeezeState: 'N/A',
      squeezeBars: 0,
      signal: null,
      volumeSurge: false,
      bbUpper: null,
      bbLower: null,
      bbMiddle: null,
      bbPercentB: null,
      volumeRatio: null,
      timestamp: null,
    };
  }

  // Calculate indicators
  const bb = calculateBollingerBands(candles);
  const atrData = calculateATR(candles);
  const volRatios = volumeRatio(candles);

  // Calculate percentile ranks
  const bbWidthPercentileArr = percentileRank(bb.widthPct);
  const atrPercentileArr = percentileRank(atrData.atrPct);

  // Detect squeeze states
  const squeezeStates = bbWidthPercentileArr.map((bbPct) =>
    detectSqueezeState(bbPct)
  );

  // Detect breakout
  const breakout = detectBreakout(candles, bb, squeezeStates, volRatios);

  // Get current values
  const lastIdx = candles.length - 1;
  const current = candles[lastIdx];
  const squeezeBars = countSqueezeBars(squeezeStates);

  return {
    status: 'OK',
    price: round(current.close, 2),
    bbWidthPct: round(bb.widthPct[lastIdx], 2),
    bbWidthPercentile: round(bbWidthPercentileArr[lastIdx], 1),
    atrPct: round(atrData.atrPct[lastIdx], 2),
    atrPercentile: round(atrPercentileArr[lastIdx], 1),
    squeezeState: squeezeStates[lastIdx],
    squeezeBars,
    signal: breakout.signal,
    volumeSurge: breakout.volumeSurge,
    bbUpper: round(bb.upper[lastIdx], 2),
    bbLower: round(bb.lower[lastIdx], 2),
    bbMiddle: round(bb.middle[lastIdx], 2),
    bbPercentB: round(bb.percentB[lastIdx], 2),
    volumeRatio: round(volRatios[lastIdx], 2),
    timestamp: current.time,
  };
}
