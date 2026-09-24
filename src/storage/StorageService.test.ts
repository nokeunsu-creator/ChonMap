import { describe, it, expect } from 'vitest';
import { validateGraph, MAX_PERSONS, loadGraph, saveGraphImmediate, clearAllData } from './StorageService';
import { FamilyGraph } from '../models/types';

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
