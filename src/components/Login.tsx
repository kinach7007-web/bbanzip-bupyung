import React, { useState } from 'react';
import { LogIn, UserCircle, ChevronRight, Check, ShieldAlert, Clock } from 'lucide-react';
import { loginWithEmail, registerWithEmail, logout, db, doc, setDoc, getDoc, getDocFromServer, auth, onAuthStateChanged, sendPasswordResetEmail } from '../firebase';
import { setPersistence, inMemoryPersistence } from 'firebase/auth';

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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEnteringManualCode, setIsEnteringManualCode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMessage("로그인 시도 중...");
    setError(null);
    setSuccessMessage(null);
    try {
      const trimmedEmail = email.trim();
      if (isResettingPassword) {
        if (!trimmedEmail) {
          setError("이메일을 입력해 주세요.");
          setIsLoading(false);
          return;
        }
        
        const actionCodeSettings = {
          url: window.location.origin,
          handleCodeInApp: true,
        };
        
        await sendPasswordResetEmail(auth, trimmedEmail, actionCodeSettings);
        setSuccessMessage("비밀번호 재설정 이메일이 발송되었습니다. 스팸함이나 정크 메일함을 포함하여 이메일을 확인해 주세요.");
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
        setLoadingMessage("계정 생성 중...");
        result = await registerWithEmail(trimmedEmail, password);
        
        if (result && result.user) {
          const isMasterAdmin = trimmedEmail.toLowerCase() === 'kinach7007@gmail.com';
          const userData: User = {
            id: result.user.uid,
            name: name,
            email: result.user.email || trimmedEmail,
            role: isMasterAdmin ? '운영자' : selectedRole,
            isApproved: isMasterAdmin,
            isBlocked: false
          };
          
          setLoadingMessage("사용자 정보 저장 중...");
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
        // Retry logic for login to handle transient network issues
        let retryCount = 0;
        const maxRetries = 4;
        
        const attemptLogin = async (): Promise<any> => {
          console.log(`Login attempt ${retryCount + 1}...`);
          // Add a timeout to the login attempt
          const loginPromise = loginWithEmail(trimmedEmail, password);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 30000)
          );

          try {
            return await Promise.race([loginPromise, timeoutPromise]);
          } catch (err: any) {
            console.warn(`Login attempt ${retryCount + 1} failed:`, err.message || err.code);
            
            // If it's a network error, it might be due to third-party cookie blocking preventing IndexedDB access.
            // Try falling back to in-memory persistence.
            if (err.code === 'auth/network-request-failed' && retryCount === 1) {
              try {
                console.log("Attempting to fallback to inMemoryPersistence...");
                await setPersistence(auth, inMemoryPersistence);
              } catch (persistenceErr) {
                console.warn("Failed to set inMemoryPersistence:", persistenceErr);
              }
            }

            if ((err.code === 'auth/network-request-failed' || err.message === 'timeout') && retryCount < maxRetries) {
              retryCount++;
              setLoadingMessage(`연결 재시도 중... (${retryCount}/${maxRetries})`);
              // Exponential backoff for retries
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount + 1000));
              return await attemptLogin();
            }
            throw err;
          }
        };

        result = await attemptLogin();
        console.log("Login successful, fetching profile...");
        if (result && result.user) {
          setLoadingMessage("사용자 프로필 불러오는 중...");
          // Add a timeout to the user doc fetch as well
          const fetchPromise = getDoc(doc(db, 'users', result.user.uid));
          const fetchTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('fetch-timeout')), 20000)
          );

          const userDoc = await Promise.race([fetchPromise, fetchTimeoutPromise]) as any;
          console.log("Profile fetch result exists:", userDoc.exists());
          
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
      
      let errorMsg = "";
      if (err.message === 'timeout' || err.message === 'fetch-timeout') {
        errorMsg = "서버 응답이 지연되고 있습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해 주세요.";
      } else if (err.message?.includes('Quota exceeded')) {
        errorMsg = "Firestore 할당량이 초과되었습니다. 내일 다시 시도해 주세요.";
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = "가입되지 않은 이메일입니다.";
      } else if (err.code === 'auth/wrong-password') {
        errorMsg = "비밀번호가 틀렸습니다.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = "이미 사용 중인 이메일입니다. 비밀번호가 기억나지 않으시면 '비밀번호 찾기'를 이용해 주세요.";
      } else if (err.code === 'auth/weak-password') {
        errorMsg = "비밀번호는 6자 이상이어야 합니다.";
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = "유효하지 않은 이메일 형식입니다.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = "너무 많은 요청이 발생했습니다. 보안을 위해 잠시 후(약 15분 뒤) 다시 시도해 주세요.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = "이메일/비밀번호 가입 기능이 비활성화되어 있습니다. Firebase 콘솔의 Authentication 메뉴에서 '이메일/비밀번호'를 활성화해 주세요.";
      } else if (err.code === 'auth/unauthorized-continue-uri') {
        errorMsg = "현재 도메인이 Firebase의 승인된 도메인 목록에 없습니다.";
      } else if (err.code === 'auth/network-request-failed') {
        errorMsg = "네트워크 연결 오류가 발생했습니다. 브라우저의 광고 차단 기능(AdBlock, Brave 쉴드 등)을 끄거나, 타사 쿠키 차단을 해제한 후 다시 시도해 주세요. (또는 Firebase API 키의 도메인 제한 설정 문제일 수 있습니다.)";
      } else {
        errorMsg = `로그인 중 오류가 발생했습니다: ${err.code || err.message}`;
      }
        
      setError(
        <div className="flex flex-col gap-4">
          <span className="text-sm">{errorMsg}</span>
          <div className="flex flex-col gap-2">
            {(err.message === 'timeout' || err.message === 'fetch-timeout' || err.code === 'auth/network-request-failed') && (
              <button 
                onClick={() => handleAuth(new Event('submit') as any)}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm"
              >
                다시 시도하기
              </button>
            )}
            <button 
              onClick={async () => {
                // Clear app specific localStorage
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('pyeobanjib-')) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Safely logout without reloading immediately
                try {
                  await logout();
                  // Wait a moment for IndexedDB to settle
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                  console.warn("Logout failed during force refresh:", e);
                }
                
                try {
                  window.location.reload();
                } catch (e) {
                  window.location.href = window.location.origin;
                }
              }}
              className="w-full py-2.5 px-4 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              캐시 삭제 후 새로고침
            </button>
          </div>
        </div> as any
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
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
            {isLoading ? (loadingMessage || "처리 중...") : (isResettingPassword ? "이메일 발송" : isRegistering ? "가입하기" : "로그인")}
          </button>
        </form>

        {isLoading && (
          <button
            onClick={() => {
              setIsLoading(false);
              setLoadingMessage(null);
              setError("작업이 취소되었습니다.");
            }}
            className="mt-4 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            응답이 너무 느린가요? 취소하고 다시 시도하기
          </button>
        )}

        {isResettingPassword && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {!isEnteringManualCode ? (
              <button
                onClick={() => setIsEnteringManualCode(true)}
                className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                링크가 작동하지 않나요? 직접 코드 입력하기
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 text-left ml-1">이메일 링크의 oobCode 값을 입력해 주세요.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="코드 입력"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (manualCode.trim()) {
                        window.location.href = `${window.location.origin}${window.location.pathname}?mode=resetPassword&oobCode=${manualCode.trim()}`;
                      }
                    }}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-100"
                  >
                    확인
                  </button>
                </div>
                <button
                  onClick={() => setIsEnteringManualCode(false)}
                  className="text-[10px] text-gray-400 hover:underline"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )}

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

          <button
            onClick={() => onLogin({
              id: 'preview-admin',
              name: '관리자(미리보기)',
              role: '운영자',
              email: 'admin@preview.com',
              isApproved: true,
              isBlocked: false
            })}
            className="mt-8 py-3 px-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-medium hover:bg-gray-100 hover:text-indigo-600 transition-all border border-gray-100"
          >
            로그인 없이 시스템 둘러보기 (미리보기 모드)
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
