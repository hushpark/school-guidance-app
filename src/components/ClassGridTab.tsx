import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Student, ClassCounts, TeacherRole } from '../types';
import { saveStoredStudents } from '../utils/studentStorage';

interface ClassGridTabProps {
  role: TeacherRole;
  students: Student[];
  classCounts: ClassCounts;
  studentPenaltyCounts: Record<string, { count: number; first7thDate?: string }>;
  penalties?: any[];
  warningThreshold?: number;
  focusThreshold?: number;
  onStudentsUpdated: (newStudents: Student[]) => void;
  onDeletePenalty?: (penaltyId: string) => void;
  initialSubTab?: 'grid' | 'date' | 'list';
}

interface GuidanceRecord {
  completed: boolean;
  date?: string;
  memo?: string;
}

const GUIDANCE_RECORDS_KEY = 'SCHOOL_GUIDANCE_COMPLETED_RECORDS';

export const ClassGridTab: React.FC<ClassGridTabProps> = ({
  role,
  students,
  classCounts,
  studentPenaltyCounts,
  penalties = [],
  warningThreshold = 4,
  focusThreshold = 7,
  onStudentsUpdated,
  onDeletePenalty,
  initialSubTab = 'grid',
}) => {
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [subTab, setSubTab] = useState<'grid' | 'date' | 'list'>(initialSubTab);

  const [sortField, setSortField] = useState<'time' | 'id' | 'name' | 'count'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>(0);

  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState<Student | null>(null);

  const isDesktopApp = typeof window !== 'undefined' && Boolean((window as any).electron);

  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // ---------------------------------------------------------------------------
  // 💡 [수정] 단일 selectedDate 대신 시작일/종료일 기간 상태 사용
  // ---------------------------------------------------------------------------
  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());

  const [guidanceRecords, setGuidanceRecords] = useState<Record<string, GuidanceRecord>>({});
  const [memoModalStudent, setMemoModalStudent] = useState<{ id: string; name: string } | null>(null);
  const [memoInput, setMemoInput] = useState('');

  const currentGradeClassCount = classCounts[selectedGrade] || 10;
  const isAdmin = role === 'admin';
  const isPrivileged = role === 'admin' || role === 'manager' || role === 'vice_principal' || role === 'principal';
  const todayStr = getTodayDate();

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    const initialMap: Record<string, string> = {};
    students.forEach((s) => { initialMap[s.id] = s.name; });
    setEditingNames(initialMap);
  }, [students]);

  useEffect(() => {
    const saved = localStorage.getItem(GUIDANCE_RECORDS_KEY);
    if (saved) {
      try { setGuidanceRecords(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  const isAbsentStudent = (student: Student) => {
    const name = editingNames[student.id] !== undefined ? editingNames[student.id] : student.name;
    return name.includes('결번') || name.includes('궐번');
  };

  const movePhotoToAbsentFolder = (studentId: string, toAbsent: boolean) => {
    if ((window as any).electron && (window as any).electron.movePhoto) {
      (window as any).electron.movePhoto(studentId, toAbsent);
    }
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

  const getGradeStudentCount = (g: number) => {
    return students.filter((s) => s.grade === g && !isAbsentStudent(s)).length;
  };

  const saveRecords = (newRecords: Record<string, GuidanceRecord>) => {
    setGuidanceRecords(newRecords);
    localStorage.setItem(GUIDANCE_RECORDS_KEY, JSON.stringify(newRecords));
  };

  const handleToggleGuidance = (studentId: string) => {
    const current = guidanceRecords[studentId];
    const isCompleted = current?.completed;

    const newRecords = {
      ...guidanceRecords,
      [studentId]: {
        completed: !isCompleted,
        date: !isCompleted ? new Date().toLocaleDateString('ko-KR') : undefined,
        memo: !isCompleted ? current?.memo || '' : undefined,
      },
    };
    saveRecords(newRecords);
  };

  const handleSaveMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoModalStudent) return;
    const studentId = memoModalStudent.id;
    const current = guidanceRecords[studentId];

    const newRecords = {
      ...guidanceRecords,
      [studentId]: {
        completed: true,
        date: current?.date || new Date().toLocaleDateString('ko-KR'),
        memo: memoInput.trim(),
      },
    };

    saveRecords(newRecords);
    setMemoModalStudent(null);
    setMemoInput('');
  };

  const handleDeletePenaltyItem = (penaltyId: string, studentName: string) => {
    if (confirm(`🚨 [${studentName}] 학생의 단속 기록을 삭제하시겠습니까?`)) {
      if (onDeletePenalty) onDeletePenalty(penaltyId);
    }
  };

  // ---------------------------------------------------------------------------
  // 💡 [수정] 선택한 기간(startDate ~ endDate)에 해당하는 단속 데이터 필터링
  // ---------------------------------------------------------------------------
  const datePenalties = penalties.filter((p) => {
    if (!p.created_at) return false;
    const pDate = new Date(p.created_at);
    const pYear = pDate.getFullYear();
    const pMonth = String(pDate.getMonth() + 1).padStart(2, '0');
    const pDay = String(pDate.getDate()).padStart(2, '0');
    const formattedPDate = `${pYear}-${pMonth}-${pDay}`;

    return formattedPDate >= startDate && formattedPDate <= endDate;
  });

  const rawDatePenaltyStudents = datePenalties.map((p) => {
    const student = students.find((s) => s.id === p.student_id);
    const pDate = new Date(p.created_at);
    const dateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
    return {
      penaltyId: p.id,
      date: dateStr,
      timestamp: pDate.getTime(),
      time: pDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      studentId: p.student_id,
      name: student ? student.name : '(등록 학생 없음)',
      grade: student ? student.grade : Math.floor(Number(p.student_id) / 10000),
      classNum: student ? student.classNum : Math.floor((Number(p.student_id) % 10000) / 100),
      number: student ? student.number : Number(p.student_id) % 100,
      totalCount: studentPenaltyCounts[p.student_id]?.count || 1,
    };
  });

  const filteredDatePenaltyStudents = rawDatePenaltyStudents.filter((s) => {
    if (gradeFilter === 0) return true;
    return s.grade === gradeFilter;
  });

  const sortedDatePenaltyStudents = [...filteredDatePenaltyStudents].sort((a, b) => {
    let result = 0;
    if (sortField === 'time') result = a.timestamp - b.timestamp;
    else if (sortField === 'id') result = a.studentId.localeCompare(b.studentId);
    else if (sortField === 'name') result = a.name.localeCompare(b.name, 'ko-KR');
    else if (sortField === 'count') result = a.totalCount - b.totalCount;

    return sortOrder === 'asc' ? result : -result;
  });

  // ---------------------------------------------------------------------------
  // 💡 [수정] 선택한 기간의 단속 내역 CSV 엑셀 다운로드 함수
  // ---------------------------------------------------------------------------
  const handleDownloadDatePenalties = () => {
    if (sortedDatePenaltyStudents.length === 0) {
      alert('다운로드할 단속 명단이 없습니다.');
      return;
    }

    let csvContent = `\uFEFF단속일자,단속시간,학년,반,번호,성명,현재누적단속횟수\n`;
    sortedDatePenaltyStudents.forEach((s) => {
      csvContent += `${s.date},${s.time},${s.grade},${s.classNum},${s.number},${s.name},${s.totalCount}회\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileName = startDate === endDate 
      ? `단속학생명단_${startDate}.csv`
      : `단속학생명단_${startDate}_~_${endDate}.csv`;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const todayPenalizedStudentIds = new Set(
    penalties
      .filter((p) => {
        if (!p.created_at) return false;
        const pDate = new Date(p.created_at);
        const pYear = pDate.getFullYear();
        const pMonth = String(pDate.getMonth() + 1).padStart(2, '0');
        const pDay = String(pDate.getDate()).padStart(2, '0');
        return `${pYear}-${pMonth}-${pDay}` === todayStr;
      })
      .map((p) => p.student_id)
  );

  const totalTodayPenalizedCount = todayPenalizedStudentIds.size;

  const currentGradeTodayPenalizedCount = Array.from(todayPenalizedStudentIds).filter((id) => {
    const student = students.find((s) => s.id === id);
    return student ? student.grade === selectedGrade && !isAbsentStudent(student) : false;
  }).length;

  const warningList = students
    .filter((s) => !isAbsentStudent(s))
    .map((s) => ({ student: s, count: studentPenaltyCounts[s.id]?.count || 0 }))
    .filter((item) => item.count >= warningThreshold && item.count < focusThreshold)
    .sort((a, b) => b.count - a.count);

  const focusList = students
    .filter((s) => !isAbsentStudent(s))
    .map((s) => ({
      student: s,
      count: studentPenaltyCounts[s.id]?.count || 0,
      first7thDate: studentPenaltyCounts[s.id]?.first7thDate,
    }))
    .filter((item) => item.count >= focusThreshold)
    .sort((a, b) => b.count - a.count);

  const handleInputChange = (studentId: string, val: string) => {
    setEditingNames((prev) => ({ ...prev, [studentId]: val }));
  };

  const handleSaveStudentName = async (studentId: string) => {
    const newName = (editingNames[studentId] || '').trim();
    if (!newName) return;

    const isAbsence = newName.includes('결번') || newName.includes('궐번');

    if (isAbsence && !isDesktopApp) {
      alert('⚠️ 사진 파일 자동 이동을 포함한 [결번 처리]는 학교 메인 PC(데스크톱 앱)에서만 실행 가능합니다.');
      const originalStudent = students.find((s) => s.id === studentId);
      if (originalStudent) {
        setEditingNames((prev) => ({ ...prev, [studentId]: originalStudent.name }));
      }
      return;
    }

    movePhotoToAbsentFolder(studentId, isAbsence);

    const updatedStudents = students.map((s) => (s.id === studentId ? { ...s, name: newName } : s));
    saveStoredStudents(updatedStudents);
    onStudentsUpdated(updatedStudents);

    try {
      const targetStudent = updatedStudents.find((s) => s.id === studentId);
      if (targetStudent) {
        await supabase.from('students').upsert({
          id: targetStudent.id,
          name: targetStudent.name,
          grade: targetStudent.grade,
          class_num: targetStudent.classNum,
          number: targetStudent.number,
          photo_url: targetStudent.photoUrl || `/photos/${targetStudent.id}.jpg`,
        });
      }
    } catch (e) {
      console.error('DB 저장 오류:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveStudentName(studentId);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startGrade: number,
    startClassNum: number,
    startNumber: number
  ) => {
    if (!isAdmin) return;
    const pasteData = e.clipboardData.getData('text');
    const pastedLines = pasteData.split(/\r\n|\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (pastedLines.length <= 1) return;

    const containsAbsence = pastedLines.some((l) => l.includes('결번') || l.includes('궐번'));
    if (containsAbsence && !isDesktopApp) {
      alert('⚠️ 사진 파일 자동 이동을 포함한 [결번 처리]는 학교 메인 PC(데스크톱 앱)에서만 실행 가능합니다.');
      return;
    }

    e.preventDefault();
    let updatedStudents = [...students];

    pastedLines.forEach((name, index) => {
      const targetNumber = startNumber + index;
      const formattedClass = String(startClassNum).padStart(2, '0');
      const formattedNumber = String(targetNumber).padStart(2, '0');
      const targetId = `${startGrade}${formattedClass}${formattedNumber}`;

      const isAbsence = name.includes('결번') || name.includes('궐번');
      movePhotoToAbsentFolder(targetId, isAbsence);

      const existingIndex = updatedStudents.findIndex((s) => s.id === targetId);

      if (existingIndex !== -1) {
        updatedStudents[existingIndex] = { ...updatedStudents[existingIndex], name };
      } else {
        updatedStudents.push({
          id: targetId,
          grade: startGrade,
          classNum: startClassNum,
          number: targetNumber,
          name,
        });
      }
    });

    saveStoredStudents(updatedStudents);
    onStudentsUpdated(updatedStudents);

    try {
      supabase.from('students').upsert(
        updatedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          class_num: s.classNum,
          number: s.number,
          photo_url: `/photos/${s.id}.jpg`,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPhoto = (studentOrId: Student | string) => {
    let targetStudent: Student | undefined;
    if (typeof studentOrId === 'string') {
      targetStudent = students.find((s) => s.id === studentOrId);
    } else {
      targetStudent = studentOrId;
    }

    if (targetStudent) {
      setSelectedPhotoStudent(targetStudent);
    }
  };

  return (
    <div className="space-y-2 flex flex-col relative">
      
      {/* 📸 사진 팝업 모달 */}
      {selectedPhotoStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 relative text-center">
            <button
              onClick={() => setSelectedPhotoStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <img
              src={getStudentPhotoUrl(selectedPhotoStudent, 'jpg')}
              alt={selectedPhotoStudent.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('.jpg')) {
                  target.src = getStudentPhotoUrl(selectedPhotoStudent, 'JPG');
                } else if (target.src.endsWith('.JPG')) {
                  target.src = getStudentPhotoUrl(selectedPhotoStudent, 'png');
                } else {
                  target.onerror = null;
                  target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedPhotoStudent.id}`;
                }
              }}
              className="w-36 h-48 rounded-3xl object-cover object-top mx-auto border-2 border-emerald-500 shadow-md"
            />

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">{selectedPhotoStudent.name}</h3>
              <p className="text-sm font-medium text-slate-600">
                {selectedPhotoStudent.grade}학년 {selectedPhotoStudent.classNum}반 {selectedPhotoStudent.number}번 ({selectedPhotoStudent.id})
              </p>
            </div>

            <button
              onClick={() => setSelectedPhotoStudent(null)}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {memoModalStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <span>📝</span> 집중지도 메모 ({memoModalStudent.name})
              </h3>
              <button onClick={() => setMemoModalStudent(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">지도 및 상담 내용</label>
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder="예: 학부모 상담 진행, 교내 선도 조치 완료 등"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none h-24"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMemoModalStudent(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md cursor-pointer">
                  지도 완료 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔝 상단 헤더 영역 */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2">
        
        <div className="w-full md:w-auto shrink-0">
          <div className="grid grid-cols-3 md:flex gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-full">
            <button
              onClick={() => setSubTab('grid')}
              className={`py-1.5 px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                subTab === 'grid'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>📊</span>
              <span>반별 누적</span>
            </button>

            {isPrivileged && (
              <button
                onClick={() => setSubTab('date')}
                className={`py-1.5 px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                  subTab === 'date'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>📅</span>
                <span>일자별 단속</span>
              </button>
            )}

            {isPrivileged && (
              <button
                onClick={() => setSubTab('list')}
                className={`py-1.5 px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                  subTab === 'list'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-slate-500 hover:text-rose-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>📋</span>
                <span>기준별 누적</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full md:w-auto shrink-0 pt-1 md:pt-0">
          
          {/* 💡 [수정] 시작일 ~ 종료일 기간 선택기 및 기간 다운로드 바 */}
          {subTab === 'date' && isPrivileged && (
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <button 
                onClick={() => {
                  setStartDate(getTodayDate());
                  setEndDate(getTodayDate());
                }} 
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${startDate === getTodayDate() && endDate === getTodayDate() ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                오늘
              </button>
              <button 
                onClick={() => {
                  setStartDate(getYesterdayDate());
                  setEndDate(getYesterdayDate());
                }} 
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${startDate === getYesterdayDate() && endDate === getYesterdayDate() ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                어제
              </button>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent font-bold text-xs text-slate-800 cursor-pointer outline-none" 
                />
                <span className="text-slate-400 font-bold text-xs">~</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-transparent font-bold text-xs text-slate-800 cursor-pointer outline-none" 
                />
              </div>

              <button 
                onClick={handleDownloadDatePenalties} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                📊 기간 다운로드
              </button>
            </div>
          )}

          {subTab === 'grid' && (
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <select
                id="grade-select"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs shrink-0"
              >
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g}>
                    {g}학년 ({classCounts[g] || 10}개 반 / {getGradeStudentCount(g)}명)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-rose-600 font-black text-xs bg-rose-50 px-2 py-1 rounded-xl border border-rose-200 shrink-0">
                <span>▲ 오늘지도</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] transition-all inline-block ${
                    totalTodayPenalizedCount > 0
                      ? 'bg-rose-500 text-white font-black shadow-sm animate-bounce ring-2 ring-rose-300'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {currentGradeTodayPenalizedCount}/{totalTodayPenalizedCount}명
                </span>
              </div>
            </div>
          )}

          {subTab === 'grid' && (
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80 text-[10px] text-slate-600 font-bold shrink-0 justify-around sm:justify-start">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                경고: {warningThreshold}~{focusThreshold - 1}회
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                집중: {focusThreshold}회 이상
              </span>
            </div>
          )}

        </div>
      </div>

      {subTab === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 pb-2">
          {Array.from({ length: currentGradeClassCount }, (_, i) => i + 1).map((classNum) => {
            const classStudents = students.filter(
              (s) => s.grade === selectedGrade && s.classNum === classNum
            );
            const validClassStudentsCount = classStudents.filter((st) => !isAbsentStudent(st)).length;
            const classTodayPenalizedCount = classStudents.filter((st) =>
              todayPenalizedStudentIds.has(st.id)
            ).length;

            return (
              <div key={classNum} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="bg-slate-800 border-b border-slate-700 py-1 px-2 text-xs font-bold text-white relative flex items-center justify-between shrink-0">
                  <span className="text-center">{classNum}반</span>
                  <div className="flex items-center gap-1">
                    {classTodayPenalizedCount > 0 && (
                      <span className="bg-rose-600 text-white text-[9px] font-black px-1 py-0.5 rounded-md animate-pulse shrink-0">
                        ▲{classTodayPenalizedCount}
                      </span>
                    )}
                    <span className="text-[9px] font-normal text-slate-400 font-mono shrink-0">
                      {validClassStudentsCount}명
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {classStudents.length === 0 ? (
                    <div className="text-center text-slate-400 py-6 text-[10px]">명단 없음</div>
                  ) : (
                    classStudents.map((st) => {
                      const count = studentPenaltyCounts[st.id]?.count || 0;
                      const isToday = todayPenalizedStudentIds.has(st.id);

                      const currentInputName = editingNames[st.id] !== undefined ? editingNames[st.id] : st.name;
                      const isMissingNum = currentInputName.includes('결번') || currentInputName.includes('궐번');
                      const isWarning = count >= warningThreshold && count < focusThreshold;
                      const isFocus = count >= focusThreshold;

                      let nameBgColor = '';
                      if (isFocus) nameBgColor = 'bg-rose-100 border-rose-200 text-rose-950 font-bold';
                      else if (isWarning) nameBgColor = 'bg-amber-100 border-amber-200 text-amber-950 font-bold';

                      return (
                        <div key={st.id} className={`px-1 py-1 min-h-[26px] flex items-center justify-between transition-colors ${isMissingNum ? 'bg-rose-50/70' : 'hover:bg-slate-50'}`}>
                          <span className={`font-mono text-[11px] font-normal whitespace-nowrap mr-0.5 min-w-[14px] text-right ${isMissingNum ? 'text-rose-400' : 'text-slate-400'}`}>{st.number}</span>
                          {isAdmin ? (
                            <input
                              type="text"
                              value={currentInputName}
                              onChange={(e) => handleInputChange(st.id, e.target.value)}
                              onBlur={() => handleSaveStudentName(st.id)}
                              onKeyDown={(e) => handleKeyDown(e, st.id)}
                              onPaste={(e) => handlePaste(e, st.grade, st.classNum, st.number)}
                              className={`w-full mx-0.5 px-0.5 py-0 text-[12px] font-medium rounded focus:outline-none focus:bg-emerald-50 focus:border-emerald-400 border border-transparent hover:border-slate-300 ${nameBgColor} ${isMissingNum ? 'text-rose-600 font-bold' : 'text-slate-800'}`}
                            />
                          ) : (
                            <span 
                              onClick={() => !isMissingNum && handleOpenPhoto(st)}
                              className={`font-medium text-[12px] truncate flex-1 text-left px-0.5 py-0 rounded cursor-pointer hover:underline ${nameBgColor} ${isMissingNum ? 'text-rose-600' : 'text-slate-800'}`}
                            >
                              {st.name}
                            </span>
                          )}
                          <span className={`font-mono font-bold px-0.5 py-0 rounded text-[10px] min-w-[16px] text-center shrink-0 flex items-center justify-center gap-0.5 ${isMissingNum ? 'bg-rose-100/50 text-rose-300 border border-rose-200/50' : isFocus ? 'bg-rose-600 text-white' : isWarning ? 'bg-amber-500 text-white' : count >= 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-300 font-normal'}`}>
                            {isMissingNum ? '-' : count > 0 ? `${count}` : '-'}
                            {isToday && !isMissingNum && <span className={`font-black animate-bounce inline-block ${isFocus ? 'text-white' : 'text-rose-600'}`}>▲</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📅 일자별 단속 탭 목록 */}
      {subTab === 'date' && isPrivileged && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 min-h-[400px]">
          <div className="border-b border-slate-100 pb-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>📅</span> 
                <span>
                  {startDate === endDate ? `${startDate}` : `${startDate} ~ ${endDate}`} 단속 학생 명단
                </span>
              </h3>
              <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full font-mono">
                총 {sortedDatePenaltyStudents.length}명
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
                <button
                  onClick={() => setGradeFilter(0)}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    gradeFilter === 0 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  전체
                </button>
                {[1, 2, 3].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      gradeFilter === g ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g}학년
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">정렬:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="time">⏰ 시간순</option>
                  <option value="id">🔢 학번순</option>
                  <option value="name">🔤 이름순</option>
                  <option value="count">🚨 누적 단속 횟수순</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-extrabold px-2 py-1 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="정렬 방향 전환 (오름차순 / 내림차순)"
                >
                  <span>{sortOrder === 'asc' ? '▲ 오름차순' : '▼ 내림차순'}</span>
                </button>
              </div>

            </div>

          </div>

          {sortedDatePenaltyStudents.length === 0 ? (
            <div className="text-center text-slate-400 py-32 text-xs">
              선택하신 기간의 단속 학생이 없습니다. 🎉 (0명)
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedDatePenaltyStudents.map((item, idx) => (
                <div key={item.penaltyId || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex justify-between items-center hover:bg-slate-100/80 transition-all shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{item.date}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">{item.time}</span>
                      <span className="font-bold text-xs text-slate-700">{item.grade}학년 {item.classNum}반 {item.number}번</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span
                        onClick={() => handleOpenPhoto(item.studentId)}
                        className="font-extrabold text-sm text-slate-900 hover:text-emerald-600 hover:underline cursor-pointer"
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-md font-mono">현재 누적 {item.totalCount}회</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePenaltyItem(item.penaltyId, item.name)} className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-sm">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📋 기준별 누적 탭 */}
      {subTab === 'list' && isPrivileged && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-amber-200 rounded-2xl p-3 md:p-4 shadow-sm space-y-3 h-fit">
            <div className="bg-amber-100 border border-amber-300 p-2 rounded-xl text-center flex items-center justify-center">
              <h3 className="font-black text-amber-900 text-xs">🟡 {warningThreshold}회 이상 명단 ({warningList.length}명)</h3>
            </div>
            <div className="overflow-x-auto border border-amber-200 rounded-xl">
              <table className="w-full text-xs text-center border-collapse min-w-[240px]">
                <thead>
                  <tr className="bg-amber-50 text-amber-900 font-bold border-b border-amber-200">
                    <th className="py-2 px-2">학번</th>
                    <th className="py-2 px-2">이름</th>
                    <th className="py-2 px-2">횟수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 font-medium text-slate-800">
                  {warningList.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-slate-400">대상 학생이 없습니다.</td></tr>
                  ) : (
                    warningList.map(({ student, count }) => (
                      <tr key={student.id} className="hover:bg-amber-50/50 transition-all">
                        <td className="py-2 px-2 font-mono text-slate-400">{student.id}</td>
                        <td className="py-2 px-2 font-bold">
                          <span
                            onClick={() => handleOpenPhoto(student)}
                            className="text-slate-900 hover:text-emerald-600 hover:underline font-bold transition-all cursor-pointer"
                          >
                            {student.name}
                          </span>
                        </td>
                        <td className="py-2 px-2"><span className="bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">{count}회</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-2xl p-3 md:p-4 shadow-sm space-y-3 h-fit">
            <div className="bg-rose-600 p-2 rounded-xl text-center text-white flex items-center justify-center">
              <h3 className="font-black text-xs text-center">🔴 {focusThreshold}회 이상 집중지도 명단 ({focusList.length}명)</h3>
            </div>
            <div className="overflow-x-auto border border-rose-200 rounded-xl">
              <table className="w-full text-xs text-center border-collapse min-w-[320px]">
                <thead>
                  <tr className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                    <th className="py-2 px-1.5">학번</th>
                    <th className="py-2 px-1.5">이름</th>
                    <th className="py-2 px-1.5">횟수</th>
                    <th className="py-2 px-1.5">{focusThreshold}회 달성일</th>
                    <th className="py-2 px-1.5">지도 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 font-medium text-slate-800">
                  {focusList.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-slate-400">대상 학생이 없습니다.</td></tr>
                  ) : (
                    focusList.map(({ student, count, first7thDate }) => {
                      const record = guidanceRecords[student.id];
                      const isCompleted = record?.completed;

                      return (
                        <tr key={student.id} className="hover:bg-rose-50/50 transition-all">
                          <td className="py-2 px-1.5 font-mono text-slate-400 text-[11px]">{student.id}</td>
                          <td className="py-2 px-1.5 font-bold text-rose-900">
                            <span
                              onClick={() => handleOpenPhoto(student)}
                              className="text-rose-900 hover:text-emerald-600 hover:underline font-bold transition-all cursor-pointer"
                            >
                              {student.name}
                            </span>
                          </td>
                          <td className="py-2 px-1.5"><span className="bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]">{count}회</span></td>
                          <td className="py-2 px-1.5 font-mono text-slate-500 text-[10px]">{first7thDate || '최근'}</td>
                          <td className="py-2 px-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleToggleGuidance(student.id)} className={`px-2 py-0.5 rounded-xl text-[10px] font-extrabold transition-all shadow-sm cursor-pointer ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                                {isCompleted ? '✅ 완료' : '⚠️ 미지도'}
                              </button>
                              <button onClick={() => { setMemoModalStudent({ id: student.id, name: student.name }); setMemoInput(record?.memo || ''); }} className="p-0.5 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer">✏️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassGridTab;