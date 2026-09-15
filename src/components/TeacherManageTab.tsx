import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TeacherRole } from '../types';

export interface TeacherAccount {
  id: string;
  name: string;
  password?: string;
  role: TeacherRole;
  gradeClass?: string;
}

interface TeacherManageTabProps {
  userRole?: TeacherRole;
}

const LOCAL_STORAGE_KEY = 'SCHOOL_GUIDANCE_TEACHERS_DATA_V1';

const formatTeacherName = (name: string): string => {
  if (!name || !name.trim()) return name;
  const trimmed = name.trim();
  if (
    trimmed.endsWith('선생님') ||
    trimmed.endsWith('교사') ||
    trimmed.endsWith('부장') ||
    trimmed.endsWith('교감') ||
    trimmed.endsWith('교장')
  ) {
    return trimmed;
  }
  return `${trimmed} 선생님`;
};

const DEFAULT_TEACHERS: TeacherAccount[] = [
  { id: 'admin', name: '강감찬 선생님', password: 'admin', role: 'admin', gradeClass: '비담임' },
  { id: 'principal', name: '세종대왕 교장선생님', password: '1234', role: 'principal', gradeClass: '비담임' },
  { id: 'vice_principal', name: '율곡이이 교감선생님', password: '1234', role: 'vice_principal', gradeClass: '비담임' },
  { id: 'manager', name: '이순신 선생님', password: 'manager', role: 'manager', gradeClass: '비담임' },
  { id: 'teacher1', name: '김철수 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 1반' },
  { id: 'teacher2', name: '이영희 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 2반' },
];

