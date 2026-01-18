/**
 * Delta Exchange API Client
 * Handles all API calls to Delta Exchange
 */

class DeltaAPI {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.productsUrl = CONFIG.PRODUCTS_URL;
        this.symbolsCache = null;
        this.symbolsCacheTime = 0;
        this.cacheDuration = 4 * 60 * 60 * 1000; // 4 hours
    }

    /**
     * Fetch all available symbols
     */
    async fetchSymbols() {
        const now = Date.now();

        // Return cached if still valid
        if (this.symbolsCache && (now - this.symbolsCacheTime) < this.cacheDuration) {
            return this.symbolsCache;
        }

        try {
            const response = await fetch(this.productsUrl);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.result) {
                throw new Error('No result in response');
            }

            // Filter symbols - only USD pairs, exclude options
            const symbols = data.result
                .map(p => p.symbol)
                .filter(s => s && !s.includes('C-') && !s.includes('P-') && !s.includes('MV-') && !s.includes('_'))
                .filter(s => s.includes('USD'))
                .sort();

            this.symbolsCache = [...new Set(symbols)];
            this.symbolsCacheTime = now;

            console.log(`Loaded ${this.symbolsCache.length} symbols`);
            return this.symbolsCache;

        } catch (error) {
            console.error('Failed to fetch symbols:', error);
            return this.symbolsCache || CONFIG.DEFAULT_WATCHLIST;
        }
    }

    /**
     * Get timeframe in seconds
     */
    getTimeframeSeconds(timeframe) {
        const mapping = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
            '1w': 604800
        };
        return mapping[timeframe] || 3600;
    }

    /**
     * Fetch historical candles for a symbol
     */
    async fetchCandles(symbol, timeframe, numCandles = CONFIG.CANDLES_TO_FETCH) {
        const now = Math.floor(Date.now() / 1000);
        const tfSeconds = this.getTimeframeSeconds(timeframe);
        const start = now - (tfSeconds * numCandles);

        const url = `${this.baseUrl}/v2/history/candles?symbol=${symbol}&resolution=${timeframe}&start=${start}&end=${now}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.result || !Array.isArray(data.result)) {
                console.warn(`No data returned for ${symbol} ${timeframe}`);
                return [];
            }

            // Parse and validate candles
            const candles = data.result
                .map(c => ({
                    time: c.time,
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close),
                    volume: parseFloat(c.volume)
                }))
                .filter(c => c.volume > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
                .sort((a, b) => a.time - b.time);

            // Remove outliers using MAD (Median Absolute Deviation)
            if (candles.length > 10) {
                const closes = candles.map(c => c.close).sort((a, b) => a - b);
                const median = closes[Math.floor(closes.length / 2)];
                const deviations = candles.map(c => Math.abs(c.close - median));
                const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];

                if (mad > 0) {
                    const threshold = 10 * mad;
                    return candles.filter(c => Math.abs(c.close - median) <= threshold);
                }
            }

            return candles;

        } catch (error) {
            console.error(`Failed to fetch candles for ${symbol} ${timeframe}:`, error);
            return [];
        }
    }

    /**
     * Fetch and analyze a symbol for all timeframes
     */
    async analyzeSymbol(symbol, timeframes = CONFIG.TIMEFRAMES) {
        const results = {};

        const promises = timeframes.map(async (tf) => {
            const candles = await this.fetchCandles(symbol, tf);
            const analysis = Indicators.analyzeVolatility(candles);
            analysis.symbol = symbol;
            analysis.timeframe = tf;
            return { tf, analysis };
        });

        const analyses = await Promise.all(promises);

        for (const { tf, analysis } of analyses) {
            results[tf] = analysis;
        }

        return results;
    }

    /**
     * Fetch and analyze multiple symbols
     */
    async analyzeMultipleSymbols(symbols, timeframes = CONFIG.TIMEFRAMES) {
        const results = {};

        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const promises = batch.map(async (symbol) => {
                const analysis = await this.analyzeSymbol(symbol, timeframes);
                return { symbol, analysis };
            });

            const batchResults = await Promise.all(promises);

            for (const { symbol, analysis } of batchResults) {
                results[symbol] = analysis;
            }
        }

        return results;
    }
}

// Create global API instance
const deltaAPI = new DeltaAPI();
