import { useState } from 'react';

const SUPABASE_URL_KEY = 'SCHOOL_GUIDANCE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'SCHOOL_GUIDANCE_SUPABASE_ANON_KEY';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverIp: string;
}

export function QRCodeModal({ isOpen, onClose, serverIp }: QRCodeModalProps) {
  const [connectMode, setConnectMode] = useState<'local' | 'external'>('local');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const supabaseUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
  const supabaseKey = localStorage.getItem(SUPABASE_ANON_KEY) || '';

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl space-y-3">
          <span className="text-4xl">⚠️</span>
          <h3 className="text-lg font-bold text-gray-800">PC에 DB 설정이 없습니다!</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            관리자 PC에서 <b>[학교 DB 연동 설정]</b>을 먼저 완료한 후<br />
            스마트폰 QR 코드를 열어주세요.
          </p>
          <button onClick={onClose} className="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer">
            닫기
          </button>
        </div>
      </div>
    );
  }

  // 🌐 외부 접속 (LTE/집) 클릭 시 Cloudflare 터널 실행
  const handleSelectExternal = async () => {
    setConnectMode('external');
    if (externalUrl) return;

    setIsLoading(true);
    try {
      if ((window as any).electron && (window as any).electron.startExternalTunnel) {
        const res = await (window as any).electron.startExternalTunnel();
        if (res.success && res.url) {
          setExternalUrl(res.url);
        } else {
          alert('외부 접속 주소 생성 실패: ' + (res.error || '알 수 없는 오류'));
          setConnectMode('local');
        }
      } else {
        alert('Electron 환경에서만 외부 접속 터널을 실행할 수 있습니다.');
        setConnectMode('local');
      }
    } catch (e) {
      alert('외부 접속 실행 중 오류가 발생했습니다.');
      setConnectMode('local');
    } finally {
      setIsLoading(false);
    }
  };

  const currentBaseUrl = connectMode === 'external' ? externalUrl : `http://${serverIp}`;
  const fullTargetUrl = connectMode === 'external'
    ? `${currentBaseUrl}/?url=${encodeURIComponent(supabaseUrl)}&key=${encodeURIComponent(supabaseKey)}`
    : `http://${serverIp}/?url=${encodeURIComponent(supabaseUrl)}&key=${encodeURIComponent(supabaseKey)}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fullTargetUrl)}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-3">📱 스마트폰 간편 연결</h3>

        {/* 🔘 [교내 Wi-Fi / 외부 LTE] 토글 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold border border-slate-200">
          <button
            onClick={() => setConnectMode('local')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              connectMode === 'local' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏫 교내 Wi-Fi
          </button>
          <button
            onClick={handleSelectExternal}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              connectMode === 'external' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🌐 외부 LTE/집
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 space-y-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-600">안전한 외부 보안 주소 생성 중...</p>
            <p className="text-[10px] text-slate-400">약 3~5초 소요됩니다.</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 inline-block mb-3">
              <img src={qrImageUrl} alt="스마트폰 연결 QR" className="w-48 h-48 mx-auto" />
            </div>

            <p className="text-[11px] font-mono text-slate-500 mb-4 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
              {connectMode === 'external' ? externalUrl : `http://${serverIp}`}
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
        >
          닫기
        </button>
      </div>
    </div>
  );
}