import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { KPI_DATA } from '../data';
import { formatCurrency } from '../App';

import { type Employee, type PartTimeWorker, type PartTimeRecord, type DispatchRecord, type DispatchWorker, type SalaryState, type MonthlyArchive } from '../types';

interface KPIDashboardProps {
  currentSummary: any;
  currentExpenses: any[];
  archives?: MonthlyArchive[];
  isReadOnly?: boolean;
}

export function KPIDashboard({ currentSummary, currentExpenses, archives = [], isReadOnly = false }: KPIDashboardProps) {
  const today = new Date().toISOString().split('T')[0];

  const PASTEL_COLORS = [
    '#A7C7E7', // Pastel Blue
    '#C1E1C1', // Pastel Green
    '#FDFD96', // Pastel Yellow
    '#FFD1DC', // Pastel Pink
    '#C3B1E1', // Pastel Purple
    '#FFB7B2', // Pastel Coral
  ];

  const computedKPIData = React.useMemo(() => {
    // 1. Summary Section Data (1. 일일핵심지표 요약)
    const summaryItems = [
      { category: '매출액', targetRatio: 100.0, actualAmount: currentSummary.totalSales },
      { category: '매출원가', targetRatio: 32.0, actualAmount: currentSummary.cogs },
      { category: '관리비', targetRatio: 43.0, actualAmount: currentSummary.labor + currentSummary.rent + currentSummary.fixedCosts + currentSummary.variableCosts + currentSummary.marketingCosts },
      { category: '세금 및 투자비', targetRatio: 7.0, actualAmount: currentSummary.taxes },
      { category: '영업외 수익/비용', targetRatio: 0, actualAmount: 0 },
      { category: '비용 합계', targetRatio: 82.0, actualAmount: currentSummary.cogs + currentSummary.labor + currentSummary.rent + currentSummary.fixedCosts + currentSummary.variableCosts + currentSummary.marketingCosts + currentSummary.taxes + currentSummary.cardFees },
      { category: '점포순이익', targetRatio: 18.0, actualAmount: currentSummary.netProfit },
    ];

    const summary = summaryItems.map(item => {
      const actualRatio = currentSummary.totalSales > 0 ? Number(((item.actualAmount / currentSummary.totalSales) * 100).toFixed(1)) : 0;
      return {
        ...item,
        actualRatio,
        diff: Number((actualRatio - item.targetRatio).toFixed(1))
      };
    });

    // 2. Detailed Section Data (2. 일일핵심지표 관리 세부 현황)
    const getDetailAmount = (catName: string, detailName: string) => {
      return currentExpenses.find(e => e.name === catName)?.details?.find((d: any) => d.name === detailName)?.amount || 0;
    };

    const liquorAmount = getDetailAmount('매출원가', '주류 원가');
    const beverageAmount = getDetailAmount('매출원가', '음료 원가');
    const liquorBeverageTotal = liquorAmount + beverageAmount;

    const detailItems = [
      { item: '1.매출액', subItem: '', targetRatio: 100.0, actualAmount: currentSummary.totalSales, level: 0 },
      { item: '매출원가', subItem: '2-1. 원자재(육류)', targetRatio: 19.5, actualAmount: getDetailAmount('매출원가', '2-1. 원자재(육류)'), level: 1 },
      { item: '', subItem: '2-2. 식자재&공산품', targetRatio: 9.5, actualAmount: getDetailAmount('매출원가', '2-2. 식자재&공산품'), level: 1 },
      { item: '', subItem: '주류/음료', targetRatio: 3.0, actualAmount: liquorBeverageTotal, level: 1 },
      { item: '2.매출원가 소계', subItem: '', targetRatio: 32.0, actualAmount: currentSummary.cogs, level: 0, isSubtotal: true },
      { item: '1)인건비', subItem: '', targetRatio: 25.0, actualAmount: currentSummary.labor, level: 1 },
      { item: '2)임대료', subItem: '', targetRatio: 6.0, actualAmount: currentSummary.rent, level: 1 },
      { item: '3)고정비', subItem: '', targetRatio: 0.9, actualAmount: currentSummary.fixedCosts, level: 1 },
      { item: '4)변동비', subItem: '', targetRatio: 8.0, actualAmount: currentSummary.variableCosts, level: 1 },
      { item: '3.관리비 소계', subItem: '(인건비~변동비)', targetRatio: 39.9, actualAmount: currentSummary.labor + currentSummary.rent + currentSummary.fixedCosts + currentSummary.variableCosts, level: 0, isSubtotal: true },
      { item: '4. 마케팅비', subItem: '', targetRatio: 3.1, actualAmount: currentSummary.marketingCosts, level: 0 },
      { item: '5. 세금 예수금', subItem: '', targetRatio: 7.0, actualAmount: currentSummary.taxes, level: 0 },
      { item: '6. 비용합계', subItem: '', targetRatio: 82.0, actualAmount: currentSummary.cogs + currentSummary.labor + currentSummary.rent + currentSummary.fixedCosts + currentSummary.variableCosts + currentSummary.marketingCosts + currentSummary.taxes + currentSummary.cardFees, level: 0, isTotal: true },
      { item: '점포순이익', subItem: '', targetRatio: 18.0, actualAmount: currentSummary.netProfit, level: 0, isTotal: true },
    ];

    const details = detailItems.map(item => {
      const actualRatio = currentSummary.totalSales > 0 ? Number(((item.actualAmount / currentSummary.totalSales) * 100).toFixed(1)) : 0;
      
      // Calculate previous month ratio
      let prevRatio = 0;
      if (archives.length > 0) {
        const lastArchive = archives[archives.length - 1];
        const prevSales = lastArchive.summary.totalSales;
        if (prevSales > 0) {
          if (item.item === '2.매출원가 소계') prevRatio = (lastArchive.summary.cogs / prevSales) * 100;
          else if (item.item === '3.관리비 소계') prevRatio = ((lastArchive.summary.labor + lastArchive.summary.rent + lastArchive.summary.fixedCosts + lastArchive.summary.variableCosts) / prevSales) * 100;
          else if (item.item === '4. 마케팅비') prevRatio = (lastArchive.summary.marketingCosts || 0) / prevSales * 100;
          else if (item.item === '5. 세금 예수금') prevRatio = (lastArchive.summary.taxes || 0) / prevSales * 100;
          else if (item.item === '점포순이익') prevRatio = (lastArchive.summary.netProfit / prevSales) * 100;
        }
      }

      // Calculate annual average ratio
      let annualRatio = 0;
      const allMonths = [...archives, { summary: currentSummary }];
      let totalRatioSum = 0;
      let validMonths = 0;
      
      allMonths.forEach(m => {
        const s = m.summary;
        if (s.totalSales > 0) {
          let r = 0;
          if (item.item === '2.매출원가 소계') r = (s.cogs / s.totalSales) * 100;
          else if (item.item === '3.관리비 소계') r = ((s.labor + s.rent + s.fixedCosts + s.variableCosts) / s.totalSales) * 100;
          else if (item.item === '4. 마케팅비') r = (s.marketingCosts || 0) / s.totalSales * 100;
          else if (item.item === '5. 세금 예수금') r = (s.taxes || 0) / s.totalSales * 100;
          else if (item.item === '점포순이익') r = (s.netProfit / s.totalSales) * 100;
          
          if (r > 0 || item.item === '점포순이익') {
            totalRatioSum += r;
            validMonths++;
          }
        }
      });
      annualRatio = validMonths > 0 ? totalRatioSum / validMonths : 0;

      return {
        ...item,
        actualRatio,
        prevRatio: Number(prevRatio.toFixed(1)),
        annualRatio: Number(annualRatio.toFixed(1)),
        diff: Number((actualRatio - item.targetRatio).toFixed(1))
      };
    });

    return { summary, details };
  }, [currentSummary, currentExpenses, archives]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">핵심 지표관리</h2>
        <div className="text-sm text-gray-500 font-medium">
          ▣ {today} 기준 일일핵심지표 관리 {'<뼈반집>'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* KPI Chart Section */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-pink-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">현재 매출 대비 비율 (%)</h3>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={computedKPIData.details.filter(d => 
                  ['2.매출원가 소계', '3.관리비 소계', '4. 마케팅비', '5. 세금 예수금', '점포순이익'].includes(d.item)
                ).map((d, idx) => ({
                  name: d.item.replace(/^\d+\.\s*/, '').replace(/\s*소계.*$/, ''),
                  '현재': d.actualRatio,
                  '전달': d.prevRatio,
                  '연간': d.annualRatio,
                }))}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip 
                  cursor={{ fill: '#fdf2f8', opacity: 0.4 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 600 }}
                />
                <Bar dataKey="현재" fill="#A7C7E7" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="전달" fill="#FFD1DC" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="연간" fill="#C1E1C1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 핵심 지표관리 */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-indigo-50/20">
            <h3 className="text-lg font-bold text-indigo-900">핵심 지표관리 세부 현황</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-50/40">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest whitespace-nowrap">항목</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest whitespace-nowrap">세부항목</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest text-right whitespace-nowrap">사용누계금액</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest text-right whitespace-nowrap">현재 비율</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest text-right whitespace-nowrap">전달 비율</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest text-right whitespace-nowrap">연간 비율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {computedKPIData.details.map((row, idx) => (
                  <tr 
                    key={`${row.item}-${row.subItem}-${idx}`} 
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      row.isSubtotal && "bg-emerald-50/40",
                      row.isTotal && "bg-amber-50/50"
                    )}
                  >
                    <td className={cn(
                      "px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-gray-900 whitespace-nowrap",
                      row.level > 0 && "pl-6 md:pl-10 font-medium text-gray-600"
                    )}>
                      {row.item}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-medium text-gray-500 whitespace-nowrap">
                      {row.subItem}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                      {formatCurrency(row.actualAmount)}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-right text-emerald-600 whitespace-nowrap">
                      {row.actualRatio}%
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-right text-pink-500 whitespace-nowrap">
                      {row.prevRatio > 0 ? `${row.prevRatio}%` : '-'}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-right text-blue-500 whitespace-nowrap">
                      {row.annualRatio > 0 ? `${row.annualRatio}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}