export const TeacherManageTab: React.FC<TeacherManageTabProps> = () => {
  const [subMode, setSubMode] = useState<'single' | 'batch'>('single');

  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<TeacherRole>('teacher');
  const [newGradeClass, setNewGradeClass] = useState('');

  const [batchText, setBatchText] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<TeacherRole>('teacher');
  const [editGradeClass, setEditGradeClass] = useState('');

  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeachersFromDB = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        const formatted: TeacherAccount[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          password: t.password || '1234',
          role: (t.role as TeacherRole) || 'teacher',
          gradeClass: t.grade_class || '비담임',
        }));
        setTeachers(formatted);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
        return;
      }
    } catch (e) {
      console.error('Supabase 교사 데이터 로드 오류:', e);
    }

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeachers(parsed);
          return;
        }
      }
    } catch (e) {}

    setTeachers(DEFAULT_TEACHERS);
  };

  useEffect(() => {
    fetchTeachersFromDB();
  }, []);

  const syncTeachersToSupabase = async (updatedList: TeacherAccount[]) => {
    setTeachers(updatedList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      const dbPayload = updatedList.map((t) => ({
        id: t.id,
        name: t.name,
        password: t.password || '1234',
        role: t.role,
        grade_class: t.gradeClass || '비담임',
      }));
      await supabase.from('teachers').upsert(dbPayload);
    } catch (e) {
      console.error('Supabase DB 교사 동기화 오류:', e);
    }
  };

  const handleDownloadTeacherTemplate = () => {
    const csvContent = "\uFEFF교사ID,성명,비밀번호,담당학급\nteacher01,이순신,1234,비담임\nteacher02,김철수,1234,1학년 1반\nteacher03,이영희,1234,1학년 2반";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '교사계정_일괄업로드_양식.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllTeachers = () => {
    if (teachers.length === 0) {
      alert('다운로드할 교사 계정이 없습니다.');
      return;
    }

    let csvContent = "\uFEFF교사ID,성명,비밀번호,권한,담당학급\n";
    teachers.forEach((t) => {
      const roleKor = 
        t.role === 'admin' ? '관리자' : 
        t.role === 'principal' ? '교장' : 
        t.role === 'vice_principal' ? '교감' : 
        t.role === 'manager' ? '인성인권부' : '일반교사';
      csvContent += `${t.id},${t.name},${t.password || '1234'},${roleKor},${t.gradeClass || '비담임'}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `전체_교사계정_명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDoubleClick = (t: TeacherAccount) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditRole(t.role);
    setEditGradeClass(t.gradeClass || '비담임');
  };

  const handleSaveEdit = async (id: string) => {
    const formattedName = formatTeacherName(editName);
    const updated = teachers.map((t) =>
      t.id === id
        ? {
            ...t,
            name: formattedName || t.name,
            role: editRole,
            gradeClass: editGradeClass.trim() || '비담임',
          }
        : t
    );
    await syncTeachersToSupabase(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleAddSingleTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = newId.trim();
    if (!trimmedId || !newName.trim()) {
      alert('교사 접속 ID와 성명을 입력해 주세요.');
      return;
    }

    const formattedName = formatTeacherName(newName);
    const isDuplicate = teachers.some((t) => t.id.toLowerCase() === trimmedId.toLowerCase());

    if (isDuplicate) {
      alert(`⚠️ 이미 존재하는 접속 ID (${trimmedId}) 입니다.`);
      return;
    }

    const newAccount: TeacherAccount = {
      id: trimmedId,
      name: formattedName,
      password: newPassword.trim() || '1234',
      role: newRole,
      gradeClass: newGradeClass.trim() || '비담임',
    };

    const updated = [...teachers, newAccount];
    await syncTeachersToSupabase(updated);

    setNewId('');
    setNewName('');
    setNewPassword('');
    setNewGradeClass('');
    setNewRole('teacher');

    alert(`🎉 ${formattedName} 계정(${trimmedId})이 DB에 생성되었습니다!`);
  };

  const handleApplyBatchTeachers = async () => {
    if (!batchText.trim()) {
      alert('엑셀 계정 명단을 붙여넣어 주세요.');
      return;
    }

    const lines = batchText
      .split(/\r\n|\n|\r/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let addedCount = 0;
    let skippedCount = 0;
    const updated = [...teachers];

    lines.forEach((line) => {
      const parts = line.split(/[\t,]+/).map((p) => p.trim()).filter((p) => p.length > 0);
      
      if (parts.length >= 2) {
        const id = parts[0];
        const rawName = parts[1];
        const formattedName = formatTeacherName(rawName);

        const thirdVal = parts[2] || '1234';
        const fourthVal = parts[3] || '비담임';

        const password = thirdVal.includes('반') || thirdVal.includes('학년') || thirdVal === '비담임' ? '1234' : thirdVal;
        const gradeClass = thirdVal.includes('반') || thirdVal.includes('학년') || thirdVal === '비담임' ? thirdVal : fourthVal;

        if (!updated.some((t) => t.id.toLowerCase() === id.toLowerCase())) {
          updated.push({
            id,
            name: formattedName,
            password,
            role: 'teacher',
            gradeClass,
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }
    });

    await syncTeachersToSupabase(updated);
    setBatchText('');
    alert(`🎉 총 ${addedCount}명의 교사 계정이 DB에 일괄 등록되었습니다!${skippedCount > 0 ? ` (중복 ID ${skippedCount}건 제외됨)` : ''}`);
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (confirm(`${name} 계정(${id})을 삭제하시겠습니까?`)) {
      const updated = teachers.filter((t) => t.id !== id);
      setTeachers(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      try {
        await supabase.from('teachers').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase DB 삭제 오류:', e);
      }
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    const updated = teachers.map((t) => (t.id === id ? { ...t, password: '1234' } : t));
    await syncTeachersToSupabase(updated);
    alert(`🔑 ${name}(${id})의 비밀번호가 [1234]로 초기화되었습니다.`);
  };

  const filteredTeachers = teachers.filter(
    (t) => t.name.includes(searchQuery) || t.id.includes(searchQuery) || (t.gradeClass && t.gradeClass.includes(searchQuery))
  );

  return (
    <div className="w-full h-full overflow-y-auto pb-20 p-2 md:p-4 max-w-7xl mx-auto">
      {/* 🎯 items-stretch 속성을 적용하여 두 카드가 높이를 완벽하게 대칭 유지하도록 설정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        
        {/* 👑 1. 발급 영역 카드 (h-full 및 flex flex-col justify-between 적용) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col justify-between h-full space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2.5 shrink-0">
              <div className="w-full sm:w-auto">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                  <span>👑</span> 교사 계정 생성 및 발급
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={handleDownloadTeacherTemplate}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    📥 양식 받기
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    onClick={handleDownloadAllTeachers}
                    className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    📊 전체 교사 명단 받기
                  </button>
                </div>
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0 w-full sm:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => setSubMode('single')}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    subMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  ➕ 개별 발급
                </button>
                <button
                  type="button"
                  onClick={() => setSubMode('batch')}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    subMode === 'batch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  📑 일괄 업로드
                </button>
              </div>
            </div>

            {subMode === 'single' ? (
              <form onSubmit={handleAddSingleTeacher} className="flex flex-col space-y-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">교사 접속 ID</label>
                      <input
                        type="text"
                        placeholder="예: teacher01"
                        value={newId}
                        onChange={(e) => setNewId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">교사 성명 (이름만 입력)</label>
                      <input
                        type="text"
                        placeholder="예: 이순신 (자동으로 '선생님' 붙음)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">초기 비밀번호</label>
                      <input
                        type="password"
                        placeholder="미입력 시 1234"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">담당 학년/반 (담임)</label>
                      <input
                        type="text"
                        placeholder="예: 1학년 1반 (비담임 가능)"
                        value={newGradeClass}
                        onChange={(e) => setNewGradeClass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">부여 권한</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as TeacherRole)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="teacher">일반교사 (조회 및 검색 전용)</option>
                      <option value="manager">인성인권부 (실시간 지도 입력/전체 조회)</option>
                      <option value="vice_principal">교감 (전체 조회/지도 내역 관리)</option>
                      <option value="principal">교장 (전체 조회/지도 내역 관리)</option>
                      <option value="admin">관리자 (전체 관리 권한)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-2xl text-xs transition-all shadow-md shrink-0 cursor-pointer mt-1"
                >
                  🚀 신규 교사 계정 발급하기
                </button>
              </form>
            ) : (
              <div className="flex flex-col space-y-3">
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <p className="text-[11px] text-slate-400">
                    엑셀에서 <b>[교사ID] [성명] [비밀번호] [담당 학년/반]</b> 열을 붙여넣으세요.
                  </p>
                  <textarea
                    placeholder={`[엑셀 붙여넣기 예시]\nmanager     이순신   manager   비담임\nteacher01   김철수   1234       1학년 1반\nteacher02   이영희   1234       1학년 2반`}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    className="w-full h-44 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleApplyBatchTeachers}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-2xl text-xs transition-all shadow-md shrink-0 cursor-pointer"
                >
                  📥 교사 계정 일괄 등록하기
                </button>
              </div>
            )}
          </div>

          {/* 하단 팁 상자가 늘어난 카드 밑바닥에 딱 맞추어 위치함 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-[10px] text-slate-500 space-y-0.5 shrink-0 mt-auto">
            <span className="font-bold text-slate-700 block">💡 성명 입력 팁</span>
            <p>• '이순신' 세 글자만 입력하면 자동으로 '이순신 선생님'으로 정리됩니다.</p>
            <p>• [인성부], [교감], [교장] 권한 계정은 학생 지도 입력 및 전체 내역 조회가 가능합니다.</p>
          </div>
        </div>

        {/* 📑 2. 명단 영역 카드 (h-full 적용) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col space-y-3 h-full justify-between">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2.5 shrink-0">
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                  <span>📑</span> 교사 계정 명단
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  등록된 교사: 총 <b>{teachers.length}명</b> (수정 시 <b>더블클릭</b>)
                </p>
              </div>
              <input
                type="text"
                placeholder="아이디, 이름, 학급 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold w-full sm:w-40 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-slate-50 flex-1">
              <div className="min-w-[460px] max-h-[480px] overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <div className="text-center text-slate-400 py-16 text-xs">
                    검색된 교사 계정이 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/80">
                    <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 flex justify-between sticky top-0 shadow-sm z-10">
                      <span className="w-1/4">교사 성명</span>
                      <span className="w-1/4">교사 ID / 권한</span>
                      <span className="w-1/4 text-center">담당 학급 (담임)</span>
                      <span className="w-1/4 text-right">계정 관리</span>
                    </div>

                    {filteredTeachers.map((t) => {
                      const isEditing = editingId === t.id;

                      return (
                        <div
                          key={t.id}
                          onDoubleClick={() => handleDoubleClick(t)}
                          className={`p-2.5 flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                            isEditing ? 'bg-amber-50/80 border-y border-amber-300' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-1/4 pr-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-white border border-amber-400 rounded-lg px-2 py-1 font-bold text-xs focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="font-bold text-slate-900 whitespace-nowrap">{t.name}</span>
                            )}
                          </div>

                          <div className="w-1/4 font-mono pr-2">
                            <span className="font-bold text-slate-700 block whitespace-nowrap">{t.id}</span>
                            {isEditing ? (
                              <div className="space-y-1 mt-0.5">
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as TeacherRole)}
                                  className="w-full text-[10px] bg-white border border-amber-400 rounded px-1 py-0.5 cursor-pointer"
                                >
                                  <option value="teacher">일반교사</option>
                                  <option value="manager">인성인권부</option>
                                  <option value="vice_principal">교감</option>
                                  <option value="principal">교장</option>
                                  <option value="admin">관리자</option>
                                </select>
                              </div>
                            ) : (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 whitespace-nowrap ${
                                  t.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700'
                                    : t.role === 'principal'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : t.role === 'vice_principal'
                                    ? 'bg-blue-100 text-blue-700'
                                    : t.role === 'manager'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t.role === 'admin' ? '관리자' : 
                                 t.role === 'principal' ? '교장' : 
                                 t.role === 'vice_principal' ? '교감' : 
                                 t.role === 'manager' ? '인성인권부' : '일반교사'}
                              </span>
                            )}
                          </div>

                          <div className="w-1/4 text-center px-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGradeClass}
                                onChange={(e) => setEditGradeClass(e.target.value)}
                                className="w-full bg-white border border-amber-400 rounded-lg px-2 py-1 font-bold text-xs text-center focus:outline-none"
                              />
                            ) : (
                              <span
                                className={`font-bold px-2 py-0.5 rounded-lg text-xs whitespace-nowrap ${
                                  t.gradeClass && t.gradeClass !== '비담임'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-slate-400'
                                }`}
                              >
                                {t.gradeClass || '비담임'}
                              </span>
                            )}
                          </div>

                          <div className="w-1/4 flex gap-1 justify-end shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(t.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleResetPassword(t.id, t.name)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-all shadow-sm"
                                  title="비밀번호 초기화(1234)"
                                >
                                  🔑 초기화
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(t.id, t.name)}
                                  className="bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 border border-slate-200/80 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
                                  title="계정 삭제"
                                >
                                  🗑️ 삭제
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherManageTab;