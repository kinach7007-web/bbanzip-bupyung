import React, { useState, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface LedgerItem {
  id: string;
  date: string;
  itemName: string;
  amount: number;
  status: '미입금' | '입금완료';
  remarks: string;
}

const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDate().toString().padStart(2, '0');
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${day}(${weekDay})`;
};

export function GenericLedgerDashboard({ 
  title, 
  items, 
  buttonColor = "blue",
  extraContent,
  extraFee,
  onTotalUpdate,
  transactions,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  isReadOnly
}: { 
  title: string; 
  items: string[]; 
  buttonColor?: "blue" | "green" | "red" | "purple";
  extraContent?: React.ReactNode;
  extraFee?: number;
  onTotalUpdate?: (total: number) => void;
  transactions?: LedgerItem[];
  onAddRecord?: (newItem: Omit<LedgerItem, 'id'>) => void;
  onUpdateRecord?: (updatedItem: LedgerItem) => void;
  onDeleteRecord?: (id: string) => void;
  isReadOnly?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [data, setData] = useState<LedgerItem[]>([]); // Keep it as a fallback
  const [filter, setFilter] = useState('전체');
  
  const isControlled = !!transactions;
  const currentData = isControlled ? transactions : data;

  // Modal state
  const [newItem, setNewItem] = useState({
    item: items[0],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: '미입금' as '미입금' | '입금완료',
    remarks: ''
  });

  const filteredData = useMemo(() => {
    if (filter === '전체') return currentData;
    return currentData.filter(d => d.itemName === filter);
  }, [currentData, filter]);

  const absoluteTotalAmount = useMemo(() => {
    return currentData.reduce((sum, item) => sum + item.amount, 0) + (extraFee || 0);
  }, [currentData, extraFee]);

  const filteredTotalAmount = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.amount, 0) + (extraFee || 0);
  }, [filteredData, extraFee]);

  useEffect(() => {
    if (onTotalUpdate) {
      onTotalUpdate(absoluteTotalAmount);
    }
  }, [absoluteTotalAmount, onTotalUpdate]);

  const saveRecord = () => {
    if (isControlled && onUpdateRecord && onAddRecord) {
        if (editingItemId) {
            onUpdateRecord({
                ...newItem,
                id: editingItemId,
                amount: Number(newItem.amount.replace(/,/g, '')),
                itemName: newItem.item
            });
        } else {
            onAddRecord({ 
                ...newItem,
                amount: Number(newItem.amount.replace(/,/g, '')),
                itemName: newItem.item
            });
        }
    } else {
        if (editingItemId) {
          setData(prev => prev.map(item => item.id === editingItemId ? {
            ...item,
            ...newItem,
            amount: Number(newItem.amount.replace(/,/g, '')),
            itemName: newItem.item
          } : item));
        } else {
          setData(prev => [...prev, {
            ...newItem,
            id: Date.now().toString(),
            amount: Number(newItem.amount.replace(/,/g, '')),
            itemName: newItem.item
          }]);
        }
    }
    setShowModal(false);
    setEditingItemId(null);
    setNewItem({ 
        item: items[0], 
        amount: '', 
        date: new Date().toISOString().split('T')[0], 
        status: '미입금', 
        remarks: '' 
    });
  };

  const deleteRecord = () => {
    if (isControlled && onDeleteRecord && editingItemId) {
      onDeleteRecord(editingItemId);
    } else if (editingItemId) {
      setData(prev => prev.filter(item => item.id !== editingItemId));
    }
    setShowModal(false);
    setEditingItemId(null);
    setNewItem({ 
        item: items[0], 
        amount: '', 
        date: new Date().toISOString().split('T')[0], 
        status: '미입금', 
        remarks: '' 
    });
  };

  const openEditModal = (item: LedgerItem) => {
    setEditingItemId(item.id);
    setNewItem({
        item: item.itemName,
        amount: item.amount.toString(),
        date: item.date,
        status: item.status,
        remarks: item.remarks
    });
    setShowModal(true);
  };

  const buttonClasses = {
      blue: "bg-sky-200 hover:bg-sky-300 text-sky-900 border border-sky-300",
      green: "bg-emerald-200 hover:bg-emerald-300 text-emerald-900 border border-emerald-300",
      red: "bg-rose-200 hover:bg-rose-300 text-rose-900 border border-rose-300",
      purple: "bg-violet-200 hover:bg-violet-300 text-violet-900 border border-violet-300",
  };

  return (
    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200 shadow-sm overflow-hidden w-full mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-xs text-sky-900">{title}</h3>
        <div className="flex gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-sky-200 bg-white rounded-lg px-1.5 py-0.5 text-[10px] text-sky-900">
                <option value="전체">전체</option>
                {items.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          {!isReadOnly && (
            <button onClick={() => { setEditingItemId(null); setShowModal(true); }} className={`px-2 py-0.5 ${buttonClasses[buttonColor]} rounded-lg text-[10px] font-bold shadow-sm transition`}>
              지출 입력
            </button>
          )}
        </div>
      </div>
      
      {extraContent && <div className="mb-4">{extraContent}</div>}
      
      <div className="overflow-auto max-h-[40vh] border rounded-lg border-sky-200 shadow-inner bg-sky-100/30">
        <table className="w-full text-[10px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-30">
            <tr className="bg-sky-100 border-b border-sky-200">
              <th className="sticky left-0 bg-sky-100 z-40 border-r border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-center whitespace-nowrap text-[9px]">날짜</th>
              <th className="border-r border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-right whitespace-nowrap text-[9px]">명칭</th>
              <th className="border-r border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-right whitespace-nowrap text-[9px]">금액</th>
              <th className="border-r border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-right whitespace-nowrap text-[9px]">비고</th>
              <th className="border-r border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-right whitespace-nowrap text-[9px]">상태</th>
              <th className="border-b border-sky-200 p-1.5 font-semibold text-sky-800 text-right whitespace-nowrap text-[9px]">수정</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(d => (
              <tr key={d.id} className="bg-white hover:bg-sky-50 border-b border-sky-100 transition-colors">
                <td className="sticky left-0 bg-inherit border-r border-b p-1.5 text-center text-sky-900 text-[9px] border-sky-100 whitespace-nowrap">{formatDate(d.date)}</td>
                <td className="border-r border-b p-1.5 text-sky-900 text-[9px] font-medium border-sky-100 text-right whitespace-nowrap">{d.itemName}</td>
                <td className="border-r border-b p-1.5 text-right text-sky-950 text-[9px] font-semibold border-sky-100 whitespace-nowrap">{d.amount.toLocaleString()}</td>
                <td className="border-r border-b p-1.5 text-sky-700 text-[9px] border-sky-100 text-right whitespace-nowrap">{d.remarks}</td>
                <td className="border-r border-b p-1.5 text-right border-sky-100 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${d.status === '입금완료' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {d.status}
                    </span>
                </td>
                <td className="border-b p-1.5 text-right border-sky-100">
                    {!isReadOnly && <button onClick={() => openEditModal(d)} className="text-[9px] text-sky-600 font-bold hover:underline">수정</button>}
                </td>
              </tr>
            ))}
            <tr className="bg-sky-200 font-bold border-b border-sky-300">
                <td colSpan={2} className="sticky left-0 bg-sky-200 border-r p-1.5 text-center text-sky-900 text-[9px] border-sky-300 whitespace-nowrap">합계</td>
                <td className="border-r p-1.5 text-right text-sky-950 text-[9px] font-semibold border-sky-300 whitespace-nowrap">{filteredTotalAmount.toLocaleString()}</td>
                <td className="border-r p-1.5 text-[9px] border-sky-300"></td>
                <td className="border-r p-1.5 text-[9px] border-sky-300"></td>
                <td className="p-1.5 text-[9px]"></td>
            </tr>
          </tbody>
        </table>
      </div>


      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{title} - 지출 기록</h3>
              <button onClick={() => { setShowModal(false); setEditingItemId(null); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">항목선택</label>
                <select className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 transition outline-none text-xs appearance-none" value={newItem.item} onChange={e => setNewItem({...newItem, item: e.target.value})}>
                    {items.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <input className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none text-xs" 
                     placeholder="금액 (KRW)" 
                     value={newItem.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} 
                     onChange={e => setNewItem({...newItem, amount: e.target.value.replace(/,/g, '')})} />
              <input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none text-xs" 
                     value={newItem.date} 
                     onChange={e => setNewItem({...newItem, date: e.target.value})} />
              <input className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none text-xs" 
                     placeholder="비고" 
                     value={newItem.remarks} 
                     onChange={e => setNewItem({...newItem, remarks: e.target.value})} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">입금상태</label>
                <div className="flex gap-2">
                    <button onClick={() => setNewItem({...newItem, status: '미입금'})} className={`flex-1 p-3 text-xs rounded-xl font-bold ${newItem.status === '미입금' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700'}`}>미입금</button>
                    <button onClick={() => setNewItem({...newItem, status: '입금완료'})} className={`flex-1 p-3 text-xs rounded-xl font-bold ${newItem.status === '입금완료' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700'}`}>입금완료</button>
                </div>
              </div>
              <button onClick={saveRecord} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition text-sm">{editingItemId ? '수정 완료' : '기록 완료'}</button>
              {editingItemId && (
                <button onClick={deleteRecord} className="w-full py-3 mt-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition text-sm">삭제</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
