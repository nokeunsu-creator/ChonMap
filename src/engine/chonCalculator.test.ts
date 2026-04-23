import { describe, it, expect } from 'vitest';
import { calculateRelationship, calculateAllRelationships, findAlternativePaths } from './chonCalculator';
import { FamilyGraph, Gender } from '../models/types';

function p(id: string, name: string, gender: Gender, birthYear?: number) {
  return { id, name, gender, birthYear };
}
function parentOf(from: string, to: string) {
  return { id: `e-${from}-${to}`, type: 'PARENT_OF' as const, from, to };
}
function spouseOf(a: string, b: string) {
  return { id: `e-${a}-${b}`, type: 'SPOUSE_OF' as const, from: a, to: b };
}

// 기본 3대 가족
const threeGenGraph: FamilyGraph = {
  persons: {
    gf: p('gf', '할아버지', 'M', 1940),
    gm: p('gm', '할머니', 'F', 1942),
    father: p('father', '아버지', 'M', 1965),
    mother: p('mother', '어머니', 'F', 1967),
    uncle: p('uncle', '삼촌', 'M', 1970),
    me: p('me', '나', 'M', 1990),
    cousin: p('cousin', '사촌', 'M', 1992),
  },
  edges: [
    spouseOf('gf', 'gm'),
    parentOf('gf', 'father'), parentOf('gm', 'father'),
    parentOf('gf', 'uncle'), parentOf('gm', 'uncle'),
    spouseOf('father', 'mother'),
    parentOf('father', 'me'), parentOf('mother', 'me'),
    parentOf('uncle', 'cousin'),
  ],
  rootPersonId: 'me',
  version: 1,
};

describe('calculateRelationship', () => {
  it('본인 관계', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'me');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(0);
    expect(r!.title).toBe('본인');
  });

  it('부모 (1촌)', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'father');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(1);
    expect(r!.title).toBe('아버지');
  });

  it('어머니 (1촌)', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'mother');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(1);
    expect(r!.title).toBe('어머니');
  });

  it('배우자 (무촌)', () => {
    const r = calculateRelationship(threeGenGraph, 'father', 'mother');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(-1);
    expect(r!.title).toMatch(/아내|남편/);
  });

  it('조부모 (2촌)', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'gf');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('할아버지');
  });

  it('삼촌 (3촌) - 아버지보다 어린 동생 → 작은아버지', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'uncle');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('작은아버지(숙부)');
  });

  it('사촌 (4촌)', () => {
    const r = calculateRelationship(threeGenGraph, 'me', 'cousin');
    expect(r).not.toBeNull();
    expect(r!.chon).toBe(4);
    expect(r!.title).toContain('사촌');
  });

  it('연결되지 않은 사람은 null', () => {
    const isolated: FamilyGraph = {
      persons: { a: p('a', 'A', 'M'), b: p('b', 'B', 'M') },
      edges: [],
      rootPersonId: 'a',
      version: 1,
    };
    const r = calculateRelationship(isolated, 'a', 'b');
    expect(r).toBeNull();
  });

  it('1인 가족', () => {
    const single: FamilyGraph = {
      persons: { a: p('a', 'A', 'M') },
      edges: [],
      rootPersonId: 'a',
      version: 1,
    };
    const r = calculateRelationship(single, 'a', 'a');
    expect(r).not.toBeNull();
    expect(r!.title).toBe('본인');
  });
});

describe('calculateAllRelationships', () => {
  it('모든 사람에 대해 관계 계산', () => {
    const results = calculateAllRelationships(threeGenGraph, 'me');
    expect(results.size).toBe(Object.keys(threeGenGraph.persons).length);
    expect(results.get('me')!.title).toBe('본인');
    expect(results.get('father')!.title).toBe('아버지');
  });
});

describe('findAlternativePaths', () => {
  it('배우자 경로', () => {
    const paths = findAlternativePaths(threeGenGraph, 'father', 'mother');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].title).toMatch(/아내|남편/);
  });

  it('본인은 빈 배열', () => {
    const paths = findAlternativePaths(threeGenGraph, 'me', 'me');
    expect(paths).toEqual([]);
  });

  it('경로가 존재하면 최소 1개', () => {
    const paths = findAlternativePaths(threeGenGraph, 'me', 'cousin');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].chon).toBe(4);
  });
});

// 확장 가계도: 8촌까지 테스트
//
// 고조할아버지(ggf)
//   ├─ 증조할아버지(greatgf)
//   │    ├─ 할아버지(gf, 1940)
//   │    │    ├─ 아버지(father, 1965)
//   │    │    │    ├─ 나(me, 1990) ← 기준
//   │    │    │    │    └─ 아들(son) → 손자(grandson) → 증손자(greatGS) → 고손자(ggreatGS)
//   │    │    │    └─ (empty)
//   │    │    └─ 삼촌(uncle, 1970)
//   │    │         └─ 사촌(cousin, 1993)
//   │    │              └─ 5촌조카(fiveJoka)
//   │    ├─ 큰할아버지(greatUncleE, 1938) ← gf보다 연상
//   │    │    └─ 당숙(dangSuk)
//   │    │         └─ 육촌(yukChon)
//   │    │              └─ 재종조카(jaeJongJoka)
//   │    └─ 작은할아버지(greatUncleY, 1945) ← gf보다 연하
//   └─ 증조형제(greatgfBro)
//        └─ 중간(jjMid)
//             └─ 재종숙(jaeJongSuk)
//                  └─ 팔촌(palChon, 2000)
//
const extendedGraph: FamilyGraph = {
  persons: {
    ggf: p('ggf', '고조할아버지', 'M', 1900),
    greatgf: p('greatgf', '증조할아버지', 'M', 1920),
    greatgfBro: p('greatgfBro', '증조형제', 'M', 1922),
    gf: p('gf', '할아버지', 'M', 1940),
    greatUncleE: p('greatUncleE', '큰할아버지', 'M', 1938),
    greatUncleY: p('greatUncleY', '작은할아버지', 'M', 1945),
    father: p('father', '아버지', 'M', 1965),
    uncle: p('uncle', '삼촌', 'M', 1970),
    dangSuk: p('dangSuk', '당숙', 'M', 1968),
    jjMid: p('jjMid', '중간', 'M', 1948),
    me: p('me', '나', 'M', 1990),
    cousin: p('cousin', '사촌', 'M', 1993),
    yukChon: p('yukChon', '육촌', 'M', 1991),
    jaeJongSuk: p('jaeJongSuk', '재종숙', 'M', 1975),
    son: p('son', '아들', 'M', 2020),
    fiveJoka: p('fiveJoka', '5촌조카', 'M', 2020),
    jaeJongJoka: p('jaeJongJoka', '재종조카', 'M', 2020),
    palChon: p('palChon', '팔촌', 'M', 2000),
    grandson: p('grandson', '손자', 'M', 2045),
    greatGS: p('greatGS', '증손자', 'M', 2070),
    ggreatGS: p('ggreatGS', '고손자', 'M', 2095),
    // --- 모계 ---
    mother: p('mother', '어머니', 'F', 1967),
    mgf: p('mgf', '외할아버지', 'M', 1938),
    mgm: p('mgm', '외할머니', 'F', 1940),
    maternalUncle: p('maternalUncle', '외삼촌', 'M', 1970),
    maternalAunt: p('maternalAunt', '이모', 'F', 1972),
    maternalCousin: p('maternalCousin', '외사촌', 'M', 1992),
    // --- 여성 부계 ---
    paternalAunt: p('paternalAunt', '고모', 'F', 1968),
    dangGoMo: p('dangGoMo', '당고모', 'F', 1969),
    jaeJongGoMo: p('jaeJongGoMo', '재종고모', 'F', 1976),
    cousinDaughter: p('cousinDaughter', '5촌조카딸', 'F', 2021),
    daughter: p('daughter', '딸', 'F', 2022),
    externalGrandson: p('externalGrandson', '외손자', 'M', 2048),
    granddaughter: p('granddaughter', '손녀', 'F', 2047),
    // --- 인척 ---
    wife: p('wife', '아내', 'F', 1991),
    fil: p('fil', '장인', 'M', 1960),
    mil: p('mil', '장모', 'F', 1962),
    wifeBro: p('wifeBro', '처남', 'M', 1993),
    wifeSisE: p('wifeSisE', '처형', 'F', 1988),
    wifeSisY: p('wifeSisY', '처제', 'F', 1994),
    brother: p('brother', '형', 'M', 1987),
    brotherWife: p('brotherWife', '형수', 'F', 1988),
    brotherDaughter: p('brotherDaughter', '조카딸', 'F', 2015),
    greatUncleEWife: p('greatUncleEWife', '큰할머니', 'F', 1939),
    sonWife: p('sonWife', '며느리', 'F', 2021),
  },
  edges: [
    // 고조 → 증조 세대
    parentOf('ggf', 'greatgf'),
    parentOf('ggf', 'greatgfBro'),
    // 증조 → 할아버지 세대
    parentOf('greatgf', 'gf'),
    parentOf('greatgf', 'greatUncleE'),
    parentOf('greatgf', 'greatUncleY'),
    parentOf('greatgfBro', 'jjMid'),
    // 할아버지 → 아버지 세대
    parentOf('gf', 'father'),
    parentOf('gf', 'uncle'),
    parentOf('greatUncleE', 'dangSuk'),
    parentOf('jjMid', 'jaeJongSuk'),
    // 아버지 → 나 세대
    parentOf('father', 'me'),
    parentOf('uncle', 'cousin'),
    parentOf('dangSuk', 'yukChon'),
    parentOf('jaeJongSuk', 'palChon'),
    // 나 → 아들 세대
    parentOf('me', 'son'),
    parentOf('cousin', 'fiveJoka'),
    parentOf('yukChon', 'jaeJongJoka'),
    // 아들 → 이하
    parentOf('son', 'grandson'),
    parentOf('grandson', 'greatGS'),
    parentOf('greatGS', 'ggreatGS'),
    // --- 모계 ---
    spouseOf('father', 'mother'),
    parentOf('mother', 'me'),
    parentOf('mother', 'brother'),
    parentOf('mgf', 'mother'),
    parentOf('mgm', 'mother'),
    parentOf('mgf', 'maternalUncle'),
    parentOf('mgm', 'maternalUncle'),
    parentOf('mgf', 'maternalAunt'),
    parentOf('mgm', 'maternalAunt'),
    parentOf('maternalUncle', 'maternalCousin'),
    // --- 여성 부계 ---
    parentOf('gf', 'paternalAunt'),
    parentOf('greatUncleE', 'dangGoMo'),
    parentOf('jjMid', 'jaeJongGoMo'),
    parentOf('cousin', 'cousinDaughter'),
    parentOf('me', 'daughter'),
    parentOf('daughter', 'externalGrandson'),
    parentOf('son', 'granddaughter'),
    // --- 인척 ---
    spouseOf('me', 'wife'),
    parentOf('fil', 'wife'),
    parentOf('mil', 'wife'),
    parentOf('fil', 'wifeBro'),
    parentOf('mil', 'wifeBro'),
    parentOf('fil', 'wifeSisE'),
    parentOf('mil', 'wifeSisE'),
    parentOf('fil', 'wifeSisY'),
    parentOf('mil', 'wifeSisY'),
    parentOf('father', 'brother'),
    spouseOf('brother', 'brotherWife'),
    parentOf('brother', 'brotherDaughter'),
    spouseOf('greatUncleE', 'greatUncleEWife'),
    spouseOf('son', 'sonWife'),
  ],
  rootPersonId: 'me',
  version: 1,
};

describe('3~4촌 직계 및 종조부 호칭', () => {
  it('증조할아버지 (3촌 직계, ascent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'greatgf');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('증조할아버지');
  });

  it('고조할아버지 (4촌 직계, ascent=4)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'ggf');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('고조할아버지');
  });

  it('증손자 (3촌 직계, descent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'greatGS');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('증손자');
  });

  it('고손자 (4촌 직계, descent=4)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'ggreatGS');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('고손자');
  });

  it('큰할아버지 (4촌, ascent=3 descent=1, 할아버지보다 연상)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'greatUncleE');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('큰할아버지');
  });

  it('작은할아버지 (4촌, ascent=3 descent=1, 할아버지보다 연하)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'greatUncleY');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('작은할아버지');
  });

  it('종조카 (4촌, ascent=1 descent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'father', 'fiveJoka');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('종조카');
  });
});

describe('5~8촌 호칭', () => {
  it('당숙 (5촌, ascent=3 descent=2)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'dangSuk');
    expect(r!.chon).toBe(5);
    expect(r!.title).toBe('당숙(5촌 아저씨)');
  });

  it('5촌 조카 (5촌, ascent=2 descent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'fiveJoka');
    expect(r!.chon).toBe(5);
    expect(r!.title).toBe('5촌 조카');
  });

  it('육촌 (6촌, ascent=3 descent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'yukChon');
    expect(r!.chon).toBe(6);
    expect(r!.title).toContain('육촌');
  });

  it('재종숙 (7촌, ascent=4 descent=3)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'jaeJongSuk');
    expect(r!.chon).toBe(7);
    expect(r!.title).toBe('재종숙');
  });

  it('재종조카 (7촌, ascent=3 descent=4)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'jaeJongJoka');
    expect(r!.chon).toBe(7);
    expect(r!.title).toBe('재종조카');
  });

  it('팔촌 (8촌, ascent=4 descent=4)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'palChon');
    expect(r!.chon).toBe(8);
    expect(r!.title).toContain('팔촌');
  });
});

describe('여성 호칭', () => {
  it('고모 (3촌, 부계 여성)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'paternalAunt');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('고모');
  });

  it('조카딸 (3촌, 형의 딸)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'brotherDaughter');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('조카딸');
  });

  it('당고모 (5촌, 여성)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'dangGoMo');
    expect(r!.chon).toBe(5);
    expect(r!.title).toBe('당고모');
  });

  it('5촌 조카딸 (5촌, 사촌의 딸)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'cousinDaughter');
    expect(r!.chon).toBe(5);
    expect(r!.title).toBe('5촌 조카딸');
  });

  it('재종고모 (7촌, 여성)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'jaeJongGoMo');
    expect(r!.chon).toBe(7);
    expect(r!.title).toBe('재종고모');
  });

  it('손녀 (2촌, 아들의 딸)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'granddaughter');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('손녀');
  });

  it('외손자 (2촌, 딸의 아들)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'externalGrandson');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('외손자');
  });
});

describe('모계 호칭', () => {
  it('외할아버지 (2촌, 모계)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'mgf');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('외할아버지');
  });

  it('외할머니 (2촌, 모계)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'mgm');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('외할머니');
  });

  it('외삼촌 (3촌, 모계 남성)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'maternalUncle');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('외삼촌');
  });

  it('이모 (3촌, 모계 여성)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'maternalAunt');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('이모');
  });

  it('외사촌 (4촌, 모계)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'maternalCousin');
    expect(r!.chon).toBe(4);
    expect(r!.title).toContain('외사촌');
  });
});

describe('인척 호칭', () => {
  it('장인어른 (배우자의 아버지)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'fil');
    expect(r!.chon).toBe(1);
    expect(r!.title).toBe('장인어른');
    expect(r!.isInLaw).toBe(true);
  });

  it('장모님 (배우자의 어머니)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'mil');
    expect(r!.chon).toBe(1);
    expect(r!.title).toBe('장모님');
    expect(r!.isInLaw).toBe(true);
  });

  it('처남 (배우자의 남형제)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'wifeBro');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('처남');
  });

  it('처형 (배우자의 언니)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'wifeSisE');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('처형');
  });

  it('처제 (배우자의 여동생)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'wifeSisY');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('처제');
  });

  it('형수 (형의 아내)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'brotherWife');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('형수');
    expect(r!.isInLaw).toBe(true);
  });

  it('큰할머니 (큰할아버지의 아내, 인척)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'greatUncleEWife');
    expect(r!.chon).toBe(4);
    expect(r!.title).toBe('큰할머니');
    expect(r!.isInLaw).toBe(true);
  });

  it('며느리 (아들의 아내)', () => {
    const r = calculateRelationship(extendedGraph, 'me', 'sonWife');
    expect(r!.chon).toBe(1);
    expect(r!.title).toBe('며느리');
    expect(r!.isInLaw).toBe(true);
  });
});

// 사돈/심화 인척 테스트용 그래프
//
// 부계:
//   gf(M,1940) ─┬─ father(M,1965) ─배우자─ mother(F,1967) ─┬─ me(M,1990)
//                │                                            ├─ bro(M,1985)
//                │                                            ├─ sis(F,1987)
//                │                                            ├─ youngBro(M,1993)
//                │                                            └─ youngSis(F,1995)
//                └─ paternalAunt(F,1968) ─배우자─ paternalAuntH(M,1966)
//
// 모계:
//   maternalGF(M,1938) ─ mother ─ (위와 동일)
//   maternalUncle(M,1970) ─배우자─ maternalUncleWife(F,1971)
//   maternalAunt(F,1972) ─배우자─ maternalAuntH(M,1970)
//
// 나의 인척:
//   me ─배우자─ wife(F,1991) ─ fil(M,1960)/mil(F,1962)
//                              └─ wifeBro(M,1993) ─배우자─ wifeBroWife(F,1994)
//   me → daughter(F,2022) ─배우자─ sonInLaw(M,2020)
//
// 형제/자매 배우자:
//   bro ─배우자─ broWife(F,1986)
//   sis ─배우자─ sisH(M,1984)
//   youngBro ─배우자─ youngBroWife(F,1994)
//   youngSis ─배우자─ youngSisH(M,1993)
const deepInLawGraph: FamilyGraph = {
  persons: {
    gf: p('gf', '할아버지', 'M', 1940),
    father: p('father', '아버지', 'M', 1965),
    mother: p('mother', '어머니', 'F', 1967),
    me: p('me', '나', 'M', 1990),
    bro: p('bro', '형', 'M', 1985),
    sis: p('sis', '누나', 'F', 1987),
    youngBro: p('youngBro', '남동생', 'M', 1993),
    youngSis: p('youngSis', '여동생', 'F', 1995),
    paternalAunt: p('paternalAunt', '고모', 'F', 1968),
    paternalAuntH: p('paternalAuntH', '고모부', 'M', 1966),
    maternalGF: p('maternalGF', '외할아버지', 'M', 1938),
    maternalGM: p('maternalGM', '외할머니', 'F', 1940),
    maternalUncle: p('maternalUncle', '외삼촌', 'M', 1970),
    maternalUncleWife: p('maternalUncleWife', '외숙모', 'F', 1971),
    maternalAunt: p('maternalAunt', '이모', 'F', 1972),
    maternalAuntH: p('maternalAuntH', '이모부', 'M', 1970),
    wife: p('wife', '아내', 'F', 1991),
    fil: p('fil', '장인', 'M', 1960),
    mil: p('mil', '장모', 'F', 1962),
    wifeBro: p('wifeBro', '처남', 'M', 1993),
    wifeBroWife: p('wifeBroWife', '처남댁', 'F', 1994),
    daughter: p('daughter', '딸', 'F', 2022),
    sonInLaw: p('sonInLaw', '사위', 'M', 2020),
    broWife: p('broWife', '형수', 'F', 1986),
    sisH: p('sisH', '매형', 'M', 1984),
    youngBroWife: p('youngBroWife', '제수씨', 'F', 1994),
    youngSisH: p('youngSisH', '매제', 'M', 1993),
  },
  edges: [
    // 부계 혈연
    parentOf('gf', 'father'),
    parentOf('gf', 'paternalAunt'),
    spouseOf('father', 'mother'),
    parentOf('father', 'me'), parentOf('mother', 'me'),
    parentOf('father', 'bro'), parentOf('mother', 'bro'),
    parentOf('father', 'sis'), parentOf('mother', 'sis'),
    parentOf('father', 'youngBro'), parentOf('mother', 'youngBro'),
    parentOf('father', 'youngSis'), parentOf('mother', 'youngSis'),
    // 고모 인척
    spouseOf('paternalAunt', 'paternalAuntH'),
    // 모계 혈연
    parentOf('maternalGF', 'mother'), parentOf('maternalGM', 'mother'),
    parentOf('maternalGF', 'maternalUncle'), parentOf('maternalGM', 'maternalUncle'),
    parentOf('maternalGF', 'maternalAunt'), parentOf('maternalGM', 'maternalAunt'),
    spouseOf('maternalUncle', 'maternalUncleWife'),
    spouseOf('maternalAunt', 'maternalAuntH'),
    // 나의 인척
    spouseOf('me', 'wife'),
    parentOf('fil', 'wife'), parentOf('mil', 'wife'),
    parentOf('fil', 'wifeBro'), parentOf('mil', 'wifeBro'),
    spouseOf('wifeBro', 'wifeBroWife'),
    parentOf('me', 'daughter'),
    spouseOf('daughter', 'sonInLaw'),
    // 형제자매 배우자
    spouseOf('bro', 'broWife'),
    spouseOf('sis', 'sisH'),
    spouseOf('youngBro', 'youngBroWife'),
    spouseOf('youngSis', 'youngSisH'),
  ],
  rootPersonId: 'me',
  version: 1,
};

describe('사돈 호칭', () => {
  it('사돈 - 형 관점에서 나의 배우자의 아버지', () => {
    const r = calculateRelationship(deepInLawGraph, 'bro', 'fil');
    expect(r!.title).toBe('사돈');
    expect(r!.isInLaw).toBe(true);
  });

  it('사돈 - 형 관점에서 나의 배우자의 어머니', () => {
    const r = calculateRelationship(deepInLawGraph, 'bro', 'mil');
    expect(r!.title).toBe('사돈');
  });

  it('사돈 - 누나 관점에서 나의 배우자의 아버지', () => {
    const r = calculateRelationship(deepInLawGraph, 'sis', 'fil');
    expect(r!.title).toBe('사돈');
  });

  it('남동생 관점에서 나의 배우자 부모도 사돈', () => {
    const r = calculateRelationship(deepInLawGraph, 'youngBro', 'fil');
    expect(r!.title).toBe('사돈');
  });

  it('처남의 아내(처남댁)는 사돈이 아님 - down→spouse→down 패턴', () => {
    // 나 → 아내(spouse) → 처남(down/up) → 처남댁(spouse)
    // spouseAfterBlood=true이므로 isMidSpouse가 아님 → 사돈이 아님
    const r = calculateRelationship(deepInLawGraph, 'me', 'wifeBroWife');
    expect(r!.title).not.toBe('사돈');
    // 현재는 처형/처제로 나오는 알려진 한계 (pre-existing)
  });

  it('사위 (딸의 남편)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'sonInLaw');
    expect(r!.title).toBe('사위');
    expect(r!.isInLaw).toBe(true);
  });
});

describe('고모부/외숙모/이모부 호칭', () => {
  it('고모부 (고모의 남편)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'paternalAuntH');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('고모부');
  });

  it('외숙모 (외삼촌의 아내)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'maternalUncleWife');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('외숙모');
  });

  it('이모부 (이모의 남편)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'maternalAuntH');
    expect(r!.chon).toBe(3);
    expect(r!.title).toBe('이모부');
  });
});

describe('역방향 호칭', () => {
  it('아버지 관점에서 나 = 아들', () => {
    const r = calculateRelationship(deepInLawGraph, 'father', 'me');
    expect(r!.title).toBe('아들');
    expect(r!.chon).toBe(1);
  });

  it('장인 관점에서 나(사위) = 사위', () => {
    const r = calculateRelationship(deepInLawGraph, 'fil', 'me');
    expect(r!.title).toBe('사위');
  });

  it('아내 관점에서 나 = 남편', () => {
    const r = calculateRelationship(deepInLawGraph, 'wife', 'me');
    expect(r!.title).toMatch(/남편/);
  });

  it('아내 관점에서 나의 아버지 = 시아버지', () => {
    const r = calculateRelationship(deepInLawGraph, 'wife', 'father');
    expect(r!.title).toBe('시아버지');
  });
});

describe('남동생/여동생 배우자 호칭', () => {
  it('제수씨 (남동생의 아내)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'youngBroWife');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('제수씨');
  });

  it('매제 (여동생의 남편, 남성 화자)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'youngSisH');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('매제');
  });

  it('형수 (형의 아내) - 역방향', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'broWife');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('형수');
  });

  it('매형 (누나의 남편)', () => {
    const r = calculateRelationship(deepInLawGraph, 'me', 'sisH');
    expect(r!.chon).toBe(2);
    expect(r!.title).toBe('매형');
  });
});

describe('여성 화자 호칭', () => {
  it('여동생 관점: 나(오빠) = 오빠', () => {
    const r = calculateRelationship(deepInLawGraph, 'youngSis', 'me');
    expect(r!.title).toBe('오빠');
  });

  it('여동생 관점: 나의 아내 = 올케', () => {
    const r = calculateRelationship(deepInLawGraph, 'youngSis', 'wife');
    expect(r!.title).toBe('올케');
  });

  it('며느리(아내) 관점: 외할아버지 = 시할아버지', () => {
    const r = calculateRelationship(deepInLawGraph, 'wife', 'maternalGF');
    expect(r!.title).toBe('시할아버지');
  });

  it('누나 관점: 나의 아내(여동생뻘) = 올케', () => {
    const r = calculateRelationship(deepInLawGraph, 'sis', 'wife');
    expect(r!.title).toBe('올케');
  });
});
