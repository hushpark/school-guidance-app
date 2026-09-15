import React, { useState } from 'react';
import type { Student, ClassCounts } from '../types';

interface PhotoSearchTabProps {
  students: Student[];
  classCounts: ClassCounts;
}

export const PhotoSearchTab: React.FC<PhotoSearchTabProps> = ({
  students,
  classCounts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 🎯 결번 학생 판별 헬퍼 함수
  const isAbsentStudent = (student: Student) => {
    return student.name.includes('결번') || student.name.includes('궐번');
  };

  // 🎯 결번 제외 실재학생만 필터링
  const activeStudents = students.filter((s) => !isAbsentStudent(s));

  const isSearchMode = searchQuery.trim().length > 0;
  const filteredStudents = activeStudents.filter((s) => {
    if (isSearchMode) {
      return s.name.includes(searchQuery.trim()) || s.id.includes(searchQuery.trim());
    }
    return s.grade === selectedGrade && s.classNum === selectedClass;
  });

  const getPhotoUrl = (photoUrl?: string, id?: string) => {
    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      return photoUrl;
    }

    const cleanPath = `/photos/${id}.jpg`;

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return `http://localhost:5173${cleanPath}`;
    }

    return cleanPath;
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load error for ${src}`));
      document.head.appendChild(script);
    });
  };

  const handleDownloadPhotosZip = async () => {
    if (filteredStudents.length === 0) {
      alert('다운로드할 학생 사진이 없습니다.');
      return;
    }

    setIsDownloading(true);

    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');

      const JSZipLib = (window as any).JSZip;
      const saveAsLib = (window as any).saveAs;

      if (!JSZipLib || !saveAsLib) {
        throw new Error('압축 라이브러리를 불러오지 못했습니다.');
      }

      const zip = new JSZipLib();
      const folderName = isSearchMode
        ? '검색결과_학생사진'
        : `${selectedGrade}학년_${selectedClass}반_학생사진`;
      const photoFolder = zip.folder(folderName);

      let successCount = 0;

      for (const student of filteredStudents) {
        try {
          const photoUrl = getPhotoUrl(student.photoUrl, student.id);
          const response = await fetch(photoUrl);
          if (!response.ok) throw new Error('사진 불러오기 실패');

          const blob = await response.blob();
          const fileName = `${student.id}_${student.name}.jpg`;

          if (photoFolder) {
            photoFolder.file(fileName, blob);
            successCount++;
          }
        } catch (err) {
          console.warn(`${student.name}(${student.id}) 사진 다운로드 실패:`, err);
        }
      }

      if (successCount === 0) {
        alert('⚠️ 다운로드 가능한 학생 사진 파일이 없습니다.');
        setIsDownloading(false);
        return;
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAsLib(zipContent, `${folderName}.zip`);
      alert(`🎉 총 ${successCount}명의 학생 사진이 압축파일(${folderName}.zip) 1개로 다운로드되었습니다!`);
    } catch (error) {
      console.error(error);
      alert('⚠️ 압축파일 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-110px)] overflow-hidden">
      
      <div className="no-print bg-white border border-slate-200 rounded-3xl p-4 md:p-6 shadow-sm space-y-3 shrink-0 mb-3 md:mb-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-full md:w-auto flex-1 max-w-md relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">
              🔍 학생 사진 검색 (이름 또는 학번)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="예: 홍길동 또는 10101"
                value={searchQuery}
                onChange={(e) => {
                  setSelectedStudent(null);
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-slate-50 border-2 border-emerald-300 rounded-2xl px-3.5 py-2 text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold w-5 h-5 rounded-full cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <button
              onClick={handleDownloadPhotosZip}
              disabled={isDownloading}
              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-400 whitespace-nowrap"
            >
              <span>🖼️</span> {isDownloading ? '⏳ 생성 중...' : '사진만 받기 (.zip)'}
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>🖨️</span> PDF 가로 출력
            </button>
          </div>
        </div>

        {!isSearchMode && (
          <div className="pt-0.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
              {[1, 2, 3].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3.5 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 w-full sm:w-auto">
              {Array.from({ length: classCounts[selectedGrade] || 10 }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedClass === c
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {c}반
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="print-area flex-1 overflow-y-auto pr-1 pb-10">
        <div className="hidden print-header text-center mb-3 border-b-2 border-slate-800 pb-2">
          <h1 className="text-lg font-black text-slate-900">
            {isSearchMode
              ? `학생 사진 검색 결과 (${filteredStudents.length}명)`
              : `${selectedGrade}학년 ${selectedClass}반 학생 명부 (${filteredStudents.length}명)`}
          </h1>
        </div>

        <div className="mb-2 px-1 flex justify-between items-center no-print">
          <h3 className="text-xs font-bold text-slate-500 whitespace-nowrap">
            {isSearchMode
              ? `🔍 검색 결과 (${filteredStudents.length}명)`
              : `📸 ${selectedGrade}학년 ${selectedClass}반 학생 명부 (${filteredStudents.length}명)`}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4 print-grid">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-16 bg-white border border-slate-200 rounded-3xl text-xs">
              검색 조건에 맞는 학생이 없습니다.
            </div>
          ) : (
            filteredStudents.map((st) => (
              <div
                key={st.id}
                onClick={() => setSelectedStudent(st)}
                className={`bg-white border rounded-2xl md:rounded-3xl p-2.5 md:p-3.5 text-center space-y-1.5 cursor-pointer transition-all hover:shadow-lg relative group print-card ${
                  selectedStudent?.id === st.id
                    ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-102'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="relative w-16 md:w-20 h-[85px] md:h-[106px] mx-auto print-photo">
                  <img
                    src={getPhotoUrl(st.photoUrl, st.id)}
                    alt={st.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.endsWith('.jpg')) {
                        target.src = getPhotoUrl(undefined, st.id).replace('.jpg', '.png');
                      } else {
                        target.style.display = 'none';
                        const fallback = document.getElementById(`photo-fallback-${st.id}`);
                        if (fallback) fallback.style.display = 'flex';
                      }
                    }}
                    className="w-16 md:w-20 h-[85px] md:h-[106px] rounded-xl md:rounded-2xl object-cover object-top mx-auto border border-slate-200 shadow-sm group-hover:scale-105 transition-all print-img"
                  />

                  <div
                    id={`photo-fallback-${st.id}`}
                    style={{ display: 'none' }}
                    className="w-16 md:w-20 h-[85px] md:h-[106px] rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl mx-auto border shadow-sm bg-slate-100 text-slate-600 border-slate-200"
                  >
                    {st.name[0]}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs md:text-base whitespace-nowrap text-slate-900">
                    {st.name}
                  </div>
                  <div className="text-[10px] md:text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {st.grade}학년 {st.classNum}반 {st.number}번
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="no-print fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-fade-in relative text-center">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <img
              src={getPhotoUrl(selectedStudent.photoUrl, selectedStudent.id)}
              alt={selectedStudent.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('.jpg')) {
                  target.src = getPhotoUrl(undefined, selectedStudent.id).replace('.jpg', '.png');
                } else {
                  target.style.display = 'none';
                  const fb = document.getElementById(`modal-fallback-${selectedStudent.id}`);
                  if (fb) fb.style.display = 'flex';
                }
              }}
              className="w-36 h-48 rounded-3xl object-cover object-top mx-auto border-2 border-emerald-500 shadow-md"
            />
            <div
              id={`modal-fallback-${selectedStudent.id}`}
              style={{ display: 'none' }}
              className="w-36 h-48 rounded-3xl bg-emerald-100 text-emerald-700 font-black text-5xl flex items-center justify-center mx-auto border-2 border-emerald-300"
            >
              {selectedStudent.name[0]}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">{selectedStudent.name}</h3>
              <p className="text-sm font-medium text-slate-600">
                {selectedStudent.grade}학년 {selectedStudent.classNum}반 {selectedStudent.number}번
              </p>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm; }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-area, .print-area * { visibility: visible; }
          .print-header { display: block !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(6, minmax(0, 1fr)) !important; gap: 4px !important; }
          .print-card { height: 33mm !important; padding: 3px !important; border: 1px solid #cbd5e1 !important; border-radius: 8px !important; box-shadow: none !important; display: flex !important; flex-direction: column !important; justify-content: center !important; items-align: center !important; }
          .print-photo { width: 16mm !important; height: 21.3mm !important; }
          .print-img { width: 16mm !important; height: 21.3mm !important; border-radius: 4px !important; object-fit: cover !important; object-position: top !important; }
        }
      `}</style>
    </div>
  );
};

export default PhotoSearchTab;