import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'SCHOOL_GUIDANCE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'SCHOOL_GUIDANCE_SUPABASE_ANON_KEY';

// 🚨 [핵심!] 스마트폰이 QR 파라미터(?url=...&key=...)로 접속했는지 최우선 검사 및 즉시 저장
if (typeof window !== 'undefined') {
  const searchParams = new URLSearchParams(window.location.search);
  const paramUrl = searchParams.get('url');
  const paramKey = searchParams.get('key');

  if (paramUrl && paramKey) {
    localStorage.setItem(SUPABASE_URL_KEY, decodeURIComponent(paramUrl).trim());
    localStorage.setItem(SUPABASE_ANON_KEY, decodeURIComponent(paramKey).trim());
    // 주소창에서 파라미터만 깔끔하게 제거
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// 🌐 [추가] 내부 IP 동기화: 다른 PC 접속 시 서버의 config.json 정보 자동 로드
if (typeof window !== 'undefined') {
  const localUrl = localStorage.getItem(SUPABASE_URL_KEY);
  const localKey = localStorage.getItem(SUPABASE_ANON_KEY);

  // 로컬스토리지에 값이 없으면 서버(/api/config)에서 config.json 키값을 가져와 동기화
  if (!localUrl || !localKey) {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.supabaseUrl && data.supabaseAnonKey) {
          localStorage.setItem(SUPABASE_URL_KEY, data.supabaseUrl);
          localStorage.setItem(SUPABASE_ANON_KEY, data.supabaseAnonKey);
          window.location.reload(); // 키 동기화 후 메인 화면으로 즉시 전환!
        }
      })
      .catch((err) => console.warn('서버 config.json 동기화 대기 중:', err));
  }
}

// 1. Vercel 환경 변수(1순위) -> LocalStorage(2순위) 순으로 DB 키 가져오기
export const getStoredSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const url = envUrl.trim() || localStorage.getItem(SUPABASE_URL_KEY) || '';
  const key = envKey.trim() || localStorage.getItem(SUPABASE_ANON_KEY) || '';
  return { url, key };
};

// 2. DB 키가 설정되어 있는지 검사하는 함수
export const hasSupabaseConfig = (): boolean => {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url.trim() && key.trim());
};

// 3. DB 키 저장 함수 (✨ Electron config.json 파일 자동 생성 연동!)
export const saveSupabaseConfig = async (url: string, key: string) => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  // 1️⃣ 브라우저 localStorage에 저장
  localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
  localStorage.setItem(SUPABASE_ANON_KEY, cleanKey);

  // 2️⃣ 관리자 PC(Electron)라면 config.json 파일로 저장하여 다른 PC 접속 차단 해제!
  if ((window as any).electron && (window as any).electron.saveDbConfig) {
    try {
      await (window as any).electron.saveDbConfig({
        supabaseUrl: cleanUrl,
        supabaseAnonKey: cleanKey,
      });
    } catch (e) {
      console.error('config.json 파일 저장 실패:', e);
    }
  }

  window.location.reload();
};

// 4. DB 키 삭제 함수
export const clearSupabaseConfig = () => {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_ANON_KEY);
  window.location.reload();
};

// 5. 최신 저장소 값으로 Supabase 클라이언트 생성
const { url, key } = getStoredSupabaseConfig();
const defaultUrl = 'https://placeholder-project.supabase.co';
const defaultKey = 'placeholder-key';

export const supabase = createClient(
  url.trim() || defaultUrl,
  key.trim() || defaultKey
);