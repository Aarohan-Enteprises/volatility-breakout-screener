'use client';

import { VolatilityAnalysis } from '@/lib/types';

interface StateCellProps {
  data: VolatilityAnalysis | undefined;
}

export function StateCell({ data }: StateCellProps) {
  if (!data || data.status === 'INSUFFICIENT_DATA' || data.status === 'ERROR') {
    return (
      <td>
        <div className="px-3 py-2 rounded-md text-center text-xs font-medium bg-gray-800 text-gray-500">
          N/A
        </div>
      </td>
    );
  }

  const { squeezeState, signal, squeezeBars, bbWidthPercentile } = data;

  let cellClass = '';
  let displayText = '';
  let details = '';

  if (signal === 'BULLISH_BREAKOUT') {
    cellClass = 'bg-green-700 text-white animate-pulse';
    displayText = '🔺 BREAKOUT';
    details = `After ${squeezeBars} bar squeeze`;
  } else if (signal === 'BEARISH_BREAKOUT') {
    cellClass = 'bg-red-700 text-white animate-pulse';
    displayText = '🔻 BREAKOUT';
    details = `After ${squeezeBars} bar squeeze`;
  } else {
    switch (squeezeState) {
      case 'TIGHT_SQUEEZE':
        cellClass = 'bg-red-900 text-red-300';
        displayText = '🔥 TIGHT';
        details = `${squeezeBars} bars`;
        break;
      case 'SQUEEZE':
        cellClass = 'bg-amber-900 text-amber-300';
        displayText = '⚡ SQUEEZE';
        details = `${squeezeBars} bars`;
        break;
      case 'EXPANSION':
        cellClass = 'bg-blue-900 text-blue-300';
        displayText = '📈 EXPAND';
        details = bbWidthPercentile !== null ? `${bbWidthPercentile.toFixed(0)}%ile` : '';
        break;
      default:
        cellClass = 'bg-gray-800 text-gray-400';
        displayText = 'NORMAL';
        details = bbWidthPercentile !== null ? `${bbWidthPercentile.toFixed(0)}%ile` : '';
    }
  }

  return (
    <td>
      <div className={`px-3 py-2 rounded-md text-center min-w-[100px] ${cellClass}`}>
        <div className="text-xs font-semibold">{displayText}</div>
        {details && <div className="text-[10px] opacity-80 mt-0.5">{details}</div>}
      </div>
    </td>
  );
}
