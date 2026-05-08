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
      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-gray-900">일일 매출 입력</h3>
          {!isReadOnly && (
            <button 
              onClick={handleOpenModal}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition"
            >
              매출 입력
            </button>
          )}
        </div>
        
        <div className="overflow-auto max-h-[40vh] border rounded-lg border-gray-100 shadow-inner bg-gray-50/30">
          <table className="w-full text-[8px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="sticky left-0 z-40 bg-gray-50 border-r border-b border-gray-100 p-1 font-semibold text-gray-700 w-12">날짜</th>
                <th className="border-r border-b border-gray-100 p-1 font-semibold text-gray-700 text-right">배달</th>
                <th className="border-r border-b border-gray-100 p-1 font-semibold text-gray-700 text-right">현금</th>
                <th className="border-r border-b border-gray-100 p-1 font-semibold text-gray-700 text-right">카드</th>
                <th className="border-r border-b border-gray-100 p-1 font-semibold text-gray-700 text-right">합계</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className="bg-white border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-inherit border-r p-1 font-semibold text-gray-800 border-gray-50">
                    {day}({getDayOfWeek(day)})
                  </td>
                  {(['delivery', 'cash', 'card'] as const).map(field => (
                    <td 
                      key={field}
                      className="border-r border-b border-gray-50 p-1 text-right text-gray-600 cursor-pointer hover:bg-blue-50/50 transition-colors"
                      onClick={() => {
                        if (isReadOnly) return;
                        setEditingCell({ day, field });
                        setEditValue((sales[day]?.[field] || 0) > 0 ? (sales[day]?.[field] || 0).toString() : '');
                      }}
                    >
                      {(sales[day]?.[field] || 0) > 0 ? (sales[day]?.[field] || 0).toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="p-1 text-right font-bold text-gray-800">
                    {(dailyTotals[day - 1] || 0) > 0 ? (dailyTotals[day - 1] || 0).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t border-gray-100">
              <tr>
                <td className="sticky left-0 z-10 bg-inherit border-r p-1 text-gray-800 border-gray-100">합계</td>
                <td className="p-1 text-right text-gray-800 border-r border-gray-100">{monthlyTotals.delivery.toLocaleString()}</td>
                <td className="p-1 text-right text-gray-800 border-r border-gray-100">{monthlyTotals.cash.toLocaleString()}</td>
                <td className="p-1 text-right text-gray-800 border-r border-gray-100">{monthlyTotals.card.toLocaleString()}</td>
                <td className="p-1 text-right text-gray-900">{monthlyTotals.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* Input Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            {/* Input Modal content remains same as the existing one in the file */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">매출 기록</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">매출 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {['현금', '카드', '배달정산'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setNewSale({...newSale, type, item: type})}
                      className={`px-3 py-2 text-sm font-medium rounded-xl transition-all ${newSale.type === type ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">매출 항목</label>
                <input className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none" value={newSale.item} onChange={e => setNewSale({...newSale, item: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">금액 (KRW)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0"
                  value={newSale.amount ? Number(newSale.amount.replace(/,/g, '')).toLocaleString() : ''} 
                  onChange={e => setNewSale({...newSale, amount: e.target.value.replace(/,/g, '')})} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">날짜</label>
                <input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none" value={newSale.date} onChange={e => setNewSale({...newSale, date: e.target.value})} />
              </div>
              
              <button 
                onClick={addSale}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
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
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">값 수정 ({editingCell.day}일 - {editingCell.field === 'delivery' ? '배달정산' : editingCell.field})</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">기존 값: {(sales[editingCell.day]?.[editingCell.field] || 0).toLocaleString()}</p>
              <input 
                type="number"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
              <div className="flex gap-2 pt-4">
                <button onClick={() => setEditingCell(null)} className="flex-1 py-3 bg-gray-200 rounded-xl text-gray-700 font-bold">취소</button>
                <button 
                  onClick={() => {
                    const val = Number(editValue) || 0;
                    setSales(prev => ({ ...prev, [editingCell.day]: { ...(prev[editingCell.day] || { delivery: 0, cash: 0, card: 0 }), [editingCell.field]: val }}));
                    setEditingCell(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
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
