import React, { useState } from 'react';
import { Edit2, Check, Trash2 } from 'lucide-react';

export function FixedValueDashboard({ title, value, onUpdate, onDelete, isReadOnly, className = '' }: { title: string, value: number, onUpdate?: (newValue: number) => void, onDelete?: () => void, isReadOnly?: boolean, className?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onUpdate?.(tempValue);
    setIsEditing(false);
  };

  return (
    <div className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between gap-4 ${className}`}>
      <h3 className="font-semibold text-xs text-gray-700">{title}</h3>
      
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input 
              type="number"
              className="w-24 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={tempValue || ''}
              onChange={e => setTempValue(Number(e.target.value))}
            />
            <button onClick={handleSave} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-gray-900 text-xs font-semibold">{value.toLocaleString()} KRW</span>
            {!isReadOnly && (
              <>
                <button onClick={() => { setIsEditing(true); setTempValue(value); }} className="text-gray-400 hover:text-indigo-600 transition-colors">
                  <Edit2 size={12} />
                </button>
                {onDelete && (
                  <button onClick={onDelete} className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
