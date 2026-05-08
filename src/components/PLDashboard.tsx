import React, { useState, useMemo } from 'react';
import { type DailySales } from '../types';

export function PLDashboard({ 
  sales = {}, 
  setSales = () => {},
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
  getBusinessDate,
  handleDailyClose,
  canDailyClose,
  onVariableCostCalculated,
  isReadOnly
}: { 
  sales?: DailySales,
  setSales?: React.Dispatch<React.SetStateAction<DailySales>>,
  user?: any,
  currentMonth?: string,
  currentSummary?: any,
  currentExpenses?: any,
  salaryBreakdown?: any,
  transactions?: any[],
  onDeleteTransaction?: (id: string) => void,
  onEditTransaction?: (transaction: any) => void,
  isModalOpen?: boolean,
  setIsModalOpen?: (open: boolean) => void,
  newExpense?: any,
  setNewExpense?: (expense: any) => void,
  handleAddExpense?: (e: React.FormEvent) => void,
  vendorList?: any,
  getBusinessDate?: () => string,
  handleDailyClose?: () => void,
  canDailyClose?: boolean,
  onVariableCostCalculated?: (cost: number) => void,
  isReadOnly?: boolean
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: number, field: 'delivery' | 'cash' | 'card' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newSale, setNewSale] = useState({ type: '현금', item: '현금', amount: '', date: '' });
  
  const daysInMonth = React.useMemo(() => {
    if (!currentMonth) return 31;
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [currentMonth]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayOfWeek = (day: number) => {
    if (!currentMonth) return '';
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return dayNames[date.getDay()];
  };

  const handleOpenModal = () => {
    const defaultDate = getBusinessDate ? getBusinessDate() : new Date().toISOString().split('T')[0];
    setNewSale({ type: '현금', item: '현금', amount: '', date: defaultDate });
    setShowModal(true);
  };

  const addSale = () => {
    const parts = newSale.date.split('-');
    const day = parts.length === 3 ? parseInt(parts[2], 10) : new Date(newSale.date).getDate();
    
    setSales(prev => {
      const current = prev[day] || { delivery: 0, cash: 0, card: 0 };
      const field = newSale.type === '현금' ? 'cash' : newSale.type === '카드' ? 'card' : 'delivery';
      return {
        ...prev,
        [day]: { ...current, [field]: current[field] + (Number(newSale.amount.replace(/,/g, '')) || 0) }
      };
    });
    const defaultDate = getBusinessDate ? getBusinessDate() : new Date().toISOString().split('T')[0];
    setNewSale({ type: '현금', item: '현금', amount: '', date: defaultDate });
    setShowModal(false);
  };

  const dailyTotals = useMemo(() => {
    return days.map(day => {
      const s = sales[day] || { delivery: 0, cash: 0, card: 0 };
      return s.delivery + s.cash + s.card;
    });
  }, [sales]);

  const monthlyTotals = useMemo(() => {
    return days.reduce((acc, day) => {
      const s = sales[day] || { delivery: 0, cash: 0, card: 0 };
      acc.delivery += s.delivery;
      acc.cash += s.cash;
      acc.card += s.card;
      acc.total += (s.delivery + s.cash + s.card);
      return acc;
    }, { delivery: 0, cash: 0, card: 0, total: 0 });
  }, [sales, days]);

  return (
    <div className="h-full animate-in fade-in duration-500">
      <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200 shadow-sm overflow-hidden w-full h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-rose-900">일일 매출 입력</h3>
          {!isReadOnly && (
            <button 
              onClick={handleOpenModal}
              className="px-3 py-1 bg-rose-300 text-rose-900 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-400 transition"
            >
              매출 입력
            </button>
          )}
        </div>
        
        <div className="overflow-auto max-h-[40vh] border rounded-lg border-rose-200 shadow-inner bg-rose-100/30">
          <table className="w-full text-[8px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="bg-rose-100 border-b border-rose-200">
                <th className="sticky left-0 z-40 bg-rose-100 border-r border-b border-rose-200 p-1 font-semibold text-rose-800 w-12">날짜</th>
                <th className="border-r border-b border-rose-200 p-1 font-semibold text-rose-800 text-right">배달</th>
                <th className="border-r border-b border-rose-200 p-1 font-semibold text-rose-800 text-right">현금</th>
                <th className="border-r border-b border-rose-200 p-1 font-semibold text-rose-800 text-right">카드</th>
                <th className="border-r border-b border-rose-200 p-1 font-semibold text-rose-800 text-right">합계</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className="bg-white border-b border-rose-100 transition-colors hover:bg-rose-50">
                  <td className="sticky left-0 z-10 bg-inherit border-r p-1 font-semibold text-rose-900 border-rose-100">
                    {day}({getDayOfWeek(day)})
                  </td>
                  {(['delivery', 'cash', 'card'] as const).map(field => (
                    <td 
                      key={field}
                      className="border-r border-b border-rose-100 p-1 text-right text-rose-700 cursor-pointer hover:bg-rose-100/50 transition-colors"
                      onClick={() => {
                        if (isReadOnly) return;
                        setEditingCell({ day, field });
                        setEditValue((sales[day]?.[field] || 0) > 0 ? (sales[day]?.[field] || 0).toString() : '');
                      }}
                    >
                      {(sales[day]?.[field] || 0) > 0 ? (sales[day]?.[field] || 0).toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="p-1 text-right font-bold text-rose-900">
                    {(dailyTotals[day - 1] || 0) > 0 ? (dailyTotals[day - 1] || 0).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-rose-200 font-bold border-t border-rose-200">
              <tr>
                <td className="sticky left-0 z-10 bg-inherit border-r p-1 text-rose-900 border-rose-200">합계</td>
                <td className="p-1 text-right text-rose-900 border-r border-rose-200">{monthlyTotals.delivery.toLocaleString()}</td>
                <td className="p-1 text-right text-rose-900 border-r border-rose-200">{monthlyTotals.cash.toLocaleString()}</td>
                <td className="p-1 text-right text-rose-900 border-r border-rose-200">{monthlyTotals.card.toLocaleString()}</td>
                <td className="p-1 text-right text-rose-950">{monthlyTotals.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* Input Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-rose-50 p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-rose-200">
            {/* Input Modal content remains same as the existing one in the file */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-rose-950">매출 기록</h3>
              <button onClick={() => setShowModal(false)} className="text-rose-400 hover:text-rose-600 text-lg">✕</button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">매출 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {['현금', '카드', '배달정산'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setNewSale({...newSale, type, item: type})}
                      className={`px-3 py-2 text-sm font-medium rounded-xl transition-all ${newSale.type === type ? 'bg-rose-300 text-rose-950 shadow-md' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">매출 항목</label>
                <input className="w-full px-4 py-2 bg-rose-100/50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 transition outline-none text-rose-950" value={newSale.item} onChange={e => setNewSale({...newSale, item: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">금액 (KRW)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-rose-100/50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 transition outline-none text-rose-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0"
                  value={newSale.amount ? Number(newSale.amount.replace(/,/g, '')).toLocaleString() : ''} 
                  onChange={e => setNewSale({...newSale, amount: e.target.value.replace(/,/g, '')})} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">날짜</label>
                <input type="date" className="w-full px-4 py-2 bg-rose-100/50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 transition outline-none text-rose-950" value={newSale.date} onChange={e => setNewSale({...newSale, date: e.target.value})} />
              </div>
              
              <button 
                onClick={addSale}
                className="w-full py-3 bg-rose-300 text-rose-950 rounded-xl font-bold hover:bg-rose-400 transition shadow-sm"
              >
                기록 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-rose-50 p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-rose-200">
            <h3 className="text-xl font-bold text-rose-950 mb-6">값 수정 ({editingCell.day}일 - {editingCell.field === 'delivery' ? '배달정산' : editingCell.field})</h3>
            <div className="space-y-4">
              <p className="text-sm text-rose-700">기존 값: {(sales[editingCell.day]?.[editingCell.field] || 0).toLocaleString()}</p>
              <input 
                type="number"
                className="w-full px-4 py-2 bg-rose-100/50 border border-rose-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-400 text-rose-950"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
              <div className="flex gap-2 pt-4">
                <button onClick={() => setEditingCell(null)} className="flex-1 py-3 bg-rose-100 rounded-xl text-rose-800 font-bold hover:bg-rose-200">취소</button>
                <button 
                  onClick={() => {
                    const val = Number(editValue) || 0;
                    setSales(prev => ({ ...prev, [editingCell.day]: { ...(prev[editingCell.day] || { delivery: 0, cash: 0, card: 0 }), [editingCell.field]: val }}));
                    setEditingCell(null);
                  }}
                  className="flex-1 py-3 bg-rose-300 text-rose-950 rounded-xl font-bold hover:bg-rose-400 shadow-sm"
                >
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
