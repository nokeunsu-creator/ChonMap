import { FamilyGraph, Gender, RelationshipResult, Lineage, Person } from '../models/types';
import { lookupTitle } from './kinshipTitles';

interface AdjEntry {
  neighborId: string;
  weight: number;          // 0 = spouse, 1 = parent-child
  edgeType: 'PARENT_OF' | 'SPOUSE_OF';
  direction: 'up' | 'down' | 'spouse'; // up = child→parent, down = parent→child
}

function buildAdjacency(graph: FamilyGraph): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();

  for (const id of Object.keys(graph.persons)) {
    adj.set(id, []);
  }

  for (const edge of graph.edges) {
    if (edge.type === 'PARENT_OF') {
      // from = parent, to = child
      adj.get(edge.from)?.push({ neighborId: edge.to, weight: 1, edgeType: 'PARENT_OF', direction: 'down' });
      adj.get(edge.to)?.push({ neighborId: edge.from, weight: 1, edgeType: 'PARENT_OF', direction: 'up' });
    } else if (edge.type === 'SPOUSE_OF') {
      adj.get(edge.from)?.push({ neighborId: edge.to, weight: 0, edgeType: 'SPOUSE_OF', direction: 'spouse' });
      adj.get(edge.to)?.push({ neighborId: edge.from, weight: 0, edgeType: 'SPOUSE_OF', direction: 'spouse' });
    }
  }

  return adj;
}

interface BFSNode {
  id: string;
  dist: number;
  prev: string | null;
  direction: 'up' | 'down' | 'spouse' | 'start';
}

// 0-1 BFS: 배우자 간선 가중치=0, 부모-자녀 간선 가중치=1
function bfs01(adj: Map<string, AdjEntry[]>, fromId: string, toId: string): BFSNode[] | null {
  const dist = new Map<string, number>();
  const nodeInfo = new Map<string, BFSNode>();
  const deque: string[] = [];

  const startNode: BFSNode = { id: fromId, dist: 0, prev: null, direction: 'start' };
  dist.set(fromId, 0);
  nodeInfo.set(fromId, startNode);
  deque.push(fromId);

  while (deque.length > 0) {
    const currentId = deque.shift()!;
    const currentDist = dist.get(currentId)!;

    if (currentId === toId) {
      // 경로 복원
      const path: BFSNode[] = [];
      let cur: string | null = toId;
      while (cur !== null) {
        path.unshift(nodeInfo.get(cur)!);
        cur = nodeInfo.get(cur)!.prev;
      }
      return path;
    }

    const neighbors = adj.get(currentId) || [];
    for (const entry of neighbors) {
      const newDist = currentDist + entry.weight;
      const existingDist = dist.get(entry.neighborId);

      if (existingDist === undefined || newDist < existingDist) {
        dist.set(entry.neighborId, newDist);
        nodeInfo.set(entry.neighborId, {
          id: entry.neighborId,
          dist: newDist,
          prev: currentId,
          direction: entry.direction,
        });

        if (entry.weight === 0) {
          deque.unshift(entry.neighborId); // 배우자: 앞에 추가
        } else {
          deque.push(entry.neighborId);    // 부모-자녀: 뒤에 추가
        }
      }
    }
  }

  return null; // 경로 없음
}

// 경로를 분석하여 ascent, descent, lineage 결정
function analyzePath(
  path: BFSNode[],
  graph: FamilyGraph,
  fromId: string,
): { ascent: number; descent: number; lineage: Lineage; isInLaw: boolean } {
  let ascent = 0;
  let descent = 0;
  let reachedPeak = false;
  let isInLaw = false;
  let lineage: Lineage = 'self';

  // 경로에서 첫 번째 상승 방향으로 lineage 결정
  let firstUpTarget: string | null = null;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];

    if (node.direction === 'spouse') {
      isInLaw = true;
      continue;
    }

    if (node.direction === 'up') {
      if (!reachedPeak) {
        ascent++;
        if (firstUpTarget === null) {
          firstUpTarget = node.id;
        }
      } else {
        // 정점 이후 다시 올라감 — 복잡한 경우, ascent에 추가
        ascent++;
      }
    } else if (node.direction === 'down') {
      reachedPeak = true;
      descent++;
    }
  }

  // lineage 결정: 첫 상승 대상이 아버지인지 어머니인지
  if (firstUpTarget) {
    const parent = graph.persons[firstUpTarget];
    if (parent) {
      lineage = parent.gender === 'M' ? 'paternal' : 'maternal';
    }
  }

  return { ascent, descent, lineage, isInLaw };
}

// 장유 판단 (형/동생 구분)
function determineSeniority(
  from: Person,
  to: Person,
  ascent: number,
  descent: number,
): 'elder' | 'younger' | 'unknown' {
  // 같은 세대인 경우에만 (ascent === descent) 장유 판단
  if (ascent !== descent) return 'unknown';

  if (from.birthYear && to.birthYear) {
    return to.birthYear < from.birthYear ? 'elder'
         : to.birthYear > from.birthYear ? 'younger'
         : 'unknown';
  }

  return 'unknown';
}

// 배우자 관계 확인
function getSpouseId(graph: FamilyGraph, personId: string): string | null {
  for (const edge of graph.edges) {
    if (edge.type === 'SPOUSE_OF') {
      if (edge.from === personId) return edge.to;
      if (edge.to === personId) return edge.from;
    }
  }
  return null;
}

// 메인: 두 사람 사이의 관계 계산
export function calculateRelationship(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
): RelationshipResult | null {
  // 본인
  if (fromId === toId) {
    return {
      chon: 0,
      path: [fromId],
      title: '본인',
      lineage: 'self',
      isInLaw: false,
    };
  }

  // 직접 배우자 확인
  const spouseId = getSpouseId(graph, fromId);
  if (spouseId === toId) {
    const from = graph.persons[fromId];
    const to = graph.persons[toId];
    const title = from.gender === 'M' ? '아내' : '남편';
    return {
      chon: -1,
      path: [fromId, toId],
      title,
      lineage: 'self',
      isInLaw: false,
    };
  }

  const adj = buildAdjacency(graph);
  const pathNodes = bfs01(adj, fromId, toId);

  if (!pathNodes) return null;

  const from = graph.persons[fromId];
  const to = graph.persons[toId];
  if (!from || !to) return null;

  const { ascent, descent, lineage, isInLaw } = analyzePath(pathNodes, graph, fromId);
  const chon = ascent + descent;
  const seniority = determineSeniority(from, to, ascent, descent);

  const title = lookupTitle(
    ascent,
    descent,
    lineage,
    to.gender,
    from.gender,
    isInLaw,
    seniority,
  );

  return {
    chon,
    path: pathNodes.map(n => n.id),
    title,
    lineage,
    isInLaw,
  };
}

// 한 사람 기준으로 모든 관계 계산
export function calculateAllRelationships(
  graph: FamilyGraph,
  perspectiveId: string,
): Map<string, RelationshipResult> {
  const results = new Map<string, RelationshipResult>();

  for (const personId of Object.keys(graph.persons)) {
    const result = calculateRelationship(graph, perspectiveId, personId);
    if (result) {
      results.set(personId, result);
    }
  }

  return results;
}
