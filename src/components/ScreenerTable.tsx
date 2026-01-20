'use client';

import { ScreenerData, TIMEFRAMES } from '@/lib/types';
import { StateCell } from './StateCell';

interface ScreenerTableProps {
  data: ScreenerData;
  timeframes?: string[];
  isLoading?: boolean;
  onSymbolClick?: (symbol: string) => void;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'N/A';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

export function ScreenerTable({
  data,
  timeframes = TIMEFRAMES,
  isLoading = false,
  onSymbolClick,
}: ScreenerTableProps) {
  const symbols = Object.keys(data);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Price
              </th>
              {timeframes.map((tf) => (
                <th key={tf} className="px-4 py-3 text-center text-xs font-semibold text-gray-400 tracking-wider">
                  {tf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={timeframes.length + 2} className="px-4 py-12 text-center text-gray-500">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center text-gray-500">
        No symbols in watchlist. Add symbols to get started.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-800">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-800 z-10">
              Symbol
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Price
            </th>
            {timeframes.map((tf) => (
              <th key={tf} className="px-4 py-3 text-center text-xs font-semibold text-gray-400 tracking-wider">
                {tf}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {symbols.map((symbol) => {
            const symbolData = data[symbol];
            const firstTf = symbolData?.[timeframes[0]];
            const price = firstTf?.price;

            return (
              <tr key={symbol} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 sticky left-0 bg-gray-900 z-10">
                  <button
                    onClick={() => onSymbolClick?.(symbol)}
                    className="text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    {symbol}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-sm">
                  ${formatPrice(price ?? null)}
                </td>
                {timeframes.map((tf) => (
                  <StateCell key={tf} data={symbolData?.[tf]} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
