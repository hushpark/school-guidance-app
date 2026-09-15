export interface Student {
    id: string;        // 예: "10101"
    grade: number;     // 학년 (1, 2, 3)
    classNum: number;  // 반 (1~10)
    number: number;    // 번호
    name: string;      // 이름
    photoUrl?: string; // (선택) 사진 경로
  }
  
  export const STUDENTS_DATA: Student[] = [
    // --- 1학년 1반 ---
    { id: "10101", grade: 1, classNum: 1, number: 1, name: "홍길동" },
    { id: "10102", grade: 1, classNum: 1, number: 2, name: "강감찬" },
    { id: "10103", grade: 1, classNum: 1, number: 3, name: "손오공" },
    
    // --- 1학년 2반 ---
    { id: "10201", grade: 1, classNum: 2, number: 1, name: "이순신" },
    { id: "10202", grade: 1, classNum: 2, number: 2, name: "김구"},
  
    // --- 1학년 5반 ---
    { id: "10520", grade: 1, classNum: 5, number: 20, name: "왕건" },
  ];