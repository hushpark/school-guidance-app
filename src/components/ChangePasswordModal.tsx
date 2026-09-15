import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TeacherAccount } from './AuthModal';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeacherAccount | null;
  onPasswordChanged?: (updatedUser: TeacherAccount) => void;
}

const LOCAL_STORAGE_KEY = 'SCHOOL_GUIDANCE_TEACHERS_DATA_V1';

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPasswordChanged,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. 현재 비밀번호 검증
    const realCurrentPassword = currentUser.password || '1234';
    if (currentPassword !== realCurrentPassword) {
      setErrorMessage('현재 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 2. 새 비밀번호 유효성 검사
    if (!newPassword.trim()) {
      setErrorMessage('새 비밀번호를 입력해 주세요.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('현재 사용 중인 비밀번호와 동일한 비밀번호입니다.');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser: TeacherAccount = {
        ...currentUser,
        password: newPassword.trim(),
      };

      // 3-1. Supabase DB 업데이트
      const { error } = await supabase
        .from('teachers')
        .update({ password: newPassword.trim() })
        .eq('id', currentUser.id);

      if (error) {
        console.warn('Supabase DB 비밀번호 변경 중 경고:', error.message);
      }

      // 3-2. 로컬 스토리지 교사 전체 데이터 동기화
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const teachers: TeacherAccount[] = JSON.parse(saved);
          const updatedTeachers = teachers.map((t) =>
            t.id === currentUser.id ? { ...t, password: newPassword.trim() } : t
          );
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTeachers));
        }
      } catch (err) {
        console.error('로컬 스토리지 동기화 오류:', err);
      }

      // 4. 변경 성공 처리
      if (onPasswordChanged) {
        onPasswordChanged(updatedUser);
      }

      alert(`🎉 비밀번호가 성공적으로 변경되었습니다!`);
      handleClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('비밀번호 변경 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 relative">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>🔑</span> 비밀번호 변경 ({currentUser.name})
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 에러 메세지 */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold px-3 py-2 rounded-xl text-center">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 폼 영역 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block pl-1">
              현재 비밀번호
            </label>
            <input
              type="password"
              placeholder="현재 비밀번호 입력"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block pl-1">
              새 비밀번호 (4자리 이상)
            </label>
            <input
              type="password"
              placeholder="새 비밀번호 입력"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block pl-1">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              placeholder="새 비밀번호 한번 더 입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:bg-slate-400"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};