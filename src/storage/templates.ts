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

export const TEMPLATES: { name: string; desc: string; graph: FamilyGraph }[] = [
  {
    name: '핵가족 (4인)',
    desc: '부모 + 자녀 2명',
    graph: {
      persons: {
        father: p('father', '아버지', 'M', 1965),
        mother: p('mother', '어머니', 'F', 1967),
        me: p('me', '나', 'M', 1990),
        sibling: p('sibling', '형제', 'M', 1993),
      },
      edges: [
        spouseOf('father', 'mother'),
        parentOf('father', 'me'), parentOf('mother', 'me'),
        parentOf('father', 'sibling'), parentOf('mother', 'sibling'),
      ],
      rootPersonId: 'me',
      version: 1,
    },
  },
  {
    name: '3대 가족 (8인)',
    desc: '조부모 + 부모 + 삼촌 + 나 + 사촌',
    graph: {
      persons: {
        gf: p('gf', '할아버지', 'M', 1940),
        gm: p('gm', '할머니', 'F', 1942),
        father: p('father', '아버지', 'M', 1965),
        mother: p('mother', '어머니', 'F', 1967),
        uncle: p('uncle', '삼촌', 'M', 1968),
        aunt_w: p('aunt_w', '숙모', 'F', 1970),
        me: p('me', '나', 'M', 1990),
        cousin: p('cousin', '사촌', 'M', 1992),
      },
      edges: [
        spouseOf('gf', 'gm'),
        parentOf('gf', 'father'), parentOf('gm', 'father'),
        parentOf('gf', 'uncle'), parentOf('gm', 'uncle'),
        spouseOf('father', 'mother'),
        spouseOf('uncle', 'aunt_w'),
        parentOf('father', 'me'), parentOf('mother', 'me'),
        parentOf('uncle', 'cousin'), parentOf('aunt_w', 'cousin'),
      ],
      rootPersonId: 'me',
      version: 1,
    },
  },
  {
    name: '양가 가족 (12인)',
    desc: '양쪽 부모 + 배우자 + 자녀',
    graph: {
      persons: {
        father: p('father', '아버지', 'M', 1960),
        mother: p('mother', '어머니', 'F', 1962),
        fil: p('fil', '장인어른', 'M', 1958),
        mil: p('mil', '장모님', 'F', 1960),
        sister: p('sister', '누나', 'F', 1985),
        bil: p('bil', '매형', 'M', 1983),
        me: p('me', '나', 'M', 1988),
        wife: p('wife', '아내', 'F', 1990),
        wbro: p('wbro', '처남', 'M', 1993),
        son: p('son', '아들', 'M', 2018),
        daughter: p('daughter', '딸', 'F', 2020),
        nephew: p('nephew', '조카', 'M', 2015),
      },
      edges: [
        spouseOf('father', 'mother'),
        spouseOf('fil', 'mil'),
        parentOf('father', 'sister'), parentOf('mother', 'sister'),
        parentOf('father', 'me'), parentOf('mother', 'me'),
        parentOf('fil', 'wife'), parentOf('mil', 'wife'),
        parentOf('fil', 'wbro'), parentOf('mil', 'wbro'),
        spouseOf('sister', 'bil'),
        spouseOf('me', 'wife'),
        parentOf('me', 'son'), parentOf('wife', 'son'),
        parentOf('me', 'daughter'), parentOf('wife', 'daughter'),
        parentOf('sister', 'nephew'), parentOf('bil', 'nephew'),
      ],
      rootPersonId: 'me',
      version: 1,
    },
  },
];
