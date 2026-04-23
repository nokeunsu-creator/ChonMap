import { Gender } from '../models/types';
import { InLawType } from './chonCalculator';

// lookupTitle: 경로 분석 결과로 한국식 호칭 결정
export function lookupTitle(
  ascent: number,
  descent: number,
  lineage: 'paternal' | 'maternal' | 'self',
  targetGender: Gender,
  speakerGender: Gender,
  isInLaw: boolean,
  inLawType: InLawType,
  seniority: 'elder' | 'younger' | 'unknown',
  maternalDescent: boolean = false,
): string {
  const chon = ascent + descent;

  // === 0촌: 본인 ===
  if (chon === 0 && !isInLaw) return '본인';

  // === 배우자 (무촌) — 직접 배우자는 calculateRelationship에서 처리됨 ===

  // === 1촌 ===
  if (ascent === 1 && descent === 0) {
    if (inLawType === 'spouse-side') {
      // 배우자의 부모
      if (speakerGender === 'M') return targetGender === 'M' ? '장인어른' : '장모님';
      else return targetGender === 'M' ? '시아버지' : '시어머니';
    }
    // 직계 부모 (인척이든 아니든)
    return targetGender === 'M' ? '아버지' : '어머니';
  }

  if (ascent === 0 && descent === 1) {
    if (inLawType === 'blood-side') {
      // 자녀의 배우자
      return targetGender === 'M' ? '사위' : '며느리';
    }
    return targetGender === 'M' ? '아들' : '딸';
  }

  // === 2촌: 조부모/형제/손자 ===
  if (ascent === 2 && descent === 0) {
    if (inLawType === 'spouse-side') {
      // 배우자의 조부모
      if (speakerGender === 'M') return targetGender === 'M' ? '사장할아버지' : '사장할머니';
      else return targetGender === 'M' ? '시할아버지' : '시할머니';
    }
    if (lineage === 'maternal') return targetGender === 'M' ? '외할아버지' : '외할머니';
    return targetGender === 'M' ? '할아버지' : '할머니';
  }

  if (ascent === 0 && descent === 2) {
    if (maternalDescent) return targetGender === 'M' ? '외손자' : '외손녀';
    return targetGender === 'M' ? '손자' : '손녀';
  }

  if (ascent === 1 && descent === 1) {
    if (inLawType === 'spouse-side') {
      // 배우자의 형제자매
      if (speakerGender === 'M') {
        if (targetGender === 'M') return '처남';
        return seniority === 'elder' ? '처형' : seniority === 'younger' ? '처제' : '처형/처제';
      } else {
        if (targetGender === 'F') return '시누이';
        return seniority === 'elder' ? '시숙(아주버님)' : seniority === 'younger' ? '도련님(시동생)' : '시형제';
      }
    }
    if (inLawType === 'blood-side') {
      // 형제자매의 배우자
      if (speakerGender === 'M') {
        if (targetGender === 'F') return seniority === 'elder' ? '형수' : '제수씨';
        return seniority === 'elder' ? '매형' : '매제';
      } else {
        if (targetGender === 'F') return '올케';
        return seniority === 'elder' ? '형부' : '제부';
      }
    }
    // 혈연 형제자매
    const s = seniority;
    if (speakerGender === 'M') {
      if (targetGender === 'M') return s === 'elder' ? '형' : s === 'younger' ? '남동생' : '형제';
      return s === 'elder' ? '누나' : s === 'younger' ? '여동생' : '자매';
    } else {
      if (targetGender === 'M') return s === 'elder' ? '오빠' : s === 'younger' ? '남동생' : '형제';
      return s === 'elder' ? '언니' : s === 'younger' ? '여동생' : '자매';
    }
  }

  // === 3촌: 삼촌/이모/조카 ===
  if (ascent === 2 && descent === 1) {
    if (inLawType === 'blood-side') {
      // 삼촌/고모의 배우자
      if (lineage === 'paternal') {
        if (targetGender === 'F') return seniority === 'elder' ? '큰어머니(백모)' : '작은어머니(숙모)';
        return '고모부';
      }
      return targetGender === 'F' ? '외숙모' : '이모부';
    }
    // 혈연 삼촌/고모/이모
    if (lineage === 'paternal') {
      if (targetGender === 'M') return seniority === 'elder' ? '큰아버지(백부)' : seniority === 'younger' ? '작은아버지(숙부)' : '삼촌';
      return '고모';
    }
    if (targetGender === 'M') return '외삼촌';
    return '이모';
  }

  if (ascent === 1 && descent === 2) {
    return targetGender === 'M' ? '조카' : '조카딸';
  }

  // === 증조/증손 (직계 3촌) ===
  if (ascent === 3 && descent === 0) {
    if (lineage === 'maternal') return targetGender === 'M' ? '외증조할아버지' : '외증조할머니';
    return targetGender === 'M' ? '증조할아버지' : '증조할머니';
  }
  if (ascent === 0 && descent === 3) return targetGender === 'M' ? '증손자' : '증손녀';

  // === 4촌 ===
  if (ascent === 2 && descent === 2) {
    const prefix = lineage === 'maternal' ? '외사촌' : '사촌';
    const s = seniority;
    if (speakerGender === 'M') {
      if (targetGender === 'M') return s === 'elder' ? `${prefix}형` : s === 'younger' ? `${prefix}동생` : prefix;
      return s === 'elder' ? `${prefix}누나` : s === 'younger' ? `${prefix}여동생` : prefix;
    } else {
      if (targetGender === 'M') return s === 'elder' ? `${prefix}오빠` : s === 'younger' ? `${prefix}남동생` : prefix;
      return s === 'elder' ? `${prefix}언니` : s === 'younger' ? `${prefix}여동생` : prefix;
    }
  }

  if (ascent === 3 && descent === 1) {
    if (targetGender === 'M') {
      return seniority === 'elder' ? '큰할아버지' : seniority === 'younger' ? '작은할아버지' : '종조부';
    }
    return seniority === 'elder' ? '큰할머니' : seniority === 'younger' ? '작은할머니' : '종조모';
  }
  if (ascent === 1 && descent === 3) return targetGender === 'M' ? '종조카' : '종조카딸';

  // 고조부모/고손
  if (ascent === 4 && descent === 0) return targetGender === 'M' ? '고조할아버지' : '고조할머니';
  if (ascent === 0 && descent === 4) return targetGender === 'M' ? '고손자' : '고손녀';

  // === 5촌 ===
  if (ascent === 3 && descent === 2) {
    if (inLawType === 'blood-side') return targetGender === 'F' ? '당숙모' : '당고모부';
    return targetGender === 'M' ? '당숙(5촌 아저씨)' : '당고모';
  }
  if (ascent === 2 && descent === 3) return targetGender === 'M' ? '5촌 조카' : '5촌 조카딸';

  // === 6촌 ===
  if (ascent === 3 && descent === 3) {
    const s = seniority;
    if (speakerGender === 'M') {
      if (targetGender === 'M') return s === 'elder' ? '육촌형' : s === 'younger' ? '육촌동생' : '육촌';
      return s === 'elder' ? '육촌누나' : s === 'younger' ? '육촌여동생' : '육촌';
    } else {
      if (targetGender === 'M') return s === 'elder' ? '육촌오빠' : s === 'younger' ? '육촌남동생' : '육촌';
      return s === 'elder' ? '육촌언니' : s === 'younger' ? '육촌여동생' : '육촌';
    }
  }

  // === 7촌 ===
  if (ascent === 4 && descent === 3) {
    if (inLawType === 'blood-side') return targetGender === 'F' ? '재종숙모' : '재종고모부';
    return targetGender === 'M' ? '재종숙' : '재종고모';
  }
  if (ascent === 3 && descent === 4) return targetGender === 'M' ? '재종조카' : '재종질녀';

  // === 8촌 ===
  if (ascent === 4 && descent === 4) {
    const s = seniority;
    if (speakerGender === 'M') {
      if (targetGender === 'M') return s === 'elder' ? '팔촌형' : s === 'younger' ? '팔촌동생' : '팔촌';
      return s === 'elder' ? '팔촌누나' : s === 'younger' ? '팔촌여동생' : '팔촌';
    } else {
      if (targetGender === 'M') return s === 'elder' ? '팔촌오빠' : s === 'younger' ? '팔촌남동생' : '팔촌';
      return s === 'elder' ? '팔촌언니' : s === 'younger' ? '팔촌여동생' : '팔촌';
    }
  }

  // === 폴백 ===
  if (chon === 0) return '본인';
  if (isInLaw) return `인척 (${chon > 0 ? chon + '촌' : ''})`;
  return `${chon}촌 친족`;
}
