import React, { useState } from 'react';
import { LogIn, UserCircle, ChevronRight, Check } from 'lucide-react';
import { loginWithGoogle, db, doc, setDoc, getDoc } from '../firebase';

export type UserRole = '운영자' | '점장' | '부점장' | '매니저';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

const ROLES: UserRole[] = ['운영자', '점장', '부점장', '매니저'];

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [tempUser, setTempUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result && result.user) {
        // Check if user already exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          onLogin({
            id: result.user.uid,
            name: result.user.displayName || '사용자',
            role: userData.role as UserRole,
            email: result.user.email || ''
          });
        } else {
          // New user, show role selection
          setTempUser({
            id: result.user.uid,
            name: result.user.displayName || '사용자',
            email: result.user.email || ''
          });
        }
      }
    } catch (error) {
      console.error("Login error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteLogin = async () => {
    if (!tempUser || !selectedRole) return;
    setIsLoading(true);
    try {
      const userData: User = {
        ...tempUser,
        role: selectedRole
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'users', tempUser.id), {
        name: userData.name,
        email: userData.email,
        role: userData.role
      });

      onLogin(userData);
    } catch (error) {
      console.error("Error saving user role", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (tempUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <UserCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">직급 선택</h2>
            <p className="text-gray-500 text-sm">
              {tempUser.name}님, 환영합니다!<br />
              사용하실 직급을 선택해 주세요.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                  selectedRole === role 
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" 
                    : "border-gray-100 hover:border-indigo-200 text-gray-600"
                }`}
              >
                <span className="font-bold">{role}</span>
                {selectedRole === role ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleCompleteLogin}
            disabled={!selectedRole || isLoading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            {isLoading ? "처리 중..." : "시작하기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-md border border-gray-100 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-indigo-200">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Pyeoban-jib Finance</h2>
        <p className="text-gray-500 mb-10 leading-relaxed">
          실시간 장부 공유를 위해<br />
          구글 계정으로 로그인해 주세요.
        </p>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          {isLoading ? "로그인 중..." : "구글 계정으로 로그인"}
        </button>
        
        <p className="mt-8 text-xs text-gray-400">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
