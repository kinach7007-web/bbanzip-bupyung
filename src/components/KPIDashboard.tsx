import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function KPIDashboard({ 
  currentSummary, 
  currentExpenses, 
  totalCogsProp,
  archives, 
  overrideVariableCosts 
}: { 
  currentSummary: any, 
  currentExpenses: any[], 
  totalCogsProp?: number,
  archives?: any[], 
  overrideVariableCosts?: number 
}) {
  
  const data = useMemo(() => {
    const totalSales = currentSummary?.totalSales || 0;
    
    // Calculate COGS using cogsProp if provided, otherwise fallback to currentExpenses
    const cogs = totalCogsProp !== undefined ? totalCogsProp : (
        currentExpenses.find(e => e.name === '매출원가')?.amount || 0
    );

    const fixedExpenses = currentExpenses.find(e => e.name === '고정비')?.amount || 0;
    const variableExpenses = currentExpenses.find(e => e.name === '변동비')?.amount || 0;
    const laborExpenses = currentExpenses.find(e => e.name === '인건비')?.amount || 0;
    const rentExpenses = currentExpenses.find(e => e.name === '임대료')?.amount || 0;
    const marketingExpenses = currentExpenses.find(e => e.name === '마케팅')?.amount || 0;
    const taxExpenses = currentExpenses.find(e => e.name === '세금 예수금')?.amount || 0;

    const totalExpenses = cogs + fixedExpenses + variableExpenses + laborExpenses + rentExpenses + marketingExpenses + taxExpenses;
    const netProfit = totalSales - totalExpenses;

    const mgmtExpenses = fixedExpenses + variableExpenses;
    const mktExpenses = marketingExpenses;

    const metrics = [
      { name: '매출원가', value: totalSales ? (cogs / totalSales) * 100 : 0, amount: cogs, color: '#ef4444' },
      { name: '관리비', value: totalSales ? (mgmtExpenses / totalSales) * 100 : 0, amount: mgmtExpenses, color: '#f59e0b' },
      { name: '마케팅', value: totalSales ? (mktExpenses / totalSales) * 100 : 0, amount: mktExpenses, color: '#8b5cf6' },
      { name: '순이익', value: totalSales ? (netProfit / totalSales) * 100 : 0, amount: netProfit, color: '#10b981' },
    ];
    
    return metrics;
  }, [currentSummary, currentExpenses, totalCogsProp]);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-6">현재 매출 대비 비율 (%)</h3>
      
      <div className="space-y-6">
        {data.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
              <span>{item.name}</span>
              <span className="text-gray-900">
                {item.value.toFixed(1)}% 
                <span className="text-gray-400 ml-1">({(item.amount || 0).toLocaleString()}원)</span>
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.color }} 
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', shadow: 'sm' }} 
              formatter={(value: number) => value.toFixed(1) + '%'}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
