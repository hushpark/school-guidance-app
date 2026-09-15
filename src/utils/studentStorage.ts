import { STUDENTS_DATA, type Student } from '../data/students';

const STORAGE_KEY = 'SCHOOL_GUIDANCE_STUDENTS';

// 로컬스토리지에서 명단 불러오기
export const getStoredStudents = (): Student[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return STUDENTS_DATA;
    }
  }
  return STUDENTS_DATA;
};

// 로컬스토리지에 명단 저장하기
export const saveStoredStudents = (students: Student[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
};

// 로컬스토리지 초기화 (기본 학생 데이터로 복원)
export const resetStoredStudents = () => {
  localStorage.removeItem(STORAGE_KEY);
  return STUDENTS_DATA;
};