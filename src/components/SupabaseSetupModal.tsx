import React, { useState, useEffect } from 'react';
import { getStoredSupabaseConfig, saveSupabaseConfig, hasSupabaseConfig } from '../lib/supabase';

export const SupabaseSetupModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    // 💡 DB Key가 없으면 무조건 팝업창 표시!
    if (!hasSupabaseConfig()) {
      const currentConfig = getStoredSupabaseConfig();
      setUrlInput(currentConfig.url);
      setKeyInput(currentConfig.key);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim() || !keyInput.trim()) {
      alert('⚠️ Supabase URL과 Anon Key를 모두 정확히 입력해 주세요.');
      return;
    }

    let cleanUrl = urlInput.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
    if (cleanUrl.endsWith('/rest/v1')) cleanUrl = cleanUrl.replace('/rest/v1', '');

    saveSupabaseConfig(cleanUrl, keyInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-7 space-y-6 animate-in fade-in zoom-in duration-200">
        
        <div className="text-center space-y-2 border-b border-slate-100 pb-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            🔑
          </div>
          <h2 className="text-xl font-black text-slate-900">학교 DB 연동 설정</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            시스템을 시작하려면 학교의 Supabase DB 연동키가 필요합니다.<br />
            발급받으신 <span className="text-blue-600 font-bold">Project URL</span>과 <span className="text-blue-600 font-bold font-mono">anon public Key</span>를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>1. Supabase Project URL</span>
              <span className="text-[10px] text-slate-400 font-normal">예: https://xxx.supabase.co</span>
            </label>
            <input
              type="text"
              required
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>2. Supabase Anon (Public) Key</span>
              <span className="text-[10px] text-amber-600 font-bold">⚠️ service_role 키 금지</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="eyJhbGciOiJIUzI1NiI..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <span>📌</span> Key 찾는 위치 (Project Settings)
            </p>
            <p className="text-[10px] text-blue-700 leading-normal">
              1. Supabase 접속 ➔ Project Settings (⚙️)<br />
              2. API Keys ➔ Legacy anon, service_role API keys 탭<br />
              3. <span className="font-bold font-mono">anon public</span> 옆의 Copy 버튼 클릭
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>연동 정보 저장 및 시작하기</span>
          </button>
        </form>

      </div>
    </div>
  );
};