import React, { useState } from 'react';
import { Lock, Check, ShieldAlert, ArrowLeft } from 'lucide-react';
import { auth, confirmPasswordReset, verifyPasswordResetCode } from '../firebase';

interface PasswordResetProps {
  oobCode: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function PasswordReset({ oobCode, onComplete, onCancel }: PasswordResetProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // Verify the code and get the email
  React.useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => setEmail(email))
      .catch((err) => {
        console.error("Invalid or expired reset code", err);
        setError("만료되었거나 유효하지 않은 비밀번호 재설정 링크입니다. 다시 시도해 주세요.");
      });
  }, [oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err: any) {
      console.error("Password reset error", err);
      setError(err.message || "비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-md border border-gray-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-8 mx-auto">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">재설정 완료</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            비밀번호가 성공적으로 변경되었습니다. 잠시 후 로그인 화면으로 이동합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-md border border-gray-100 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-indigo-200">
          <Lock className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">새 비밀번호 설정</h2>
        {email && (
          <p className="text-indigo-600 font-medium mb-2">{email}</p>
        )}
        <p className="text-gray-500 mb-8 leading-relaxed">
          새로운 비밀번호를 입력해 주세요.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !!error && !email}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 mt-4"
          >
            {isLoading ? "처리 중..." : "비밀번호 변경"}
          </button>
        </form>

        <button
          onClick={onCancel}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인으로 돌아가기
        </button>
      </div>
    </div>
  );
}
