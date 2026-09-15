import React, { useState } from 'react';
import Papa from 'papaparse';
import type { Student, ClassCounts } from '../types';
import { saveStoredStudents, resetStoredStudents } from '../utils/studentStorage';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classCounts: ClassCounts;
  onClassCountChange: (grade: number, count: number) => void;
  onStudentsUpdated: (newStudents: Student[]) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  students,
  classCounts,
  onClassCountChange,
  onStudentsUpdated,
}) => {
  // 모달 내부 서브 탭 (명단 직접 수정/붙여넣기 vs CSV 일괄 업로드 vs 학급수 설정)
  const [activeSubTab, setActiveSubTab] = useState<'paste' | 'csv' | 'class'>('paste');

  // 엑셀 붙여넣기 상태
  const [pasteGrade, setPasteGrade] = useState<number>(1);
  const [pasteClass, setPasteClass] = useState<number>(1);
  const [pasteText, setPasteText] = useState('');

  // 개별 전입생 추가 상태
  const [newGrade, setNewGrade] = useState<number>(1);
  const [newClass, setNewClass] = useState<number>(1);
  const [newNumber, setNewNumber] = useState<number>(1);
  const [newName, setNewName] = useState<string>('');

  // 검색 및 수정 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ grade: number; classNum: number; number: number; name: string }>({
    grade: 1,
    classNum: 1,
    number: 1,
    name: '',
  });

  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  // 1️⃣ 엑셀 붙여넣기 반영
  const handleApplyPaste = () => {
    if (!pasteText.trim()) {
      alert('붙여넣을 엑셀 명단을 입력해 주세요.');
      return;
    }

    const lines = pasteText
      .split(/\r\n|\n|\r/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let updated = [...students];

    lines.forEach((name, index) => {
      const num = index + 1;
      const formattedClass = String(pasteClass).padStart(2, '0');
      const formattedNumber = String(num).padStart(2, '0');
      const autoId = `${pasteGrade}${formattedClass}${formattedNumber}`;

      const existingIndex = updated.findIndex((s) => s.id === autoId);
      if (existingIndex !== -1) {
        updated[existingIndex] = { ...updated[existingIndex], name };
      } else {
        updated.push({
          id: autoId,
          grade: pasteGrade,
          classNum: pasteClass,
          number: num,
          name,
        });
      }
    });

    saveStoredStudents(updated);
    onStudentsUpdated(updated);
    setPasteText('');
    alert(`${pasteGrade}학년 ${pasteClass}반 총 ${lines.length}명의 명단이 반영되었습니다!`);
  };

  // 2️⃣ 개별 전입생 추가
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('이름을 입력하세요.');
      return;
    }

    const formattedClass = String(newClass).padStart(2, '0');
    const formattedNumber = String(newNumber).padStart(2, '0');
    const autoId = `${newGrade}${formattedClass}${formattedNumber}`;

    const newStudent: Student = {
      id: autoId,
      grade: newGrade,
      classNum: newClass,
      number: newNumber,
      name: newName.trim(),
    };

    const updated = [...students.filter((s) => s.id !== autoId), newStudent].sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    saveStoredStudents(updated);
    onStudentsUpdated(updated);
    setNewName('');
    setNewNumber((prev) => prev + 1);
    alert(`${newGrade}학년 ${newClass}반 ${newNumber}번 ${newName} 학생이 추가되었습니다.`);
  };

  // 3️⃣ 개별 수정 저장
  const handleSaveEdit = (originalId: string) => {
    if (!editForm.name.trim()) return;

    const formattedClass = String(editForm.classNum).padStart(2, '0');
    const formattedNumber = String(editForm.number).padStart(2, '0');
    const newId = `${editForm.grade}${formattedClass}${formattedNumber}`;

    const updated = students.map((s) => {
      if (s.id === originalId) {
        return {
          ...s,
          id: newId,
          grade: editForm.grade,
          classNum: editForm.classNum,
          number: editForm.number,
          name: editForm.name.trim(),
        };
      }
      return s;
    });

    saveStoredStudents(updated);
    onStudentsUpdated(updated);
    setEditingStudentId(null);
  };

  // 4️⃣ 결번 및 삭제 처리
  const handleSetMissing = (id: string) => {
    const updated = students.map((s) => (s.id === id ? { ...s, name: '결번' } : s));
    saveStoredStudents(updated);
    onStudentsUpdated(updated);
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`${name} 학생을 지우시겠습니까?`)) {
      const updated = students.filter((s) => s.id !== id);
      saveStoredStudents(updated);
      onStudentsUpdated(updated);
    }
  };

  // 5️⃣ CSV 일괄 파싱
  const downloadCSVSample = () => {
    const csvContent = "\uFEFF학년,반,번호,이름\n1,1,1,홍길동\n1,1,2,결번\n1,1,3,강감찬\n1,2,1,이순신";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '학생명단_양식.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents: Student[] = [];
        results.data.forEach((row: any) => {
          const name = row['이름'] || row['name'];
          const grade = parseInt(row['학년'] || row['grade'], 10);
          const classNum = parseInt(row['반'] || row['classNum'], 10);
          const number = parseInt(row['번호'] || row['number'], 10);

          if (name && !isNaN(grade) && !isNaN(classNum) && !isNaN(number)) {
            const formattedClass = String(classNum).padStart(2, '0');
            const formattedNumber = String(number).padStart(2, '0');
            const autoId = `${grade}${formattedClass}${formattedNumber}`;
            parsedStudents.push({
              id: autoId,
              name: String(name).trim(),
              grade,
              classNum,
              number,
            });
          }
        });

        if (parsedStudents.length === 0) {
          alert('올바른 학생 데이터를 찾을 수 없습니다.');
          return;
        }

        saveStoredStudents(parsedStudents);
        onStudentsUpdated(parsedStudents);
        alert(`총 ${parsedStudents.length}명의 학생 명단이 적용되었습니다!`);
      },
    });
  };

  const filteredStudents = students.filter(
    (s) => s.name.includes(searchQuery) || s.id.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 relative border border-slate-100 max-h-[90vh] flex flex-col">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-slate-400 hover:text-slate-600 font-bold text-lg"
        >
          ✕
        </button>

        {/* 헤더 */}
        <div>
          <h3 className="text-lg font-bold text-slate-900">⚙️ 학교/명단 종합 설정 (통합 관리자)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            명단 직접 수정, 엑셀 붙여넣기, CSV 일괄 파일 업로드, 학급 수를 한곳에서 설정합니다.
          </p>
        </div>

        {/* 통합 상단 서브 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubTab('paste')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            ✍️ 직접 수정 & 엑셀 붙여넣기
          </button>
          <button
            onClick={() => setActiveSubTab('csv')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'csv' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            📁 CSV 파일 일괄 업로드
          </button>
          <button
            onClick={() => setActiveSubTab('class')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'class' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            🏫 학년별 학급 수 설정
          </button>
        </div>

        {/* [서브탭 1] 직접 수정 & 엑셀 붙여넣기 */}
        {activeSubTab === 'paste' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* 좌측: 엑셀 통 붙여넣기 & 전입생 추가 */}
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-800 flex justify-between items-center">
                  <span>📋 엑셀 명단 통째로 붙여넣기</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={pasteGrade}
                      onChange={(e) => setPasteGrade(Number(e.target.value))}
                      className="bg-white border rounded px-1 py-0.5 text-xs font-bold"
                    >
                      {[1, 2, 3].map((g) => (<option key={g} value={g}>{g}학년</option>))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={pasteClass}
                      onChange={(e) => setPasteClass(Number(e.target.value))}
                      className="w-10 border rounded px-1 py-0.5 text-center text-xs font-bold"
                    />
                    <span className="text-xs">반</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="엑셀에서 학생 이름 열을 복사(Ctrl+C)하여 여기에 붙여넣기(Ctrl+V) 하세요."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none"
                />
                <button
                  onClick={handleApplyPaste}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 rounded-xl text-xs transition-all shadow"
                >
                  📥 해당 반 명단 일괄 적용
                </button>
              </div>

              <form onSubmit={handleAddSingleStudent} className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-emerald-900">➕ 전입생 1명 개별 추가</div>
                <div className="flex items-center gap-1 text-xs">
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="bg-white border rounded px-1 py-0.5 font-bold"
                  >
                    {[1, 2, 3].map((g) => (<option key={g} value={g}>{g}학년</option>))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newClass}
                    onChange={(e) => setNewClass(Number(e.target.value))}
                    className="w-10 border rounded px-1 py-0.5 text-center font-bold"
                  />
                  <span>반</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newNumber}
                    onChange={(e) => setNewNumber(Number(e.target.value))}
                    className="w-10 border rounded px-1 py-0.5 text-center font-bold"
                  />
                  <span>번</span>
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="이름 입력"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-white border rounded px-2 py-1 text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-xs"
                  >
                    등록
                  </button>
                </div>
              </form>
            </div>

            {/* 우측: 전체 명단 검색 및 수정 */}
            <div className="flex flex-col h-full overflow-hidden space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">✏️ 개별 명단 수정/결번</span>
                <input
                  type="text"
                  placeholder="학번/이름 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold w-36 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 max-h-[280px]">
                {filteredStudents.map((st) => {
                  const isEditing = editingStudentId === st.id;
                  return (
                    <div key={st.id} className="p-2 bg-white flex items-center justify-between text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 mr-1">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-20 border rounded px-1 py-0.5 font-bold text-emerald-700"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{st.id}</span>
                          <span className="font-bold text-slate-800">{st.grade}-{st.classNum}-{st.number}</span>
                          <span className={`font-bold ${st.name.includes('결번') ? 'text-rose-500' : 'text-slate-900'}`}>{st.name}</span>
                        </div>
                      )}

                      <div className="flex gap-1 shrink-0">
                        {isEditing ? (
                          <button onClick={() => handleSaveEdit(st.id)} className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">저장</button>
                        ) : (
                          <>
                            <button onClick={() => { setEditingStudentId(st.id); setEditForm({ grade: st.grade, classNum: st.classNum, number: st.number, name: st.name }); }} className="bg-slate-100 border px-1.5 py-0.5 rounded text-[10px] font-bold">수정</button>
                            <button onClick={() => handleSetMissing(st.id)} className="bg-rose-50 text-rose-700 border px-1.5 py-0.5 rounded text-[10px] font-bold">결번</button>
                            <button onClick={() => handleDeleteStudent(st.id, st.name)} className="text-slate-400 hover:text-rose-600 px-1">🗑️</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* [서브탭 2] CSV 일괄 파일 업로드 */}
        {activeSubTab === 'csv' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">엑셀 기본 양식 다운로드</div>
                <div className="text-[11px] text-slate-500">학년, 반, 번호, 이름 형식</div>
              </div>
              <button onClick={downloadCSVSample} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">📥 양식 받기</button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) processCSV(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <div className="text-3xl">📄</div>
              <div className="text-xs font-bold text-slate-700 mt-2">엑셀(.csv) 파일을 이곳으로 끌어다 놓으세요</div>
              <label className="mt-3 inline-block bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                파일 선택하기
                <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && processCSV(e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* [서브탭 3] 학년별 학급 수 설정 */}
        {activeSubTab === 'class' && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4 flex-1">
            <div className="text-xs font-bold text-emerald-900">🏫 학년별 학급 수 설정 (총 몇 반까지 있나요?)</div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((grade) => (
                <div key={grade} className="bg-white p-4 rounded-2xl border border-emerald-100 text-center shadow-sm">
                  <label className="block text-xs font-bold text-slate-600 mb-2">{grade}학년</label>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={classCounts[grade] || 10}
                      onChange={(e) => onClassCountChange(grade, parseInt(e.target.value, 10) || 1)}
                      className="w-16 text-center font-mono font-bold text-emerald-700 bg-slate-50 border border-slate-300 rounded-xl py-1.5 text-base focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">반</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs shrink-0">
          <span className="text-slate-400 font-bold">현재 등록 학생: {students.length}명</span>
          <button
            onClick={() => {
              if (confirm('기존 데이터를 지우고 기본 샘플 데이터로 복원하시겠습니까?')) {
                onStudentsUpdated(resetStoredStudents());
                alert('기본 데이터로 복원되었습니다.');
              }
            }}
            className="text-rose-600 hover:underline font-semibold text-[11px]"
          >
            기본 명단으로 초기화
          </button>
        </div>
      </div>
    </div>
  );
};