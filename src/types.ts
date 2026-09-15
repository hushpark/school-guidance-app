export interface Student {
  id: string;
  name: string;
  grade: number;
  classNum: number;
  number: number;
  photoUrl?: string;
}

export interface Penalty {
  id: string;
  student_id: string;
  grade: number;
  created_at: string;
}

export interface ClassCounts {
  [grade: number]: number;
}

export type TeacherRole = 'admin' | 'manager' | 'vice_principal' | 'principal' | 'teacher';

export type MainTab = 
  | 'realtime' 
  | 'photoSearch' 
  | 'classGrid' 
  | 'studentManage' 
  | 'teacherManage' 
  | 'systemConfig' 
  | 'helpGuide';

// 🎯 역할 그룹별 외부 접속 차단 옵션 타입[cite: 9]
export interface BlockExternalAccessConfig {
  teacher?: boolean;        // 일반교사 (true: 교내망만 허용)[cite: 9]
  manager?: boolean;        // 인성부장/인성부 교사[cite: 9]
  leadership?: boolean;     // 교감 / 교장[cite: 9]
  admin?: boolean;          // 관리자[cite: 9]
}

export interface SchoolBranding {
  schoolName: string;
  logoType: 'emoji' | 'image' | 'file';
  logoValue: string;
  logoBgColor?: string;
  rulesPdfUrl?: string;
  blockExternalAccess?: BlockExternalAccessConfig; // 🎯 그룹별 외부 접속 차단 설정[cite: 9]

  // 🎯 새로 추가된 네트워크 및 시간제 제어 관련 타입 프로퍼티
  addressType?: 'dynamic' | 'fixed';               // 접속 주소 방식 ('dynamic': 변동, 'fixed': 고정)
  cloudflareToken?: string;                       // Cloudflare 터널 비밀 토큰 키
  useTimeLimit?: boolean;                         // 등교 지도 시간제 제한 사용 여부
  timeLimitStart?: string;                        // 시작 시간 (예: "07:30")
  timeLimitEnd?: string;                          // 종료 시간 (예: "08:30")
  afterTimePolicy?: 'block_all' | 'admin_only';  // 제한 시간 종료 후 정책
  adminOverrideSwitch?: boolean;                  // 관리자 예외 접속 ON/OFF 스위치
}

export type PhotoConfig = 'always_on' | 'always_off' | 'allow_toggle';