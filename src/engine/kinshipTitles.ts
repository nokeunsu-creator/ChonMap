import { Gender } from '../models/types';

// 호칭 룩업 키: "ascent,descent,lineage,targetGender,speakerGender,isInLaw,seniority"
// seniority: 'elder' | 'younger' | 'any'
// lineage: 'P' (paternal) | 'M' (maternal)

interface TitleEntry {
  ascent: number;
  descent: number;
  lineage: 'P' | 'M' | '*';    // * = 무관
  targetGender: Gender | '*';
  speakerGender: Gender | '*';
  isInLaw: boolean;
  seniority: 'elder' | 'younger' | '*';
  title: string;
}

const TITLES: TitleEntry[] = [
  // === 0촌: 본인 ===
  { ascent: 0, descent: 0, lineage: '*', targetGender: '*', speakerGender: '*', isInLaw: false, seniority: '*', title: '본인' },

  // === 1촌: 부모/자녀 ===
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '아버지' },
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '어머니' },
  { ascent: 0, descent: 1, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '아들' },
  { ascent: 0, descent: 1, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '딸' },

  // 1촌 인척: 부모의 배우자, 자녀의 배우자
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '아버지' },
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '어머니' },
  { ascent: 0, descent: 1, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '사위' },
  { ascent: 0, descent: 1, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '며느리' },

  // === 배우자 (무촌) ===
  // 배우자는 chonCalculator에서 직접 처리

  // === 2촌: 조부모/형제/손자녀 ===
  // 조부모
  { ascent: 2, descent: 0, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '할아버지' },
  { ascent: 2, descent: 0, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '할머니' },
  { ascent: 2, descent: 0, lineage: 'M', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '외할아버지' },
  { ascent: 2, descent: 0, lineage: 'M', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '외할머니' },
  // 조부모 인척
  { ascent: 2, descent: 0, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '할머니' },
  { ascent: 2, descent: 0, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '할아버지' },
  { ascent: 2, descent: 0, lineage: 'M', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '외할머니' },
  { ascent: 2, descent: 0, lineage: 'M', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '외할아버지' },

  // 형제자매
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '형' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '남동생' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '오빠' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '남동생' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '누나' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '여동생' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '언니' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '여동생' },

  // 형제자매 (장유 불명 시 일반 호칭)
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '형제' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '자매' },

  // 형제자매 인척 (형수, 제수, 매형, 매제, 올케, 형부 등)
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: true, seniority: 'elder', title: '형수' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: true, seniority: 'younger', title: '제수씨' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: true, seniority: 'elder', title: '매형' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: true, seniority: 'younger', title: '매제' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: true, seniority: 'elder', title: '올케' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: true, seniority: 'younger', title: '올케' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: true, seniority: 'elder', title: '형부' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: true, seniority: 'younger', title: '제부' },

  // 손자녀
  { ascent: 0, descent: 2, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '손자' },
  { ascent: 0, descent: 2, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '손녀' },
  // 외손자녀 (딸의 자녀)
  // 외손은 경로에서 판단 — 여기서는 기본 손자/손녀로 처리

  // === 3촌: 삼촌/이모/조카 등 ===
  // 부계 삼촌/고모
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: 'elder', title: '큰아버지(백부)' },
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: 'younger', title: '작은아버지(숙부)' },
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '고모' },
  // 부계 3촌 인척
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: 'elder', title: '큰어머니(백모)' },
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: 'younger', title: '작은어머니(숙모)' },
  { ascent: 2, descent: 1, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '고모부' },

  // 모계 삼촌/이모
  { ascent: 2, descent: 1, lineage: 'M', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '외삼촌' },
  { ascent: 2, descent: 1, lineage: 'M', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '이모' },
  // 모계 3촌 인척
  { ascent: 2, descent: 1, lineage: 'M', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '외숙모' },
  { ascent: 2, descent: 1, lineage: 'M', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '이모부' },

  // 조카
  { ascent: 1, descent: 2, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '조카' },
  { ascent: 1, descent: 2, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '조카딸' },

  // === 4촌: 사촌/종조부 등 ===
  // 사촌 (부계)
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '사촌형' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '사촌동생' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '사촌오빠' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '사촌남동생' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '사촌누나' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '사촌여동생' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '사촌언니' },
  { ascent: 2, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '사촌여동생' },

  // 외사촌 (모계)
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '외사촌형' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '외사촌동생' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '외사촌오빠' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '외사촌남동생' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '외사촌누나' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '외사촌여동생' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '외사촌언니' },
  { ascent: 2, descent: 2, lineage: 'M', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '외사촌여동생' },

  // 종조부모 (4촌 위)
  { ascent: 3, descent: 1, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '종조부' },
  { ascent: 3, descent: 1, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '종조모' },
  { ascent: 3, descent: 1, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '종조부' },
  { ascent: 3, descent: 1, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '종조모' },

  // 증조부모
  { ascent: 3, descent: 0, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '증조할아버지' },
  { ascent: 3, descent: 0, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '증조할머니' },
  { ascent: 3, descent: 0, lineage: 'M', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '외증조할아버지' },
  { ascent: 3, descent: 0, lineage: 'M', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '외증조할머니' },

  // 증손자녀
  { ascent: 0, descent: 3, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '증손자' },
  { ascent: 0, descent: 3, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '증손녀' },

  // 종조카 (3촌의 자녀)
  { ascent: 1, descent: 3, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '종조카' },
  { ascent: 1, descent: 3, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '종조카딸' },

  // === 5촌: 당숙/종조카 등 ===
  { ascent: 3, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '당숙(5촌 아저씨)' },
  { ascent: 3, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '당고모' },
  { ascent: 2, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '종손(5촌 조카)' },
  { ascent: 2, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '종질녀' },

  // 5촌 인척
  { ascent: 3, descent: 2, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '당숙모' },
  { ascent: 3, descent: 2, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '당고모부' },

  // === 6촌 ===
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '육촌형' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '육촌동생' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '육촌오빠' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '육촌남동생' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '육촌누나' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '육촌여동생' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '육촌언니' },
  { ascent: 3, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '육촌여동생' },

  // 고조부모 (4촌 위 직계)
  { ascent: 4, descent: 0, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '고조할아버지' },
  { ascent: 4, descent: 0, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '고조할머니' },

  // 고손자녀
  { ascent: 0, descent: 4, lineage: '*', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '고손자' },
  { ascent: 0, descent: 4, lineage: '*', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '고손녀' },

  // === 7촌 ===
  { ascent: 4, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '재종숙' },
  { ascent: 4, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '재종고모' },
  { ascent: 3, descent: 4, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: false, seniority: '*', title: '재종조카' },
  { ascent: 3, descent: 4, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: false, seniority: '*', title: '재종질녀' },
  { ascent: 4, descent: 3, lineage: 'P', targetGender: 'F', speakerGender: '*', isInLaw: true, seniority: '*', title: '재종숙모' },
  { ascent: 4, descent: 3, lineage: 'P', targetGender: 'M', speakerGender: '*', isInLaw: true, seniority: '*', title: '재종고모부' },

  // === 8촌 ===
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '팔촌형' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'M', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '팔촌동생' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '팔촌오빠' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'M', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '팔촌남동생' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'elder', title: '팔촌누나' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'F', speakerGender: 'M', isInLaw: false, seniority: 'younger', title: '팔촌여동생' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'elder', title: '팔촌언니' },
  { ascent: 4, descent: 4, lineage: 'P', targetGender: 'F', speakerGender: 'F', isInLaw: false, seniority: 'younger', title: '팔촌여동생' },

  // === 배우자 쪽 (시/처가) ===
  // 장인/장모 (아내의 부모)
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: true, seniority: '*', title: '장인어른' },
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: true, seniority: '*', title: '장모님' },
  // 시부모 (남편의 부모)
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: true, seniority: '*', title: '시아버지' },
  { ascent: 1, descent: 0, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: true, seniority: '*', title: '시어머니' },

  // 처남/처제 (아내의 형제자매)
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'M', isInLaw: true, seniority: '*', title: '처남' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: true, seniority: 'elder', title: '처형' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'M', isInLaw: true, seniority: 'younger', title: '처제' },
  // 시형제 (남편의 형제자매)
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: true, seniority: 'elder', title: '시숙(아주버님)' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'M', speakerGender: 'F', isInLaw: true, seniority: 'younger', title: '도련님(시동생)' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: true, seniority: 'elder', title: '시누이(형님)' },
  { ascent: 1, descent: 1, lineage: '*', targetGender: 'F', speakerGender: 'F', isInLaw: true, seniority: 'younger', title: '시누이(아가씨)' },
];

