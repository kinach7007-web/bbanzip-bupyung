import React from 'react';
import { LogIn } from 'lucide-react';
import { loginWithGoogle } from '../firebase';

export type UserRole = '운영자' | '점장' | '매니저';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const handleGoogleLogin = async () => {
    try {
      const result = await loginWithGoogle();
      if (result && result.user) {
        onLogin({
          id: result.user.uid,
          name: result.user.displayName || '사용자',
          role: '운영자', // Default role for now
          email: result.user.email || ''
        });
      }
    } catch (error) {
      console.error("Login error", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
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
          className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          구글 계정으로 로그인
        </button>
        
        <p className="mt-8 text-xs text-gray-400">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
