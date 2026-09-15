import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Student } from '../../types';
import { saveStoredStudents } from '../../utils/studentStorage';

interface PromotionResult {
  oldId: string;
  newId: string;
  name: string;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onStudentsUpdated: (newStudents: Student[]) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  students,
  onStudentsUpdated,
}) => {
  const [promotionText, setPromotionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [appliedPromotionResults, setAppliedPromotionResults] = useState<PromotionResult[]>([]);

  if (!isOpen) return null;

  const parsePromotionPreview = () => {
    if (!promotionText.trim()) return [];
    const lines = promotionText.split(/\r\n|\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0);
    const previewList: PromotionResult[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[\t\s]+/).map((p) => p.trim()).filter((p) => p.length > 0);

      if (parts.length >= 2) {
        const oldId = parts[0];
        const rawNewId = parts[parts.length - 1];

        const matchedStudent = students.find((s) => s.id === oldId);
        const name = matchedStudent ? matchedStudent.name : (parts.length >= 3 ? parts[1] : '(미등록)');

        const isGraduated = rawNewId.includes('졸업') || rawNewId === '0';
        const displayNewId = isGraduated ? '🎓 졸업' : rawNewId;

        previewList.push({ oldId, newId: displayNewId, name });
      }
    });
    return previewList;
  };

  const previewData = parsePromotionPreview();

  const handleApplyPromotion = async () => {
    if (previewData.length === 0) {
      alert('진급 매칭 명단(이전 학번과 새 학번)을 붙여넣어 주세요.');
      return;
    }

    setIsProcessing(true);
    let updatedStudents = [...students];
    const resultsLog: PromotionResult[] = [];

    previewData.forEach(({ oldId, newId }) => {
      if (newId.includes('졸업')) {
        updatedStudents = updatedStudents.filter((s) => s.id !== oldId);
        return;
      }

      const studentIndex = updatedStudents.findIndex((s) => s.id === oldId);
      if (studentIndex !== -1 && newId.length >= 5) {
        const newGrade = parseInt(newId.substring(0, 1), 10);
        const newClass = parseInt(newId.substring(1, 3), 10);
        const newNum = parseInt(newId.substring(3, 5), 10);

        if (!isNaN(newGrade) && !isNaN(newClass) && !isNaN(newNum)) {
          const studentName = updatedStudents[studentIndex].name;
          const newPhotoUrl = `/photos/${newId}.jpg`;

          updatedStudents[studentIndex] = {
            ...updatedStudents[studentIndex],
            id: newId,
            grade: newGrade,
            classNum: newClass,
            number: newNum,
            photoUrl: newPhotoUrl,
          };
          resultsLog.push({ oldId, newId, name: studentName });
        }
      }
    });

    updatedStudents.sort((a, b) => a.id.localeCompare(b.id));

    try {
      await supabase.from('students').upsert(
        updatedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          class_num: s.classNum,
          number: s.number,
          photo_url: `/photos/${s.id}.jpg`,
        }))
      );
    } catch (e) {
      console.error(e);
    }

    saveStoredStudents(updatedStudents);
    onStudentsUpdated(updatedStudents);
    setAppliedPromotionResults(resultsLog);
    setIsProcessing(false);
    alert(`🎉 진급 처리가 완료되었습니다! (이동 반영: ${resultsLog.length}명)`);
  };

  const handleDownloadRenameScript = () => {
    if (appliedPromotionResults.length === 0) return;
    let batContent = '@echo off\r\nchcp 65001 > nul\r\n';
    appliedPromotionResults.forEach(({ oldId, newId }) => {
      batContent += `if exist "${oldId}.jpg" ren "${oldId}.jpg" "${newId}.jpg"\r\n`;
    });
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = '사진파일명_새학번_일괄변경.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔀</span>
            <h3 className="text-base font-black text-slate-900">새 학기 진급 학번 일괄 처리</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto min-h-[350px]">
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>1. 엑셀 진급 명단 붙여넣기</span>
              <span className="text-[10px] text-slate-400 font-normal">엑셀 2~3열 복사</span>
            </label>
            <textarea
              placeholder={`[엑셀 복사/붙여넣기 예시]\n10101   20101\n10102   홍길동   20102\n30101   졸업`}
              value={promotionText}
              onChange={(e) => setPromotionText(e.target.value)}
              className="w-full flex-1 min-h-[260px] bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-mono resize-none focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>2. 실시간 매칭 검증 결과</span>
              <span className="text-[10px] font-bold text-blue-600">{previewData.length}명 매칭 감지</span>
            </label>
            <div className="flex-1 min-h-[260px] max-h-[300px] overflow-y-auto border border-slate-300 rounded-2xl bg-slate-50 p-2">
              {previewData.length === 0 ? (
                <div className="text-center text-slate-400 h-full flex flex-col items-center justify-center text-xs p-4 space-y-1">
                  <span className="text-2xl">📋</span>
                  <span>좌측 영역에 엑셀 명단을 붙여넣으시면</span>
                  <span>실시간 변경 미리보기가 표시됩니다.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {previewData.map((item, idx) => (
                    <div key={idx} className="p-2 flex justify-between text-xs items-center hover:bg-white rounded-lg transition-colors">
                      <span className="w-1/3 font-mono font-bold text-slate-500">{item.oldId}</span>
                      <span className="w-1/3 text-center font-bold text-slate-900 truncate">{item.name}</span>
                      <span className={`w-1/3 text-right font-mono font-bold ${item.newId.includes('졸업') ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ➔ {item.newId}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200 pt-3 shrink-0">
          <div className="w-full sm:w-auto">
            {appliedPromotionResults.length > 0 ? (
              <button onClick={handleDownloadRenameScript} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                <span>📂</span>
                <span>사진 파일명 자동 변경 스크립트 (.bat) 다운로드</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">* 진급 반영 완료 후 학생 사진 일괄 변경(.bat) 파일이 제공됩니다.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer">
              취소
            </button>
            <button
              onClick={handleApplyPromotion}
              disabled={isProcessing || previewData.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? '⏳ 진급 반영 중...' : `🚀 진급 매칭 최종 반영하기 (${previewData.length}명)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};