import React, { useState, useRef } from 'react';
import type { SchoolBranding } from '../../types';

interface BrandingConfigCardProps {
  schoolBranding: SchoolBranding;
  onSchoolBrandingChange: (branding: SchoolBranding) => void;
  saveConfigToSupabase: (key: string, value: any) => Promise<void>;
}

const PRESET_COLORS = ['transparent', '#ffffff', '#d1fae5', '#dbeafe', '#fef3c7', '#fce7f3'];

export const BrandingConfigCard: React.FC<BrandingConfigCardProps> = ({
  schoolBranding,
  onSchoolBrandingChange,
  saveConfigToSupabase,
}) => {
  const [schoolNameInput, setSchoolNameInput] = useState(schoolBranding.schoolName);
  const [logoTypeInput, setLogoTypeInput] = useState<'emoji' | 'image' | 'file'>(schoolBranding.logoType || 'emoji');
  const [logoValueInput, setLogoValueInput] = useState(schoolBranding.logoValue);
  const [logoBgColorInput, setLogoBgColorInput] = useState<string>(schoolBranding.logoBgColor || 'transparent');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const colorInputRef = useRef<HTMLInputElement>(null);

  const updateRealtimeBranding = (field: Partial<SchoolBranding>) => {
    const updated: SchoolBranding = {
      ...schoolBranding,
      schoolName: field.schoolName !== undefined ? field.schoolName : schoolNameInput,
      logoType: field.logoType !== undefined ? field.logoType : logoTypeInput,
      logoValue: field.logoValue !== undefined ? field.logoValue : logoValueInput,
      logoBgColor: field.logoBgColor !== undefined ? field.logoBgColor : logoBgColorInput,
    };
    onSchoolBrandingChange(updated);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoValueInput(result);
      updateRealtimeBranding({ logoValue: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    const updated: SchoolBranding = {
      ...schoolBranding,
      schoolName: schoolNameInput.trim() || '양현고등학교',
      logoType: logoTypeInput,
      logoValue: logoValueInput.trim() || (logoTypeInput === 'emoji' ? '⚖️' : ''),
      logoBgColor: logoBgColorInput,
    };
    onSchoolBrandingChange(updated);
    saveConfigToSupabase('school_branding', updated);
    alert('🎉 학교 정보 및 로고 설정이 성공적으로 저장되었습니다!');
  };

  const openColorPicker = () => {
    const el = colorInputRef.current;
    if (el) {
      if ('showPicker' in el && typeof (el as any).showPicker === 'function') {
        try { (el as any).showPicker(); } catch { el.click(); }
      } else {
        el.click();
      }
    }
  };

  const isTransparent = !logoBgColorInput || logoBgColorInput === 'transparent';
  const isPresetColor = PRESET_COLORS.includes(logoBgColorInput);

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between flex-1 space-y-3">
      <div className="border-b border-slate-200 pb-2 shrink-0">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
          <span>🏛️</span> 학교 정보 및 로고 설정
        </h2>
      </div>

      <div className="flex flex-col space-y-3 flex-1 justify-around text-xs">
        {/* 학교명 */}
        <div className="space-y-1">
          <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
            <span>🏫</span> 학교명
          </span>
          <input
            type="text"
            placeholder="예: 양현고"
            value={schoolNameInput}
            onChange={(e) => {
              const val = e.target.value;
              setSchoolNameInput(val);
              updateRealtimeBranding({ schoolName: val });
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-slate-600 shadow-inner"
          />
        </div>

        {/* 로고 선택 */}
        <div className="space-y-1">
          <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
            <span>🖼️</span> 로고 선택
          </span>
          <select
            value={logoTypeInput}
            onChange={(e) => {
              const newType = e.target.value as 'emoji' | 'image' | 'file';
              setLogoTypeInput(newType);
              let newVal = logoValueInput;
              if (newType === 'emoji' && !logoValueInput) newVal = '⚖️';
              setLogoValueInput(newVal);
              updateRealtimeBranding({ logoType: newType, logoValue: newVal });
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="emoji">대표 이모지</option>
            <option value="image">웹 이미지(URL)</option>
            <option value="file">📁 직접 파일 등록</option>
          </select>
        </div>

        {/* 복원: 이미지 URL 또는 파일 업로드 영역 */}
        {logoTypeInput === 'image' && (
          <div className="space-y-1">
            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
              <span>🔗</span> 로고 이미지 URL
            </span>
            <input
              type="text"
              placeholder="https://..."
              value={logoValueInput}
              onChange={(e) => {
                const val = e.target.value;
                setLogoValueInput(val);
                updateRealtimeBranding({ logoValue: val });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-[11px] text-slate-900 focus:outline-none"
            />
          </div>
        )}

        {logoTypeInput === 'file' && (
          <div className="space-y-1">
            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
              <span>📁</span> 로고 이미지 파일
            </span>
            <div className="flex items-center gap-2">
              <label className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shrink-0 transition-all">
                파일 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] font-medium text-slate-500 truncate">
                {selectedFileName || '선택된 파일 없음'}
              </span>
            </div>
          </div>
        )}

        {/* 로고 배경색 */}
        <div className="space-y-1">
          <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px]">
            <span>🎨</span> 로고 배경색
          </span>
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl border border-slate-400 flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden shadow-inner"
              style={{ backgroundColor: isTransparent ? '#ffffff' : logoBgColorInput }}
            >
              {logoTypeInput === 'emoji' ? (
                logoValueInput || '⚖️'
              ) : logoValueInput ? (
                <img src={logoValueInput} alt="logo" className="w-full h-full object-contain" />
              ) : (
                '🏫'
              )}
            </div>
            <select
              value={isTransparent ? 'transparent' : isPresetColor ? logoBgColorInput : 'custom'}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'custom') {
                  setLogoBgColorInput(val);
                  updateRealtimeBranding({ logoBgColor: val });
                }
              }}
              className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 cursor-pointer"
            >
              <option value="transparent">⚪ 투명</option>
              <option value="#ffffff">⬜ 흰색</option>
              <option value="#d1fae5">🟢 에메랄드</option>
              <option value="#dbeafe">🔵 파란색</option>
            </select>

            <button
              type="button"
              onClick={openColorPicker}
              className="hover:bg-slate-200 text-slate-800 font-bold px-2 py-1.5 border border-slate-300 rounded-xl text-xs cursor-pointer shrink-0"
            >
              🎨
            </button>

            <input
              ref={colorInputRef}
              type="color"
              value={logoBgColorInput.startsWith('#') ? logoBgColorInput : '#ffffff'}
              onChange={(e) => {
                const val = e.target.value;
                setLogoBgColorInput(val);
                updateRealtimeBranding({ logoBgColor: val });
              }}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSaveBranding}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0 mt-2"
      >
        💾 학교 설정 저장
      </button>
    </div>
  );
};