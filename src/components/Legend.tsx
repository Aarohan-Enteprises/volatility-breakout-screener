'use client';

const legendItems = [
  { label: 'Tight Squeeze', className: 'bg-red-900' },
  { label: 'Squeeze', className: 'bg-amber-900' },
  { label: 'Normal', className: 'bg-gray-800 border border-gray-700' },
  { label: 'Expansion', className: 'bg-blue-900' },
  { label: 'Bullish Breakout', className: 'bg-green-700' },
  { label: 'Bearish Breakout', className: 'bg-red-700' },
];

export function Legend() {
  return (
    <div className="flex flex-wrap gap-4 p-3 bg-gray-900 rounded-lg border border-gray-800 mb-5">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${item.className}`} />
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
