import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export function RentInput() {
  const [rentAmount, setRentAmount] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const fetchRent = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRentAmount(data.rentAmount || '');
          setLastSaved(data.lastSaved || '');
          setIsLocked(!!data.rentAmount); // Lock if amount exists
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'settings/global');
      }
    };
    fetchRent();
  }, []);

  const saveRent = async () => {
    try {
      const now = new Date().toLocaleDateString();
      const docRef = doc(db, 'settings', 'global');
      await setDoc(docRef, { rentAmount, lastSaved: now }, { merge: true });
      setLastSaved(now);
      setIsLocked(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  return (
    <div className="bg-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-1.5 md:gap-3 shrink-0">
      <span className="font-bold text-[9px] md:text-sm text-gray-900 whitespace-nowrap">임대료</span>
      <input 
          className={`w-20 md:w-32 px-1 md:px-3 py-0.5 md:py-1 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-sm ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}
          placeholder="금액(KRW)"
          value={rentAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          onChange={e => !isLocked && setRentAmount(e.target.value.replace(/,/g, ''))}
          disabled={isLocked}
      />
      <button 
        onClick={isLocked ? () => setIsLocked(false) : saveRent} 
        className={`px-1.5 md:px-3 py-0.5 md:py-1 text-white rounded-lg text-[9px] md:text-sm font-bold shadow-sm transition ${isLocked ? 'bg-gray-400 hover:bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
          {isLocked ? '수정' : '저장'}
      </button>
      {lastSaved && <span className="text-[8px] md:text-[10px] text-gray-500 whitespace-nowrap">{lastSaved}</span>}
    </div>
  );
}