// 호칭 조회
export function lookupTitle(
  ascent: number,
  descent: number,
  lineage: 'paternal' | 'maternal' | 'self',
  targetGender: Gender,
  speakerGender: Gender,
  isInLaw: boolean,
  seniority: 'elder' | 'younger' | 'unknown',
): string {
  const lin = lineage === 'paternal' ? 'P' : lineage === 'maternal' ? 'M' : '*';
  const sen = seniority === 'unknown' ? '*' : seniority;

  // 정확한 매칭 시도 (구체적 → 일반적)
  for (const specificity of getMatchOrders(lin, targetGender, speakerGender, sen)) {
    const match = TITLES.find(t =>
      t.ascent === ascent &&
      t.descent === descent &&
      (t.lineage === specificity.lineage || t.lineage === '*') &&
      (t.targetGender === specificity.targetGender || t.targetGender === '*') &&
      (t.speakerGender === specificity.speakerGender || t.speakerGender === '*') &&
      t.isInLaw === isInLaw &&
      (t.seniority === specificity.seniority || t.seniority === '*')
    );
    if (match) return match.title;
  }

  // 폴백: 촌수 기반 일반 호칭
  const chon = ascent + descent;
  if (chon === 0) return '본인';
  return `${chon}촌 ${isInLaw ? '인척' : '친족'}`;
}

function getMatchOrders(
  lin: string,
  tg: Gender,
  sg: Gender,
  sen: string,
): Array<{ lineage: string; targetGender: Gender | '*'; speakerGender: Gender | '*'; seniority: string }> {
  return [
    { lineage: lin, targetGender: tg, speakerGender: sg, seniority: sen },
    { lineage: lin, targetGender: tg, speakerGender: sg, seniority: '*' },
    { lineage: lin, targetGender: tg, speakerGender: '*', seniority: sen },
    { lineage: lin, targetGender: tg, speakerGender: '*', seniority: '*' },
    { lineage: '*', targetGender: tg, speakerGender: sg, seniority: sen },
    { lineage: '*', targetGender: tg, speakerGender: sg, seniority: '*' },
    { lineage: '*', targetGender: tg, speakerGender: '*', seniority: sen },
    { lineage: '*', targetGender: tg, speakerGender: '*', seniority: '*' },
  ];
}
