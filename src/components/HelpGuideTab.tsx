import React, { useState } from 'react';

interface HelpGuideTabProps {
  role?: string;
  rulesPdfUrl?: string;
}

export const HelpGuideTab: React.FC<HelpGuideTabProps> = ({ role = 'teacher', rulesPdfUrl }) => {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      
      {/* 📜 1. 학교 생활 지도 규정 확인 카드 */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl shrink-0 border border-slate-700/60">
            📜
          </div>
          <div>
            <h2 className="text-base font-black text-white">학교 생활 지도 규정 확인</h2>
            <p className="text-xs text-slate-300 font-medium mt-1">
              학생 생활지도 시 적용되는 본교 생활 규정 PDF 문서를 열람합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-4 py-3 rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>👁️</span>
            <span>팝업으로 열람하기</span>
          </button>

          <button
            onClick={() => {
              if (!rulesPdfUrl) {
                alert('⚠️ 등록된 규정 PDF가 없습니다. [시스템 설정] 메뉴에서 먼저 PDF를 등록해 주세요.');
                return;
              }
              
              const win = window.open();
              if (win) {
                win.document.write(
                  `<iframe src="${rulesPdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                );
              }
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-3 rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-1"
            title="새 탭에서 원본 열기"
          >
            <span>↗️</span>
          </button>
        </div>
      </div>

      {/* 📱 2. 스마트폰 간편 연결 안내 카드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
            📱
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-blue-900">스마트폰 1초 간편 자동 연동 안내</h3>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              QR 코드 스캔 또는 메신저 링크 클릭 시 <b>학교 DB 연결 정보가 자동 적용</b>되어 별도의 DB Key 입력 없이 메인 화면으로 즉시 연결됩니다.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-xl whitespace-nowrap shadow-sm self-end sm:self-center">
          ⚡ 1회 클릭/스캔 자동 연동
        </span>
      </div>

      {/* 📖 3. 권한별 이용 가이드 타이틀 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
          <span>📖</span> 권한별 이용 가이드
        </h2>
      </div>

      {/* 👥 4. 권한별 가이드 3분할 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 일반 교사 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
              <span>👨‍🏫</span> 일반 교사
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              조회 전용
            </span>
          </div>

          <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed flex-1">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>학생 사진 및 정보 조회</b>
                <p className="text-[11px] text-slate-400 mt-0.5">반별 학생 사진 명부를 확인하고, 3:4 반명함판 팝업으로 사진을 크게 확대할 수 있습니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>결번 제외 정확한 재학생 수 집계</b>
                <p className="text-[11px] text-slate-400 mt-0.5">결번 학생은 카운트 수치에서 자동으로 제외되어 실제 재학 중인 학생 수만 정확히 파악됩니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>비밀번호 직접 변경</b>
                <p className="text-[11px] text-slate-400 mt-0.5">상단 프로필 우측 [🔑 비번] 버튼을 눌러 본인의 비밀번호를 자유롭게 변경할 수 있습니다.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* 인성인권부 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
              <span>🛡️</span> 인성인권부
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
              실시간 지도 (PC / 스마트폰)
            </span>
          </div>

          <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed flex-1">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>실시간 및 과거 날짜 지도 등록</b>
                <p className="text-[11px] text-slate-400 mt-0.5">현장 실시간 지도 등록 외에도 [📅 과거 내역 등록] 버튼으로 지난 일자의 지도 내역을 소급 등록할 수 있습니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>당일 지도 내역 취소/삭제</b>
                <p className="text-[11px] text-slate-400 mt-0.5">오늘 잘못 입력된 단속 내역을 우측 내역 카드에서 바로 취소 및 삭제 처리합니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>단계별 지도 명단 및 상담 메모</b>
                <p className="text-[11px] text-slate-400 mt-0.5">설정된 기준 횟수에 따라 1단계(경고)/2단계(집중) 대상자를 자동 분류하고 상담 메모를 기록합니다.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* 관리자 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
              <span>👑</span> 관리자
            </h3>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
              전체 관리
            </span>
          </div>

          <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed flex-1">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>메인 PC 앱 결번 폴더 이동 제어</b>
                <p className="text-[11px] text-slate-400 mt-0.5">메인 PC(.exe) 앱에서 결번 처리 시 사진 파일이 `photos/결번사진/` 폴더로 자동 정돈됩니다. (웹/스마트폰 차단 팝업 안전장치 적용)</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>새 학기 진급 학번 일괄 처리</b>
                <p className="text-[11px] text-slate-400 mt-0.5">엑셀 진급 명단을 붙여넣어 학번을 자동 갱신하고, 사진 파일명 일괄 변경 스크립트(.bat)를 생성합니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <div>
                <b>시스템 설정 & 계정 그룹별 보안 제어</b>
                <p className="text-[11px] text-slate-400 mt-0.5">학교 명칭/로고, 단계별 기준 횟수, 교외망 접속 제한 정책을 통합 관리합니다.</p>
              </div>
            </li>
          </ul>
        </div>

      </div>

      {/* 👑 5. 관리자 전용 안내 */}
      {role === 'admin' && (
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-2.5">
            <span className="text-lg">📁</span>
            <h3 className="text-sm font-extrabold text-emerald-950">
              관리자 PC 바탕화면 자동 생성 파일 & 외부 접속 구동 모드 안내
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-emerald-900">
            <div className="bg-white/80 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1">
                <span>📂</span> 바탕화면 자동 생성 파일 (2종)
              </h4>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex items-start gap-1">
                  <span className="font-bold text-emerald-600">1.</span>
                  <span><b>스마트폰_연결_QR.png</b> : 스마트폰 카메라 스캔용 이미지</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="font-bold text-emerald-600">2.</span>
                  <span><b>스마트폰_연결_주소.txt</b> : 카톡/쿨메신저 전송용 링크 텍스트</span>
                </li>
              </ul>
              <p className="text-[10px] text-emerald-700 font-medium pt-1">
                * 앱 실행 시 최신 주소로 바탕화면에 자동 갱신(덮어쓰기)됩니다.
              </p>
            </div>

            <div className="bg-white/80 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1">
                <span>⚙️</span> 스마트폰 외부 접속 구동 모드
              </h4>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li><b>⚡ 하이브리드 (권장):</b> 앱 실행 시 자동 생성 + 필요시 수동 재발급</li>
                <li><b>🚀 자동:</b> 프로그램 실행과 동시에 터널 상시 활성화</li>
                <li><b>🔒 수동:</b> 버튼을 누를 때만 선택적 개방 (보안 강화)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ❓ 6. 자주 묻는 질문 (FAQ) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-[15px] font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span>❓</span> 스마트폰 접속 자주 묻는 질문 (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-md font-black">Q1</span>
              <span>외부(LTE/집) 접속 주소는 매번 바뀌나요?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-7">
              <b>네, 보안을 위해 관리자 PC 프로그램을 재시작할 때마다 새로 생성됩니다.</b><br />
              무단 접속 차단을 위한 보안 정책이며, 새로 생성된 주소 역시 클릭/스캔 1회로 DB 연동까지 자동 완성됩니다.
            </p>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-md font-black">Q2</span>
              <span>스마트폰 바탕화면에 앱처럼 등록하는 방법</span>
            </div>
            <div className="text-xs text-amber-900/80 leading-relaxed pl-7 space-y-1">
              <p><b>브라우저의 [홈 화면에 추가] 기능을 활용하세요!</b></p>
              <ol className="list-decimal pl-4 text-[11px] space-y-0.5 text-slate-700">
                <li>공유받은 QR이나 메시지 링크를 눌러 접속합니다.</li>
                <li>Safari(아이폰) 메뉴의 공유 $\rightarrow$ <b>[홈 화면에 추가]</b> / Chrome(안드로이드) 메뉴 $\rightarrow$ <b>[홈 화면에 추가]</b>를 누릅니다.</li>
                <li>스마트폰 바탕화면에 생성된 아이콘을 누르면 앱처럼 터치 한 번으로 열립니다.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 📄 7. PDF 팝업 모달 */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="font-extrabold text-sm">학교 생활 지도 규정 (PDF)</h3>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer"
              >
                닫기 ✖
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              {rulesPdfUrl ? (
                <iframe
                  src={rulesPdfUrl}
                  title="학교 생활 규정 PDF"
                  className="w-full h-full rounded-2xl border border-slate-300"
                />
              ) : (
                <div className="w-full h-full rounded-2xl border border-slate-300 bg-white flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <span className="text-5xl">📄</span>
                  <h4 className="text-base font-bold text-slate-800">등록된 생활 지도 규정 PDF가 없습니다.</h4>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    [시스템 설정] 메뉴에서 학교 생활 지도 규정 PDF 파일을 업로드해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HelpGuideTab;