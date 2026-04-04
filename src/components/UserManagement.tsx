import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, updateDoc, doc, deleteDoc, query, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { User } from './Login';
import { Trash2, Shield, ShieldAlert, CheckCircle2, XCircle, Ban, Unlock, Clock, Users } from 'lucide-react';

export function UserManagement({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isApproved: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, isBlocked: !currentStatus } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`${userName} 사용자의 프로필을 삭제하시겠습니까?`)) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            사용자 관리
          </h2>
          <p className="text-gray-500 text-sm mt-1">시스템 사용자들의 승인 및 차단 상태를 관리합니다.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">사용자</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">이메일</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">직급</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">승인 상태</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">차단 상태</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${user.isBlocked ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          {user.name}
                          {user.id === currentUser.id && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded-md">나</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.role === '운영자' ? 'bg-rose-100 text-rose-700' :
                      user.role === '점장' ? 'bg-blue-100 text-blue-700' :
                      user.role === '부점장' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.isApproved ? (
                      <span className="inline-flex items-center text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> 승인됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-amber-600 text-xs font-bold">
                        <Clock className="w-4 h-4 mr-1" /> 대기 중
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.isBlocked ? (
                      <span className="inline-flex items-center text-red-600 text-xs font-bold">
                        <Ban className="w-4 h-4 mr-1" /> 차단됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-emerald-600 text-xs font-bold">
                        <Unlock className="w-4 h-4 mr-1" /> 정상
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleApproval(user.id, !!user.isApproved)}
                        disabled={user.id === currentUser.id}
                        className={`p-2 rounded-xl transition-all ${
                          user.isApproved 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        } ${user.id === currentUser.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={user.id === currentUser.id ? "본인 계정은 수정할 수 없습니다" : (user.isApproved ? "승인 취소" : "승인하기")}
                      >
                        {user.isApproved ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleToggleBlock(user.id, !!user.isBlocked)}
                        disabled={user.id === currentUser.id}
                        className={`p-2 rounded-xl transition-all ${
                          user.isBlocked 
                            ? 'text-emerald-600 hover:bg-emerald-50' 
                            : 'text-red-600 hover:bg-red-50'
                        } ${user.id === currentUser.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={user.id === currentUser.id ? "본인 계정은 차단할 수 없습니다" : (user.isBlocked ? "차단 해제" : "사용자 차단")}
                      >
                        {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={user.id === currentUser.id}
                        className={`p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ${user.id === currentUser.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={user.id === currentUser.id ? "본인 계정은 삭제할 수 없습니다" : "사용자 삭제"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
