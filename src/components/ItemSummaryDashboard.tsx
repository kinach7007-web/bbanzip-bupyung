import React, { useMemo } from 'react';

interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  category: string;
}

interface SummaryGroup {
  title: string;
  items: string[];
}

interface ItemSummaryProps {
  transactions: Transaction[];
  groups: SummaryGroup[];
}

export function ItemSummaryDashboard({ transactions, groups }: ItemSummaryProps) {
  const summary = useMemo(() => {
    const data: { [item: string]: number } = {};
    groups.forEach(group => group.items.forEach(item => data[item] = 0));
    
    transactions.forEach(t => {
      if (data[t.name] !== undefined) {
        data[t.name] += t.amount;
      }
    });
    
    return data;
  }, [transactions, groups]);

  return (
    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm w-full">
      <h3 className="font-bold text-base text-emerald-950 mb-6">항목별 합산금액</h3>
      <div className="flex flex-col md:flex-row gap-8">
        {groups.map(group => (
            <div key={group.title} className="flex-1">
                <h4 className="font-bold text-xs text-emerald-900 mb-4">{group.title}</h4>
                <div className="flex flex-col gap-2">
                    {group.items.map(item => (
                    <div key={item} className="flex justify-between items-center py-2 border-b border-emerald-100 last:border-b-0">
                        <span className="text-emerald-800 text-[10px]">{item}</span>
                        <span className="font-semibold text-emerald-950 text-[10px] text-right">
                        {summary[item]?.toLocaleString()}원
                        </span>
                    </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
