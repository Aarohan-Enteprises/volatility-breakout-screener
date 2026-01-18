/**
 * Volatility Breakout Screener - Main Application
 */

class App {
    constructor() {
        this.allSymbols = [];
        this.watchlist = [];
        this.screenerData = {};
        this.previousStates = {};
        this.isLoading = false;
        this.refreshInterval = null;
        this.settings = Storage.getSettings();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Volatility Breakout Screener...');

        // Load watchlist
        this.watchlist = Storage.getWatchlist();

        // Setup UI event listeners
        this.setupEventListeners();

        // Load symbols
        await this.loadSymbols();

        // Initial data fetch
        await this.refreshScreenerData();

        // Render watchlist
        this.renderWatchlist();

        // Load saved alerts
        this.loadSavedAlerts();

        // Start auto-refresh
        this.startAutoRefresh();

        console.log('App initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshScreenerData());

        // Add symbol
        document.getElementById('addSymbolBtn').addEventListener('click', () => this.addSymbolFromInput());
        document.getElementById('symbolInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSymbolFromInput();
        });

        // Autocomplete
        document.getElementById('symbolInput').addEventListener('input', (e) => this.handleAutocomplete(e.target.value));

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.watchlist-add')) {
                document.getElementById('autocompleteDropdown').classList.remove('show');
            }
        });

        // Save settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Clear alerts
        document.getElementById('clearAlertsBtn')?.addEventListener('click', () => this.clearAlerts());
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    /**
     * Load symbols from API
     */
    async loadSymbols() {
        this.allSymbols = await deltaAPI.fetchSymbols();
    }

    /**
     * Refresh screener data
     */
    async refreshScreenerData() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();
        this.updateRefreshButton(true);

        try {
            const timeframes = this.settings.visibleTimeframes || CONFIG.TIMEFRAMES;
            this.screenerData = await deltaAPI.analyzeMultipleSymbols(this.watchlist, timeframes);

            // Check for state changes and generate alerts
            this.checkForAlerts();

            // Store current states for next comparison
            this.updatePreviousStates();

            // Render table
            this.renderScreenerTable();

        } catch (error) {
            console.error('Failed to refresh screener data:', error);
            this.showError('Failed to load data. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateRefreshButton(false);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tbody = document.getElementById('screenerBody');
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <div class="loading-spinner"></div>
                    <span>Loading data...</span>
                </td>
            </tr>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const tbody = document.getElementById('screenerBody');
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5" style="color: var(--accent-red);">
                    ${message}
                </td>
            </tr>
        `;
    }

    /**
     * Update refresh button state
     */
    updateRefreshButton(loading) {
        const btn = document.getElementById('refreshBtn');
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">🔄</span> Refresh';
        }
    }

    /**
     * Render screener table
     */
    renderScreenerTable() {
        const tbody = document.getElementById('screenerBody');
        const symbols = Object.keys(this.screenerData);
        const timeframes = this.settings.visibleTimeframes || CONFIG.TIMEFRAMES;

        if (symbols.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="5">
                        No symbols in watchlist. Add symbols from the Watchlist tab.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';

        for (const symbol of symbols) {
            const symbolData = this.screenerData[symbol] || {};
            const firstTf = symbolData[timeframes[0]] || {};
            const price = firstTf.price || 'N/A';

            html += `
                <tr data-symbol="${symbol}">
                    <td class="sticky-col">
                        <span class="symbol-cell" onclick="app.addSymbolToWatchlist('${symbol}')">${symbol}</span>
                    </td>
                    <td class="price-cell">${this.formatPrice(price)}</td>
            `;

            for (const tf of timeframes) {
                const tfData = symbolData[tf] || {};
                html += this.renderStateCell(tfData);
            }

            html += '</tr>';
        }

        tbody.innerHTML = html;
    }

    /**
     * Render state cell
     */
    renderStateCell(data) {
        if (!data || data.status === 'INSUFFICIENT_DATA' || data.status === 'ERROR') {
            return `<td><div class="state-cell na">N/A</div></td>`;
        }

        const state = data.squeezeState || 'NORMAL';
        const signal = data.signal;
        const squeezeBars = data.squeezeBars || 0;
        const bbWidthPct = data.bbWidthPercentile;

        let cellClass = '';
        let displayText = '';
        let details = '';

        if (signal === 'BULLISH_BREAKOUT') {
            cellClass = 'bullish-breakout';
            displayText = '🔺 BREAKOUT';
            details = `After ${squeezeBars} bar squeeze`;
        } else if (signal === 'BEARISH_BREAKOUT') {
            cellClass = 'bearish-breakout';
            displayText = '🔻 BREAKOUT';
            details = `After ${squeezeBars} bar squeeze`;
        } else {
            switch (state) {
                case 'TIGHT_SQUEEZE':
                    cellClass = 'tight-squeeze';
                    displayText = '🔥 TIGHT';
                    details = `${squeezeBars} bars`;
                    break;
                case 'SQUEEZE':
                    cellClass = 'squeeze';
                    displayText = '⚡ SQUEEZE';
                    details = `${squeezeBars} bars`;
                    break;
                case 'EXPANSION':
                    cellClass = 'expansion';
                    displayText = '📈 EXPAND';
                    details = bbWidthPct !== null ? `${bbWidthPct.toFixed(0)}%ile` : '';
                    break;
                default:
                    cellClass = 'normal';
                    displayText = 'NORMAL';
                    details = bbWidthPct !== null ? `${bbWidthPct.toFixed(0)}%ile` : '';
            }
        }

        return `
            <td>
                <div class="state-cell ${cellClass}">
                    ${displayText}
                    ${details ? `<div class="state-details">${details}</div>` : ''}
                </div>
            </td>
        `;
    }

    /**
     * Format price
     */
    formatPrice(price) {
        if (price === 'N/A' || price === null || price === undefined) return 'N/A';
        const num = parseFloat(price);
        if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (num >= 1) return num.toFixed(2);
        if (num >= 0.01) return num.toFixed(4);
        return num.toFixed(6);
    }

    /**
     * Handle autocomplete
     */
    handleAutocomplete(query) {
        const dropdown = document.getElementById('autocompleteDropdown');
        query = query.toUpperCase().trim();

        if (query.length < 1) {
            dropdown.classList.remove('show');
            return;
        }

        const matches = this.allSymbols
            .filter(s => s.includes(query))
            .slice(0, 10);

        if (matches.length === 0) {
            dropdown.classList.remove('show');
            return;
        }

        dropdown.innerHTML = matches
            .map(s => `<div class="autocomplete-item" data-symbol="${s}" onclick="app.selectAutocomplete('${s}')">${s}</div>`)
            .join('');
        dropdown.classList.add('show');
    }

    /**
     * Select autocomplete item
     */
    selectAutocomplete(symbol) {
        document.getElementById('symbolInput').value = symbol;
        document.getElementById('autocompleteDropdown').classList.remove('show');
    }

    /**
     * Add symbol from input
     */
    async addSymbolFromInput() {
        const input = document.getElementById('symbolInput');
        const symbol = input.value.toUpperCase().trim();

        if (symbol) {
            await this.addSymbolToWatchlist(symbol);
            input.value = '';
            document.getElementById('autocompleteDropdown').classList.remove('show');
        }
    }

    /**
     * Add symbol to watchlist
     */
    async addSymbolToWatchlist(symbol) {
        if (this.watchlist.includes(symbol)) {
            console.log(`${symbol} already in watchlist`);
            return;
        }

        // Validate symbol
        if (!this.allSymbols.includes(symbol)) {
            alert(`Invalid symbol: ${symbol}`);
            return;
        }

        Storage.addToWatchlist(symbol);
        this.watchlist.push(symbol);
        this.renderWatchlist();

        // Fetch data for new symbol
        await this.refreshScreenerData();
    }

    /**
     * Remove symbol from watchlist
     */
    removeSymbolFromWatchlist(symbol) {
        Storage.removeFromWatchlist(symbol);
        this.watchlist = this.watchlist.filter(s => s !== symbol);
        delete this.screenerData[symbol];
        delete this.previousStates[symbol];

        this.renderWatchlist();
        this.renderScreenerTable();
    }

    /**
     * Render watchlist
     */
    renderWatchlist() {
        const container = document.getElementById('watchlistItems');

        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="no-alerts">
                    No symbols in watchlist. Use the search above to add symbols.
                </div>
            `;
            return;
        }

        container.innerHTML = this.watchlist
            .map(symbol => `
                <div class="watchlist-item">
                    <span class="watchlist-symbol">${symbol}</span>
                    <button class="watchlist-remove" onclick="app.removeSymbolFromWatchlist('${symbol}')">
                        Remove
                    </button>
                </div>
            `)
            .join('');
    }

    /**
     * Check for state changes and generate alerts
     */
    checkForAlerts() {
        const timeframes = this.settings.visibleTimeframes || CONFIG.TIMEFRAMES;

        for (const symbol of Object.keys(this.screenerData)) {
            for (const tf of timeframes) {
                const current = this.screenerData[symbol]?.[tf];
                const previous = this.previousStates[symbol]?.[tf];

                if (!current || current.status !== 'OK') continue;

                // Check for breakout
                if (current.signal && (!previous || previous.signal !== current.signal)) {
                    this.addAlert({
                        type: 'breakout',
                        signal: current.signal,
                        symbol,
                        timeframe: tf,
                        price: current.price,
                        squeezeBars: current.squeezeBars,
                        timestamp: Date.now()
                    });
                }

                // Check for squeeze entry
                else if ((current.squeezeState === 'SQUEEZE' || current.squeezeState === 'TIGHT_SQUEEZE') &&
                         (!previous || previous.squeezeState === 'NORMAL')) {
                    this.addAlert({
                        type: 'squeeze_entry',
                        squeezeState: current.squeezeState,
                        symbol,
                        timeframe: tf,
                        price: current.price,
                        timestamp: Date.now()
                    });
                }

                // Check for tight squeeze
                else if (current.squeezeState === 'TIGHT_SQUEEZE' &&
                         previous && previous.squeezeState === 'SQUEEZE') {
                    this.addAlert({
                        type: 'tight_squeeze',
                        symbol,
                        timeframe: tf,
                        price: current.price,
                        squeezeBars: current.squeezeBars,
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    /**
     * Update previous states for next comparison
     */
    updatePreviousStates() {
        this.previousStates = JSON.parse(JSON.stringify(this.screenerData));
    }

    /**
     * Add alert to UI and storage
     */
    addAlert(alert) {
        Storage.saveAlert(alert);
        this.renderAlert(alert);
        console.log('Alert:', alert);
    }

    /**
     * Render alert in UI
     */
    renderAlert(alert) {
        const alertsLog = document.getElementById('alertsLog');

        // Remove "no alerts" message if present
        const noAlerts = alertsLog.querySelector('.no-alerts');
        if (noAlerts) noAlerts.remove();

        let icon, title, titleClass;

        switch (alert.type) {
            case 'breakout':
                if (alert.signal === 'BULLISH_BREAKOUT') {
                    icon = '🔺';
                    title = `${alert.symbol} Bullish Breakout`;
                    titleClass = 'bullish';
                } else {
                    icon = '🔻';
                    title = `${alert.symbol} Bearish Breakout`;
                    titleClass = 'bearish';
                }
                break;
            case 'squeeze_entry':
                icon = '⚡';
                title = `${alert.symbol} Entered Squeeze`;
                titleClass = 'squeeze';
                break;
            case 'tight_squeeze':
                icon = '🔥';
                title = `${alert.symbol} Tight Squeeze`;
                titleClass = 'squeeze';
                break;
            default:
                icon = '📊';
                title = `${alert.symbol} Alert`;
                titleClass = '';
        }

        const time = new Date(alert.timestamp).toLocaleTimeString();

        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item';
        alertElement.innerHTML = `
            <span class="alert-icon">${icon}</span>
            <div class="alert-content">
                <div class="alert-title ${titleClass}">${title}</div>
                <div class="alert-details">${alert.timeframe} | $${this.formatPrice(alert.price)}</div>
            </div>
            <span class="alert-time">${time}</span>
        `;

        alertsLog.insertBefore(alertElement, alertsLog.firstChild);

        // Keep only last 20 alerts in UI
        const alerts = alertsLog.querySelectorAll('.alert-item');
        if (alerts.length > 20) {
            alerts[alerts.length - 1].remove();
        }
    }

    /**
     * Load saved alerts
     */
    loadSavedAlerts() {
        const alerts = Storage.getAlerts();
        const alertsLog = document.getElementById('alertsLog');

        if (alerts.length === 0) {
            return;
        }

        alertsLog.innerHTML = '';
        alerts.slice(0, 20).forEach(alert => this.renderAlert(alert));
    }

    /**
     * Clear all alerts
     */
    clearAlerts() {
        Storage.clearAlerts();
        const alertsLog = document.getElementById('alertsLog');
        alertsLog.innerHTML = '<div class="no-alerts">No alerts yet. Watching for volatility breakouts...</div>';
    }

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            bbPeriod: parseInt(document.getElementById('bbPeriod').value) || CONFIG.BB_PERIOD,
            bbStdDev: parseFloat(document.getElementById('bbStdDev').value) || CONFIG.BB_STD_DEV,
            atrPeriod: parseInt(document.getElementById('atrPeriod').value) || CONFIG.ATR_PERIOD,
            squeezeThreshold: parseInt(document.getElementById('squeezeThreshold').value) || CONFIG.SQUEEZE_PERCENTILE_THRESHOLD,
            tightSqueezeThreshold: parseInt(document.getElementById('tightSqueezeThreshold').value) || CONFIG.TIGHT_SQUEEZE_PERCENTILE_THRESHOLD,
            visibleTimeframes: Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value),
            autoRefresh: true,
            refreshInterval: CONFIG.REFRESH_INTERVAL
        };

        Storage.saveSettings(settings);
        this.settings = settings;

        const btn = document.getElementById('saveSettingsBtn');
        btn.textContent = 'Saved!';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = 'Save Settings';
            btn.disabled = false;
        }, 2000);

        // Refresh data with new settings
        this.refreshScreenerData();
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshScreenerData();
        }, this.settings.refreshInterval || CONFIG.REFRESH_INTERVAL);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Create and initialize app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
