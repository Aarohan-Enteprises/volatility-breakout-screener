/**
 * Configuration for Volatility Breakout Screener
 */
const CONFIG = {
    // Delta Exchange API
    API_BASE_URL: 'https://api.india.delta.exchange',
    PRODUCTS_URL: 'https://api.delta.exchange/v2/products',

    // Bollinger Bands Settings
    BB_PERIOD: 20,
    BB_STD_DEV: 2.0,

    // ATR Settings
    ATR_PERIOD: 14,

    // Squeeze Detection Settings
    SQUEEZE_PERCENTILE_THRESHOLD: 20,
    TIGHT_SQUEEZE_PERCENTILE_THRESHOLD: 10,
    BREAKOUT_PERCENTILE_THRESHOLD: 70,
    LOOKBACK_PERIOD: 100,
    SQUEEZE_LOOKBACK_BARS: 10,

    // Volume Settings
    VOLUME_SURGE_MULTIPLIER: 1.5,

    // Timeframes
    TIMEFRAMES: ['1h', '4h', '1d'],

    // Default Watchlist
    DEFAULT_WATCHLIST: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'DOGEUSD'],

    // Number of candles to fetch
    CANDLES_TO_FETCH: 200,

    // Refresh interval (ms)
    REFRESH_INTERVAL: 60000,

    // Local Storage Keys
    STORAGE_KEYS: {
        WATCHLIST: 'vbs_watchlist',
        SETTINGS: 'vbs_settings',
        ALERTS: 'vbs_alerts'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.TIMEFRAMES);
Object.freeze(CONFIG.DEFAULT_WATCHLIST);
Object.freeze(CONFIG.STORAGE_KEYS);
