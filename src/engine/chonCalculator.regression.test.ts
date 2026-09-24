import { describe, it, expect } from 'vitest';
import { calculateRelationship, findAlternativePaths } from './chonCalculator';
import { FamilyGraph, Gender } from '../models/types';

// 2026-09 코드 리뷰에서 발견된 호칭 오류 회귀 테스트

function p(id: string, gender: Gender, birthYear?: number) {
  return { id, name: id, gender, birthYear };
}
function parentOf(from: string, to: string) {
  return { id: `e-${from}-${to}`, type: 'PARENT_OF' as const, from, to };
}
function spouseOf(a: string, b: string) {
  return { id: `e-${a}-${b}`, type: 'SPOUSE_OF' as const, from: a, to: b };
}

// 할아버지(gf)─할머니(gm)
//   ├ 아버지(father) ─ 어머니(mother)          ─ 나(me, 1985) ─ 아내(wife, 1990)
//   │                                           ├ 남동생(bro, 1988) ─ 제수(broWife)
//   │                                           └ 여동생(sis, 1992) ─ 매제(sisH)
//   ├ 작은아버지(uncle) — 할아버지에게만 연결
//   └ 고모(aunt) — 할머니에게만 연결
// 증조(ggf) ─ 할아버지(gf), 고모할머니(gfSis) ─ 고모할아버지(gfSisH)
// 외할아버지(mgf) ─ 외종조부(mgfBro)  (둘 다 외증조(mggf)의 자녀)
// 장인(fil) ─ 아내(wife), 처형(wifeSisE, 1988) ─ 동서(wifeSisEH), 처남(wifeBro) ─ 처남댁(wifeBroWife)
// 처조부(wgf) ─ 장인(fil), 처삼촌(wifeUncle, 장인 동생)
// 나 ─ 아들(son, 2015) — 나에게만 연결 / 딸(daughter, 2017) — 아내에게만 연결
const g: FamilyGraph = {
  persons: {
    ggf: p('ggf', 'M', 1910),
    gf: p('gf', 'M', 1935), gm: p('gm', 'F', 1937),
    gfSis: p('gfSis', 'F', 1938), gfSisH: p('gfSisH', 'M', 1936),
    father: p('father', 'M', 1960), mother: p('mother', 'F', 1962),
    uncle: p('uncle', 'M', 1965), aunt: p('aunt', 'F', 1963),
    mggf: p('mggf', 'M', 1912), mgf: p('mgf', 'M', 1936), mgfBro: p('mgfBro', 'M', 1940),
    me: p('me', 'M', 1985), wife: p('wife', 'F', 1990),
    bro: p('bro', 'M', 1988), broWife: p('broWife', 'F', 1989),
    sis: p('sis', 'F', 1992), sisH: p('sisH', 'M', 1991),
    wgf: p('wgf', 'M', 1935), fil: p('fil', 'M', 1960), wifeUncle: p('wifeUncle', 'M', 1963),
    wifeSisE: p('wifeSisE', 'F', 1988), wifeSisEH: p('wifeSisEH', 'M', 1986),
    wifeBro: p('wifeBro', 'M', 1993), wifeBroWife: p('wifeBroWife', 'F', 1994),
    son: p('son', 'M', 2015), daughter: p('daughter', 'F', 2017),
  },
  edges: [
    parentOf('ggf', 'gf'), parentOf('ggf', 'gfSis'), spouseOf('gfSis', 'gfSisH'),
    spouseOf('gf', 'gm'),
    parentOf('gf', 'father'), parentOf('gm', 'father'),
    parentOf('gf', 'uncle'),
    parentOf('gm', 'aunt'),
    spouseOf('father', 'mother'),
    parentOf('father', 'me'), parentOf('mother', 'me'),
    parentOf('father', 'bro'), parentOf('mother', 'bro'), spouseOf('bro', 'broWife'),
    parentOf('father', 'sis'), parentOf('mother', 'sis'), spouseOf('sis', 'sisH'),
    parentOf('mggf', 'mgf'), parentOf('mggf', 'mgfBro'), parentOf('mgf', 'mother'),
    spouseOf('me', 'wife'),
    parentOf('wgf', 'fil'), parentOf('wgf', 'wifeUncle'),
    parentOf('fil', 'wife'), parentOf('fil', 'wifeSisE'), parentOf('fil', 'wifeBro'),
    spouseOf('wifeSisE', 'wifeSisEH'), spouseOf('wifeBro', 'wifeBroWife'),
    parentOf('me', 'son'), parentOf('wife', 'daughter'),
  ],
  rootPersonId: 'me',
  version: 1,
};

const rel = (from: string, to: string) => calculateRelationship(g, from, to)!;

describe('한쪽 부모에게만 연결된 가족 (up→spouse→down 경유)', () => {
  it('아내에게만 연결된 딸도 나의 딸', () => {
    expect(rel('me', 'daughter').title).toBe('딸');
  });
  it('아들 관점에서 엄마 쪽에만 연결된 동생은 여동생 (제수씨 아님)', () => {
    const r = rel('son', 'daughter');
    expect(r.title).toBe('여동생');
    expect(r.chon).toBe(2);
    expect(r.isInLaw).toBe(false);
  });
  it('딸 관점에서 아빠 쪽에만 연결된 오빠는 오빠 (형부 아님)', () => {
    expect(rel('daughter', 'son').title).toBe('오빠');
  });
  it('할머니에게만 연결된 고모는 고모 (작은어머니 아님)', () => {
    const r = rel('me', 'aunt');
    expect(r.title).toBe('고모');
    expect(r.chon).toBe(3);
    expect(r.isInLaw).toBe(false);
  });
});

describe('배우자 쪽 가족의 장유는 배우자 기준', () => {
  it('나보다 어려도 아내보다 나이 많은 아내의 언니 = 처형', () => {
    // 나 1985, 아내 1990, 처형 1988
    expect(rel('me', 'wifeSisE').title).toBe('처형');
  });
  it('아내보다 나이 많지만 남편보다 어린 시동생 = 도련님', () => {
    // 아내 1990, 남편(나) 1985, 남동생 1988 → 남편의 동생
    expect(rel('wife', 'bro').title).toBe('도련님(시동생)');
  });
});

describe('동서·처남댁 (배우자 형제자매의 배우자)', () => {
  it('아내 언니의 남편 = 동서(형님)', () => {
    const r = rel('me', 'wifeSisEH');
    expect(r.title).toBe('동서(형님)');
    expect(r.isInLaw).toBe(true);
  });
  it('아내 남동생의 아내 = 처남댁', () => {
    expect(rel('me', 'wifeBroWife').title).toBe('처남댁');
  });
  it('남편 동생의 아내 = 동서 (시누이 아님)', () => {
    expect(rel('wife', 'broWife').title).toBe('동서');
  });
  it('남편 여동생의 남편 = 서방님', () => {
    expect(rel('wife', 'sisH').title).toBe('서방님(시누이 남편)');
  });
});

describe('배우자의 삼촌 (2-1 spouse-side)', () => {
  it('아내의 작은아버지 = 처삼촌 (작은아버지 아님)', () => {
    const r = rel('me', 'wifeUncle');
    expect(r.title).toBe('처삼촌');
    expect(r.isInLaw).toBe(true);
  });
  it('남편의 작은아버지 = 시삼촌', () => {
    expect(rel('wife', 'uncle').title).toBe('시삼촌');
  });
});

describe('종조부 항렬 (3-1)', () => {
  it('할아버지의 누이 = 고모할머니 (작은할머니 아님)', () => {
    const r = rel('me', 'gfSis');
    expect(r.title).toBe('고모할머니');
    expect(r.chon).toBe(4);
  });
  it('고모할머니의 남편 = 고모할아버지', () => {
    expect(rel('me', 'gfSisH').title).toBe('고모할아버지');
  });
  it('외할아버지의 동생 = 외종조부 (작은할아버지 아님)', () => {
    expect(rel('me', 'mgfBro').title).toBe('외종조부');
  });
});

describe('다른 경로 보기', () => {
  it('경로에 같은 사람이 두 번 나오지 않는다', () => {
    for (const target of ['gm', 'gf', 'aunt', 'wifeSisE', 'mgfBro', 'daughter']) {
      for (const alt of findAlternativePaths(g, 'me', target, 5)) {
        expect(new Set(alt.path).size).toBe(alt.path.length);
      }
    }
  });
  it('친할머니가 어떤 경로에서도 외할머니로 나오지 않는다', () => {
    const titles = findAlternativePaths(g, 'me', 'gm', 5).map(a => a.title);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles).not.toContain('외할머니');
  });
});
