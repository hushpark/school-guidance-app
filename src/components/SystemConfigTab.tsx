import React, { useState, useEffect } from 'react';
import { supabase, clearSupabaseConfig } from '../lib/supabase';
import type { Student, ClassCounts, SchoolBranding, PhotoConfig } from '../types';
import { saveStoredStudents } from '../utils/studentStorage';
import { PromotionModal } from './config/PromotionModal';
import { BrandingConfigCard } from './config/BrandingConfigCard';
import { NetworkSecurityCard } from './config/NetworkSecurityCard';

interface SystemConfigTabProps {
  students: Student[];
  classCounts: ClassCounts;
  warningThreshold: number;
  focusThreshold: number;
  schoolBranding: SchoolBranding;
  photoConfig: PhotoConfig;
  onClassCountChange: (grade: number, count: number) => void;
  onThresholdChange: (warning: number, focus: number) => void;
  onStudentsUpdated: (newStudents: Student[]) => void;
  onResetPenalties: () => void;
  onSchoolBrandingChange: (branding: SchoolBranding) => void;
  onPhotoConfigChange: (config: PhotoConfig) => void;
  rulesPdfUrl?: string;
  onUpdateRulesPdfUrl?: (url: string) => void;
}

export const SystemConfigTab: React.FC<SystemConfigTabProps> = ({
  students,
  classCounts,
  warningThreshold,
  focusThreshold,
  schoolBranding,
  photoConfig,
  onClassCountChange,
  onThresholdChange,
  onStudentsUpdated,
  onResetPenalties,
  onSchoolBrandingChange,
  onPhotoConfigChange,
  rulesPdfUrl,
  onUpdateRulesPdfUrl,
}) => {
  const [warningInput, setWarningInput] = useState(warningThreshold);
  const [focusInput, setFocusInput] = useState(focusThreshold);

  const [autoLaunch, setAutoLaunch] = useState<boolean>(false);
  const [startHidden, setStartHidden] = useState<boolean>(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if ((window as any).electronAPI?.getAutoLaunchState) {
      (window as any).electronAPI.getAutoLaunchState().then((state: any) => {
        if (state) {
          setAutoLaunch(state.openAtLogin);
          setStartHidden(state.openAsHidden);
        }
      });
    }
  }, []);

  const saveConfigToSupabase = async (key: string, value: any) => {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const { error } = await supabase.from('settings').upsert(
        { key, value: stringValue, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) console.warn('settings 테이블 저장 참고:', error.message);
    } catch (err) {
      console.error('DB 동기화 오류:', err);
    }
  };

  const handleAutoLaunchToggle = async (enabled: boolean) => {
    setAutoLaunch(enabled);
    if ((window as any).electronAPI?.setAutoLaunch) {
      await (window as any).electronAPI.setAutoLaunch(enabled, startHidden);
    }
  };

  const handleStartHiddenToggle = async (hidden: boolean) => {
    setStartHidden(hidden);
    if ((window as any).electronAPI?.setAutoLaunch) {
      await (window as any).electronAPI.setAutoLaunch(autoLaunch, hidden);
    }
  };

  const handleResetDbConfig = () => {
    if (confirm('🔑 현재 연동된 Supabase DB Key를 삭제하고 초기화하시겠습니까?')) {
      clearSupabaseConfig();
    }
  };

  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('⚠️ PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (onUpdateRulesPdfUrl) {
        onUpdateRulesPdfUrl(result);
        saveConfigToSupabase('rules_pdf_url', result);
        alert('🎉 학생 생활 지도 규정 PDF가 성공적으로 등록되었습니다!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePdf = () => {
    if (confirm('📜 등록된 학생 생활 지도 규정 PDF를 삭제하시겠습니까?')) {
      if (onUpdateRulesPdfUrl) {
        onUpdateRulesPdfUrl('');
        saveConfigToSupabase('rules_pdf_url', '');
        alert('삭제되었습니다.');
      }
    }
  };

  const handleSaveThresholds = () => {
    if (warningInput >= focusInput) {
      alert('1단계(경고) 기준 횟수는 2단계(집중지도) 기준 횟수보다 작아야 합니다.');
      return;
    }
    onThresholdChange(warningInput, focusInput);
    saveConfigToSupabase('thresholds', {
      warning_threshold: warningInput,
      focus_threshold: focusInput,
    });
    alert(`지도 기준이 DB에 저장되었습니다!\n- 1단계 경고: ${warningInput}회\n- 2단계 집중지도: ${focusInput}회`);
  };

  const handleClassCountChangeAndSave = (grade: number, count: number) => {
    onClassCountChange(grade, count);
    const updatedCounts = { ...classCounts, [grade]: count };
    saveConfigToSupabase('class_counts', updatedCounts);
  };

  return (
    <div className="w-full h-full overflow-y-auto pb-10 p-2 md:p-4">
      {/* 🎯 전체 창 모드에서도 크기가 늘어나지 않도록 max-w-[1200px] 고정 및 mx-auto 중앙 정렬 */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_1fr] gap-3.5 items-stretch max-w-[1200px] mx-auto">

        {/* 📌 1열: 학교 브랜딩 및 실행 옵션 */}
        <div className="flex flex-col justify-between space-y-3.5 h-full min-w-0">
          <BrandingConfigCard
            schoolBranding={schoolBranding}
            onSchoolBrandingChange={onSchoolBrandingChange}
            saveConfigToSupabase={saveConfigToSupabase}
          />

          <div className="bg-white border border-slate-300 rounded-2xl p-3.5 shadow-sm space-y-2 shrink-0">
            <div className="border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1 truncate">
                <span>⚙️</span> 실행 옵션 (데스크톱)
              </h2>
            </div>
            <div className="space-y-2 text-[11px] pt-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-800 truncate">시작 시 자동 실행</span>
                <input
                  type="checkbox"
                  checked={autoLaunch}
                  onChange={(e) => handleAutoLaunchToggle(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer shrink-0"
                />
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
                <span className="font-bold text-slate-800 truncate">백그라운드 시작</span>
                <input
                  type="checkbox"
                  disabled={!autoLaunch}
                  checked={startHidden}
                  onChange={(e) => handleStartHiddenToggle(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer disabled:opacity-30 shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 📌 2열: 학급 수 설정 + 지도 수치 + 진급/초기화 카드들 */}
        <div className="flex flex-col justify-between space-y-3 h-full min-w-0">
          
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 shadow-sm space-y-1.5 shrink-0">
            <div className="border-b border-slate-200/60 pb-1">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span>🏢</span> 학년별 총 학급 수 설정
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {[1, 2, 3].map((g) => (
                <div key={g} className="bg-white border border-slate-300 rounded-2xl p-1.5 md:p-2 flex items-center justify-between shadow-2xs">
                  <span className="text-xs font-bold text-slate-800 shrink-0">{g}학년</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={classCounts[g as keyof ClassCounts] ?? 1}
                      onChange={(e) => handleClassCountChangeAndSave(g, Number(e.target.value))}
                      className="w-9 md:w-10 border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 py-0.5"
                    />
                    <span className="text-xs font-bold text-slate-800 shrink-0">반</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 shadow-sm space-y-1.5 shrink-0">
            <div className="border-b border-slate-200/60 pb-1 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span>🎯</span> 지도 단계별 기준 횟수
              </h2>
              <button 
                onClick={handleSaveThresholds} 
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded-lg text-xs cursor-pointer shadow-sm"
              >
                저장
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="bg-amber-50/80 border border-amber-300 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 shrink-0">1단계(경고)</span>
                <input
                  type="number"
                  value={warningInput}
                  onChange={(e) => setWarningInput(Number(e.target.value))}
                  className="w-12 border border-amber-300 rounded-lg text-center font-black text-xs bg-white focus:outline-none py-0.5"
                />
              </div>

              <div className="bg-rose-50/80 border border-rose-300 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-950 shrink-0">2단계(집중)</span>
                <input
                  type="number"
                  value={focusInput}
                  onChange={(e) => setFocusInput(Number(e.target.value))}
                  className="w-12 border border-rose-300 rounded-lg text-center font-black text-xs bg-white focus:outline-none py-0.5"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-3 shadow-md space-y-1.5 border border-slate-700 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 border-b border-slate-700 pb-1">
                <span className="text-sm">🔀</span>
                <h2 className="text-xs font-black text-white">새 학기 진급 학번 처리</h2>
              </div>
              <p className="text-[10px] text-slate-300 font-medium pt-0.5">
                새 학기 엑셀 명단을 붙여넣어 학번 일괄 변경 및 졸업 처리를 손쉽게 진행합니다.
              </p>
            </div>
            <button
              onClick={() => setIsPromotionModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
            >
              🚀 진급 학번 일괄 처리창 열기
            </button>
          </div>

          <div className="bg-white border border-slate-300 rounded-2xl p-2.5 shadow-sm space-y-1 shrink-0">
            <div className="border-b border-slate-200 pb-1 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1">📜 규정 PDF 등록</h2>
              {rulesPdfUrl ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">✓ 등록됨</span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">미등록</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-xl text-xs cursor-pointer text-center truncate">
                📁 규정 PDF 파일 선택
                <input type="file" accept="application/pdf" onChange={handlePdfFileUpload} className="hidden" />
              </label>
              {rulesPdfUrl && (
                <button onClick={handleDeletePdf} className="bg-rose-50 text-rose-600 border border-rose-200 font-bold px-2 py-1.5 rounded-xl text-xs">삭제</button>
              )}
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-2.5 shadow-sm space-y-1 shrink-0">
            <h2 className="text-xs font-black text-blue-950 flex items-center gap-1">🔑 학교 DB 연동 설정</h2>
            <button onClick={handleResetDbConfig} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-xl text-xs transition-all cursor-pointer">
              ⚡ DB Key 연동 해제 및 재설정하기
            </button>
          </div>

          <div className="bg-white border border-slate-300 rounded-2xl p-2.5 shadow-sm space-y-1 shrink-0">
            <h2 className="text-xs font-black text-slate-900">🚨 데이터 운영 초기화</h2>
            <div className="flex gap-2 text-xs">
              <button onClick={() => confirm('지도 내역을 초기화하시겠습니까?') && onResetPenalties()} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-xl cursor-pointer">지도 내역 초기화</button>
              <button onClick={() => confirm('전체 명단을 초기화하시겠습니까?') && (saveStoredStudents([]), onStudentsUpdated([]))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded-xl cursor-pointer">학생 명단 초기화</button>
            </div>
          </div>

        </div>

        {/* 📌 3열: 스마트폰 외부 접속 & 보안 제어 */}
        <div className="flex flex-col h-full min-w-0">
          <NetworkSecurityCard
            schoolBranding={schoolBranding}
            photoConfig={photoConfig}
            onSchoolBrandingChange={onSchoolBrandingChange}
            onPhotoConfigChange={onPhotoConfigChange}
            saveConfigToSupabase={saveConfigToSupabase}
          />
        </div>

      </div>

      <PromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        students={students}
        onStudentsUpdated={onStudentsUpdated}
      />

    </div>
  );
};

export default SystemConfigTab;