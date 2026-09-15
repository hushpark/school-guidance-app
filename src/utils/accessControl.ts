import type { SchoolBranding, TeacherRole } from '../types';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 접속을 시도하는 사용자의 계정 역할, 접속망(외부/교내망), 현재 시간을 기반으로
 * 접속 허용 여부를 검증하는 최상위 인가 로직 함수
 */
export const checkExternalAccessPermission = (
  role: TeacherRole,
  isExternalAccess: boolean,
  schoolBranding: SchoolBranding,
  customCurrentTime?: Date
): AccessCheckResult => {
  // 1. 내부망(교내 PC) 접속인 경우 무조건 모든 접근 허용
  if (!isExternalAccess) {
    return { allowed: true };
  }

  // 2. 계정 그룹별 외부 접속 개별 스위치 제어 확인 (1차 필터)
  const blockConfig = schoolBranding.blockExternalAccess || {
    teacher: true,
    manager: false,
    leadership: false,
    admin: false,
  };

  // 계정 역할(TeacherRole)을 BlockExternalAccessConfig 키로 매핑
  let isGroupBlocked = false;
  if (role === 'teacher' && blockConfig.teacher) isGroupBlocked = true;
  else if (role === 'manager' && blockConfig.manager) isGroupBlocked = true;
  else if ((role === 'vice_principal' || role === 'principal') && blockConfig.leadership) isGroupBlocked = true;
  else if (role === 'admin' && blockConfig.admin) isGroupBlocked = true;

  if (isGroupBlocked) {
    return {
      allowed: false,
      reason: `선생님의 계정 권한[${getRoleName(role)}]은 교내망(학교 PC)에서만 접속하도록 설정되어 있습니다.`,
    };
  }

  // 3. 등교 지도 시간제 접속 타이머 검증 (2차 필터)
  const useTimeLimit = schoolBranding.useTimeLimit ?? true;

  // 타이머 기능이 꺼져있다면 그룹 허용 권한만으로 접속 허용
  if (!useTimeLimit) {
    return { allowed: true };
  }

  // 현재 시각 판별 (HH:mm 포맷)
  const now = customCurrentTime || new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const startTime = schoolBranding.timeLimitStart || '07:30';
  const endTime = schoolBranding.timeLimitEnd || '08:40';

  // 현재 시간이 허용 시간 범위 내에 있는지 판별 (예: 07:30 ~ 08:40)
  const isWithinTimeRange = currentTimeStr >= startTime && currentTimeStr <= endTime;

  if (isWithinTimeRange) {
    // 허용 시간 내에는 그룹 스위치가 '🔓 허용'인 모든 사용자가 정상 접속 가능
    return { allowed: true };
  }

  // 4. 허용 시간(예: 08:40) 경과 후의 처리 정책 판별
  const afterTimePolicy = schoolBranding.afterTimePolicy || 'admin_only';
  const adminOverrideSwitch = schoolBranding.adminOverrideSwitch ?? true;

  // 정책이 '관리자 예외'이고 + 스위치가 ON이며 + 접속자가 '관리자(admin)'인 경우만 통과!
  if (role === 'admin' && afterTimePolicy === 'admin_only' && adminOverrideSwitch) {
    return { allowed: true };
  }

  // 그 외 모든 경우(인성부, 교감/교장 포함)는 시간 경과로 차단
  return {
    allowed: false,
    reason: `현재 등교 지도 시간(${startTime}~${endTime})이 지나 외부 스마트폰 접속이 제한됩니다. 교내망 PC를 이용해 주세요.`,
  };
};

// 역할 한글 명칭 변환 헬퍼
function getRoleName(role: TeacherRole): string {
  switch (role) {
    case 'teacher':
      return '일반교사';
    case 'manager':
      return '인성부 교사';
    case 'vice_principal':
      return '교감 선생님';
    case 'principal':
      return '교장 선생님';
    case 'admin':
      return '관리자';
    default:
      return '사용자';
  }
}