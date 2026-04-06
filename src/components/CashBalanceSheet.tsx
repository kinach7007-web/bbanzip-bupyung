import React, { useState, useEffect } from 'react';
import { CASH_BALANCE_DATA, CashBalanceRow } from '../data';
import { formatCurrency } from '../App';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, History, Check, Edit2, X, Save, Lock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { type User } from './Login';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CashBalanceSheetProps {
  user?: User | null;
  data: typeof CASH_BALANCE_DATA;
  setData: React.Dispatch<React.SetStateAction<typeof CASH_BALANCE_DATA>>;
  isReadOnly?: boolean;
  businessDateStr?: string;
}

export const CashBalanceSheet: React.FC<CashBalanceSheetProps> = ({ user, data, setData, isReadOnly, businessDateStr }) => {
  const [tempBalanceInput, setTempBalanceInput] = useState(data.carryover.toString());
  const [isInputVisible, setIsInputVisible] = useState(data.carryover === 0);

  // Sync temp input when data.carryover changes from outside
  useEffect(() => {
    setTempBalanceInput(data.carryover.toString());
    if (data.carryover !== 0) {
      setIsInputVisible(false);
    }
  }, [data.carryover]);

  // Inline Edit State
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'transferOut' | 'otherExpense' | null>(null);
  const [editOtherExpense, setEditOtherExpense] = useState<string>('');
  const [editExpenseType, setEditExpenseType] = useState<'plus' | 'minus'>('minus');
  const [editTransferOut, setEditTransferOut] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');

  const handleSetBalance = () => {
    const val = parseInt(tempBalanceInput.replace(/,/g, ''), 10);
    if (!isNaN(val)) {
      setIsInputVisible(false);
      
      let currentBalance = val;
      const newRows = data.rows.map(row => {
        const prev = currentBalance;
        const balance = prev + row.income - row.transferOut - row.otherExpense;
        currentBalance = balance;
        return { ...row, prevBalance: prev, balance: balance };
      });

      const totalIncome = newRows.reduce((acc, row) => acc + row.income, 0);
      const totalExpense = newRows.reduce((acc, row) => acc + row.transferOut + row.otherExpense, 0);
      const finalBalance = newRows[newRows.length - 1].balance;
      const netChange = finalBalance - val;

      setData(prev => ({
        ...prev,
        carryover: val,
        isCarryoverFixed: true, // Lock it
        rows: newRows,
        totalIncome,
        totalExpense,
        netChange,
        finalBalance
      }));
    }
  };

  const recalculateData = (rowsToCalc: CashBalanceRow[], carryoverVal: number) => {
    let currentBalance = carryoverVal;
    const newRows = rowsToCalc.map(row => {
      const prev = currentBalance;
      const balance = prev + row.income - row.transferOut - row.otherExpense;
      currentBalance = balance;
      return { ...row, prevBalance: prev, balance: balance };
    });

    const totalIncome = newRows.reduce((acc, row) => acc + row.income, 0);
    const totalExpense = newRows.reduce((acc, row) => acc + row.transferOut + row.otherExpense, 0);
    const finalBalance = newRows[newRows.length - 1].balance;
    const netChange = finalBalance - carryoverVal;

    setData(prev => ({
      ...prev,
      carryover: carryoverVal,
      rows: newRows,
      totalIncome,
      totalExpense,
      netChange,
      finalBalance
    }));
  };

  const handleEditClick = (idx: number, field: 'transferOut' | 'otherExpense') => {
    setEditingRowIdx(idx);
    setEditingField(field);
    const row = data.rows[idx];
    
    setEditTransferOut(row.transferOut > 0 ? row.transferOut.toString() : '');
    
    if (row.otherExpense < 0) {
      setEditExpenseType('plus');
      setEditOtherExpense(Math.abs(row.otherExpense).toString());
    } else {
      setEditExpenseType('minus');
      setEditOtherExpense(row.otherExpense.toString());
    }
    setEditRemarks(row.remarks || '');
  };

  const handleSaveRow = () => {
    if (editingRowIdx === null) return;
    const val = parseInt(editOtherExpense.replace(/,/g, ''), 10) || 0;
    const finalOtherExpense = editExpenseType === 'minus' ? val : -val;
    const transferOutVal = parseInt(editTransferOut.replace(/,/g, ''), 10) || 0;

    const newRows = [...data.rows];
    newRows[editingRowIdx] = {
      ...newRows[editingRowIdx],
      transferOut: transferOutVal,
      otherExpense: finalOtherExpense,
      remarks: editRemarks,
      isVerified: false,
      author: user?.name
    };

    recalculateData(newRows, data.carryover);
    setEditingRowIdx(null);
    setEditingField(null);
  };
  
  const handleVerify = (idx: number) => {
    const newRows = [...data.rows];
    newRows[idx] = { ...newRows[idx], isVerified: true };
    setData(prev => ({ ...prev, rows: newRows }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetBalance();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">최초시재</p>
            {data.isCarryoverFixed && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> 고정됨
              </div>
            )}
          </div>
          
          {isInputVisible && !isReadOnly && !data.isCarryoverFixed ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={tempBalanceInput}
                onChange={(e) => setTempBalanceInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-lg font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all tabular-nums"
                placeholder="금액 입력"
                autoFocus
              />
              <button 
                onClick={handleSetBalance}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <h3 
              className={cn(
                "text-2xl font-bold text-gray-900 mt-1",
                !isReadOnly && !data.isCarryoverFixed && "cursor-pointer hover:text-blue-600 transition-colors"
              )}
              onClick={() => {
                if (isReadOnly || data.isCarryoverFixed) return;
                setTempBalanceInput(data.carryover.toString());
                setIsInputVisible(true);
              }}
              title={isReadOnly || data.isCarryoverFixed ? "" : "클릭하여 수정"}
            >
              {formatCurrency(data.carryover)}
            </h3>
          )}
        </div>

        <div className="bg-white px-6 py-4 rounded-2xl border border-emerald-100 shadow-sm bg-emerald-50/30 flex flex-col justify-center">
          <p className="text-sm font-medium text-emerald-800 mb-1">현재 현금시재</p>
          <h3 className="text-2xl font-bold text-emerald-900 mt-1">{formatCurrency(data.finalBalance)}</h3>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
          <h2 className="font-bold text-gray-900">{data.title.replace(/시제/g, '시재')}</h2>
          <div className="text-xs text-gray-500 font-medium">단위: 원 (KRW)</div>
        </div>
        <div className="overflow-auto rounded-b-2xl max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm text-left border-collapse table-fixed min-w-[1000px] relative">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky top-0 z-20 bg-gray-50 px-3 py-4 font-bold text-gray-700 border-r border-gray-100 w-[60px] text-center uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">일자</th>
                <th className="sticky top-0 z-20 bg-gray-50 px-3 py-4 font-bold text-gray-700 border-r border-gray-100 w-[50px] text-center uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">요일</th>
                <th className="sticky top-0 z-20 bg-gray-50 px-4 py-4 font-bold text-gray-700 border-r border-gray-100 w-[120px] text-right uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">전일 시재</th>
                <th className="sticky top-0 z-20 bg-emerald-50 px-4 py-4 font-bold text-emerald-700 border-r border-gray-100 w-[120px] text-right uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">현금 입금</th>
                <th className="sticky top-0 z-20 bg-rose-50 px-4 py-4 font-bold text-rose-700 border-r border-gray-100 w-[120px] text-right uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">계좌 이체</th>
                <th className="sticky top-0 z-20 bg-rose-50 px-4 py-4 font-bold text-rose-700 border-r border-gray-100 w-[120px] text-right uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">기타 지출</th>
                <th className="sticky top-0 z-20 bg-gray-50 px-4 py-4 font-bold text-gray-700 border-r border-gray-100 min-w-[150px] uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">비고 & 시재맞음</th>
                <th className="sticky top-0 z-20 bg-blue-50 px-4 py-4 font-bold text-blue-700 w-[130px] text-right uppercase tracking-tighter text-[11px] border-b shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">현금시재 잔액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-3 py-3 text-center border-r border-gray-50 font-mono text-gray-500 text-xs">{row.day}</td>
                  <td className={cn(
                    "px-3 py-3 text-center border-r border-gray-50 font-bold text-xs",
                    row.weekday === '일' ? "text-rose-500" : row.weekday === '토' ? "text-blue-500" : "text-gray-400"
                  )}>{row.weekday}</td>
                  <td className="px-4 py-3 text-right border-r border-gray-50 font-mono text-gray-400 text-xs tabular-nums">
                    {formatCurrency(row.prevBalance).replace('₩', '')}
                  </td>
                  <td className="px-4 py-3 text-right border-r border-gray-50 font-mono font-bold text-emerald-600 bg-emerald-50/5 tabular-nums">
                    {row.income > 0 ? formatCurrency(row.income).replace('₩', '') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right border-r border-gray-50 font-mono text-rose-600 bg-rose-50/5 tabular-nums group-hover:bg-white transition-colors relative group">
                    {editingRowIdx === idx && editingField === 'transferOut' ? (
                      <input 
                        type="text" 
                        value={editTransferOut} 
                        onChange={e => setEditTransferOut(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-2 py-1 text-right text-xs border border-gray-300 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        placeholder="금액"
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {row.transferOut > 0 ? formatCurrency(row.transferOut).replace('₩', '') : '-'}
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleEditClick(idx, 'transferOut')} 
                            className="p-1 text-rose-400 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right border-r border-gray-50 font-mono bg-gray-50/30 tabular-nums group-hover:bg-white transition-colors relative">
                    {editingRowIdx === idx && editingField === 'otherExpense' ? (
                      <div className="flex flex-col gap-1.5 min-w-[100px]">
                        <div className="flex items-center justify-end gap-1 bg-gray-100 p-0.5 rounded">
                          <button 
                            onClick={() => setEditExpenseType('plus')}
                            className={cn("flex-1 py-1 text-[10px] font-bold rounded transition-colors", editExpenseType === 'plus' ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200")}
                          >+ (남음)</button>
                          <button 
                            onClick={() => setEditExpenseType('minus')}
                            className={cn("flex-1 py-1 text-[10px] font-bold rounded transition-colors", editExpenseType === 'minus' ? "bg-rose-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200")}
                          >- (모자람)</button>
                        </div>
                        <input 
                          type="text" 
                          value={editOtherExpense} 
                          onChange={e => setEditOtherExpense(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-2 py-1 text-right text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="금액"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn(
                          "font-bold",
                          row.otherExpense > 0 ? "text-rose-600" : row.otherExpense < 0 ? "text-emerald-600" : "text-gray-400"
                        )}>
                          {row.otherExpense !== 0 ? (row.otherExpense < 0 ? '+' : '-') + formatCurrency(Math.abs(row.otherExpense)).replace('₩', '') : '-'}
                        </span>
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleEditClick(idx, 'otherExpense')} 
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-50 text-gray-600 text-[11px] leading-tight group-hover:bg-white transition-colors relative">
                    {editingRowIdx === idx ? (
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          value={editRemarks} 
                          onChange={e => setEditRemarks(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="비고 (사유)"
                        />
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button onClick={() => setEditingRowIdx(null)} className="px-2 py-1 text-[10px] font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1">
                            <X className="w-3 h-3" /> 취소
                          </button>
                          <button onClick={handleSaveRow} className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-1 shadow-sm">
                            <Save className="w-3 h-3" /> 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center min-h-[32px] relative group">
                        {row.isVerified ? (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex-1 truncate group-hover:whitespace-normal group-hover:overflow-visible text-gray-700 font-medium flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100 shrink-0">
                                <Check className="w-3.5 h-3.5" /> 시재확인
                              </div>
                              <span className="truncate">{row.remarks}</span>
                              {row.author && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md shrink-0">{row.author}</span>}
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => handleEditClick(idx, 'otherExpense')} 
                                className="p-1 text-amber-500 hover:bg-amber-50 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex-1 truncate group-hover:whitespace-normal group-hover:overflow-visible text-gray-700 font-medium">
                              {row.remarks || '-'}
                              {row.author && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{row.author}</span>}
                            </div>
                            {!isReadOnly && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button 
                                  onClick={() => handleEditClick(idx, 'otherExpense')} 
                                  className="p-1 text-amber-500 hover:bg-amber-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleVerify(idx)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                  시재맞음
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 bg-blue-50/5 tabular-nums">
                    {formatCurrency(row.balance).replace('₩', '')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100/80 font-bold border-t-2 border-gray-200">
                <td colSpan={3} className="px-4 py-4 text-right border-r border-gray-200 text-gray-600 uppercase text-[11px]">합계 / 잔액</td>
                <td className="px-4 py-4 text-right border-r border-gray-200 text-emerald-700 bg-emerald-100/30 font-mono tabular-nums">{formatCurrency(data.totalIncome).replace('₩', '')}</td>
                <td colSpan={2} className="px-4 py-4 text-right border-r border-gray-200 text-rose-700 bg-rose-100/30 font-mono tabular-nums">{formatCurrency(data.totalExpense).replace('₩', '')}</td>
                <td className="px-4 py-4 border-r border-gray-200 text-gray-500 text-[10px] font-medium">
                  순증감: <span className={cn(data.netChange >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(data.netChange).replace('₩', '')}</span>
                </td>
                <td className="px-4 py-4 text-right text-blue-700 bg-blue-100/30 font-mono tabular-nums">{formatCurrency(data.finalBalance).replace('₩', '')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
