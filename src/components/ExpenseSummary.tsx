import React from 'react';

export function ExpenseSummary({ title, items }: { title: string, items: { name: string, total: number }[] }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full">
      <h3 className="font-bold text-sm text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.name} className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{item.name}</span>
            <span className="font-bold text-gray-900">{item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
