'use client';

import { Alert } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface AlertsLogProps {
  alerts: Alert[];
  onClear: () => void;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

export function AlertsLog({ alerts, onClear }: AlertsLogProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">Recent Alerts</h3>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 max-h-[300px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            No alerts yet. Watching for volatility breakouts...
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              let icon = '📊';
              let titleClass = 'text-gray-300';
              let title = `${alert.symbol} Alert`;

              switch (alert.type) {
                case 'breakout':
                  if (alert.signal === 'BULLISH_BREAKOUT') {
                    icon = '🔺';
                    title = `${alert.symbol} Bullish Breakout`;
                    titleClass = 'text-green-400';
                  } else {
                    icon = '🔻';
                    title = `${alert.symbol} Bearish Breakout`;
                    titleClass = 'text-red-400';
                  }
                  break;
                case 'squeeze_entry':
                  icon = '⚡';
                  title = `${alert.symbol} Entered Squeeze`;
                  titleClass = 'text-amber-400';
                  break;
                case 'tight_squeeze':
                  icon = '🔥';
                  title = `${alert.symbol} Tight Squeeze`;
                  titleClass = 'text-amber-400';
                  break;
              }

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg animate-in slide-in-from-left duration-300"
                >
                  <span className="text-lg">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${titleClass}`}>{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {alert.timeframe} | ${formatPrice(alert.price)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
