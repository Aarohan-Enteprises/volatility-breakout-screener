// Technical Indicators for Volatility Breakout Screener
// Using trading-signals library for accurate calculations

import { BollingerBands as TSBollingerBands, ATR as TSATR, SMA as TSSMA } from 'trading-signals';
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

/**
 * Calculate Bollinger Bands using trading-signals library
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = CONFIG.BB_PERIOD,
  stdDevMultiplier = CONFIG.BB_STD_DEV
): BollingerBands {
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: (number | null)[] = [];
  const widthPct: (number | null)[] = [];
  const percentB: (number | null)[] = [];

  const bb = new TSBollingerBands(period, stdDevMultiplier);

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    bb.add(close);

    if (bb.isStable) {
      const result = bb.getResult();
      if (result) {
        const m = Number(result.middle);
        const u = Number(result.upper);
        const l = Number(result.lower);
        const w = u - l;

        middle.push(m);
        upper.push(u);
        lower.push(l);
        width.push(w);
        widthPct.push(m !== 0 ? (w / m) * 100 : null);
        percentB.push(u !== l ? (close - l) / (u - l) : null);
      } else {
        middle.push(null);
        upper.push(null);
        lower.push(null);
        width.push(null);
        widthPct.push(null);
        percentB.push(null);
      }
    } else {
      middle.push(null);
      upper.push(null);
      lower.push(null);
      width.push(null);
      widthPct.push(null);
      percentB.push(null);
    }
  }

  return { middle, upper, lower, width, widthPct, percentB };
}

/**
 * Calculate ATR (Average True Range) using trading-signals library
 */
export function calculateATR(candles: Candle[], period = CONFIG.ATR_PERIOD): ATRData {
  const atr: (number | null)[] = [];
  const atrPct: (number | null)[] = [];

  const atrIndicator = new TSATR(period);

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    atrIndicator.add({
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });

    if (atrIndicator.isStable) {
      const atrValue = Number(atrIndicator.getResult());
      atr.push(atrValue);
      atrPct.push(candle.close !== 0 ? (atrValue / candle.close) * 100 : null);
    } else {
      atr.push(null);
      atrPct.push(null);
    }
  }

  return { atr, atrPct };
}

/**
 * Calculate SMA using trading-signals library
 */
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const sma = new TSSMA(period);

  for (const value of data) {
    sma.add(value);
    if (sma.isStable) {
      result.push(Number(sma.getResult()));
    } else {
      result.push(null);
    }
  }

  return result;
}

/**
 * Calculate Volume Ratio (current volume / SMA of volume)
 */
function volumeRatio(candles: Candle[], period = 20): (number | null)[] {
  const volumes = candles.map(c => c.volume);
  const smaVolume = calculateSMA(volumes, period);

  return volumes.map((vol, i) => {
    const avg = smaVolume[i];
    if (avg === null || avg === 0) return null;
    return vol / avg;
  });
}

/**
 * Calculate Percentile Rank (rolling window)
 * Fixed formula: uses window.length instead of window.length - 1
 */
function percentileRank(data: (number | null)[], lookback = CONFIG.LOOKBACK_PERIOD): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] === null || i < lookback - 1) {
      result.push(null);
    } else {
      const window = data
        .slice(Math.max(0, i - lookback + 1), i + 1)
        .filter((x): x is number => x !== null);

      if (window.length < 2) {
        result.push(null);
      } else {
        const current = data[i] as number;
        const countLess = window.filter(x => x < current).length;
        // Fixed: use window.length instead of window.length - 1
        result.push((countLess / window.length) * 100);
      }
    }
  }

  return result;
}

/**
 * Detect Squeeze State based on BB Width Percentile
 */
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

/**
 * Count consecutive squeeze bars from the end
 */
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

/**
 * Check if price was in squeeze within recent bars
 */
function wasInSqueezeRecently(squeezeStates: SqueezeState[], lookback = CONFIG.SQUEEZE_LOOKBACK_BARS): boolean {
  const recentStates = squeezeStates.slice(-lookback - 1, -1);
  return recentStates.some(s => s === 'SQUEEZE' || s === 'TIGHT_SQUEEZE');
}

/**
 * Breakout detection result
 */
interface BreakoutResult {
  signal: BreakoutSignal;
  squeezeBars: number;
  volumeSurge: boolean;
  inSqueezeRecently: boolean;
}

/**
 * Detect Breakout Signal
 * Requires: price crossing BB band + was in squeeze recently
 */
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

  // Bullish Breakout: Close crosses above upper band after squeeze
  if (currUpper !== null && prevUpper !== null &&
      current.close > currUpper &&
      previous.close <= prevUpper &&
      inSqueezeRecently) {
    signal = 'BULLISH_BREAKOUT';
  }
  // Bearish Breakout: Close crosses below lower band after squeeze
  else if (currLower !== null && prevLower !== null &&
           current.close < currLower &&
           previous.close >= prevLower &&
           inSqueezeRecently) {
    signal = 'BEARISH_BREAKOUT';
  }

  return { signal, squeezeBars, volumeSurge, inSqueezeRecently };
}

/**
 * Round helper with null safety
 */
function round(value: number | null, decimals: number): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Complete Volatility Analysis
 * Combines all indicators to produce analysis result
 */
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

  // Calculate indicators using trading-signals library
  const bb = calculateBollingerBands(candles);
  const atrData = calculateATR(candles);
  const volRatios = volumeRatio(candles);

  // Calculate percentile ranks
  const bbWidthPercentileArr = percentileRank(bb.widthPct);
  const atrPercentileArr = percentileRank(atrData.atrPct);

  // Detect squeeze states for each bar
  const squeezeStates = bbWidthPercentileArr.map((bbPct) =>
    detectSqueezeState(bbPct)
  );

  // Detect breakout signal
  const breakout = detectBreakout(candles, bb, squeezeStates, volRatios);

  // Get current (last) values
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
