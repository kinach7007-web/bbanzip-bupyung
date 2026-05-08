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
    <div className={`bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-full flex justify-between items-center ${className}`}>
      <h3 className="font-bold text-xs text-gray-900">{title}</h3>
      <div className="flex items-center gap-2 text-xs font-bold">
        <span>합계</span>
        {isEditing ? (
          <input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(Number(e.target.value))}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
            className="text-gray-900 text-lg w-20 border rounded px-1"
            autoFocus
          />
        ) : (
          <span className={`text-gray-900 text-lg ${!isReadOnly ? 'cursor-pointer' : ''}`} onClick={() => !isReadOnly && setIsEditing(true)}>
            {value.toLocaleString()}
          </span>
        )}
        {!isReadOnly && onDelete && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
