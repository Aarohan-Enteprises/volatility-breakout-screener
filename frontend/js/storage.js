/**
 * Local Storage Manager
 * Handles persistence of watchlist, settings, and alerts
 */

class Storage {
    /**
     * Get watchlist from localStorage
     */
    static getWatchlist() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEYS.WATCHLIST);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading watchlist:', error);
        }
        return [...CONFIG.DEFAULT_WATCHLIST];
    }

    /**
     * Save watchlist to localStorage
     */
    static saveWatchlist(watchlist) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
            return true;
        } catch (error) {
            console.error('Error saving watchlist:', error);
            return false;
        }
    }

    /**
     * Add symbol to watchlist
     */
    static addToWatchlist(symbol) {
        const watchlist = this.getWatchlist();
        if (!watchlist.includes(symbol)) {
            watchlist.push(symbol);
            this.saveWatchlist(watchlist);
            return true;
        }
        return false;
    }

    /**
     * Remove symbol from watchlist
     */
    static removeFromWatchlist(symbol) {
        const watchlist = this.getWatchlist();
        const index = watchlist.indexOf(symbol);
        if (index > -1) {
            watchlist.splice(index, 1);
            this.saveWatchlist(watchlist);
            return true;
        }
        return false;
    }

    /**
     * Get settings from localStorage
     */
    static getSettings() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading settings:', error);
        }
        return {
            bbPeriod: CONFIG.BB_PERIOD,
            bbStdDev: CONFIG.BB_STD_DEV,
            atrPeriod: CONFIG.ATR_PERIOD,
            squeezeThreshold: CONFIG.SQUEEZE_PERCENTILE_THRESHOLD,
            tightSqueezeThreshold: CONFIG.TIGHT_SQUEEZE_PERCENTILE_THRESHOLD,
            visibleTimeframes: [...CONFIG.TIMEFRAMES],
            autoRefresh: true,
            refreshInterval: CONFIG.REFRESH_INTERVAL
        };
    }

    /**
     * Save settings to localStorage
     */
    static saveSettings(settings) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get alerts from localStorage
     */
    static getAlerts() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEYS.ALERTS);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading alerts:', error);
        }
        return [];
    }

    /**
     * Save alert to localStorage
     */
    static saveAlert(alert) {
        try {
            const alerts = this.getAlerts();
            alerts.unshift(alert);
            // Keep only last 50 alerts
            const trimmedAlerts = alerts.slice(0, 50);
            localStorage.setItem(CONFIG.STORAGE_KEYS.ALERTS, JSON.stringify(trimmedAlerts));
            return true;
        } catch (error) {
            console.error('Error saving alert:', error);
            return false;
        }
    }

    /**
     * Clear all alerts
     */
    static clearAlerts() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ALERTS);
            return true;
        } catch (error) {
            console.error('Error clearing alerts:', error);
            return false;
        }
    }

    /**
     * Clear all storage
     */
    static clearAll() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.WATCHLIST);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SETTINGS);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ALERTS);
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }
}
