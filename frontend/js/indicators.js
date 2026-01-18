/**
 * Technical Indicators for Volatility Breakout Screener
 * - Bollinger Bands
 * - ATR (Average True Range)
 * - Squeeze Detection
 */

class Indicators {
    /**
     * Calculate Simple Moving Average
     */
    static sma(data, period) {
        const result = [];
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

    /**
     * Calculate Exponential Moving Average
     */
    static ema(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(data[i]);
            } else if (i < period - 1) {
                // Use SMA for initial values
                const slice = data.slice(0, i + 1);
                const sum = slice.reduce((a, b) => a + b, 0);
                result.push(sum / (i + 1));
            } else if (i === period - 1) {
                // First EMA is SMA
                const slice = data.slice(0, period);
                const sum = slice.reduce((a, b) => a + b, 0);
                result.push(sum / period);
            } else {
                const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
                result.push(ema);
            }
        }
        return result;
    }

    /**
     * Calculate Standard Deviation
     */
    static stdDev(data, period) {
        const result = [];
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

    /**
     * Calculate Bollinger Bands
     */
    static bollingerBands(candles, period = CONFIG.BB_PERIOD, stdDev = CONFIG.BB_STD_DEV) {
        const closes = candles.map(c => c.close);
        const middle = this.sma(closes, period);
        const std = this.stdDev(closes, period);

        const upper = [];
        const lower = [];
        const width = [];
        const widthPct = [];
        const percentB = [];

        for (let i = 0; i < candles.length; i++) {
            if (middle[i] === null || std[i] === null) {
                upper.push(null);
                lower.push(null);
                width.push(null);
                widthPct.push(null);
                percentB.push(null);
            } else {
                const u = middle[i] + (stdDev * std[i]);
                const l = middle[i] - (stdDev * std[i]);
                const w = u - l;

                upper.push(u);
                lower.push(l);
                width.push(w);
                widthPct.push((w / middle[i]) * 100);
                percentB.push((closes[i] - l) / (u - l));
            }
        }

        return { middle, upper, lower, width, widthPct, percentB };
    }

    /**
     * Calculate True Range
     */
    static trueRange(candles) {
        const result = [];
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

    /**
     * Calculate ATR (Average True Range)
     */
    static atr(candles, period = CONFIG.ATR_PERIOD) {
        const tr = this.trueRange(candles);
        const atrValues = this.ema(tr, period);
        const closes = candles.map(c => c.close);

        const atrPct = atrValues.map((atr, i) => {
            if (atr === null || closes[i] === 0) return null;
            return (atr / closes[i]) * 100;
        });

        return { atr: atrValues, atrPct };
    }

    /**
     * Calculate Percentile Rank (rolling)
     */
    static percentileRank(data, lookback = CONFIG.LOOKBACK_PERIOD) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i] === null || i < lookback - 1) {
                result.push(null);
            } else {
                const window = data.slice(Math.max(0, i - lookback + 1), i + 1).filter(x => x !== null);
                if (window.length < 2) {
                    result.push(null);
                } else {
                    const current = data[i];
                    const countLess = window.filter(x => x < current).length;
                    result.push((countLess / (window.length - 1)) * 100);
                }
            }
        }
        return result;
    }

    /**
     * Calculate Volume Ratio
     */
    static volumeRatio(candles, period = 20) {
        const volumes = candles.map(c => c.volume);
        const smaVolume = this.sma(volumes, period);

        return volumes.map((vol, i) => {
            if (smaVolume[i] === null || smaVolume[i] === 0) return null;
            return vol / smaVolume[i];
        });
    }

    /**
     * Detect Squeeze State
     */
    static detectSqueezeState(bbWidthPercentile, atrPercentile) {
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
    static countSqueezeBars(squeezeStates) {
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
     * Check if was in squeeze recently
     */
    static wasInSqueezeRecently(squeezeStates, lookback = CONFIG.SQUEEZE_LOOKBACK_BARS) {
        const recentStates = squeezeStates.slice(-lookback - 1, -1);
        return recentStates.some(s => s === 'SQUEEZE' || s === 'TIGHT_SQUEEZE');
    }

    /**
     * Detect Breakout Signal
     */
    static detectBreakout(candles, bb, squeezeStates, volumeRatios) {
        if (candles.length < 2) {
            return { signal: null, squeezeBars: 0, volumeSurge: false };
        }

        const lastIdx = candles.length - 1;
        const prevIdx = lastIdx - 1;

        const current = candles[lastIdx];
        const previous = candles[prevIdx];

        const inSqueezeRecently = this.wasInSqueezeRecently(squeezeStates);
        const squeezeBars = this.countSqueezeBars(squeezeStates.slice(0, -1)); // Exclude current
        const volumeSurge = volumeRatios[lastIdx] >= CONFIG.VOLUME_SURGE_MULTIPLIER;

        let signal = null;

        // Bullish Breakout
        if (current.close > bb.upper[lastIdx] &&
            previous.close <= bb.upper[prevIdx] &&
            inSqueezeRecently) {
            signal = 'BULLISH_BREAKOUT';
        }
        // Bearish Breakout
        else if (current.close < bb.lower[lastIdx] &&
                 previous.close >= bb.lower[prevIdx] &&
                 inSqueezeRecently) {
            signal = 'BEARISH_BREAKOUT';
        }

        return { signal, squeezeBars, volumeSurge, inSqueezeRecently };
    }

    /**
     * Complete Volatility Analysis
     */
    static analyzeVolatility(candles) {
        if (!candles || candles.length < Math.max(CONFIG.BB_PERIOD, CONFIG.ATR_PERIOD, 20)) {
            return {
                status: 'INSUFFICIENT_DATA',
                price: null,
                bbWidthPct: null,
                atrPct: null,
                squeezeState: 'N/A',
                squeezeBars: 0,
                signal: null
            };
        }

        // Calculate indicators
        const bb = this.bollingerBands(candles);
        const atrData = this.atr(candles);
        const volumeRatios = this.volumeRatio(candles);

        // Calculate percentile ranks
        const bbWidthPercentile = this.percentileRank(bb.widthPct);
        const atrPercentile = this.percentileRank(atrData.atrPct);

        // Detect squeeze states for all candles
        const squeezeStates = bbWidthPercentile.map((bbPct, i) =>
            this.detectSqueezeState(bbPct, atrPercentile[i])
        );

        // Detect breakout
        const breakout = this.detectBreakout(candles, bb, squeezeStates, volumeRatios);

        // Get current values
        const lastIdx = candles.length - 1;
        const current = candles[lastIdx];
        const squeezeBars = this.countSqueezeBars(squeezeStates);

        return {
            status: 'OK',
            price: this.round(current.close, 2),
            bbWidthPct: this.round(bb.widthPct[lastIdx], 2),
            bbWidthPercentile: this.round(bbWidthPercentile[lastIdx], 1),
            atrPct: this.round(atrData.atrPct[lastIdx], 2),
            atrPercentile: this.round(atrPercentile[lastIdx], 1),
            squeezeState: squeezeStates[lastIdx],
            squeezeBars: squeezeBars,
            signal: breakout.signal,
            volumeSurge: breakout.volumeSurge,
            bbUpper: this.round(bb.upper[lastIdx], 2),
            bbLower: this.round(bb.lower[lastIdx], 2),
            bbMiddle: this.round(bb.middle[lastIdx], 2),
            bbPercentB: this.round(bb.percentB[lastIdx], 2),
            volumeRatio: this.round(volumeRatios[lastIdx], 2),
            timestamp: current.time
        };
    }

    /**
     * Round to specified decimal places
     */
    static round(value, decimals) {
        if (value === null || value === undefined || isNaN(value)) return null;
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}
