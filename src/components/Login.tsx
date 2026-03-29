import React, { useState } from 'react';
import { LogIn, UserCircle, ChevronRight, Check, ShieldAlert, Clock } from 'lucide-react';
import { loginWithEmail, registerWithEmail, db, doc, setDoc, getDoc, auth, onAuthStateChanged, sendPasswordResetEmail } from '../firebase';

export type UserRole = '운영자' | '점장' | '부점장' | '매니저';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  isApproved: boolean;
  isBlocked: boolean;
}

const ROLES: UserRole[] = ['운영자', '점장', '부점장', '매니저'];

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('매니저');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isResettingPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage("비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해 주세요.");
        setIsResettingPassword(false);
        setIsLoading(false);
        return;
      }

      let result;
      if (isRegistering) {
        if (!name) {
          setError("이름을 입력해 주세요.");
          setIsLoading(false);
          return;
        }
        result = await registerWithEmail(email, password);
        
        if (result && result.user) {
          const userData: User = {
            id: result.user.uid,
            name: name,
            email: result.user.email || email,
            role: selectedRole,
            isApproved: email === 'kinach7007@gmail.com', // Auto-approve the master admin
            isBlocked: false
          };
          
          await setDoc(doc(db, 'users', result.user.uid), {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            isApproved: userData.isApproved,
            isBlocked: userData.isBlocked
          });
          
          onLogin(userData);
        }
      } else {
        result = await loginWithEmail(email, password);
        if (result && result.user) {
          const userDoc = await getDoc(doc(db, 'users', result.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            onLogin({
              id: result.user.uid,
              name: userData.name || '사용자',
              role: userData.role as UserRole,
              email: result.user.email || '',
              isApproved: userData.isApproved,
              isBlocked: userData.isBlocked
            });
          } else {
            setError("사용자 정보를 찾을 수 없습니다. 다시 가입해 주세요.");
          }
        }
      }
    } catch (err: any) {
      console.error("Auth error", err);
      if (err.code === 'auth/user-not-found') {
        setError("가입되지 않은 이메일입니다.");
      } else if (err.code === 'auth/wrong-password') {
        setError("비밀번호가 틀렸습니다.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("이미 사용 중인 이메일입니다. 비밀번호가 기억나지 않으시면 '비밀번호 찾기'를 이용해 주세요.");
      } else if (err.code === 'auth/weak-password') {
        setError("비밀번호는 6자 이상이어야 합니다.");
      } else if (err.code === 'auth/invalid-email') {
        setError("유효하지 않은 이메일 형식입니다.");
      } else {
        setError(err.message || "인증 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-md border border-gray-100 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-indigo-200">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Pyeoban-jib Finance</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          {isResettingPassword ? "비밀번호 재설정" : isRegistering ? "새로운 계정을 만들어 보세요." : "이메일로 로그인해 주세요."}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 text-sm rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 text-left">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required
            />
          </div>
          {!isResettingPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                required
              />
            </div>
          )}

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">직급</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none bg-white"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 mt-4"
          >
            {isLoading ? "처리 중..." : (isResettingPassword ? "이메일 발송" : isRegistering ? "가입하기" : "로그인")}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setIsResettingPassword(false);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            {isRegistering ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
          </button>
          
          {!isRegistering && (
            <button
              onClick={() => {
                setIsResettingPassword(!isResettingPassword);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {isResettingPassword ? "로그인으로 돌아가기" : "비밀번호를 잊으셨나요?"}
            </button>
          )}
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
