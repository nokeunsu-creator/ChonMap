import { describe, it, expect } from 'vitest';
import { validateGraph, MAX_PERSONS, loadGraph, saveGraphImmediate, clearAllData } from './StorageService';
import { FamilyGraph } from '../models/types';
import { TEMPLATES } from './templates';
import { computeLayout } from '../components/tree/TreeLayout';

describe('validateGraph', () => {
  const validGraph: FamilyGraph = {
    persons: { me: { id: 'me', name: '나', gender: 'M' } },
    edges: [],
    rootPersonId: 'me',
    version: 1,
  };

  it('유효한 그래프 통과', () => {
    expect(validateGraph(validGraph)).toBe(true);
  });

  it('null 거부', () => {
    expect(validateGraph(null as any)).toBe(false);
  });

  it('persons 없으면 거부', () => {
    expect(validateGraph({ ...validGraph, persons: null as any })).toBe(false);
  });

  it('edges가 배열 아니면 거부', () => {
    expect(validateGraph({ ...validGraph, edges: 'not array' as any })).toBe(false);
  });

  it('rootPersonId가 존재하지 않는 사람이면 거부', () => {
    expect(validateGraph({ ...validGraph, rootPersonId: 'nobody' })).toBe(false);
  });

  it('잘못된 gender 거부', () => {
    expect(validateGraph({
      ...validGraph,
      persons: { me: { id: 'me', name: '나', gender: 'X' as any } },
    })).toBe(false);
  });

  it('이름이 100자 초과하면 거부', () => {
    expect(validateGraph({
      ...validGraph,
      persons: { me: { id: 'me', name: 'A'.repeat(101), gender: 'M' } },
    })).toBe(false);
  });

  it(`${MAX_PERSONS}명 초과하면 거부`, () => {
    const persons: Record<string, any> = {};
    for (let i = 0; i <= MAX_PERSONS; i++) {
      persons[`p${i}`] = { id: `p${i}`, name: `Person${i}`, gender: 'M' };
    }
    expect(validateGraph({
      persons, edges: [], rootPersonId: 'p0', version: 1,
    })).toBe(false);
  });

  it('존재하지 않는 사람을 참조하는 엣지 거부', () => {
    expect(validateGraph({
      ...validGraph,
      edges: [{ id: 'e1', type: 'PARENT_OF', from: 'me', to: 'ghost' }],
    })).toBe(false);
  });

  it('잘못된 엣지 타입 거부', () => {
    const graph: FamilyGraph = {
      persons: {
        a: { id: 'a', name: 'A', gender: 'M' },
        b: { id: 'b', name: 'B', gender: 'F' },
      },
      edges: [{ id: 'e1', type: 'UNKNOWN' as any, from: 'a', to: 'b' }],
      rootPersonId: 'a',
      version: 1,
    };
    expect(validateGraph(graph)).toBe(false);
  });

  it('유효한 엣지 있는 그래프 통과', () => {
    const graph: FamilyGraph = {
      persons: {
        a: { id: 'a', name: 'A', gender: 'M' },
        b: { id: 'b', name: 'B', gender: 'F' },
      },
      edges: [{ id: 'e1', type: 'SPOUSE_OF', from: 'a', to: 'b' }],
      rootPersonId: 'a',
      version: 1,
    };
    expect(validateGraph(graph)).toBe(true);
  });
});

// localStorage 최소 스텁 (vitest node 환경)
function stubLocalStorage() {
  const m = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
  return m;
}

describe('저장본 보호', () => {
  const graph: FamilyGraph = {
    persons: { me: { id: 'me', name: '나', gender: 'M' } },
    edges: [], rootPersonId: 'me', version: 1,
  };

  it('검증에 실패한 저장본은 복구용 키에 보관된다', () => {
    const m = stubLocalStorage();
    const broken = JSON.stringify({ ...graph, rootPersonId: 'nobody' });
    m.set('chonmap_family_v1', broken);
    expect(loadGraph()).toBeNull();
    expect(m.get('chonmap_family_v1_recovery')).toBe(broken);
  });

  it('데이터 초기화 후에는 beforeunload 즉시 저장이 데이터를 되살리지 않는다', () => {
    const m = stubLocalStorage();
    saveGraphImmediate(graph);
    expect(m.has('chonmap_family_v1')).toBe(true);
    clearAllData();
    saveGraphImmediate(graph); // reload 직전 beforeunload flush
    expect(m.has('chonmap_family_v1')).toBe(false);
  });
});

