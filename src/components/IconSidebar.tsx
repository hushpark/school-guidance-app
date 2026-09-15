import React, { useState } from 'react';
import type { TeacherRole, MainTab, SchoolBranding } from '../types';

interface IconSidebarProps {
  role: TeacherRole;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  schoolBranding?: SchoolBranding;
  isExternalAccess?: boolean;
}

export const IconSidebar: React.FC<IconSidebarProps> = ({
  role,
  activeTab,
  setActiveTab,
  schoolBranding,
}) => {
  // 🎯 모바일 화면용 열림/닫힘 상태 관리
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = role === 'admin';
  const isPrivileged =
    role === 'admin' ||
    role === 'manager' ||
    role === 'vice_principal' ||
    role === 'principal';

  // 메뉴 클릭 시 모바일에서는 사이드바가 자동으로 닫히도록 수정한 함수
  const handleTabClick = (tab: MainTab) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* 📱 1. 모바일 전용 햄버거 버튼 (화면 좌측 상단 고정) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        aria-label="메뉴 열기/닫기"
      >
        <span className="text-xl leading-none">{isOpen ? '✕' : '☰'}</span>
      </button>

      {/* 📱 2. 모바일용 어두운 배경 오버레이 (열렸을 때 클릭하면 닫힘) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* 💻📱 3. 메인 사이드바 (데스크톱 고정 & 모바일 슬라이드 연동) */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-20 bg-slate-900 text-slate-300 flex flex-col justify-between items-center py-4 shrink-0 shadow-2xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 🔝 상단 로고 및 주요 메뉴 영역 */}
        <div className="flex flex-col items-center gap-5 w-full px-2">
          {/* 학교 로고 */}
          <div
            onClick={() => handleTabClick(isPrivileged ? 'realtime' : 'photoSearch')}
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xl md:text-2xl cursor-pointer hover:bg-slate-700 transition-all shadow-md active:scale-95 group"
            title="홈으로 이동"
          >
            {schoolBranding?.logoType === 'emoji' ? (
              <span>{schoolBranding?.logoValue || '⚖️'}</span>
            ) : schoolBranding?.logoValue ? (
              <img
                src={schoolBranding.logoValue}
                alt="로고"
                className="w-full h-full object-contain p-1 rounded-xl"
              />
            ) : (
              <span>⚖️</span>
            )}
          </div>

          {/* 📌 네비게이션 메뉴 버튼들 */}
          <nav className="flex flex-col gap-2.5 w-full px-1">
            {/* ⚡ 실시간 생활지도 등록 */}
            {isPrivileged && (
              <button
                onClick={() => handleTabClick('realtime')}
                className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'realtime'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="실시간 생활지도 등록"
              >
                <span className="text-lg leading-none">⚡</span>
                <span className="text-[10px] font-bold tracking-tight">지도등록</span>
              </button>
            )}

            {/* 🔍 학생 사진/정보 조회 */}
            <button
              onClick={() => handleTabClick('photoSearch')}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'photoSearch'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="학생 사진/정보 조회"
            >
              <span className="text-lg leading-none">🔍</span>
              <span className="text-[10px] font-bold tracking-tight">사진조회</span>
            </button>

            {/* 📊 반별 / 기준별 누적 명단 */}
            <button
              onClick={() => handleTabClick('classGrid')}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'classGrid'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="반별 / 기준별 누적 명단"
            >
              <span className="text-lg leading-none">📊</span>
              <span className="text-[10px] font-bold tracking-tight">누적명단</span>
            </button>

            {/* ✍️ 학생 명단 관리 (관리자 전용) */}
            {isAdmin && (
              <button
                onClick={() => handleTabClick('studentManage')}
                className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'studentManage'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="학생 명단 관리"
              >
                <span className="text-lg leading-none">✍️</span>
                <span className="text-[10px] font-bold tracking-tight">학생관리</span>
              </button>
            )}

            {/* 🔑 교사 계정 관리 (관리자 전용) */}
            {isAdmin && (
              <button
                onClick={() => handleTabClick('teacherManage')}
                className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'teacherManage'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="교사 계정 관리"
              >
                <span className="text-lg leading-none">🔑</span>
                <span className="text-[10px] font-bold tracking-tight">교사관리</span>
              </button>
            )}

            {/* ⚙️ 시스템 & 진급 설정 (관리자 전용) */}
            {isAdmin && (
              <button
                onClick={() => handleTabClick('systemConfig')}
                className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'systemConfig'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="시스템 & 진급 설정"
              >
                <span className="text-lg leading-none">⚙️</span>
                <span className="text-[10px] font-bold tracking-tight">설정</span>
              </button>
            )}
          </nav>
        </div>

        {/* 🔽 하단 가이드 버튼 */}
        <div className="w-full px-2">
          <button
            onClick={() => handleTabClick('helpGuide')}
            className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'helpGuide'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="사용 가이드"
          >
            <span className="text-lg leading-none">❓</span>
            <span className="text-[10px] font-bold tracking-tight">가이드</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default IconSidebar;