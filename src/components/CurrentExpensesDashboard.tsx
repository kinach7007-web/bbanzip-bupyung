import React from 'react';

interface ExpenseItem {
  name: string;
  amount: number;
}

export function CurrentExpensesDashboard({ title, items }: { title: string, items: ExpenseItem[] }) {
  // Filter out items with 0 amount if needed, or keep for consistency. 
  // Let's keep for consistency.
  return (
    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm w-full">
      <h3 className="font-semibold text-base text-amber-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.name} className="flex justify-between items-center text-xs">
            <span className="text-amber-700 font-medium">{item.name}</span>
            <span className="font-semibold text-amber-900">{item.amount.toLocaleString()} 원</span>
          </div>
        ))}
      </div>
    </div>
  );
}
