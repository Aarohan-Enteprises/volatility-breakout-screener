// Delta Exchange WebSocket Client for Real-time Candle Updates

import { Candle } from './types';

const WS_URL = 'wss://socket.india.delta.exchange';

type CandleCallback = (symbol: string, timeframe: string, candle: Candle) => void;
type StatusCallback = (connected: boolean) => void;

interface WebSocketMessage {
  type: string;
  candle_start_time?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  resolution?: string;
  symbol?: string;
  timestamp?: number;
}

interface SubscriptionChannel {
  name: string;
  symbols: string[];
}

class DeltaWebSocket {
  private ws: WebSocket | null = null;
  private onCandleCallback: CandleCallback | null = null;
  private onStatusCallback: StatusCallback | null = null;
  private subscribedChannels: SubscriptionChannel[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(onCandle: CandleCallback, onStatus?: StatusCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onCandleCallback = onCandle;
      this.onStatusCallback = onStatus || null;
      this.isIntentionallyClosed = false;

      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.onStatusCallback?.(true);

          // Resubscribe to channels if reconnecting
          if (this.subscribedChannels.length > 0) {
            this.sendSubscribe(this.subscribedChannels);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = () => {
          // Error handled by onclose
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.onStatusCallback?.(false);

          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Send heartbeat every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Handle candlestick updates
      if (message.type?.startsWith('candlestick_') && message.symbol) {
        // candle_start_time is in microseconds, convert to seconds
        const timeInSeconds = Math.floor((message.candle_start_time || 0) / 1000000);

        const candle: Candle = {
          time: timeInSeconds,
          open: message.open || 0,
          high: message.high || 0,
          low: message.low || 0,
          close: message.close || 0,
          volume: message.volume || 0,
        };

        const timeframe = message.resolution || message.type.replace('candlestick_', '');

        if (this.onCandleCallback && candle.time > 0) {
          this.onCandleCallback(message.symbol, timeframe, candle);
        }
      }
    } catch (error) {
      // Ignore parse errors for non-JSON messages
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isIntentionallyClosed && this.onCandleCallback) {
        this.connect(this.onCandleCallback);
      }
    }, delay);
  }

  private sendSubscribe(channels: SubscriptionChannel[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        payload: {
          channels,
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(symbols: string[], timeframes: string[]) {
    // Build channel subscriptions for each timeframe
    const channels: SubscriptionChannel[] = timeframes.map(tf => ({
      name: `candlestick_${tf}`,
      symbols,
    }));

    this.subscribedChannels = channels;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channels);
    }
  }

  unsubscribe(symbols: string[], timeframes: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const channels = timeframes.map(tf => ({
        name: `candlestick_${tf}`,
        symbols,
      }));

      const message = {
        type: 'unsubscribe',
        payload: {
          channels,
        },
      };
      this.ws.send(JSON.stringify(message));

      // Update subscribed channels
      this.subscribedChannels = this.subscribedChannels.filter(
        ch => !channels.some(c => c.name === ch.name)
      );
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.subscribedChannels = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Update the candle callback (used when React dependencies change)
   */
  updateCallback(onCandle: CandleCallback, onStatus?: StatusCallback): void {
    this.onCandleCallback = onCandle;
    if (onStatus) {
      this.onStatusCallback = onStatus;
    }
  }
}

// Singleton instance
export const deltaWebSocket = new DeltaWebSocket();
