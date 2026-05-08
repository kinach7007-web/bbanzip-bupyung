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
    <div className={`bg-violet-50/50 p-3 rounded-lg border border-violet-200 shadow-sm flex items-center justify-between gap-4 ${className}`}>
      <h3 className="font-semibold text-xs text-violet-800">{title}</h3>
      
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input 
              type="number"
              className="w-24 px-2 py-1 text-xs bg-violet-100 border border-violet-200 rounded focus:ring-1 focus:ring-violet-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={tempValue || ''}
              onChange={e => setTempValue(Number(e.target.value))}
            />
            <button onClick={handleSave} className="p-1 bg-violet-300 text-violet-900 rounded hover:bg-violet-400 transition">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-violet-950 text-xs font-semibold">{value.toLocaleString()} KRW</span>
            {!isReadOnly && (
              <>
                <button onClick={() => { setIsEditing(true); setTempValue(value); }} className="text-violet-400 hover:text-violet-600 transition-colors">
                  <Edit2 size={12} />
                </button>
                {onDelete && (
                  <button onClick={onDelete} className="text-violet-400 hover:text-rose-400 transition-colors">
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
