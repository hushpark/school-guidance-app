import React, { useState } from 'react';
import type { SchoolBranding, PhotoConfig, BlockExternalAccessConfig } from '../../types';

interface NetworkSecurityCardProps {
  schoolBranding: SchoolBranding;
  photoConfig: PhotoConfig;
  onSchoolBrandingChange: (branding: SchoolBranding) => void;
  onPhotoConfigChange: (config: PhotoConfig) => void;
  saveConfigToSupabase: (key: string, value: any) => Promise<void>;
}

export const NetworkSecurityCard: React.FC<NetworkSecurityCardProps> = ({
  schoolBranding,
  photoConfig,
  onSchoolBrandingChange,
  onPhotoConfigChange,
  saveConfigToSupabase,
}) => {
  const [addressType, setAddressType] = useState<'dynamic' | 'fixed'>(schoolBranding.addressType || 'dynamic');
  const [cloudflareToken, setCloudflareToken] = useState<string>(schoolBranding.cloudflareToken || '');

  const [blockAccess, setBlockAccess] = useState<BlockExternalAccessConfig>({
    teacher: schoolBranding.blockExternalAccess?.teacher ?? true,
    manager: schoolBranding.blockExternalAccess?.manager ?? false,
    leadership: schoolBranding.blockExternalAccess?.leadership ?? false,
    admin: schoolBranding.blockExternalAccess?.admin ?? false,
  });

  const [useTimeLimit, setUseTimeLimit] = useState<boolean>(schoolBranding.useTimeLimit ?? true);
  const [startTime, setStartTime] = useState<string>(schoolBranding.timeLimitStart || '07:30');
  const [endTime, setEndTime] = useState<string>(schoolBranding.timeLimitEnd || '08:30');
  const [afterTimePolicy, setAfterTimePolicy] = useState<'block_all' | 'admin_only'>(
    schoolBranding.afterTimePolicy || 'admin_only'
  );
  const [adminOverrideSwitch, setAdminOverrideSwitch] = useState<boolean>(
    schoolBranding.adminOverrideSwitch ?? true
  );

  // 상단 계정 그룹별 토글 함수 (스마트 연동 반영)
  const handleToggleBlockGroup = (groupKey: keyof BlockExternalAccessConfig) => {
    setBlockAccess((prev) => {
      const isCurrentlyBlocked = prev[groupKey]; // true면 현재 교내전용
      const nextBlocked = !isCurrentlyBlocked;

      // 만약 '관리자' 그룹을 '🔒 교내전용(true)'으로 바꾼다면 하단 예외 스위치도 모순 없게 자동 끔
      if (groupKey === 'admin' && nextBlocked) {
        setAfterTimePolicy('block_all');
        setAdminOverrideSwitch(false);
      }

      return {
        ...prev,
        [groupKey]: nextBlocked,
      };
    });
  };

  // 하단 관리자 예외 정책 선택 시 상단과 스마트 연동
  const handleSelectAdminOnlyPolicy = () => {
    if (blockAccess.admin) { // 관리자가 현재 '교내전용' 차단 상태라면
      if (confirm('💡 관리자 계정이 [교내전용]으로 차단되어 있습니다.\n관리자의 외부 접속을 [허용]으로 자동 변경하시겠습니까?')) {
        setBlockAccess((prev) => ({ ...prev, admin: false })); // 허용으로 바꿈
        setAfterTimePolicy('admin_only');
        setAdminOverrideSwitch(true);
      }
    } else {
      setAfterTimePolicy('admin_only');
    }
  };

  // 하단 관리자 예외 스위치 토글 시 스마트 연동
  const handleToggleAdminOverrideSwitch = () => {
    if (!adminOverrideSwitch && blockAccess.admin) { // 끄려고 할 때 관리자가 차단 상태라면
      if (confirm('💡 관리자 계정이 [교내전용]으로 차단되어 있습니다.\n관리자의 외부 접속을 [허용]으로 자동 변경하시겠습니까?')) {
        setBlockAccess((prev) => ({ ...prev, admin: false }));
        setAdminOverrideSwitch(true);
      }
    } else {
      setAdminOverrideSwitch(!adminOverrideSwitch);
    }
  };

  const handleSaveNetworkSettings = () => {
    if (addressType === 'fixed' && !cloudflareToken.trim()) {
      alert('⚠️ 고정 주소를 사용하려면 Cloudflare 터널 토큰 키를 입력해 주세요.');
      return;
    }

    const updatedBranding: SchoolBranding = {
      ...schoolBranding,
      addressType,
      cloudflareToken,
      useTimeLimit,
      timeLimitStart: startTime,
      timeLimitEnd: endTime,
      afterTimePolicy,
      adminOverrideSwitch,
      blockExternalAccess: blockAccess,
    };

    onSchoolBrandingChange(updatedBranding);
    saveConfigToSupabase('school_branding', updatedBranding);
    alert('🎉 외부 접속 제어 및 보안 설정이 성공적으로 저장되었습니다!');
  };

  const handleShowHelpGuide = () => {
    alert(
      `📌 [Cloudflare 고정 터널 토큰 발급 가이드]\n\n` +
      `1. Cloudflare Zero Trust 대시보드(one.dash.cloudflare.com) 접속\n` +
      `2. Access ➔ Tunnels 메뉴 이동 후 [Create a tunnel] 클릭\n` +
      `3. 터널 이름 입력 후 생성되는 커맨드에서\n` +
      `   "cloudflared.exe service install [토큰키]" 의 [토큰키] 문자열 복사\n` +
      `4. 복사한 긴 토큰 키를 위 입력란에 붙여넣고 [저장] 클릭`
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-sm space-y-3.5 h-full flex flex-col">
      {/* 카드 헤더 */}
      <div className="border-b border-slate-200 pb-2 flex justify-between items-center shrink-0">
        <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <span>🌐</span> 스마트폰 외부 접속 & 보안 제어
        </h2>
        <button
          onClick={handleSaveNetworkSettings}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1 rounded-lg text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          저장
        </button>
      </div>

      {/* 카드 본문 */}
      <div className="space-y-3.5 text-xs flex-1">
        {/* 1. 주소 방식 선택 */}
        <div className="space-y-1.5">
          <span className="font-bold text-slate-700 block text-[11px]">1) 접속 주소 방식 선택</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAddressType('dynamic')}
              className={`py-2 rounded-xl border font-bold cursor-pointer transition-all ${
                addressType === 'dynamic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              ⚡ 변동 주소 (TryCloudflare)
            </button>
            <button
              type="button"
              onClick={() => setAddressType('fixed')}
              className={`py-2 rounded-xl border font-bold cursor-pointer transition-all ${
                addressType === 'fixed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              📌 고정 주소 (Named Tunnel)
            </button>
          </div>

          {/* 선택 방식별 상세 설명 안내 구역 */}
          {addressType === 'dynamic' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10px] text-amber-900 leading-relaxed font-medium">
              💡 <strong>변동 주소 방식이란?</strong><br />
              별도 가입 없이 즉시 사용 가능한 방식입니다. PC를 재부팅할 때마다 외부 접속 주소(URL)가 새로 발급됩니다.
            </div>
          ) : (
            <div className="space-y-1.5 bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-950 text-[11px]">📌 고정 도메인 토큰 입력</span>
                <button
                  type="button"
                  onClick={handleShowHelpGuide}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>📖 발급 가이드</span>
                </button>
              </div>

              <input
                type="password"
                placeholder="Cloudflare 터널 토큰 키(eyJh...로 시작하는 긴 문자열) 입력"
                value={cloudflareToken}
                onChange={(e) => setCloudflareToken(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-inner"
              />

              <p className="text-[10px] text-blue-800 leading-tight">
                * Cloudflare에서 발급받은 무료 터널 토큰을 등록하면 PC 재부팅 후에도 **학교 전용 고정 주소**가 유지됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 2. 계정 그룹별 외부 접속 개별 스위치 제어 */}
        <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-2.5">
          <span className="font-bold text-slate-800 block text-[11px]">
            2) 계정 그룹별 외부 접속 제어 (선택)
          </span>
          
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">일반교사</span>
              <button
                type="button"
                onClick={() => handleToggleBlockGroup('teacher')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                  blockAccess.teacher ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {blockAccess.teacher ? '🔒 교내전용' : '🔓 허용'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">인성부 교사</span>
              <button
                type="button"
                onClick={() => handleToggleBlockGroup('manager')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                  blockAccess.manager ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {blockAccess.manager ? '🔒 교내전용' : '🔓 허용'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">교감/교장</span>
              <button
                type="button"
                onClick={() => handleToggleBlockGroup('leadership')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                  blockAccess.leadership ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {blockAccess.leadership ? '🔒 교내전용' : '🔓 허용'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">관리자</span>
              <button
                type="button"
                onClick={() => handleToggleBlockGroup('admin')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                  blockAccess.admin ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {blockAccess.admin ? '🔒 교내전용' : '🔓 허용'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. 등교 지도 시간제 접속 타이머 */}
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px]">3) 등교 지도 시간제 접속 타이머</span>
            <input
              type="checkbox"
              checked={useTimeLimit}
              onChange={(e) => setUseTimeLimit(e.target.checked)}
              className="w-4 h-4 accent-slate-900 cursor-pointer"
            />
          </div>

          {useTimeLimit && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-600">접속 허용 시간:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="border border-slate-300 rounded px-1.5 py-0.5 font-bold text-xs bg-slate-50"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border border-slate-300 rounded px-1.5 py-0.5 font-bold text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-0.5">
                <span className="font-bold text-slate-600 block text-[10px]">
                  {endTime} 이후 외부 접속 제한 정책:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAfterTimePolicy('block_all')}
                    className={`py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                      afterTimePolicy === 'block_all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    🚫 전체 차단
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAdminOnlyPolicy}
                    className={`py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                      afterTimePolicy === 'admin_only' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    👑 관리자 예외
                  </button>
                </div>
              </div>

              {afterTimePolicy === 'admin_only' && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-purple-900">관리자 예외 스위치</span>
                  <button
                    type="button"
                    onClick={handleToggleAdminOverrideSwitch}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                      adminOverrideSwitch ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {adminOverrideSwitch ? '🟢 ON (허용)' : '🔴 OFF (차단)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. 학생 사진 표시 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5">
          <span className="font-bold text-slate-800 block text-[11px]">4) 학생 사진 표시 설정</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onPhotoConfigChange('always_on');
                saveConfigToSupabase('photo_config', 'always_on');
                alert('🎉 사진 표시가 [켜기]로 설정되었습니다.');
              }}
              className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                photoConfig === 'always_on' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              켜기
            </button>
            <button
              type="button"
              onClick={() => {
                onPhotoConfigChange('always_off');
                saveConfigToSupabase('photo_config', 'always_off');
                alert('🎉 사진 표시가 [끄기]로 설정되었습니다.');
              }}
              className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                photoConfig === 'always_off' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              끄기
            </button>
            <button
              type="button"
              onClick={() => {
                onPhotoConfigChange('allow_toggle');
                saveConfigToSupabase('photo_config', 'allow_toggle');
                alert('🎉 사진 표시가 [자율]로 설정되었습니다.');
              }}
              className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                photoConfig === 'allow_toggle' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              자율
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};