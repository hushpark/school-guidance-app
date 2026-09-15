import React, { useState } from 'react';
import type { Student, ClassCounts } from '../types';

interface PhotoAlbumTabProps {
  students: Student[];
  classCounts: ClassCounts;
}

export const PhotoAlbumTab: React.FC<PhotoAlbumTabProps> = ({ students, classCounts }) => {
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<number>(1);

  // 🎯 결번 학생 판별 헬퍼 함수
  const isAbsentStudent = (student: Student) => {
    return student.name.includes('결번') || student.name.includes('궐번');
  };

  // 🎯 선택된 학년/반 실재학생만 추출 (결번 제외, 번호순 정렬)
  const currentClassStudents = students
    .filter((s) => s.grade === selectedGrade && s.classNum === selectedClass && !isAbsentStudent(s))
    .sort((a, b) => a.number - b.number);

  // 1️⃣ 엑셀(CSV) 저장 기능 (A4 세로 출력용 명단)
  const handleExportExcel = () => {
    if (currentClassStudents.length === 0) {
      alert('저장할 학생 명단이 없습니다.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += '학년,반,번호,이름\n';

    currentClassStudents.forEach((st) => {
      csvContent += `${st.grade},${st.classNum},${st.number},"${st.name}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedGrade}학년_${selectedClass}반_명단.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2️⃣ PDF 가로 출력 기능
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* 🖨️ 컨트롤 바 */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">🏫 학년:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {[1, 2, 3].map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">반:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {Array.from({ length: classCounts[selectedGrade] || 10 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  {c}반
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>📊</span> 엑셀 저장 (.csv)
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>🖨️</span> PDF 가로 출력
          </button>
        </div>
      </div>

      {/* 📄 인쇄 영역 */}
      <div className="print-area bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-4 border-b-2 border-slate-800 pb-2">
          <h1 className="text-lg font-black text-slate-900">
            {selectedGrade}학년 {selectedClass}반 학생 명단
          </h1>
          {/* 🎯 결번 제외 실재학생 수 표출 */}
          <p className="text-[10px] text-slate-500 font-mono">총 인원: {currentClassStudents.length}명</p>
        </div>

        <div className="grid grid-cols-6 gap-2 print-grid">
          {currentClassStudents.length === 0 ? (
            <div className="col-span-6 text-center py-12 text-slate-400 text-xs">등록된 학생이 없습니다.</div>
          ) : (
            currentClassStudents.map((st) => (
              <div
                key={st.id}
                className="border border-slate-300 rounded-lg p-2 flex flex-col items-center justify-center bg-slate-50/50 print-card text-center"
              >
                <div className="text-[11px] font-mono text-slate-400 font-bold mb-0.5">
                  {st.grade}-{st.classNum}-{String(st.number).padStart(2, '0')}
                </div>
                <div className="text-xs font-extrabold text-slate-800 truncate w-full">
                  {st.name}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .print-card {
            height: 32mm !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }
        }
      `}</style>
    </div>
  );
};