import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function SingleValueDashboard({ title, value, onUpdate, onDelete, isReadOnly, className = '' }: { title: string, value: number, onUpdate?: (newValue: number) => void, onDelete?: () => void, isReadOnly?: boolean, className?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleUpdate = () => {
    onUpdate?.(tempValue);
    setIsEditing(false);
  };

  return (
    <div className={`bg-emerald-50/50 p-2 rounded-xl border border-emerald-200 shadow-sm w-full flex justify-between items-center ${className}`}>
      <h3 className="font-bold text-xs text-emerald-900">{title}</h3>
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
        <span>합계</span>
        {isEditing ? (
          <input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(Number(e.target.value))}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
            className="text-emerald-950 text-lg w-20 border border-emerald-300 rounded px-1 outline-none focus:border-emerald-500"
            autoFocus
          />
        ) : (
          <span className={`text-emerald-950 text-lg ${!isReadOnly ? 'cursor-pointer hover:text-emerald-700' : ''}`} onClick={() => !isReadOnly && setIsEditing(true)}>
            {value.toLocaleString()}
          </span>
        )}
        {!isReadOnly && onDelete && (
          <button onClick={onDelete} className="text-emerald-400 hover:text-rose-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
