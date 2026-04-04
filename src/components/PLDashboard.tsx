import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Receipt,
  Plus,
  X,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  Edit2,
  Lock,
  Info
} from 'lucide-react';
import { PL_DATA, DAILY_LEDGER_DATA, type LedgerRow } from '../data';
import { formatCurrency } from '../App';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TransactionCategory = '매출' | '매출원가' | '인건비' | '변동비' | '고정비' | '마케팅' | '세금' | '카드수수료(1.9%)';

import { type User } from './Login';

interface PLDashboardProps {
  user?: User | null;
  currentMonth: string;
  currentSummary: any;
  currentExpenses: any[];
  salaryBreakdown: {
      employeesTotal: number;
      partTimeTotal: number;
      dispatchTotal: number;
      insuranceTotal: number;
      total: number;
  };
  transactions: any[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: any) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  newExpense: any;
  setNewExpense: (expense: any) => void;
  handleAddExpense: (e: React.FormEvent) => void;
  vendorList: Record<string, string[]>;
  isReadOnly?: boolean;
  getBusinessDate?: () => string;
  handleDailyClose?: () => void;
  canDailyClose?: boolean;
}

export function PLDashboard({ 
  user,
  currentMonth,
  currentSummary, 
  currentExpenses, 
  salaryBreakdown,
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  isModalOpen,
  setIsModalOpen,
  newExpense,
  setNewExpense,
  handleAddExpense,
  vendorList,
  isReadOnly = false,
  getBusinessDate,
  handleDailyClose,
  canDailyClose = true
}: PLDashboardProps) {
  const [selectedCell, setSelectedCell] = React.useState<{ row: LedgerRow, day: number } | null>(null);

  // Generate days for the month (assuming May 2025 based on data)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const computedLedgerData = React.useMemo(() => {
    // Deep clone the base data
    const data = JSON.parse(JSON.stringify(DAILY_LEDGER_DATA)) as LedgerRow[];
    
    // Apply salary data
    const salaryRows = [
        { id: '4-1', amount: salaryBreakdown.employeesTotal },
        { id: '4-2', amount: salaryBreakdown.partTimeTotal },
        { id: '4-3', amount: salaryBreakdown.dispatchTotal },
        { id: '4-4', amount: salaryBreakdown.insuranceTotal },
    ];
    
    salaryRows.forEach(s => {
        const row = data.find(r => r.id === s.id);
        if (row) {
            row.total = s.amount;
            // Distribute salary across days (simplified: just put it in the last day or first day)
            // For now, let's put it in the last day of the month as a placeholder
            row.daily[30] = s.amount;
        }
    });

    // 1. Apply transactions to leaf nodes
    transactions.forEach(t => {
      const date = new Date(t.date);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const [targetYearStr, targetMonthStr] = currentMonth.split('-');
      const targetYear = parseInt(targetYearStr);
      const targetMonth = parseInt(targetMonthStr);

      // Only process for the current period context
      if (year !== targetYear || month !== targetMonth) return;
      if (day < 1 || day > 31) return;

      const cleanTName = t.name.trim();
      
      // Find matching leaf row or subtotal row
      let matchingRow = data.find(row => {
        if (row.isHeader) return false;
        const cleanRowName = row.category.replace(/^[0-9.-]+\s*/, '').trim();
        const cleanTNameNoPrefix = cleanTName.replace(/^[0-9.-]+\s*/, '').trim();
        return cleanRowName === cleanTNameNoPrefix || row.category === cleanTName;
      });

      // Special case for Sales mapping
      if (t.category === '매출') {
        if (cleanTName === '계좌이체' || cleanTName === '현금') {
          matchingRow = data.find(r => r.id === '1-1');
        } else if (cleanTName === '카드') {
          matchingRow = data.find(r => r.id === '1-2');
        } else if (cleanTName === '배달 정산 금액') {
          matchingRow = data.find(r => r.id === '1-sub-1');
        } else if (!matchingRow) {
          matchingRow = data.find(r => r.id === '1-2'); // Default fallback
        }
      }

      if (matchingRow) {
        matchingRow.daily[day - 1] = (matchingRow.daily[day - 1] || 0) + t.amount;
      } else {
        // Find a generic/other row for the category
        let parentId = '';
        if (t.category === '매출원가') parentId = '2-2';
        else if (t.category === '인건비') parentId = '4';
        else if (t.category === '임대료') parentId = '5';
        else if (t.category === '변동비') parentId = '6';
        else if (t.category === '고정비') parentId = '5';
        else if (t.category === '마케팅') {
          // For Marketing, since it's a single row now, map everything to it
          const mRow = data.find(r => r.id === '7');
          if (mRow) {
            mRow.daily[day - 1] = (mRow.daily[day - 1] || 0) + t.amount;
            return;
          }
        }
        else if (t.category === '세금') parentId = '9';
        
        const otherRow = data.find(r => 
          r.id.startsWith(parentId) && 
          (r.category.includes('기타') || r.category.includes('공산품')) &&
          !r.isHeader && !r.isSubtotal
        );
        
        if (otherRow) {
          otherRow.daily[day - 1] = (otherRow.daily[day - 1] || 0) + t.amount;
        }
      }
    });

    // 2. Recalculate totals for all rows
    data.forEach(row => {
      row.total = row.daily.reduce((sum, val) => sum + (val || 0), 0);
    });

    // 3. Recalculate subtotals and headers (bottom-up)
    [2, 1, 0].forEach(level => {
      data.filter(row => row.level === level && (row.isHeader || row.isSubtotal)).forEach(parent => {
        const children = data.filter(child => 
          child.level === level + 1 && 
          child.id.startsWith(parent.id + '-')
        );

        if (children.length > 0) {
          parent.daily = Array(31).fill(0);
          children.forEach(child => {
            child.daily.forEach((val, idx) => {
              parent.daily[idx] += (val || 0);
            });
          });
          parent.total = parent.daily.reduce((sum, val) => sum + (val || 0), 0);
        }
      });
    });

    // 4. Calculate Gross Profit (매출이익 = 매출액 - 매출원가)
    const salesRow = data.find(r => r.id === '1');
    const cogsRow = data.find(r => r.id === '2');
    const grossProfitRow = data.find(r => r.id === '3');
    if (salesRow && cogsRow && grossProfitRow) {
      grossProfitRow.daily = salesRow.daily.map((s, i) => (s || 0) - (cogsRow.daily[i] || 0));
      grossProfitRow.total = grossProfitRow.daily.reduce((sum, val) => sum + (val || 0), 0);
    }

    // 5. Calculate Operating Profit (영업이익 = 매출이익 - 인건비 - 고정비 - 변동비 - 마케팅)
    const laborRow = data.find(r => r.id === '4');
    const fixedCostRow = data.find(r => r.id === '5');
    const variableCostRow = data.find(r => r.id === '6');
    const marketingRow = data.find(r => r.id === '7');
    const opProfitRow = data.find(r => r.id === '8');
    if (grossProfitRow && laborRow && fixedCostRow && variableCostRow && marketingRow && opProfitRow) {
      opProfitRow.daily = grossProfitRow.daily.map((gp, i) => 
        (gp || 0) - (laborRow.daily[i] || 0) - (fixedCostRow.daily[i] || 0) - (variableCostRow.daily[i] || 0) - (marketingRow.daily[i] || 0)
      );
      opProfitRow.total = opProfitRow.daily.reduce((sum, val) => sum + (val || 0), 0);
    }

    // 6. Calculate Card Fees (카드수수료 = 1-2. 카드 * 1.9%)
    const cardSalesRow = data.find(r => r.id === '1-2');
    const cardFeeRow = data.find(r => r.id === '9');
    if (cardSalesRow && cardFeeRow) {
      cardFeeRow.daily = cardSalesRow.daily.map(s => (s || 0) * 0.019);
      cardFeeRow.total = cardFeeRow.daily.reduce((sum, val) => sum + (val || 0), 0);
    }

    // 7. Calculate Tax Withholding (세금 예수금 = 매출액 * 7%)
    const taxRow = data.find(r => r.id === '10');
    const vatRow = data.find(r => r.id === '10-1');
    const incomeTaxRow = data.find(r => r.id === '10-2');
    if (salesRow && taxRow && vatRow && incomeTaxRow) {
      vatRow.daily = salesRow.daily.map(s => (s || 0) * 0.05);
      vatRow.total = vatRow.daily.reduce((sum, val) => sum + (val || 0), 0);
      
      incomeTaxRow.daily = salesRow.daily.map(s => (s || 0) * 0.02);
      incomeTaxRow.total = incomeTaxRow.daily.reduce((sum, val) => sum + (val || 0), 0);
      
      taxRow.daily = salesRow.daily.map(s => (s || 0) * 0.07);
      taxRow.total = taxRow.daily.reduce((sum, val) => sum + (val || 0), 0);
    }

    // 8. Calculate Net Profit (점포 순이익 = 영업이익 - 카드수수료 - 세금 예수금)
    const netProfitRow = data.find(r => r.id === '11');
    if (opProfitRow && cardFeeRow && taxRow && netProfitRow) {
      netProfitRow.daily = opProfitRow.daily.map((op, i) => (op || 0) - (cardFeeRow.daily[i] || 0) - (taxRow.daily[i] || 0));
      netProfitRow.total = netProfitRow.daily.reduce((sum, val) => sum + (val || 0), 0);
    }

    // 8. Update ratios based on total sales
    const totalSales = data.find(r => r.id === '1')?.total || 1;
    data.forEach(row => {
      row.ratio = Number(((row.total / totalSales) * 100).toFixed(1));
    });

    return data;
  }, [transactions]);

  const getCellTransactions = (row: LedgerRow, day: number) => {
    const [year, month] = currentMonth.split('-');
    const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    const cleanRowName = row.category.replace(/^[0-9.-]+\s*/, '').trim();
    
    return transactions.filter(t => {
      const isSameDate = t.date === dateStr;
      
      // Special case for Marketing row (id: '7')
      if (row.id === '7') {
        return isSameDate && t.category === '마케팅';
      }

      const isSameName = t.name.trim() === cleanRowName;
      return isSameDate && isSameName;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header with Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">손익계산서 상세</h2>
          <p className="text-xs md:text-sm text-gray-500">Monthly Profit & Loss Details</p>
        </div>
      </div>

      {/* Mobile Summary Cards */}
      <div className="grid grid-cols-2 md:hidden gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">총 매출</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(currentSummary.totalSales)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">매출원가</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(currentSummary.cogs)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">영업이익</p>
          <p className="text-sm font-bold text-emerald-600">{formatCurrency(currentSummary.operatingProfit)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">당기순이익</p>
          <p className="text-sm font-bold text-indigo-600">{formatCurrency(currentSummary.netProfit)}</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">일별 세부 현황</h3>
            <p className="text-xs md:text-sm text-gray-500">Monthly Daily Ledger Spreadsheet</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <CalendarIcon className="w-3 h-3" />
              {currentMonth.split('-')[0]}년 {currentMonth.split('-')[1]}월
            </div>
            {!isReadOnly && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    const dateStr = getBusinessDate ? getBusinessDate() : new Date().toISOString().split('T')[0];
                    setNewExpense({ ...newExpense, category: '매출', name: '', status: 'paid', date: dateStr });
                    setIsModalOpen(true);
                  }}
                  className="px-3 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3 md:w-4 h-4" />
                  매출 입력
                </button>
                <button 
                  onClick={() => {
                    const dateStr = getBusinessDate ? getBusinessDate() : new Date().toISOString().split('T')[0];
                    setNewExpense({ ...newExpense, category: '매출원가', name: '', status: 'unpaid', date: dateStr });
                    setIsModalOpen(true);
                  }}
                  className="px-3 md:px-6 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3 md:w-4 h-4" />
                  지출 입력
                </button>
                <button 
                  onClick={() => {
                    if (handleDailyClose) {
                      handleDailyClose();
                    }
                  }}
                  disabled={!canDailyClose}
                  className={cn(
                    "px-3 md:px-6 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                    canDailyClose 
                      ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  )}
                >
                  <Lock className="w-3 h-3 md:w-4 h-4" />
                  일일마감
                </button>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-[10px] md:text-xs text-gray-500">
              <Info className="w-3 h-3 md:w-4 h-4 text-indigo-500" />
              <span>
                현재 입력 기준일: <strong className="text-indigo-600">{getBusinessDate ? getBusinessDate() : '설정 전'}</strong>
                {!canDailyClose && " (매출이나 지출을 1건 이상 입력해야 마감할 수 있습니다)"}
              </span>
            </div>
          )}
        </div>
        <div className="overflow-auto custom-scrollbar rounded-b-2xl md:rounded-b-3xl max-h-[calc(100vh-280px)]">
          <table className="w-full text-left border-collapse min-w-max relative">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="sticky top-0 left-0 z-30 bg-gray-100 px-1.5 md:px-4 py-2 md:py-3 text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-200 min-w-[90px] md:min-w-[200px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">계정</th>
                <th className="sticky top-0 left-[90px] md:left-[200px] z-30 bg-gray-100 px-1.5 md:px-4 py-2 md:py-3 text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right border-r border-gray-200 min-w-[70px] md:min-w-[120px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">금액</th>
                <th className="hidden md:table-cell sticky top-0 left-[320px] z-30 bg-gray-100 px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right border-r border-gray-200 min-w-[80px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">비율</th>
                {days.map(day => {
                  const [yearStr, monthStr] = currentMonth.split('-');
                  const year = parseInt(yearStr);
                  const month = parseInt(monthStr);
                  const date = new Date(year, month - 1, day);
                  const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                  return (
                    <th key={day} className="sticky top-0 z-20 bg-gray-50 px-1 md:px-3 py-2 md:py-3 text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center border-r border-gray-100 min-w-[45px] md:min-w-[100px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                      {day}일<span className="hidden md:inline">({dayName})</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {computedLedgerData.map((row) => (
                <tr 
                  key={row.id} 
                  className={cn(
                    "hover:bg-gray-50/50 transition-colors group",
                    row.isHeader && "bg-gray-50/30 font-bold",
                    row.isSubtotal && "bg-emerald-50/10"
                  )}
                >
                  <td className={cn(
                    "sticky left-0 z-10 px-1.5 md:px-4 py-2 md:py-3 text-[9px] md:text-xs border-r border-gray-200",
                    row.isHeader ? "bg-gray-100 text-gray-900" : "bg-white group-hover:bg-gray-50 text-gray-600",
                    row.id === '7' && "bg-gray-100 text-gray-900 font-bold",
                    (row.category.includes('[육류 및 육수 재료]') || row.category.includes('[식자재&공산품 소계]')) && "bg-amber-100/80",
                    row.level === 1 && "pl-3 md:pl-8",
                    row.level === 2 && "pl-5 md:pl-12"
                  )}>
                    {row.category}
                  </td>
                  <td className={cn(
                    "sticky left-[90px] md:left-[200px] z-10 px-1.5 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-mono text-right border-r border-gray-200 whitespace-nowrap",
                    row.isHeader ? "bg-gray-100 text-gray-900" : "bg-white group-hover:bg-gray-50 text-gray-700",
                    row.id === '7' && "bg-gray-100 text-gray-900 font-bold",
                    (row.category.includes('[육류 및 육수 재료]') || row.category.includes('[식자재&공산품 소계]')) && "bg-amber-100/80"
                  )}>
                    {formatCurrency(row.total)}
                  </td>
                  <td className={cn(
                    "hidden md:table-cell sticky left-[320px] z-10 px-4 py-3 text-xs font-mono text-right border-r border-gray-200",
                    row.isHeader ? "bg-gray-100 text-gray-900" : "bg-white group-hover:bg-gray-50 text-gray-500",
                    row.id === '7' && "bg-gray-100 text-gray-900 font-bold",
                    (row.category.includes('[육류 및 육수 재료]') || row.category.includes('[식자재&공산품 소계]')) && "bg-amber-100/80"
                  )}>
                    {row.ratio}%
                  </td>
                  {row.daily.map((val, idx) => {
                    // 인건비 항목(4-1, 4-2, 4-3)은 일별 입력란을 숨김
                    if (['4-1', '4-2', '4-3'].includes(row.id)) {
                      return <td key={idx} className="px-1 md:px-3 py-2 md:py-3 border-r border-gray-50 bg-gray-50/50"></td>;
                    }
                    return (
                      <td 
                        key={idx} 
                        onClick={() => {
                          if (row.isHeader || row.isSubtotal) return;
                          const day = idx + 1;
                          setSelectedCell({ row, day });
                        }}
                        className={cn(
                          "px-1 md:px-3 py-2 md:py-3 text-[9px] md:text-xs font-mono text-right border-r border-gray-50 text-gray-600 transition-colors",
                          !row.isHeader && !row.isSubtotal && "cursor-pointer hover:bg-emerald-50/50",
                          (() => {
                            const cellTransactions = getCellTransactions(row, idx + 1);
                            const hasUnpaid = cellTransactions.some(t => t.status === 'unpaid');
                            const hasPaid = cellTransactions.some(t => t.status === 'paid');
                            if (hasUnpaid) return ""; // 미입금 항목이 있으면 색상을 채우지 않음
                            if (hasPaid) return "bg-emerald-200/40";
                            return "";
                          })()
                        )}
                      >
                        {val && val > 0 ? formatCurrency(val) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {selectedCell && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCell(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCell.row.category.replace(/^[0-9.-]+\s*/, '')}</h2>
                    <p className="text-sm text-gray-500">{selectedCell.day}일 세부 내역</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCell(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">일일 합계</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedCell.row.daily[selectedCell.day - 1] || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">입력된 내역</h3>
                    <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {getCellTransactions(selectedCell.row, selectedCell.day).length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-4 text-center">추가 입력된 내역이 없습니다.</p>
                      ) : (
                        getCellTransactions(selectedCell.row, selectedCell.day).map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                t.status === 'unpaid' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                              )}>
                                {t.status === 'unpaid' ? '미' : '완'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">
                                  {t.name}
                                  {t.author && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{t.author}</span>}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  t.status === 'unpaid' ? "text-rose-500" : "text-emerald-500"
                                )}>
                                  {t.status === 'unpaid' ? '미입금' : '입금완료'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-red-600">-{formatCurrency(t.amount)}</span>
                              {!isReadOnly && (
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      setSelectedCell(null);
                                      onEditTransaction(t);
                                    }}
                                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-300 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTransaction(t.id);
                                    }}
                                    className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors relative z-[100] pointer-events-auto min-w-[32px] min-h-[32px] flex items-center justify-center"
                                    title="삭제"
                                  >
                                    <X className="w-4 h-4 pointer-events-none" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <button 
                    onClick={() => {
                      const [year, month] = currentMonth.split('-');
                      const dateStr = `${year}-${month}-${selectedCell.day.toString().padStart(2, '0')}`;
                      let category: TransactionCategory = '매출원가';
                      if (selectedCell.row.id.startsWith('4')) category = '인건비';
                      else if (selectedCell.row.id.startsWith('5')) category = '고정비';
                      else if (selectedCell.row.id.startsWith('6')) category = '변동비';
                      else if (selectedCell.row.id.startsWith('7')) category = '마케팅';
                      else if (selectedCell.row.id.startsWith('9')) category = '카드수수료(1.9%)';
                      else if (selectedCell.row.id.startsWith('10')) category = '세금';
                      else if (selectedCell.row.id.startsWith('1')) category = '매출';

                      setNewExpense({ 
                        ...newExpense, 
                        date: dateStr, 
                        category, 
                        name: selectedCell.row.category.replace(/^[0-9.-]+\s*/, ''),
                        amount: '',
                        status: category === '매출' ? 'paid' : 'unpaid'
                      });
                      setSelectedCell(null);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95"
                  >
                    내역 추가하기
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{newExpense.category === '매출' ? '매출 기록' : '지출 기록'}</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleAddExpense} className="space-y-6">
                  {newExpense.category !== '매출' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">카테고리</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['매출원가', '변동비', '고정비', '마케팅'] as TransactionCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewExpense({ ...newExpense, category: cat, name: '' })}
                            className={cn(
                              "px-2 py-2 text-[10px] font-bold rounded-xl border transition-all",
                              newExpense.category === cat 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100" 
                                : "bg-white border-gray-100 text-gray-500 hover:border-emerald-200"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {newExpense.category === '매출' ? '매출 유형' : '거래처 선택'}
                    </label>
                    <div className={cn(
                      "flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar",
                      newExpense.category === '매출' && "grid grid-cols-3 w-full gap-2 overflow-visible max-h-none"
                    )}>
                      {vendorList[newExpense.category]?.map((vendor) => (
                        <button
                          key={vendor}
                          type="button"
                          onClick={() => setNewExpense({ ...newExpense, name: vendor })}
                          className={cn(
                            "px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all",
                            newExpense.category === '매출' && "py-3 text-sm font-bold rounded-xl",
                            newExpense.name === vendor
                              ? (newExpense.category === '매출' 
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100" 
                                  : "bg-emerald-50 border-emerald-500 text-emerald-700")
                              : "bg-gray-50 border-gray-100 text-gray-600 hover:border-emerald-200"
                          )}
                        >
                          {vendor}
                        </button>
                      ))}
                      {(!vendorList[newExpense.category] || vendorList[newExpense.category].length === 0) && (
                        <p className="text-[10px] text-gray-400 italic py-2">등록된 거래처가 없습니다. 직접 입력하세요.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{newExpense.category === '매출' ? '매출 항목' : '지출 명칭'}</label>
                    {newExpense.name ? (
                      <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <span className="text-sm font-bold text-emerald-700">{newExpense.name}</span>
                        <button 
                          type="button"
                          onClick={() => setNewExpense({ ...newExpense, name: '' })}
                          className="text-[10px] font-bold text-emerald-600 hover:underline"
                        >
                          변경
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text"
                        placeholder={newExpense.category === '매출' ? "직접 입력 가능" : "거래처를 선택하거나 입력하세요"}
                        value={newExpense.name}
                        onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 font-medium text-sm"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">금액 (KRW)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="0"
                        value={newExpense.amount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setNewExpense({ ...newExpense, amount: val ? parseInt(val).toLocaleString() : '' });
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 font-bold text-lg"
                      />
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">날짜</label>
                    <input 
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 font-medium"
                    />
                  </div>

                  {newExpense.category !== '매출' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">입금 상태</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewExpense({ ...newExpense, status: 'unpaid' })}
                          className={cn(
                            "py-3 rounded-2xl font-bold text-sm border transition-all",
                            newExpense.status === 'unpaid'
                              ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100"
                              : "bg-gray-50 border-gray-100 text-gray-500 hover:border-rose-200"
                          )}
                        >
                          미입금
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewExpense({ ...newExpense, status: 'paid' })}
                          className={cn(
                            "py-3 rounded-2xl font-bold text-sm border transition-all",
                            newExpense.status === 'paid'
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100"
                              : "bg-gray-50 border-gray-100 text-gray-500 hover:border-emerald-200"
                          )}
                        >
                          입금완료
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95 mt-4"
                  >
                    기록 완료
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

