import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Electron 빌드 시 흰 화면 방지용 상대 경로 설정
  server: {
    host: true, // 교내 랜선/Wi-Fi IP 자동 개방
    port: 5173,
    allowedHosts: true, // 👈 ✨ 외부 Cloudflare 호스트 접속 차단(blocked request) 해제!
  },
});