import React, { useState, useEffect, useRef } from 'react';
import { supabase, hasSupabaseConfig } from './lib/supabase';
import type { Student, Penalty, ClassCounts, MainTab, SchoolBranding, PhotoConfig } from './types';
import { saveStoredStudents } from './utils/studentStorage';
import { updateFavicon } from './utils/favicon';

import { IconSidebar } from './components/IconSidebar';
import { RealtimeTab } from './components/RealtimeTab';
import PhotoSearchTab from './components/PhotoSearchTab';
import { ClassGridTab } from './components/ClassGridTab';
import { StudentManageTab } from './components/StudentManageTab';
import SystemConfigTab from './components/SystemConfigTab';
import TeacherManageTab from './components/TeacherManageTab';
import { AuthModal, type TeacherAccount } from './components/AuthModal';
import HelpGuideTab from './components/HelpGuideTab';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const CLASS_COUNTS_KEY = 'SCHOOL_GUIDANCE_CLASS_COUNTS';
const WARNING_THRESHOLD_KEY = 'SCHOOL_GUIDANCE_WARNING_THRESHOLD';
const FOCUS_THRESHOLD_KEY = 'SCHOOL_GUIDANCE_FOCUS_THRESHOLD';
const TEACHERS_STORAGE_KEY_LEGACY = 'SCHOOL_GUIDANCE_TEACHERS';
const TEACHERS_STORAGE_KEY = 'SCHOOL_GUIDANCE_TEACHERS_DATA_V1';
const SCHOOL_BRANDING_KEY = 'SCHOOL_GUIDANCE_BRANDING';
const PHOTO_CONFIG_KEY = 'SCHOOL_GUIDANCE_PHOTO_CONFIG';

const DEFAULT_TEACHERS: TeacherAccount[] = [
  { id: 'admin', name: '관리자 교사', password: 'admin', role: 'admin', gradeClass: '비담임' },
  { id: 'principal', name: '교장 선생님', password: '1234', role: 'principal', gradeClass: '비담임' },
  { id: 'vice_principal', name: '교감 선생님', password: '1234', role: 'vice_principal', gradeClass: '비담임' },
  { id: 'manager', name: '인성부장 교사', password: 'manager', role: 'manager', gradeClass: '비담임' },
  { id: 'teacher1', name: '김철수 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 1반' },
  { id: 'teacher2', name: '이영희 선생님', password: '1234', role: 'teacher', gradeClass: '1학년 2반' },
];

