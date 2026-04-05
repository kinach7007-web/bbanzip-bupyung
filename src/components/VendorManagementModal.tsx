import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Trash2, Plus, Check, X as CancelIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VendorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorList: Record<string, string[]>;
  onUpdateVendor: (category: string, oldName: string, newName: string) => Promise<void>;
  onDeleteVendor: (category: string, vendorName: string) => Promise<void>;
  onAddVendor: (category: string, vendorName: string) => Promise<void>;
  onReorderVendor: (category: string, startIndex: number, endIndex: number) => Promise<void>;
}

export function VendorManagementModal({
  isOpen,
  onClose,
  vendorList,
  onUpdateVendor,
  onDeleteVendor,
  onAddVendor,
  onReorderVendor
}: VendorManagementModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('매출원가');
  const [editingVendor, setEditingVendor] = useState<{ category: string, oldName: string, newName: string } | null>(null);
  const [confirmingEdit, setConfirmingEdit] = useState<{ category: string, oldName: string, newName: string } | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<{ category: string, name: string } | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categories = Object.keys(vendorList).filter(c => vendorList[c]?.length > 0 || c === '매출원가');
  if (!categories.includes('매출원가')) categories.push('매출원가');

  const handleSaveEdit = () => {
    if (!editingVendor || !editingVendor.newName.trim()) return;
    if (editingVendor.oldName === editingVendor.newName.trim()) {
      setEditingVendor(null);
      return;
    }
    setConfirmingEdit(editingVendor);
    setEditingVendor(null);
  };

  const executeEdit = async () => {
    if (!confirmingEdit) return;
    await onUpdateVendor(confirmingEdit.category, confirmingEdit.oldName, confirmingEdit.newName.trim());
    setConfirmingEdit(null);
  };

  const handleSaveNew = async () => {
    if (!newVendorName.trim()) {
      setIsAdding(false);
      return;
    }
    await onAddVendor(selectedCategory, newVendorName.trim());
    setNewVendorName('');
    setIsAdding(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-xl font-bold text-gray-900">거래처 관리</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Categories Sidebar */}
              <div className="w-full md:w-48 bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0 flex md:flex-col p-2 gap-1 hide-scrollbar">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-4 py-3 text-sm font-bold rounded-xl text-left transition-colors whitespace-nowrap md:whitespace-normal",
                      selectedCategory === category
                        ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Vendors List */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">{selectedCategory} 거래처</h3>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>

                <div className="space-y-2">
                  {isAdding && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <input
                        type="text"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        placeholder="새 거래처 이름"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                      />
                      <button onClick={handleSaveNew} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setIsAdding(false); setNewVendorName(''); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                        <CancelIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(vendorList[selectedCategory] || []).map((vendor, idx) => {
                    const isEditing = editingVendor?.category === selectedCategory && editingVendor?.oldName === vendor;
                    const isConfirmingEdit = confirmingEdit?.category === selectedCategory && confirmingEdit?.oldName === vendor;
                    const isDeleting = deletingVendor?.category === selectedCategory && deletingVendor?.name === vendor;

                    return (
                      <div key={`${vendor}-${idx}`} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors group">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingVendor.newName}
                              onChange={(e) => setEditingVendor({ ...editingVendor, newName: e.target.value })}
                              className="flex-1 px-3 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                            />
                            <button onClick={handleSaveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingVendor(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                              <CancelIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : isConfirmingEdit ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-indigo-600 truncate mr-2">
                              '{confirmingEdit.newName}'(으)로 수정하시겠습니까?
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={executeEdit}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                              >
                                수정확인
                              </button>
                              <button
                                onClick={() => {
                                  setEditingVendor(confirmingEdit);
                                  setConfirmingEdit(null);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-rose-600">정말 삭제하시겠습니까?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onDeleteVendor(selectedCategory, vendor);
                                  setDeletingVendor(null);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => setDeletingVendor(null)}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-700">{vendor}</span>
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => idx > 0 && onReorderVendor(selectedCategory, idx, idx - 1)}
                                disabled={idx === 0}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="위로 이동"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => idx < (vendorList[selectedCategory]?.length || 0) - 1 && onReorderVendor(selectedCategory, idx, idx + 1)}
                                disabled={idx === (vendorList[selectedCategory]?.length || 0) - 1}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="아래로 이동"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-1" />
                              <button
                                onClick={() => setEditingVendor({ category: selectedCategory, oldName: vendor, newName: vendor })}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="수정"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingVendor({ category: selectedCategory, name: vendor })}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  
                  {(!vendorList[selectedCategory] || vendorList[selectedCategory].length === 0) && !isAdding && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      등록된 거래처가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
