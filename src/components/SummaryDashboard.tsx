import React from 'react';

export function SummaryDashboard({ title, items }: { title: string, items: { name: string, total: number }[] }) {
  const revenue = items[0]?.total || 0;
  const expenses = items.slice(1).reduce((sum, item) => sum + item.total, 0);
  const displayNetProfit = revenue - expenses;
  console.log("SummaryDashboard items:", items);
  console.log("SummaryDashboard expenses:", expenses);
  console.log("SummaryDashboard revenue:", revenue);
  console.log("SummaryDashboard displayNetProfit:", displayNetProfit);

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm w-full mb-4">
      <h3 className="font-bold text-xs text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.name} className="flex justify-between items-center text-[10px]">
            <span className="text-gray-600">{item.name}</span>
            <span className="font-semibold text-gray-900">{item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 mt-4 pt-2 flex justify-between items-center text-xs font-bold">
        <span className="text-gray-900">순이익</span>
        <span className={displayNetProfit < 0 ? "text-red-600" : "text-indigo-600"}>{displayNetProfit.toLocaleString()}</span>
      </div>
    </div>
  );
}
