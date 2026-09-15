import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Student, ClassCounts } from '../types';

interface StudentManageTabProps {
  students: Student[];
  classCounts: ClassCounts;
  onStudentsUpdated: (newStudents: Student[]) => void;
}

export const StudentManageTab: React.FC<StudentManageTabProps> = ({
  students,
  classCounts,
  onStudentsUpdated,
}) => {
  const [targetGrade, setTargetGrade] = useState<number>(1);
  const [targetClass, setTargetClass] = useState<number>(1);

  const [viewGrade, setViewGrade] = useState<number>(1);
  const [viewClass, setViewClass] = useState<number>(1);

  const [leftNamesText, setLeftNamesText] = useState('');
  const [rightNamesText, setRightNamesText] = useState('');

  const [singleGrade, setSingleGrade] = useState<number>(1);
  const [singleClass, setSingleClass] = useState<number>(1);
  const [singleNum, setSingleNum] = useState<number>(1);
  const [singleName, setSingleName] = useState<string>('');

  const [deleteGrade, setDeleteGrade] = useState<number>(1);
  const [deleteClass, setDeleteClass] = useState<number>(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const isDesktopApp = typeof window !== 'undefined' && Boolean((window as any).electron);

  useEffect(() => {
    setViewGrade(targetGrade);
    setViewClass(targetClass);
  }, [targetGrade, targetClass]);

  const movePhotoToAbsentFolder = (studentId: string, toAbsent: boolean) => {
    if ((window as any).electron && (window as any).electron.movePhoto) {
      (window as any).electron.movePhoto(studentId, toAbsent);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFF학년,반,번호,성명\n1,1,1,홍길동\n1,1,2,김철수\n1,1,3,이영희";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '학생명단_일괄업로드_양식.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllStudents = () => {
    if (students.length === 0) {
      alert('다운로드할 학생 명단이 없습니다.');
      return;
    }

    const sortedStudents = [...students].sort((a, b) => a.id.localeCompare(b.id));
    let csvContent = "\uFEFF학년,반,번호,성명\n";

    sortedStudents.forEach((s) => {
      csvContent += `${s.grade},${s.classNum},${s.number},${s.name}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `전체_학생_명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const syncStudentsToSupabase = async (updatedList: Student[]) => {
    try {
      const dbPayload = updatedList.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        grade: s.grade,
        class_num: s.classNum,
        number: s.number,
        photo_url: s.photoUrl && s.photoUrl.trim() !== '' ? s.photoUrl : `/photos/${s.id}.jpg`,
      }));

      const { error } = await supabase.from('students').upsert(dbPayload);
      if (error) {
        console.error('Supabase DB 저장 중 오류:', error);
      }
    } catch (err) {
      console.error('Supabase 통신 오류:', err);
    }
  };

  const processFileContent = async (text: string) => {
    const lines = text.split(/\r\n|\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) {
      alert('업로드한 파일에 학생 데이터가 없습니다.');
      return;
    }

    const newParsedStudents: Student[] = [];

    lines.slice(1).forEach((line) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 4) {
        const grade = parseInt(parts[0], 10);
        const classNum = parseInt(parts[1], 10);
        const number = parseInt(parts[2], 10);
        const name = parts[3];

        if (!isNaN(grade) && !isNaN(classNum) && !isNaN(number) && name) {
          const id = `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;
          newParsedStudents.push({
            id,
            name: name.trim(),
            grade,
            classNum,
            number,
            photoUrl: `/photos/${id}.jpg`,
          });
        }
      }
    });

    if (newParsedStudents.length === 0) {
      alert('올바른 CSV/엑셀 양식이 아닙니다. [학년,반,번호,성명] 순서로 작성된 파일인지 확인해 주세요.');
      return;
    }

    let updatedList = [...students];
    newParsedStudents.forEach((newSt) => {
      const idx = updatedList.findIndex((s) => s.id === newSt.id);
      if (idx !== -1) {
        updatedList[idx] = newSt;
      } else {
        updatedList.push(newSt);
      }
    });

    updatedList.sort((a, b) => a.id.localeCompare(b.id));

    await syncStudentsToSupabase(updatedList);
    onStudentsUpdated(updatedList);
    alert(`🎉 파일에서 총 ${newParsedStudents.length}명의 학생 명단을 성공적으로 등록했습니다!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processFileContent(text);
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) processFileContent(text);
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleApplyClassPaste = async () => {
    const parseNames = (text: string) =>
      text
        .split(/\r\n|\n|\r/)
        .map((n) => n.trim().replace(/[0-9\t]/g, ''))
        .filter((n) => n.length > 0);

    let leftList = parseNames(leftNamesText);
    let rightList = parseNames(rightNamesText);

    if (leftList.length === 0 && rightList.length === 0) {
      alert('붙여넣은 명단이 없습니다.');
      return;
    }

    if (leftList.length > 15) {
      alert(`⚠️ 1~15번 영역에 ${leftList.length}명이 입력되었습니다. 상위 15명만 1~15번에 배치됩니다.`);
      leftList = leftList.slice(0, 15);
    }

    let updatedList = students.filter(
      (s) => !(s.grade === targetGrade && s.classNum === targetClass)
    );

    const newClassStudents: Student[] = [];

    leftList.forEach((name, idx) => {
      const num = idx + 1;
      const id = `${targetGrade}${String(targetClass).padStart(2, '0')}${String(num).padStart(2, '0')}`;
      newClassStudents.push({
        id,
        name: name.trim(),
        grade: targetGrade,
        classNum: targetClass,
        number: num,
        photoUrl: `/photos/${id}.jpg`,
      });
    });

    rightList.forEach((name, idx) => {
      const num = idx + 16;
      const id = `${targetGrade}${String(targetClass).padStart(2, '0')}${String(num).padStart(2, '0')}`;
      newClassStudents.push({
        id,
        name: name.trim(),
        grade: targetGrade,
        classNum: targetClass,
        number: num,
        photoUrl: `/photos/${id}.jpg`,
      });
    });

    updatedList = [...updatedList, ...newClassStudents];
    updatedList.sort((a, b) => a.id.localeCompare(b.id));

    await syncStudentsToSupabase(updatedList);
    onStudentsUpdated(updatedList);

    setLeftNamesText('');
    setRightNamesText('');

    setViewGrade(targetGrade);
    setViewClass(targetClass);

    alert(`🎉 ${targetGrade}학년 ${targetClass}반 명단(${newClassStudents.length}명)이 성공적으로 등록되었습니다!`);
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }

    const id = `${singleGrade}${String(singleClass).padStart(2, '0')}${String(singleNum).padStart(2, '0')}`;

    const exists = students.some((s) => s.id === id);
    if (exists && !confirm(`${singleGrade}학년 ${singleClass}반 ${singleNum}번 자리에 이미 학생이 있습니다. 덮어쓰시겠습니까?`)) {
      return;
    }

    const newStudent: Student = {
      id,
      name: singleName.trim(),
      grade: singleGrade,
      classNum: singleClass,
      number: singleNum,
      photoUrl: `/photos/${id}.jpg`,
    };

    const updatedList = students.filter((s) => s.id !== id);
    updatedList.push(newStudent);
    updatedList.sort((a, b) => a.id.localeCompare(b.id));

    await syncStudentsToSupabase(updatedList);
    onStudentsUpdated(updatedList);

    setSingleName('');
    setViewGrade(singleGrade);
    setViewClass(singleClass);

    alert(`🎉 ${singleGrade}학년 ${singleClass}반 ${singleNum}번 ${singleName} 학생이 등록되었습니다.`);
  };

  const handleDeleteClassStudents = async () => {
    if (!isDesktopApp) {
      alert(
        '⚠️ 사진 파일 정리 및 일괄 삭제 기능은 학교 메인 PC(데스크톱 앱)에서만 구동 가능합니다.\n\n' +
        '스마트폰/웹 환경에서는 파일 시스템 조작 권한이 제한됩니다.'
      );
      return;
    }

    const targetStudents = students.filter(
      (s) => s.grade === deleteGrade && s.classNum === deleteClass
    );

    if (targetStudents.length === 0) {
      alert('해당 반에 등록된 학생이 없습니다.');
      return;
    }

    if (confirm(`🚨 ${deleteGrade}학년 ${deleteClass}반 학생 전체(${targetStudents.length}명)를 삭제하시겠습니까?`)) {
      targetStudents.forEach((st) => movePhotoToAbsentFolder(st.id, true));

      const updatedList = students.filter(
        (s) => !(s.grade === deleteGrade && s.classNum === deleteClass)
      );

      await supabase
        .from('students')
        .delete()
        .eq('grade', deleteGrade)
        .eq('class_num', deleteClass);

      onStudentsUpdated(updatedList);
      alert(`${deleteGrade}학년 ${deleteClass}반 명단이 삭제되었습니다.`);
    }
  };

  const handleToggleAbsence = async (student: Student) => {
    if (!isDesktopApp) {
      alert(
        '⚠️ 사진 파일 자동 이동을 포함한 [결번 처리]는 학교 메인 PC(데스크톱 앱)에서만 실행 가능합니다.\n\n' +
        '스마트폰 및 웹 접속 환경에서는 사진 폴더 수정 권한이 제한되어 있어 결번 변경이 불가능합니다.'
      );
      return;
    }

    const isAbsence = student.name.includes('결번') || student.name.includes('궐번');
    const newName = isAbsence ? '학생명' : '결번';

    movePhotoToAbsentFolder(student.id, !isAbsence);

    const updatedList = students.map((s) =>
      s.id === student.id ? { ...s, name: newName } : s
    );

    await syncStudentsToSupabase(updatedList);
    onStudentsUpdated(updatedList);
  };

  const handleStartEdit = (student: Student) => {
    setEditingId(student.id);
    setEditName(student.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;

    const isAbsence = editName.includes('결번') || editName.includes('궐번');

    if (isAbsence && !isDesktopApp) {
      alert(
        '⚠️ 사진 파일 자동 이동을 포함한 [결번 처리]는 학교 메인 PC(데스크톱 앱)에서만 실행 가능합니다.\n\n' +
        '스마트폰 및 웹 접속 환경에서는 결번 처리가 제한됩니다.'
      );
      setEditingId(null);
      return;
    }

    movePhotoToAbsentFolder(id, isAbsence);

    const updatedList = students.map((s) =>
      s.id === id ? { ...s, name: editName.trim() } : s
    );

    await syncStudentsToSupabase(updatedList);
    onStudentsUpdated(updatedList);
    setEditingId(null);
  };

  const handleDeleteSingle = async (id: string) => {
    if (!isDesktopApp) {
      alert(
        '⚠️ 학생 삭제 및 사진 정리는 학교 메인 PC(데스크톱 앱)에서만 실행 가능합니다.'
      );
      return;
    }

    if (confirm('해당 학생을 삭제하시겠습니까?')) {
      movePhotoToAbsentFolder(id, true);

      const updatedList = students.filter((s) => s.id !== id);

      await supabase.from('students').delete().eq('id', id);
      onStudentsUpdated(updatedList);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (searchTerm.trim()) {
      return (
        s.id.includes(searchTerm.trim()) ||
        s.name.includes(searchTerm.trim()) ||
        `${s.grade}학년 ${s.classNum}반`.includes(searchTerm.trim())
      );
    }
    return s.grade === viewGrade && s.classNum === viewClass;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-2 pb-1">
      
      {/* 상단 3개 조작 블록 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        
        <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm space-y-1 flex flex-col justify-center">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 whitespace-nowrap">
              📁 학생 명단 파일 업로드
            </span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <button
                onClick={handleDownloadAllStudents}
                className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                📊 전체 받기
              </button>
              <span className="text-slate-300 text-[10px]">|</span>
              <button
                onClick={handleDownloadTemplate}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                📥 양식 받기
              </button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl py-0.5 px-2 text-center flex items-center justify-between transition-all ${
              isDragging ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <span className={`text-[10px] font-bold whitespace-nowrap ${isDragging ? 'text-blue-600' : 'text-slate-400'}`}>
              {isDragging ? '📂 파일 놓기!' : '명단 파일 드래그 (CSV)'}
            </span>
            <input
              type="file"
              id="student-file-upload"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="student-file-upload"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded-md cursor-pointer shrink-0 whitespace-nowrap"
            >
              업로드
            </label>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl px-3 py-1.5 shadow-sm flex flex-col justify-center space-y-1">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 whitespace-nowrap">
            ➕ 전입생 1명 즉시 추가
          </span>
          <form onSubmit={handleAddSingleStudent} className="flex items-center gap-1">
            <select
              value={singleGrade}
              onChange={(e) => {
                const g = Number(e.target.value);
                setSingleGrade(g);
                const maxClass = classCounts[g] || 10;
                if (singleClass > maxClass) setSingleClass(1);
              }}
              className="bg-white border border-emerald-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              {[1, 2, 3].map((g) => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>

            <select
              value={singleClass}
              onChange={(e) => setSingleClass(Number(e.target.value))}
              className="bg-white border border-emerald-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer min-w-[48px]"
            >
              {Array.from(
                { length: classCounts[singleGrade] || 10 },
                (_, i) => i + 1
              ).map((c) => (
                <option key={c} value={c}>{c}반</option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              max="50"
              value={singleNum}
              onChange={(e) => setSingleNum(Number(e.target.value))}
              className="w-10 border border-emerald-300 rounded-lg py-0.5 px-1 text-center font-bold text-xs bg-white focus:outline-none"
            />
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">번</span>

            <input
              type="text"
              placeholder="이름"
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              className="w-16 border border-emerald-300 rounded-lg px-1.5 py-0.5 font-bold text-xs bg-white focus:outline-none"
            />

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-lg text-xs shadow-sm shrink-0 cursor-pointer whitespace-nowrap transition-all"
            >
              등록
            </button>
          </form>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl px-3 py-1.5 shadow-sm flex flex-col justify-center space-y-1">
          <span className="text-xs font-bold text-rose-900 flex items-center gap-1 whitespace-nowrap">
            🧹 반별 / 학년별 일괄 삭제
          </span>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-1">
              <select
                value={deleteGrade}
                onChange={(e) => setDeleteGrade(Number(e.target.value))}
                className="bg-white border border-rose-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </select>
              <select
                value={deleteClass}
                onChange={(e) => setDeleteClass(Number(e.target.value))}
                className="bg-white border border-rose-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer min-w-[48px]"
              >
                {Array.from(
                  { length: classCounts[deleteGrade] || 10 },
                  (_, i) => i + 1
                ).map((c) => (
                  <option key={c} value={c}>{c}반</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleDeleteClassStudents}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-0.5 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-all"
            >
              🗑️ 삭제하기
            </button>
          </div>
        </div>

      </div>

      {/* 좌우 메인 영역 (590px 높이에 15행 가득 채움) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch h-[600px]">
        
        {/* 명단 붙여넣기 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm flex flex-col justify-between h-full">
          <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-100 pb-1 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1 whitespace-nowrap">
                  <span>📝</span> 명단 붙여넣기
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                  좌/우 어디서나 붙여넣기(Ctrl+V) 하시면 차례대로 분할되어 들어갑니다.
                </p>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={targetGrade}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    setTargetGrade(g);
                    const maxClass = classCounts[g] || 10;
                    if (targetClass > maxClass) setTargetClass(1);
                  }}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3].map((g) => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>

                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(Number(e.target.value))}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer min-w-[50px]"
                >
                  {Array.from(
                    { length: classCounts[targetGrade] || 10 },
                    (_, i) => i + 1
                  ).map((c) => (
                    <option key={c} value={c}>{c}반</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              <div className="flex flex-col space-y-1 min-h-0">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                  👉 1번 ~ 15번 영역
                </span>
                <textarea
                  placeholder={`1번부터 이름만 줄바꿈하여 붙여넣기`}
                  value={leftNamesText}
                  onChange={(e) => setLeftNamesText(e.target.value)}
                  className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col space-y-1 min-h-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                  👉 16번 ~ 30번+ 영역
                </span>
                <textarea
                  placeholder={`16번부터 이름만 줄바꿈하여 붙여넣기`}
                  value={rightNamesText}
                  onChange={(e) => setRightNamesText(e.target.value)}
                  className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyClassPaste}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-md shrink-0 mt-1.5 cursor-pointer whitespace-nowrap"
          >
            📋 {targetGrade}학년 {targetClass}반 명단 일괄 적용하기
          </button>
        </div>

        {/* 🎯 [밀착 정돈] 등록 명단 조회 및 수정 (스크롤바 없이 15개 가로 2열 30명 한눈에 보임) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm flex flex-col justify-between h-full">
          <div className="border-b border-slate-100 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shrink-0">
            <div>
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1 whitespace-nowrap">
                <span>✏️</span> 등록 명단 조회 및 수정
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                {searchTerm.trim() ? (
                  <span className="text-blue-600 font-bold">🔍 전체 학생 검색 결과 중</span>
                ) : (
                  <span>💡 선택한 학급의 학생 명단만 조회됩니다.</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={viewGrade}
                onChange={(e) => setViewGrade(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </select>
              <select
                value={viewClass}
                onChange={(e) => setViewClass(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer min-w-[50px]"
              >
                {Array.from(
                  { length: classCounts[viewGrade] || 10 },
                  (_, i) => i + 1
                ).map((c) => (
                  <option key={c} value={c}>{c}반</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="전체 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none w-20 shadow-sm shrink-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 mt-1 p-1 min-h-0">
            {filteredStudents.length === 0 ? (
              <div className="text-center text-slate-400 py-32 text-xs">
                {searchTerm.trim() ? '검색된 학생이 없습니다.' : `${viewGrade}학년 ${viewClass}반에 등록된 학생이 없습니다.`}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    onDoubleClick={() => handleStartEdit(s)}
                    className="py-0.5 px-1.5 bg-white border border-slate-200/80 rounded-lg flex justify-between items-center text-[11px] hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer gap-0.5 h-[31px]"
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="font-bold text-slate-400 text-[10px] shrink-0 font-mono whitespace-nowrap min-w-[20px]">
                        {s.number}번
                      </span>

                      {editingId === s.id ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-emerald-500 rounded px-1 py-0 text-[11px] font-bold text-slate-900 w-14 focus:outline-none bg-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(s.id)}
                            className="bg-emerald-600 text-white text-[9px] font-bold px-1 py-0.5 rounded whitespace-nowrap"
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <span className={`font-bold text-[11px] truncate ${
                          s.name.includes('결번') || s.name.includes('궐번')
                            ? 'text-rose-500 bg-rose-50 px-1 rounded'
                            : 'text-slate-900'
                        }`}>
                          {s.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleAbsence(s)}
                        title={!isDesktopApp ? '메인 PC 전용 기능입니다' : ''}
                        className={`text-[9px] font-bold px-1 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                          s.name.includes('결번') || s.name.includes('궐번')
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60'
                        }`}
                      >
                        {s.name.includes('결번') || s.name.includes('궐번') ? '복구' : '🚫 결번'}
                      </button>
                      <button
                        onClick={() => handleDeleteSingle(s.id)}
                        className="text-slate-400 hover:text-rose-600 text-[10px] p-0.5 cursor-pointer whitespace-nowrap"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudentManageTab;