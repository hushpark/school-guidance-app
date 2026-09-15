import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Student, Penalty, PhotoConfig } from '../types';

interface RealtimeTabProps {
  students: Student[];
  penalties: Penalty[];
  inputStudentId: string;
  matchedStudent: Student | null;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectStudent?: (student: Student) => void;
  onAddPenalty: (e: React.FormEvent) => void;
  onDeletePenalty?: (id: string) => void;
  studentPenaltyCounts: Record<string, { count: number; first7thDate?: string }>;
  warningThreshold?: number;
  focusThreshold?: number;
  userRole?: string;
  photoConfig?: PhotoConfig;
  onNavigateToSubTab?: (target: 'date' | 'list') => void;
}

export const RealtimeTab: React.FC<RealtimeTabProps> = ({
  students = [],
  penalties = [],
  inputStudentId,
  matchedStudent,
  isSubmitting,
  onInputChange,
  onSelectStudent,
  onAddPenalty,
  onDeletePenalty,
  studentPenaltyCounts,
  warningThreshold = 4,
  focusThreshold = 7,
  userRole = 'teacher',
  photoConfig = 'allow_toggle',
  onNavigateToSubTab,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [userTogglePhoto, setUserTogglePhoto] = useState<boolean>(true);
  const [modalStudent, setModalStudent] = useState<Student | null>(null);

  const [isRetroModalOpen, setIsRetroModalOpen] = useState<boolean>(false);
  const getTodayFormatted = () => new Date().toISOString().split('T')[0];
  const [retroDate, setRetroDate] = useState<string>(getTodayFormatted());
  const [retroBatchText, setRetroBatchText] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // 🎯 [핵심 1] 결번 학생 여부 판단 헬퍼 함수
  const isAbsentStudent = (student: Student | null) => {
    if (!student || !student.name) return false;
    return student.name.includes('결번') || student.name.includes('궐번');
  };

  // 🎯 [핵심 2] 모든 학생 통계 집계 시 '결번' 학생 제외한 실제 재학생 목록 생성
  const activeStudents = students.filter((s) => !isAbsentStudent(s));

  const isPhotoVisible = 
    photoConfig === 'always_on' ? true :
    photoConfig === 'always_off' ? false :
    userTogglePhoto;

  const canToggle = photoConfig === 'allow_toggle' && (userRole === 'admin' || userRole === 'manager' || userRole === 'teacher');

  const searchKeyword = (inputStudentId || '').trim().toLowerCase();
  const searchResults = searchKeyword
    ? activeStudents.filter(
      (s) => (s.id && s.id.toLowerCase().includes(searchKeyword)) || 
             (s.name && s.name.toLowerCase().includes(searchKeyword))
    ).slice(0, 5)
    : [];

  const handleSelect = (s: Student) => {
    if (onSelectStudent) {
      onSelectStudent(s);
    }
    setIsDropdownOpen(false);
  };

  const getStudentPhotoUrl = (student: Student, extension: string = 'jpg') => {
    if (student.photoUrl && (student.photoUrl.startsWith('http://') || student.photoUrl.startsWith('https://'))) {
      return student.photoUrl;
    }

    const cleanPath = `/photos/${student.id}.${extension}`;

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return `http://localhost:5173${cleanPath}`;
    }

    return cleanPath;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedStudent || isSubmitting) return;

    // 결번 학생 지도 단속 등록 방지
    if (isAbsentStudent(matchedStudent)) {
      alert('⚠️ 결번(궐번) 처리된 학생은 생활 지도 단속 등록을 할 수 없습니다.');
      return;
    }

    const studentName = matchedStudent.name;

    onAddPenalty(e);

    setToastMessage(`⚡ ${studentName} 등록 완료!`);
    setTimeout(() => setToastMessage(null), 1800);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleBatchRetroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroBatchText.trim()) {
      alert('등록할 학번 또는 이름을 입력해 주세요.');
      return;
    }

    const lines = retroBatchText
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const payload: any[] = [];
    let successCount = 0;
    let failCount = 0;

    const customTimestamp = `${retroDate}T12:00:00+09:00`;

    lines.forEach((line) => {
      const tokens = line.split(/[\t,\s]+/).map((t) => t.trim()).filter((t) => t.length > 0);
      tokens.forEach((token) => {
        const found = activeStudents.find((s) => s.id === token || s.name === token);
        if (found) {
          payload.push({
            student_id: found.id,
            grade: found.grade,
            created_at: customTimestamp,
          });
          successCount++;
        } else {
          failCount++;
        }
      });
    });

    if (payload.length === 0) {
      alert('일치하는 학생 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const { error } = await supabase.from('penalties').insert(payload);
      if (error) {
        alert('과거 내역 등록 중 오류가 발생했습니다.');
        return;
      }

      setToastMessage(`🎉 과거 단속 총 ${successCount}건 등록 완료! (${retroDate})`);
      setTimeout(() => setToastMessage(null), 2000);

      setRetroBatchText('');
      setIsRetroModalOpen(false);

      if (failCount > 0) {
        alert(`총 ${successCount}건 등록 완료! (미인식/일치하지 않는 학번 ${failCount}건 제외됨)`);
      }
    } catch (err) {
      console.error(err);
      alert('등록 실패');
    }
  };

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const todayStr = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;

  const todayPenalties = penalties.filter((p) => {
    if (!p.created_at) return false;
    const pDate = new Date(p.created_at);
    return (
      pDate.getFullYear() === todayY &&
      pDate.getMonth() === todayM &&
      pDate.getDate() === todayD
    );
  });

  const todayPenalizedStudentIds = Array.from(new Set(todayPenalties.map((p) => p.student_id)));

  // 오늘 단속 학생 중 결번 제외
  const todayPenalizedStudents = activeStudents.filter((s) => todayPenalizedStudentIds.includes(s.id));
  const todayGrade1Count = todayPenalizedStudents.filter((s) => s.grade === 1).length;
  const todayGrade2Count = todayPenalizedStudents.filter((s) => s.grade === 2).length;
  const todayGrade3Count = todayPenalizedStudents.filter((s) => s.grade === 3).length;

  // 누적 단속 학생 중 결번 제외
  const totalPenalizedStudentIds = Object.keys(studentPenaltyCounts || {});
  const totalPenalizedStudents = activeStudents.filter((s) => totalPenalizedStudentIds.includes(s.id));
  const totalPenalizedStudentCount = totalPenalizedStudents.length;
  const totalGrade1Count = totalPenalizedStudents.filter((s) => s.grade === 1).length;
  const totalGrade2Count = totalPenalizedStudents.filter((s) => s.grade === 2).length;
  const totalGrade3Count = totalPenalizedStudents.filter((s) => s.grade === 3).length;

  // 🎯 [카운트 보완] 결번을 완전히 제외한 실재학생 카운트
  const totalStudentCount = activeStudents.length;
  const grade1Count = activeStudents.filter((s) => s.grade === 1).length;
  const grade2Count = activeStudents.filter((s) => s.grade === 2).length;
  const grade3Count = activeStudents.filter((s) => s.grade === 3).length;

  // 경고 대상(결번 제외)
  const warningStudents = Object.entries(studentPenaltyCounts || {})
    .reduce<{ student: Student; count: number }[]>((acc, [studentId, data]) => {
      if (data.count >= warningThreshold) {
        const student = activeStudents.find((s) => s.id === studentId);
        if (student) acc.push({ student, count: data.count });
      }
      return acc;
    }, []);

  const warningGrade1Count = warningStudents.filter((item) => item.student.grade === 1).length;
  const warningGrade2Count = warningStudents.filter((item) => item.student.grade === 2).length;
  const warningGrade3Count = warningStudents.filter((item) => item.student.grade === 3).length;

  // 집중지도 대상(결번 제외)
  const intensiveStudents = Object.entries(studentPenaltyCounts || {})
    .reduce<{ student: Student; count: number; first7thDate?: string }[]>((acc, [studentId, data]) => {
      if (data.count >= focusThreshold) {
        const student = activeStudents.find((s) => s.id === studentId);
        if (student) {
          acc.push({ student, count: data.count, first7thDate: data.first7thDate });
        }
      }
      return acc;
    }, []);

  const intensiveGrade1Count = intensiveStudents.filter((item) => item.student.grade === 1).length;
  const intensiveGrade2Count = intensiveStudents.filter((item) => item.student.grade === 2).length;
  const intensiveGrade3Count = intensiveStudents.filter((item) => item.student.grade === 3).length;

  const newlyIntensiveTodayStudents = intensiveStudents.filter((item) => {
    const isPenalizedToday = todayPenalizedStudentIds.includes(item.student.id);
    const isAchievedToday = item.first7thDate === todayStr || isPenalizedToday;
    return isAchievedToday;
  });

  const hasNewIntensiveToday = newlyIntensiveTodayStudents.length > 0;
  const isMatchedAbsent = isAbsentStudent(matchedStudent);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch relative">

      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-emerald-400 font-extrabold text-xs px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-150">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 👈 1. [학생 검색 카드] */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full">
        <div className="space-y-4 flex-1 flex flex-col">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-slate-800 min-w-0">
              <span className="text-lg shrink-0">🔍</span>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
                학생 검색
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canToggle && (
                <button
                  type="button"
                  onClick={() => setUserTogglePhoto(!userTogglePhoto)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm border ${
                    userTogglePhoto
                      ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 active:scale-95'
                      : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 active:scale-95'
                  }`}
                  title="사진 표시/숨김 스위치"
                >
                  <span>{userTogglePhoto ? '🖼️ 사진 ON' : '🙈 사진 OFF'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsRetroModalOpen(true)}
                className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm"
                title="어제나 과거 날짜의 단속 내역을 등록합니다"
              >
                📅 과거 내역 등록
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 relative flex-1 flex flex-col">
            
            <div className="relative flex items-center shrink-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="학생 이름/학번 입력 후 [엔터]"
                value={inputStudentId}
                onChange={(e) => {
                  onInputChange(e);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-slate-50 border-2 border-emerald-500 rounded-2xl pl-4 pr-28 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
              />

              <button
                type="submit"
                disabled={!matchedStudent || isSubmitting || isMatchedAbsent}
                className={`absolute right-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer z-10 ${
                  matchedStudent && !isSubmitting && !isMatchedAbsent
                    ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <span>🚨</span>
                <span>단속 등록</span>
              </button>

              {isDropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {searchResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {s.id}
                        </span>
                        <span className="font-bold text-slate-900">{s.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {s.grade}학년 {s.classNum}반 {s.number}번
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex-1 flex items-center justify-center relative min-h-[220px] shadow-2xs">
              {matchedStudent ? (
                <div className="flex items-center justify-center gap-5 w-full animate-in fade-in duration-150">
                  {isPhotoVisible && (
                    <div
                      onClick={() => setModalStudent(matchedStudent)}
                      className="relative group cursor-pointer w-28 h-36 bg-white rounded-2xl overflow-hidden border-2 border-slate-200 shrink-0 shadow-md flex items-center justify-center p-0.5"
                      title="클릭 시 크게 보기"
                    >
                      {isMatchedAbsent ? (
                        <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-500 font-black text-sm">
                          결번
                        </div>
                      ) : (
                        <img
                          src={getStudentPhotoUrl(matchedStudent, 'jpg')}
                          alt={matchedStudent.name}
                          className="w-full h-full object-cover object-top rounded-xl group-hover:scale-105 transition-all"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.endsWith('.jpg')) {
                              target.src = getStudentPhotoUrl(matchedStudent, 'JPG');
                            } else if (target.src.endsWith('.JPG')) {
                              target.src = getStudentPhotoUrl(matchedStudent, 'png');
                            } else {
                              target.onerror = null;
                              target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${matchedStudent.id}`;
                            }
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        🔍 확대
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-2xl text-slate-900">
                        {matchedStudent.name}
                      </span>
                      <span className="bg-slate-200 text-slate-800 text-xs font-bold font-mono px-2 py-0.5 rounded-md">
                        {matchedStudent.id}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-600">
                      {matchedStudent.grade}학년 {matchedStudent.classNum}반 {matchedStudent.number}번
                    </p>

                    {isMatchedAbsent ? (
                      <p className="text-xs font-bold text-rose-600 flex items-center gap-1 pt-1">
                        <span>🚫</span> 결번 처리된 학생입니다. (지도 불가)
                      </p>
                    ) : (
                      <div className="pt-1 flex items-center gap-1.5">
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl inline-block shadow-2xs">
                          🚨 누적 단속: <b>{studentPenaltyCounts[matchedStudent.id]?.count || 0}회</b>
                        </span>
                        {(studentPenaltyCounts[matchedStudent.id]?.count || 0) >= focusThreshold && (
                          <span className="text-amber-500 font-bold text-base" title="집중지도 대상">⚠️</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 text-xs font-medium space-y-1.5 my-auto py-2">
                  <p className="text-2xl">⚡</p>
                  <p className="font-bold text-slate-600 text-sm">학생 이름/학번 입력 후 [엔터]</p>
                  <p className="text-slate-400 text-xs">즉시 해당 학생의 단속 정보가 등록됩니다.</p>
                </div>
              )}
            </div>

          </form>
        </div>
      </div>

      {/* 👉 2. [오늘 단속 명단] */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between h-full">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
          <div
            onClick={() => onNavigateToSubTab && onNavigateToSubTab('date')}
            className="flex items-center gap-1.5 cursor-pointer group hover:opacity-80 transition-all"
            title="클릭 시 일자별 단속 명단 페이지로 이동합니다"
          >
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-blue-600">
              <span>📋</span> 오늘 단속 명단
            </span>
            <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
          </div>

          <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            오늘 {todayPenalties.length}건
          </span>
        </div>

        {todayPenalties.length > 0 ? (
          <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1 flex-1">
            {todayPenalties.map((p) => {
              const student = students.find((s) => s.id === p.student_id);
              const timeStr = new Date(p.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={p.id}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                >
                  <div
                    onClick={() => {
                      if (student) setModalStudent(student);
                    }}
                    className="flex items-center gap-2 cursor-pointer hover:underline group"
                    title="클릭하여 학생 프로필 사진 크게 보기"
                  >
                    <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md group-hover:bg-blue-100">
                      {p.student_id}
                    </span>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {student ? student.name : '학생 정보 없음'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                  </div>

                  {onDeletePenalty && (
                    <button
                      onClick={() => onDeletePenalty(p.id)}
                      className="text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer"
                      title="단속 내역 삭제"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center text-slate-400 text-xs font-medium flex-1 flex items-center justify-center">
            오늘 단속된 내역이 없습니다.
          </div>
        )}
      </div>

      {/* 👉 3. 📊 [학생 및 단속 현황 통계 카드] */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between h-full">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>📊</span> 학생 및 단속 현황 통계
          </h2>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            실시간 집계
          </span>
        </div>

        <div className="space-y-2 flex-1 flex flex-col justify-between">
          
          {/* 전체 등록 학생 수 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <span>👥</span> 전체 등록 학생 수
              </span>
              <span className="text-sm font-black font-mono text-slate-900">
                {totalStudentCount}명
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/60">
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">1학년</span>
                <span className="text-xs font-black font-mono text-blue-600">{grade1Count}명</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">2학년</span>
                <span className="text-xs font-black font-mono text-emerald-600">{grade2Count}명</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">3학년</span>
                <span className="text-xs font-black font-mono text-purple-600">{grade3Count}명</span>
              </div>
            </div>
          </div>

          {/* 오늘 단속 학생 수 & 누적 단속 학생 수 */}
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => onNavigateToSubTab && onNavigateToSubTab('date')}
              className="bg-rose-50/70 border border-rose-200 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:bg-rose-100/80 transition-all hover:scale-[1.02] shadow-2xs group min-h-[64px]"
              title="클릭 시 일자별 단속 명단으로 이동"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-900 truncate">오늘 단속 학생 수</span>
                <span className="text-[10px] text-rose-400 group-hover:text-rose-600 font-bold shrink-0">➔</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm sm:text-base font-black font-mono text-rose-600">
                  {todayPenalizedStudents.length}명
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-rose-500 bg-rose-100/80 px-1 py-0.5 rounded-md shrink-0">
                  ({todayGrade1Count}/{todayGrade2Count}/{todayGrade3Count})
                </span>
              </div>
            </div>

            <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between min-h-[64px]">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 truncate">누적 단속 학생 수</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm sm:text-base font-black font-mono text-slate-800">
                  {totalPenalizedStudentCount}명
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-600 bg-slate-200/80 px-1 py-0.5 rounded-md shrink-0">
                  ({totalGrade1Count}/{totalGrade2Count}/{totalGrade3Count})
                </span>
              </div>
            </div>
          </div>

          {/* N회 이상 단속 학생 수 & N회 이상 집중지도 대상 학생 수 (모바일 잘림 완전히 방지) */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* 🟡 경고 대상 카드 */}
            <div
              onClick={() => onNavigateToSubTab && onNavigateToSubTab('list')}
              className="bg-amber-50/80 border border-amber-200 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:bg-amber-100/80 transition-all hover:scale-[1.02] shadow-2xs group min-h-[64px]"
              title="클릭 시 기준별 누적 명단으로 이동"
            >
              <div className="flex justify-between items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 flex items-center gap-0.5 whitespace-nowrap shrink-0">
                  <span>🟡</span>
                  <span className="font-extrabold">{warningThreshold}회↑</span>
                  <span className="hidden sm:inline">단속 학생</span>
                </span>
                <span className="text-[10px] text-amber-400 group-hover:text-amber-700 font-bold shrink-0">➔</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm sm:text-base font-black font-mono text-amber-700">
                  {warningStudents.length}명
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-700 bg-amber-100/80 px-1 py-0.5 rounded-md shrink-0">
                  ({warningGrade1Count}/{warningGrade2Count}/{warningGrade3Count})
                </span>
              </div>
            </div>

            {/* 🔥 집중지도 카드 */}
            <div
              onClick={() => onNavigateToSubTab && onNavigateToSubTab('list')}
              className={`border rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] min-h-[64px] transition-all duration-300 ${
                hasNewIntensiveToday
                  ? 'bg-rose-500 text-white border-rose-600 shadow-lg animate-pulse ring-4 ring-rose-300/80'
                  : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
              }`}
              title="클릭 시 기준별 누적 명단으로 이동"
            >
              <div className="flex justify-between items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-extrabold flex items-center gap-0.5 whitespace-nowrap shrink-0">
                  <span>🔥</span>
                  <span className="font-extrabold">{focusThreshold}회↑</span>
                  <span className="hidden sm:inline">집중지도</span>
                </span>
                {hasNewIntensiveToday ? (
                  <span className="bg-white text-rose-600 text-[8px] font-black px-1.5 py-0.2 rounded-full animate-bounce shrink-0">
                    🚨신규!
                  </span>
                ) : (
                  <span className="text-[10px] opacity-70 shrink-0">➔</span>
                )}
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm sm:text-base font-black font-mono">
                  {intensiveStudents.length}명
                </span>
                <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 py-0.5 rounded-md shrink-0 ${
                  hasNewIntensiveToday 
                    ? 'bg-rose-600 text-white border border-rose-400' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  ({intensiveGrade1Count}/{intensiveGrade2Count}/{intensiveGrade3Count})
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 📅 과거 날짜 내역 등록 팝업 모달 */}
      {isRetroModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>📅</span> 과거 단속 내역 등록
              </h3>
              <button
                onClick={() => setIsRetroModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchRetroSubmit} className="space-y-3">
              <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                <span className="text-xs font-bold text-amber-900 whitespace-nowrap">단속 발생 일자</span>
                <input
                  type="date"
                  value={retroDate}
                  onChange={(e) => setRetroDate(e.target.value)}
                  className="bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  학번 또는 이름 (여러 명 붙여넣기 가능)
                </label>
                <textarea
                  rows={5}
                  placeholder={`[예시: 1명 또는 여러 명 입력 가능]\n10101\n10102\n홍길동\n이순신`}
                  value={retroBatchText}
                  onChange={(e) => setRetroBatchText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRetroModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  🚀 과거 내역 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 사진 대형 확대 팝업 모달 */}
      {modalStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 relative text-center">
            <button
              onClick={() => setModalStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <img
              src={getStudentPhotoUrl(modalStudent, 'jpg')}
              alt={modalStudent.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('.jpg')) {
                  target.src = getStudentPhotoUrl(modalStudent, 'JPG');
                } else if (target.src.endsWith('.JPG')) {
                  target.src = getStudentPhotoUrl(modalStudent, 'png');
                } else {
                  target.onerror = null;
                  target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${modalStudent.id}`;
                }
              }}
              className="w-36 h-48 rounded-3xl object-cover object-top mx-auto border-2 border-emerald-500 shadow-md"
            />

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">{modalStudent.name}</h3>
              <p className="text-sm font-medium text-slate-600">
                {modalStudent.grade}학년 {modalStudent.classNum}반 {modalStudent.number}번 ({modalStudent.id})
              </p>
            </div>

            <button
              onClick={() => setModalStudent(null)}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
};