// src/utils/favicon.ts

/**
 * 탭 파비콘 및 브라우저 탭 제목(Title)을 이모지/이미지 및 학교명으로 실시간 변경하는 함수
 */
export const updateFavicon = (
  logoType: 'emoji' | 'image' | 'file',
  logoValue: string,
  schoolName?: string // 🎯 학교명 인자 추가 (선택적)
) => {
  // 1️⃣ 브라우저 탭 제목(Title) 실시간 변경
  if (schoolName && schoolName.trim()) {
    document.title = `${schoolName.trim()} 생활지도 시스템`;
  } else {
    document.title = '학교 생활지도 시스템';
  }

  // 2️⃣ 파비콘 URL 생성
  let faviconUrl = '';

  if (logoType === 'emoji') {
    const emoji = logoValue || '⚖️';
    // 이모지를 SVG 데이터 URL로 즉시 변환
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
    faviconUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  } else {
    // 이미지 URL 또는 직접 업로드한 로고 파일 Data URL
    faviconUrl = logoValue;
  }

  if (!faviconUrl) return;

  // 3️⃣ 기존 <link rel="icon"> 태그 탐색 또는 생성 후 파비콘 교체
  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'shortcut icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  link.type = logoType === 'emoji' ? 'image/svg+xml' : 'image/x-icon';
  link.href = faviconUrl;
};