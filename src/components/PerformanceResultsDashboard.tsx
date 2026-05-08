import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { MonthlyArchive } from '../types';

interface DashboardProps {
  totalSales: number;
  cogs: number;
  mgmt: number;
  marketing: number;
  taxes: number;
  operatingProfit: number;
  gamjatang?: number;
  supply?: number;
  alcohol?: number;
  labor?: number;
  rent?: number;
  fixedCosts?: number;
  variableCosts?: number;
  currentMonth?: string;
  archives?: MonthlyArchive[];
}

export function PerformanceResultsDashboard({ 
  totalSales, 
  cogs, 
  mgmt, 
  marketing, 
  taxes, 
  operatingProfit,
  gamjatang = 0,
  supply = 0,
  alcohol = 0,
  labor = 0,
  rent = 0,
  fixedCosts = 0,
  variableCosts = 0,
  currentMonth,
  archives
}: DashboardProps) {
  const analytics = useMemo(() => {
    // 1. Calculate previous month figures
    const getPrevMonthStr = (monthStr: string) => {
      if (!monthStr) return "";
      const [y, m] = monthStr.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, 1);
      date.setMonth(date.getMonth() - 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    
    const prevMonthStr = getPrevMonthStr(currentMonth || "");
    const prevArchive = archives?.find(a => a.month === prevMonthStr);
    const prevTotalSales = prevArchive?.summary?.totalSales || 0;
    const prevCogs = prevArchive?.summary?.cogs || 0;
    const prevMgmt = (prevArchive?.summary?.labor || 0) + (prevArchive?.summary?.rent || 0) + (prevArchive?.summary?.fixedCosts || 0) + (prevArchive?.summary?.variableCosts || 0);
    const prevMarketing = prevArchive?.summary?.marketingCosts || 0;
    const prevTaxes = prevArchive?.summary?.taxes || 0;
    const prevOperatingProfit = prevArchive?.summary?.operatingProfit || 0;

    const prevLabor = prevArchive?.summary?.labor || 0;
    const prevRent = prevArchive?.summary?.rent || 0;
    const prevFixedCosts = prevArchive?.summary?.fixedCosts || 0;
    const prevVariableCosts = prevArchive?.summary?.variableCosts || 0;

    // 2. Calculate yearly figures
    const yearPrefix = currentMonth?.split('-')[0] || String(new Date().getFullYear());
    const yearlyArchives = archives?.filter(a => a.month.startsWith(yearPrefix)) || [];

    let yearlyTotalSales = 0, yearlyCogs = 0, yearlyMgmt = 0, yearlyMarketing = 0, yearlyTaxes = 0, yearlyOperatingProfit = 0;
    let yearlyLabor = 0, yearlyRent = 0, yearlyFixedCosts = 0, yearlyVariableCosts = 0;
    
    yearlyArchives.forEach(a => {
      if (a.month !== currentMonth) {
        yearlyTotalSales += a.summary?.totalSales || 0;
        yearlyCogs += a.summary?.cogs || 0;
        yearlyMgmt += (a.summary?.labor || 0) + (a.summary?.rent || 0) + (a.summary?.fixedCosts || 0) + (a.summary?.variableCosts || 0);
        yearlyMarketing += a.summary?.marketingCosts || 0;
        yearlyTaxes += a.summary?.taxes || 0;
        yearlyOperatingProfit += a.summary?.operatingProfit || 0;
        yearlyLabor += a.summary?.labor || 0;
        yearlyRent += a.summary?.rent || 0;
        yearlyFixedCosts += a.summary?.fixedCosts || 0;
        yearlyVariableCosts += a.summary?.variableCosts || 0;
      }
    });

    // Always add the current month's values passed via props
    yearlyTotalSales += totalSales;
    yearlyCogs += cogs;
    yearlyMgmt += mgmt;
    yearlyMarketing += marketing;
    yearlyTaxes += taxes;
    yearlyOperatingProfit += operatingProfit;
    yearlyLabor += labor;
    yearlyRent += rent;
    yearlyFixedCosts += fixedCosts;
    yearlyVariableCosts += variableCosts;

    // 3. Assemble data for chart
    const metrics = [
      { 
        name: '매출원가', 
        '연간': yearlyTotalSales > 0 ? Number(((yearlyCogs / yearlyTotalSales) * 100).toFixed(1)) : 0,
        '전달': prevTotalSales > 0 ? Number(((prevCogs / prevTotalSales) * 100).toFixed(1)) : 0,
        '현재': totalSales > 0 ? Number(((cogs / totalSales) * 100).toFixed(1)) : 0
      },
      { 
        name: '관리비', 
        '연간': yearlyTotalSales > 0 ? Number(((yearlyMgmt / yearlyTotalSales) * 100).toFixed(1)) : 0,
        '전달': prevTotalSales > 0 ? Number(((prevMgmt / prevTotalSales) * 100).toFixed(1)) : 0,
        '현재': totalSales > 0 ? Number(((mgmt / totalSales) * 100).toFixed(1)) : 0
      },
      { 
        name: '마케팅', 
        '연간': yearlyTotalSales > 0 ? Number(((yearlyMarketing / yearlyTotalSales) * 100).toFixed(1)) : 0,
        '전달': prevTotalSales > 0 ? Number(((prevMarketing / prevTotalSales) * 100).toFixed(1)) : 0,
        '현재': totalSales > 0 ? Number(((marketing / totalSales) * 100).toFixed(1)) : 0
      },
      { 
        name: '세금', 
        '연간': yearlyTotalSales > 0 ? Number(((yearlyTaxes / yearlyTotalSales) * 100).toFixed(1)) : 0,
        '전달': prevTotalSales > 0 ? Number(((prevTaxes / prevTotalSales) * 100).toFixed(1)) : 0,
        '현재': totalSales > 0 ? Number(((taxes / totalSales) * 100).toFixed(1)) : 0
      },
      { 
        name: '영업이익', 
        '연간': yearlyTotalSales > 0 ? Number(((yearlyOperatingProfit / yearlyTotalSales) * 100).toFixed(1)) : 0,
        '전달': prevTotalSales > 0 ? Number(((prevOperatingProfit / prevTotalSales) * 100).toFixed(1)) : 0,
        '현재': totalSales > 0 ? Number(((operatingProfit / totalSales) * 100).toFixed(1)) : 0
      }
    ];

    return {
        metrics,
        raw: {
            yearly: { totalSales: yearlyTotalSales, cogs: yearlyCogs, mgmt: yearlyMgmt, marketing: yearlyMarketing, taxes: yearlyTaxes, operatingProfit: yearlyOperatingProfit, labor: yearlyLabor, rent: yearlyRent, fixedCosts: yearlyFixedCosts, variableCosts: yearlyVariableCosts },
            prev: { totalSales: prevTotalSales, cogs: prevCogs, mgmt: prevMgmt, marketing: prevMarketing, taxes: prevTaxes, operatingProfit: prevOperatingProfit, labor: prevLabor, rent: prevRent, fixedCosts: prevFixedCosts, variableCosts: prevVariableCosts }
        }
    }
  }, [totalSales, cogs, mgmt, marketing, taxes, operatingProfit, labor, rent, fixedCosts, variableCosts, currentMonth, archives]);

  const formatRatio = (val: number, total: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '-';
  const formatCurrency = (val: number) => val === 0 ? '-' : `₩${val.toLocaleString()}`;

  const { metrics, raw } = analytics;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 tracking-tight">실적결과 대시보드</h2>
      
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">매출 대비 비중 (%) - 연간/전달/현재 비교</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f3f4f6' }} 
                contentStyle={{ fontSize: '13px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} 
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
              <Bar dataKey="연간" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              <Bar dataKey="전달" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="현재" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <h3 className="text-base font-semibold text-gray-900">지표관리 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap min-w-[800px]">
            <thead className="bg-gray-50 text-gray-500 font-medium tracking-wide">
              <tr>
                <th className="py-3 px-5 font-medium">항목</th>
                <th className="py-3 px-5 font-medium">세부항목</th>
                <th className="py-3 px-5 font-medium text-right">사용누계금액</th>
                <th className="py-3 px-5 font-medium text-right">현재 비율</th>
                <th className="py-3 px-5 font-medium text-right">전달 비율</th>
                <th className="py-3 px-5 font-medium text-right">연간 비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {/* 1.매출액 */}
              <tr className="hover:bg-gray-50 transition-colors bg-blue-50/20">
                 <td className="py-3 px-5 font-semibold text-gray-900">1. 매출액</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(totalSales)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(totalSales, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.totalSales, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.totalSales, raw.yearly.totalSales)}</td>
              </tr>
              {/* 매출원가 세부내역 */}
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-medium text-gray-500 align-top" rowSpan={3}>매출원가</td>
                 <td className="py-3 px-5">감자탕&원재료</td>
                 <td className="py-3 px-5 text-right text-gray-900 font-medium">{formatCurrency(gamjatang)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(gamjatang, totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-400">-</td>
                 <td className="py-3 px-5 text-right text-gray-400">-</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5">식자재&공산품</td>
                 <td className="py-3 px-5 text-right text-gray-900 font-medium">{formatCurrency(supply)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(supply, totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-400">-</td>
                 <td className="py-3 px-5 text-right text-gray-400">-</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 border-b border-gray-100">주류&음료</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-900 font-medium">{formatCurrency(alcohol)}</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 font-medium">{formatRatio(alcohol, totalSales)}</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-400">-</td>
              </tr>
              {/* 2.매출원가 소계 */}
              <tr className="hover:bg-gray-50 transition-colors bg-orange-50/30">
                 <td className="py-3 px-5 font-semibold text-gray-900">2. 매출원가 소계</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(cogs)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(cogs, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.cogs, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.cogs, raw.yearly.totalSales)}</td>
              </tr>
              {/* 관리비 세부내역 */}
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-medium text-gray-500">인건비</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right text-gray-900 font-medium">{formatCurrency(labor)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(labor, totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.prev.labor, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.yearly.labor, raw.yearly.totalSales)}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-medium text-gray-500">임대료</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right text-gray-900 font-medium">{formatCurrency(rent)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(rent, totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.prev.rent, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.yearly.rent, raw.yearly.totalSales)}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-medium text-gray-500">고정비</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right text-gray-900 font-medium">{formatCurrency(fixedCosts)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(fixedCosts, totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.prev.fixedCosts, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right text-gray-900">{formatRatio(raw.yearly.fixedCosts, raw.yearly.totalSales)}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 border-b border-gray-100 font-medium text-gray-500">변동비</td>
                 <td className="py-3 px-5 text-gray-400 border-b border-gray-100">-</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-900 font-medium">{formatCurrency(variableCosts)}</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 font-medium">{formatRatio(variableCosts, totalSales)}</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-900">{formatRatio(raw.prev.variableCosts, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right border-b border-gray-100 text-gray-900">{formatRatio(raw.yearly.variableCosts, raw.yearly.totalSales)}</td>
              </tr>
              {/* 3.관리비 소계 */}
              <tr className="hover:bg-gray-50 transition-colors bg-purple-50/30">
                 <td className="py-3 px-5 font-semibold text-gray-900">3. 관리비 소계</td>
                 <td className="py-3 px-5 text-gray-400 text-[11px] whitespace-nowrap">(인건비~변동비)</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(mgmt)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(mgmt, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.mgmt, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.mgmt, raw.yearly.totalSales)}</td>
              </tr>
              {/* 4. 마케팅 */}
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-semibold text-gray-900">4. 마케팅</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(marketing)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(marketing, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.marketing, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.marketing, raw.yearly.totalSales)}</td>
              </tr>
              {/* 5. 세금 예수금 */}
              <tr className="hover:bg-gray-50 transition-colors">
                 <td className="py-3 px-5 font-semibold text-gray-900">5. 세금 예수금</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(taxes)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(taxes, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.taxes, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.taxes, raw.yearly.totalSales)}</td>
              </tr>
              {/* 6. 비용합계 */}
              <tr className="hover:bg-gray-50 transition-colors bg-gray-50">
                 <td className="py-3 px-5 font-semibold text-gray-900">6. 비용합계</td>
                 <td className="py-3 px-5 text-gray-400">-</td>
                 <td className="py-3 px-5 text-right font-semibold text-gray-900">{formatCurrency(cogs + mgmt + marketing + taxes)}</td>
                 <td className="py-3 px-5 text-right font-medium">{formatRatio(cogs + mgmt + marketing + taxes, totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.prev.cogs + raw.prev.mgmt + raw.prev.marketing + raw.prev.taxes, raw.prev.totalSales)}</td>
                 <td className="py-3 px-5 text-right">{formatRatio(raw.yearly.cogs + raw.yearly.mgmt + raw.yearly.marketing + raw.yearly.taxes, raw.yearly.totalSales)}</td>
              </tr>
              {/* 영업이익 */}
              <tr className="bg-emerald-50 hover:bg-emerald-100/60 transition-colors">
                 <td className="py-4 px-5 font-bold text-emerald-800 text-sm">영업이익</td>
                 <td className="py-4 px-5 text-emerald-600/50">-</td>
                 <td className="py-4 px-5 text-right font-bold text-emerald-700 text-sm">{formatCurrency(operatingProfit)}</td>
                 <td className="py-4 px-5 text-right font-bold text-emerald-700 text-sm">{formatRatio(operatingProfit, totalSales)}</td>
                 <td className="py-4 px-5 text-right font-semibold text-emerald-700">{formatRatio(raw.prev.operatingProfit, raw.prev.totalSales)}</td>
                 <td className="py-4 px-5 text-right font-semibold text-emerald-700">{formatRatio(raw.yearly.operatingProfit, raw.yearly.totalSales)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
