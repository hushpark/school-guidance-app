import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TeacherRole, SchoolBranding } from '../types';

export interface TeacherAccount {
  id: string;
  name: string;
  password?: string;
  role: TeacherRole;
  gradeClass?: string;
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherAccount[];
  onLoginSuccess: (user: TeacherAccount) => void;
  schoolBranding?: SchoolBranding;
}

const LOCAL_STORAGE_KEY = 'SCHOOL_GUIDANCE_TEACHERS_DATA_V1';

const DEFAULT_TEACHERS: TeacherAccount[] = [
  { id: 'admin', name: '관리자 교사', password: 'admin', role: 'admin', gradeClass: '비담임' },
  { id: 'principal', name: '교장 선생님', password: '1234', role: 'principal', gradeClass: '비담임' },
  { id: 'vice_principal', name: '교감 선생님', password: '1234', role: 'vice_principal', gradeClass: '비담임' },
  { id: 'manager', name: '인성부 교사', password: 'manager', role: 'manager', gradeClass: '비담임' },
  { id: 'teacher1', name: '김철수 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 1반' },
  { id: 'teacher2', name: '이영희 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 2반' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  teachers,
  onLoginSuccess,
  schoolBranding,
}) => {
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // 내부망(교내 PC) 접속 여부 판별
  const checkInternalAccess = (): boolean => {
    if (typeof window === 'undefined') return true;
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.')
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!teacherId.trim() || !password.trim()) {
      setErrorMessage('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    let activeTeachers: TeacherAccount[] = teachers;

    try {
      const { data, error } = await supabase.from('teachers').select('*');
      if (!error && data && data.length > 0) {
        activeTeachers = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          password: t.password || '1234',
          role: (t.role as TeacherRole) || 'teacher',
          gradeClass: t.grade_class || '비담임',
        }));
      } else {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) activeTeachers = parsed;
        }
      }
    } catch (err) {
      console.error('교사 데이터 로드 실패:', err);
      activeTeachers = DEFAULT_TEACHERS;
    }

    const foundTeacher = activeTeachers.find(
      (t) => t.id.toLowerCase() === teacherId.trim().toLowerCase()
    );

    if (!foundTeacher) {
      setErrorMessage('존재하지 않는 교사 ID입니다.');
      setIsLoading(false);
      return;
    }

    const validPassword = foundTeacher.password || '1234';
    if (password.trim() !== validPassword) {
      setErrorMessage('비밀번호가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 🔒 [보안 검사 1차] 계정 역할 그룹별 외부 접속 차단 여부 검사
    const isInternalIp = checkInternalAccess();
    const blockConfig = schoolBranding?.blockExternalAccess || {};

    let isGroupBlocked = false;
    let roleLabel = '';

    if (foundTeacher.role === 'teacher' && blockConfig.teacher) {
      isGroupBlocked = true;
      roleLabel = '일반교사';
    } else if (foundTeacher.role === 'manager' && blockConfig.manager) {
      isGroupBlocked = true;
      roleLabel = '인성부 교사';
    } else if (
      (foundTeacher.role === 'vice_principal' || foundTeacher.role === 'principal') &&
      blockConfig.leadership
    ) {
      isGroupBlocked = true;
      roleLabel = '교감/교장';
    } else if (foundTeacher.role === 'admin' && blockConfig.admin) {
      isGroupBlocked = true;
      roleLabel = '관리자';
    }

    // 그룹 스위치가 [🔒 교내전용]인 경우 외부 접속 즉시 차단
    if (isGroupBlocked && !isInternalIp) {
      setErrorMessage(`🔒 [${roleLabel}] 계정은 보안 정책에 따라 교내망(학교 PC)에서만 로그인할 수 있습니다.`);
      setIsLoading(false);
      return;
    }

    // 🔒 [보안 검사 2차] 등교 지도 시간제 접속 타이머 및 관리자 예외 검사 (핵심 추가)
    if (!isInternalIp && schoolBranding?.useTimeLimit) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const startTime = schoolBranding.timeLimitStart || '07:30';
      const endTime = schoolBranding.timeLimitEnd || '08:40';

      const isWithinTimeRange = currentTimeStr >= startTime && currentTimeStr <= endTime;

      // 지정된 시간(예: 07:30 ~ 08:40)을 벗어난 경우
      if (!isWithinTimeRange) {
        const afterTimePolicy = schoolBranding.afterTimePolicy || 'admin_only';
        const adminOverrideSwitch = schoolBranding.adminOverrideSwitch ?? true;

        // 오직 '관리자(admin)' 계정이면서 + 정책이 '관리자 예외'이고 + 스위치가 ON인 경우만 예외 통과
        const isAdminAllowed =
          foundTeacher.role === 'admin' &&
          afterTimePolicy === 'admin_only' &&
          adminOverrideSwitch;

        if (!isAdminAllowed) {
          setErrorMessage(
            `⏰ 현재 등교 지도 시간(${startTime}~${endTime})이 통과되어 외부 스마트폰 접속이 제한됩니다. 교내망 PC를 이용해 주세요.`
          );
          setIsLoading(false);
          return;
        }
      }
    }

    // 검증 성공 시 로그인 승인
    onLoginSuccess(foundTeacher);
    setTeacherId('');
    setPassword('');
    setIsLoading(false);
  };

  const isTransparent = !schoolBranding?.logoBgColor || schoolBranding.logoBgColor === 'transparent';

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="text-center space-y-2 pt-1 flex flex-col items-center">
          <div
            className={`w-14 h-14 flex items-center justify-center text-3xl transition-all ${
              isTransparent
                ? 'bg-transparent border-none shadow-none p-0'
                : 'rounded-2xl border border-slate-200/60 shadow-sm p-1'
            }`}
            style={{
              backgroundColor: isTransparent ? 'transparent' : schoolBranding?.logoBgColor,
            }}
          >
            {schoolBranding?.logoType === 'emoji' ? (
              <span>{schoolBranding?.logoValue || '🛡️'}</span>
            ) : schoolBranding?.logoValue ? (
              <img
                src={schoolBranding.logoValue}
                alt="학교 로고"
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <span>🛡️</span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800">
              {schoolBranding?.schoolName ? `${schoolBranding.schoolName} 생활지도 시스템` : '학생 생활 지도 시스템'}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">등록된 계정으로 로그인해 주세요.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold px-3 py-2.5 rounded-xl text-center leading-relaxed">
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block pl-1">교사 ID</label>
            <input
              type="text"
              placeholder="교사 ID 입력"
              value={teacherId}
              disabled={isLoading}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white disabled:bg-slate-100"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block pl-1">비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white disabled:bg-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-3.5 rounded-xl text-xs transition-all shadow-md mt-1 flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-slate-700 text-slate-300 cursor-wait'
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>로그인 처리 중...</span>
              </>
            ) : (
              <span>🔓 로그인</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default AuthModal;