// 2026-11-12 보안 점검: 조작된 백업 JSON이 앱을 멈추게 하던 케이스
describe('validateGraph — 조작된 데이터 거부', () => {
  const two: FamilyGraph = {
    persons: { a: { id: 'a', name: 'a', gender: 'M' }, b: { id: 'b', name: 'b', gender: 'F' } },
    edges: [{ id: 'e1', type: 'PARENT_OF', from: 'a', to: 'b' }],
    rootPersonId: 'a', version: 1,
  };

  it('정상 그래프와 템플릿 3종은 통과', () => {
    expect(validateGraph(two)).toBe(true);
    for (const t of TEMPLATES) expect(validateGraph(t.graph)).toBe(true);
  });

  it('persons가 배열이면 거부', () => {
    expect(validateGraph({ ...two, persons: [two.persons.a] as any, rootPersonId: '0' })).toBe(false);
  });

  it('persons 값이 null이거나 키와 id가 다르면 거부', () => {
    expect(validateGraph({ ...two, persons: { ...two.persons, c: null as any } })).toBe(false);
    expect(validateGraph({ ...two, persons: { ...two.persons, b: { ...two.persons.b, id: 'zzz' } } })).toBe(false);
  });

  it('null 간선·자기 자신 간선 거부', () => {
    expect(validateGraph({ ...two, edges: [null as any] })).toBe(false);
    expect(validateGraph({ ...two, edges: [{ id: 'e', type: 'PARENT_OF', from: 'a', to: 'a' }] })).toBe(false);
    expect(validateGraph({ ...two, edges: [{ id: 'e', type: 'SPOUSE_OF', from: 'a', to: 'a' }] })).toBe(false);
  });

  it('부모-자녀 순환 거부 (2노드, 3노드)', () => {
    expect(validateGraph({ ...two, edges: [...two.edges, { id: 'e2', type: 'PARENT_OF', from: 'b', to: 'a' }] })).toBe(false);
    const three: FamilyGraph = {
      ...two,
      persons: { ...two.persons, c: { id: 'c', name: 'c', gender: 'M' } },
      edges: [
        { id: '1', type: 'PARENT_OF', from: 'a', to: 'b' },
        { id: '2', type: 'PARENT_OF', from: 'b', to: 'c' },
        { id: '3', type: 'PARENT_OF', from: 'c', to: 'a' },
      ],
    };
    expect(validateGraph(three)).toBe(false);
    // 순환 아닌 공유 조상(다이아몬드)은 통과
    const diamond: FamilyGraph = {
      ...three,
      persons: { ...three.persons, d: { id: 'd', name: 'd', gender: 'F' } },
      edges: [
        { id: '1', type: 'PARENT_OF', from: 'a', to: 'b' },
        { id: '2', type: 'PARENT_OF', from: 'a', to: 'c' },
        { id: '3', type: 'PARENT_OF', from: 'b', to: 'd' },
        { id: '4', type: 'PARENT_OF', from: 'c', to: 'd' },
      ],
    };
    expect(validateGraph(diamond)).toBe(true);
  });

  it('childOrder 형식 오류 거부, 정상 형식 통과', () => {
    expect(validateGraph({ ...two, childOrder: 'oops' as any })).toBe(false);
    expect(validateGraph({ ...two, childOrder: { a: 'oops' } as any })).toBe(false);
    expect(validateGraph({ ...two, childOrder: { a: [1, 2] } as any })).toBe(false);
    expect(validateGraph({ ...two, childOrder: { a: null } as any })).toBe(false);
    expect(validateGraph({ ...two, childOrder: { a: ['b'] } })).toBe(true);
    expect(validateGraph({ ...two, childOrder: {} })).toBe(true);
  });
});

describe('computeLayout — 방어', () => {
  it('childOrder 값이 배열이 아니어도 예외 없이 그린다', () => {
    const g: FamilyGraph = {
      persons: { a: { id: 'a', name: 'a', gender: 'M' }, b: { id: 'b', name: 'b', gender: 'F' } },
      edges: [{ id: 'e1', type: 'PARENT_OF', from: 'a', to: 'b' }],
      rootPersonId: 'a', version: 1, childOrder: { a: 'oops' } as any,
    };
    expect(() => computeLayout(g)).not.toThrow();
    expect(computeLayout(g).positions.size).toBe(2);
  });

  it('조상이 격자처럼 겹쳐도(조부모가 부모로도 등록) 레이아웃이 즉시 끝난다', () => {
    // i의 부모가 i+1, i+2 — 캐시 없이는 경로 수가 피보나치로 폭발
    const n = 60;
    const persons: FamilyGraph['persons'] = {};
    const edges: FamilyGraph['edges'] = [];
    for (let i = 0; i < n; i++) {
      persons['l' + i] = { id: 'l' + i, name: 'l' + i, gender: 'M' };
      if (i + 1 < n) edges.push({ id: `p1-${i}`, type: 'PARENT_OF', from: 'l' + (i + 1), to: 'l' + i });
      if (i + 2 < n) edges.push({ id: `p2-${i}`, type: 'PARENT_OF', from: 'l' + (i + 2), to: 'l' + i });
    }
    const g: FamilyGraph = { persons, edges, rootPersonId: 'l0', version: 1 };
    expect(validateGraph(g)).toBe(true);
    const t0 = performance.now();
    expect(computeLayout(g).positions.size).toBe(n);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