const DEFAULT_BRANDING: SchoolBranding = {
  schoolName: '학교',
  logoType: 'emoji',
  logoValue: '⚖️',
  logoBgColor: 'transparent',
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // 💡 URL 공유 열람 모드 상태
  const [isPublicShareMode, setIsPublicShareMode] = useState<boolean>(false);

  useEffect(() => {
    // 주소창 파라미터 감지 (?view=public 또는 ?view=share)
    const params = new URLSearchParams(window.location.search);
    const viewMode = params.get('view');
    if (viewMode === 'public' || viewMode === 'share') {
      setIsPublicShareMode(true);
      setActiveTab('photoSearch'); // 2번 메뉴(사진조회)를 기본 화면으로 지정
    }
  }, []);

  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const savedNew = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (savedNew) {
        const parsed = JSON.parse(savedNew);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedLegacy = localStorage.getItem(TEACHERS_STORAGE_KEY_LEGACY);
      if (savedLegacy) {
        const parsed = JSON.parse(savedLegacy);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('교사 목록 로드 오류:', e);
    }
    return DEFAULT_TEACHERS;
  });

  const [currentUser, setCurrentUser] = useState<TeacherAccount | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('photoSearch');
  const [classGridSubTab, setClassGridSubTab] = useState<'grid' | 'date' | 'list'>('grid');

  const [inputStudentId, setInputStudentId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [matchedStudent, setMatchedStudent] = useState<Student | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classCounts, setClassCounts] = useState<ClassCounts>({ 1: 1, 2: 1, 3: 1 });

  const [warningThreshold, setWarningThreshold] = useState<number>(4);
  const [focusThreshold, setFocusThreshold] = useState<number>(7);
  const [todayDate, setTodayDate] = useState('');

  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(DEFAULT_BRANDING);
  const [photoConfig, setPhotoConfig] = useState<PhotoConfig>('allow_toggle');

  const [serverIp, setServerIp] = useState<string>('IP 감지 중...');
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isPwModalOpen, setIsPwModalOpen] = useState<boolean>(false);
  const isExternalAccess = false;

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        (window as any).electron = {
          startExternalTunnel: () => ipcRenderer.invoke('start-external-tunnel'),
          setTunnelMode: (mode: string) => ipcRenderer.invoke('set-tunnel-mode', mode),
          getTunnelStatus: () => ipcRenderer.invoke('get-tunnel-status'),
          getDbConfig: () => ipcRenderer.invoke('get-db-config'),
          saveDbConfig: (config: any) => ipcRenderer.invoke('save-db-config', config),
          movePhoto: (studentId: string, toAbsent: boolean) =>
            ipcRenderer.invoke('move-photo', { studentId, toAbsent }),
        };
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (schoolBranding) {
      updateFavicon(
        schoolBranding.logoType || 'emoji',
        schoolBranding.logoValue || '⚖️',
        schoolBranding.schoolName
      );
    }
  }, [schoolBranding]);

  const loadTeachers = () => {
    try {
      const saved = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeachers(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('교사 계정 동기화 오류:', e);
    }
  };

  useEffect(() => {
    const port = window.location.port || '5173';
    const host = window.location.hostname;

    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('file:')) {
      setServerIp(`${host}:${port}`);
    } else {
      const defaultIp = '10.17.70.88';

      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then((offer) => pc.setLocalDescription(offer));
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;
          const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (ipMatch && ipMatch[1] && !ipMatch[1].startsWith('127.')) {
            setServerIp(`${ipMatch[1]}:${port}`);
            pc.onicecandidate = null;
          }
        };

        setTimeout(() => {
          setServerIp((prev) => (prev.includes('감지 중') || prev.startsWith(':') ? `${defaultIp}:${port}` : prev));
        }, 1000);
      } catch (e) {
        setServerIp(`${defaultIp}:${port}`);
      }
    }

    loadTeachers();

    const savedBranding = localStorage.getItem(SCHOOL_BRANDING_KEY);
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding);
        setSchoolBranding(parsed);
        updateFavicon(
          parsed.logoType || 'emoji',
          parsed.logoValue || '⚖️',
          parsed.schoolName
        );
      } catch {
        setSchoolBranding(DEFAULT_BRANDING);
      }
    }

    const savedPhotoConfig = localStorage.getItem(PHOTO_CONFIG_KEY);
    if (savedPhotoConfig) {
      setPhotoConfig(savedPhotoConfig as PhotoConfig);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [activeTab, isLoggedIn]);

  const handleSchoolBrandingChange = (branding: SchoolBranding) => {
    setSchoolBranding(branding);
    localStorage.setItem(SCHOOL_BRANDING_KEY, JSON.stringify(branding));
    updateFavicon(
      branding.logoType || 'emoji',
      branding.logoValue || '⚖️',
      branding.schoolName
    );
  };

  const handlePhotoConfigChange = async (config: PhotoConfig) => {
    setPhotoConfig(config);
    localStorage.setItem(PHOTO_CONFIG_KEY, config);

    if (hasSupabaseConfig()) {
      try {
        await supabase
          .from('settings')
          .upsert({ key: 'photo_config', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      } catch (e) {
        console.error('설정 DB 저장 오류:', e);
      }
    }
  };

  const handleLoginSuccess = (user: TeacherAccount) => {
    if (!hasSupabaseConfig()) {
      alert('⚠️ 학교 DB 연동 Key가 설정되어 있지 않습니다.\nDB 연동 설정을 먼저 완료해 주세요.');
      return;
    }
    setIsLoggedIn(true);
    setCurrentUser(user);
    setActiveTab(user.role === 'teacher' ? 'photoSearch' : 'realtime');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const fetchStudentsFromDB = async () => {
    if (!hasSupabaseConfig()) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        const formattedStudents: Student[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          grade: item.grade,
          classNum: item.class_num,
          number: item.number,
          photoUrl: item.photo_url && item.photo_url.startsWith('http') 
            ? item.photo_url 
            : `/photos/${item.id}.jpg`,
        }));

        setStudents(formattedStudents);
        saveStoredStudents(formattedStudents);
      }
    } catch (e) {
      console.error('학생 데이터 조회 오류:', e);
    }
  };

  const fetchPenalties = async () => {
    if (!hasSupabaseConfig()) return;
    const { data, error } = await supabase.from('penalties').select('*').order('created_at', { ascending: false });
    if (!error && data) setPenalties(data as Penalty[]);
  };

  const fetchSettingsFromDB = async () => {
    if (!hasSupabaseConfig()) return;
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data && data.length > 0) {
        data.forEach((row) => {
          if (row.key === 'class_counts' && row.value) {
            try {
              const counts = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
              setClassCounts(counts);
              localStorage.setItem(CLASS_COUNTS_KEY, JSON.stringify(counts));
            } catch (e) { }
          }
          if (row.key === 'school_branding' && row.value) {
            try {
              const branding = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
              setSchoolBranding(branding);
              localStorage.setItem(SCHOOL_BRANDING_KEY, JSON.stringify(branding));
              updateFavicon(
                branding.logoType || 'emoji',
                branding.logoValue || '⚖️',
                branding.schoolName
              );
            } catch (e) { }
          }
          if (row.key === 'thresholds' && row.value) {
            try {
              const thresholds = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
              if (thresholds.warning_threshold) {
                setWarningThreshold(thresholds.warning_threshold);
                localStorage.setItem(WARNING_THRESHOLD_KEY, String(thresholds.warning_threshold));
              }
              if (thresholds.focus_threshold) {
                setFocusThreshold(thresholds.focus_threshold);
                localStorage.setItem(FOCUS_THRESHOLD_KEY, String(thresholds.focus_threshold));
              }
            } catch (e) { }
          }
          if (row.key === 'photo_config' && row.value) {
            setPhotoConfig(row.value as PhotoConfig);
            localStorage.setItem(PHOTO_CONFIG_KEY, row.value);
          }
        });
      }
    } catch (e) {
      console.error('settings DB 조회 오류:', e);
    }
  };

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[now.getDay()];
    setTodayDate(`${y}. ${m}. ${d}. (${dayName})`);

    if (!hasSupabaseConfig()) return;

    fetchStudentsFromDB();
    fetchPenalties();
    fetchSettingsFromDB();

    const savedCounts = localStorage.getItem(CLASS_COUNTS_KEY);
    if (savedCounts) {
      try { setClassCounts(JSON.parse(savedCounts)); } catch { }
    }

    const savedWarning = localStorage.getItem(WARNING_THRESHOLD_KEY);
    if (savedWarning) setWarningThreshold(Number(savedWarning) || 4);

    const savedFocus = localStorage.getItem(FOCUS_THRESHOLD_KEY);
    if (savedFocus) setFocusThreshold(Number(savedFocus) || 7);

    // 🎯 웹소켓 기반 실시간 데이터 감지 (트래픽 소모 없음)
    const penaltiesChannel = supabase
      .channel('public:penalties')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penalties' }, () => fetchPenalties())
      .subscribe();

    const settingsChannel = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchSettingsFromDB())
      .subscribe();

    const studentsChannel = supabase
      .channel('public:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchStudentsFromDB())
      .subscribe();

    // ❌ 트래픽 초과 원인이었던 3초 무한 폴링(setInterval) 제거 완료

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStudentsFromDB();
        fetchPenalties();
        fetchSettingsFromDB();
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      supabase.removeChannel(penaltiesChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(studentsChannel);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, []);

  const handleStudentsUpdated = (newStudents: Student[]) => {
    const sortedStudents = [...newStudents].sort((a, b) => a.id.localeCompare(b.id));
    setStudents(sortedStudents);
    saveStoredStudents(sortedStudents);
  };

  const handleClassCountChange = (grade: number, count: number) => {
    const newCounts = { ...classCounts, [grade]: Math.max(1, count) };
    setClassCounts(newCounts);
    localStorage.setItem(CLASS_COUNTS_KEY, JSON.stringify(newCounts));
  };

  const handleThresholdChange = (warning: number, focus: number) => {
    setWarningThreshold(warning);
    setFocusThreshold(focus);
    localStorage.setItem(WARNING_THRESHOLD_KEY, String(warning));
    localStorage.setItem(FOCUS_THRESHOLD_KEY, String(focus));
  };

  const handleResetPenalties = async () => {
    if (!confirm('모든 단속 내역을 초기화하시겠습니까?')) return;
    await supabase.from('penalties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    fetchPenalties();
  };

  const handleDeletePenalty = async (id: string) => {
    if (!confirm('해당 지도 단속 내역을 삭제하시겠습니까?')) return;

    setPenalties((prev) => prev.filter((p) => p.id !== id));

    const { error } = await supabase.from('penalties').delete().eq('id', id);
    if (error) {
      alert('삭제 처리 중 오류가 발생했습니다.');
      fetchPenalties();
    } else {
      fetchPenalties();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputStudentId(val);

    if (!val.trim()) {
      setMatchedStudent(null);
      return;
    }

    const found = students.find((s) => s.id === val.trim() || s.name === val.trim());
    setMatchedStudent(found || null);
  };

  const handleSelectStudent = (student: Student) => {
    setInputStudentId(`${student.id} ${student.name}`);
    setMatchedStudent(student);
  };

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'teacher' || !matchedStudent || isSubmitting) return;

    if (matchedStudent.name.includes('결번') || matchedStudent.name.includes('궐번')) {
      alert('결번(궐번) 처리된 학생은 지도 등록을 할 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('penalties')
      .insert([{ student_id: matchedStudent.id, grade: matchedStudent.grade }]);

    setIsSubmitting(false);

    if (error) {
      alert('지도 등록 오류가 발생했습니다.');
      return;
    }

    await fetchPenalties();

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setInputStudentId('');
    setMatchedStudent(null);
  };

  const handleNavigateToSubTab = (subTabTarget: 'date' | 'list') => {
    setActiveTab('classGrid');
    setClassGridSubTab(subTabTarget);
  };

  const studentPenaltyCounts = penalties.reduce<Record<string, { count: number; first7thDate?: string }>>((acc, p) => {
    if (!acc[p.student_id]) acc[p.student_id] = { count: 0 };
    acc[p.student_id].count += 1;
    if (acc[p.student_id].count === focusThreshold && !acc[p.student_id].first7thDate) {
      acc[p.student_id].first7thDate = new Date(p.created_at).toLocaleDateString('ko-KR');
    }
    return acc;
  }, {});

  // 💡 공유 전용 모드에서는 일반 교사('teacher') 권한으로 열람 제한
  const userRole = isPublicShareMode ? 'teacher' : (currentUser?.role || 'teacher');
  const isTransparent = !schoolBranding.logoBgColor || schoolBranding.logoBgColor === 'transparent';
  const isDbConnected = hasSupabaseConfig();

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">

      {!isDbConnected ? (
        <SupabaseSetupModal />
      ) : (
        !isPublicShareMode && (
          <AuthModal
            isOpen={!isLoggedIn}
            onClose={() => { }}
            teachers={teachers}
            onLoginSuccess={handleLoginSuccess}
            schoolBranding={schoolBranding}
          />
        )
      )}

      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        serverIp={serverIp}
      />

      <ChangePasswordModal
        isOpen={isPwModalOpen}
        onClose={() => setIsPwModalOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* 사이드바 : 공유 모드일 때도 2번(사진조회) & 3번(누적명단) 메뉴만 포함하여 표시 */}
      {(isLoggedIn || isPublicShareMode) && (
        <IconSidebar
          role={userRole}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          schoolBranding={schoolBranding}
          isExternalAccess={isExternalAccess}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* 💡 A. 공유 전용 모드 접속 헤더 (?view=public 또는 ?view=share) */}
        {isPublicShareMode && (
          <header className="bg-slate-900 text-white border-b border-slate-800 px-4 md:px-7 py-3 shadow-md shrink-0 flex items-center justify-between gap-2 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <h1 className="text-sm md:text-base font-black text-white">
                  {schoolBranding.schoolName} 학생 생활지도 현황 (공유 전용)
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  * [🔍 학생 사진/정보 조회]와 [📊 반별/기준별 누적 명단] 전용 열람 화면입니다.
                </p>
              </div>
            </div>

            <button
              onClick={() => (window.location.href = window.location.pathname)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
            >
              ⚙️ 관리자 로그인
            </button>
          </header>
        )}

        {/* 💡 B. 로그인 완료 시 기본 상단 헤더 */}
        {isLoggedIn && !isPublicShareMode && (
          <header className="bg-white border-b border-slate-200 px-3 md:px-7 py-2 md:py-3 shadow-sm shrink-0 flex items-center justify-between gap-2 relative">
            <div className="flex flex-col justify-center gap-1 min-w-0 pl-11 md:pl-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-xs sm:text-sm md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap min-w-0">
                  <span
                    className={`w-6 h-6 md:w-9 md:h-9 flex items-center justify-center text-sm md:text-lg transition-all shrink-0 ${isTransparent
                      ? 'bg-transparent border-none shadow-none p-0'
                      : 'rounded-xl border border-slate-200/60 shadow-sm p-0.5 md:p-1'
                      }`}
                    style={{
                      backgroundColor: isTransparent ? 'transparent' : schoolBranding.logoBgColor,
                    }}
                  >
                    {schoolBranding.logoType === 'emoji' ? (
                      <span>{schoolBranding.logoValue || '⚖️'}</span>
                    ) : (
                      <img
                        src={schoolBranding.logoValue}
                        alt="학교 로고"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    )}
                  </span>

                  <span className="truncate">
                    {schoolBranding.schoolName} 생활지도 시스템
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] md:text-xs font-bold text-slate-600 inline-flex items-center gap-1 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  {activeTab === 'realtime' && '⚡ 실시간 생활지도 등록'}
                  {activeTab === 'photoSearch' && '🔍 학생 사진/정보 조회'}
                  {activeTab === 'classGrid' && '📊 반별 / 기준별 누적 명단'}
                  {activeTab === 'studentManage' && '✍️ 학생 명단 관리'}
                  {activeTab === 'teacherManage' && '🔑 교사 계정 관리'}
                  {activeTab === 'systemConfig' && '⚙️ 시스템 & 진급 설정'}
                  {activeTab === 'helpGuide' && '❓ 사용 가이드'}
                </span>

                <span className="md:hidden text-[9px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold whitespace-nowrap shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {todayDate || '작동 중'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end justify-center shrink-0">
              <div className="block md:hidden bg-slate-900 text-white px-2 py-1 rounded-xl shadow-sm text-[10px] font-mono min-w-[120px]">
                <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px]">👤</span>
                    <span className="font-bold font-sans text-[10px] text-white truncate max-w-[60px]">
                      {currentUser ? currentUser.name : '미인증'}
                    </span>
                  </div>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans font-bold shrink-0 ${
                    userRole === 'admin' ? 'bg-purple-600 text-white' : 
                    userRole === 'principal' ? 'bg-indigo-600 text-white' : 
                    userRole === 'vice_principal' ? 'bg-blue-600 text-white' : 
                    userRole === 'manager' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {userRole === 'admin' ? '관리자' : 
                     userRole === 'principal' ? '교장' : 
                     userRole === 'vice_principal' ? '교감' : 
                     userRole === 'manager' ? '인성부' : '교사'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1 pt-0.5">
                  {isLoggedIn && (
                    <>
                      <button
                        onClick={() => setIsPwModalOpen(true)}
                        className="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-1.5 py-0.2 rounded transition-all border border-slate-700 cursor-pointer"
                      >
                        🔑 비번
                      </button>
                      <button
                        onClick={handleLogout}
                        className="text-[8px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.2 rounded transition-all cursor-pointer"
                      >
                        로그아웃
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {todayDate || '작동 중'}
                  </span>

                  <span
                    onClick={() => {
                      if (!serverIp.includes('감지 중')) {
                        navigator.clipboard.writeText(`http://${serverIp}`);
                        alert(`📋 접속 주소가 복사되었습니다:\nhttp://${serverIp}`);
                      }
                    }}
                    className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold cursor-pointer hover:bg-blue-100 transition-all whitespace-nowrap max-w-[180px] lg:max-w-[280px] truncate"
                    title={`클릭 시 복사: http://${serverIp}`}
                  >
                    <span>🌐</span>
                    <span className="truncate">IP: {serverIp}</span>
                  </span>

                  {isDbConnected && (
                    <button
                      onClick={() => setIsQrOpen(true)}
                      className="text-[11px] font-sans font-bold bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>📱</span>
                      <span>스마트폰 연결 QR</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-mono">
                  <span className="text-xs">👤</span>
                  <span className="font-bold font-sans text-xs">{currentUser ? currentUser.name : '미인증'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                    userRole === 'admin' ? 'bg-purple-600 text-white' : 
                    userRole === 'principal' ? 'bg-indigo-600 text-white' : 
                    userRole === 'vice_principal' ? 'bg-blue-600 text-white' : 
                    userRole === 'manager' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {userRole === 'admin' ? '관리자' : 
                     userRole === 'principal' ? '교장' : 
                     userRole === 'vice_principal' ? '교감' : 
                     userRole === 'manager' ? '인성인권부' : '일반교사'}
                  </span>

                  {isLoggedIn && (
                    <>
                      <button
                        onClick={() => setIsPwModalOpen(true)}
                        className="ml-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer border border-slate-700"
                        title="내 비밀번호 직접 변경"
                      >
                        🔑 비번
                      </button>
                      <button
                        onClick={handleLogout}
                        className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                      >
                        로그아웃
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </header>
        )}

        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          {/* 1번 메뉴 (실시간 지도 등록) : 일반 공유 모드에서는 차단 */}
          {activeTab === 'realtime' && userRole !== 'teacher' && !isPublicShareMode && (
            <RealtimeTab
              students={students}
              penalties={penalties}
              inputStudentId={inputStudentId}
              matchedStudent={matchedStudent}
              isSubmitting={isSubmitting}
              onInputChange={handleInputChange}
              onSelectStudent={handleSelectStudent}
              onAddPenalty={handleAddPenalty}
              onDeletePenalty={handleDeletePenalty}
              studentPenaltyCounts={studentPenaltyCounts}
              warningThreshold={warningThreshold}
              focusThreshold={focusThreshold}
              userRole={userRole}
              photoConfig={photoConfig}
              onNavigateToSubTab={handleNavigateToSubTab}
            />
          )}

          {/* 💡 2번 메뉴 : 🔍 학생 사진/정보 조회 (공유 허용) */}
          {activeTab === 'photoSearch' && (
            <PhotoSearchTab
              students={students}
              classCounts={classCounts}
            />
          )}

          {/* 💡 3번 메뉴 : 📊 반별 / 기준별 누적 명단 (공유 허용) */}
          {activeTab === 'classGrid' && (
            <ClassGridTab
              role={userRole}
              students={students}
              classCounts={classCounts}
              studentPenaltyCounts={studentPenaltyCounts}
              penalties={penalties}
              warningThreshold={warningThreshold}
              focusThreshold={focusThreshold}
              onStudentsUpdated={handleStudentsUpdated}
              onDeletePenalty={handleDeletePenalty}
              initialSubTab={classGridSubTab}
            />
          )}

          {/* 관리자 전용 탭들은 공유 모드에서 접근 불가 */}
          {activeTab === 'studentManage' && userRole === 'admin' && !isPublicShareMode && (
            <StudentManageTab
              students={students}
              classCounts={classCounts}
              onStudentsUpdated={handleStudentsUpdated}
            />
          )}

          {activeTab === 'teacherManage' && userRole === 'admin' && !isPublicShareMode && (
            <TeacherManageTab userRole={userRole} />
          )}

          {activeTab === 'systemConfig' && userRole === 'admin' && !isPublicShareMode && (
            <SystemConfigTab
              students={students}
              classCounts={classCounts}
              warningThreshold={warningThreshold}
              focusThreshold={focusThreshold}
              schoolBranding={schoolBranding}
              photoConfig={photoConfig}
              onClassCountChange={handleClassCountChange}
              onThresholdChange={handleThresholdChange}
              onStudentsUpdated={handleStudentsUpdated}
              onResetPenalties={handleResetPenalties}
              onSchoolBrandingChange={handleSchoolBrandingChange}
              onPhotoConfigChange={handlePhotoConfigChange}
              rulesPdfUrl={schoolBranding.rulesPdfUrl}
              onUpdateRulesPdfUrl={(url) => handleSchoolBrandingChange({ ...schoolBranding, rulesPdfUrl: url })}
            />
          )}

          {activeTab === 'helpGuide' && !isPublicShareMode && (
            <HelpGuideTab
              role={userRole}
              rulesPdfUrl={schoolBranding.rulesPdfUrl}
            />
          )}
        </main>
      </div>
    </div>
  );
}