import { FamilyGraph, Gender, RelationshipResult, Lineage, Person } from '../models/types';
import { lookupTitle } from './kinshipTitles';

interface AdjEntry {
  neighborId: string;
  weight: number;
  edgeType: 'PARENT_OF' | 'SPOUSE_OF';
  direction: 'up' | 'down' | 'spouse';
}

function buildAdjacency(graph: FamilyGraph): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  for (const id of Object.keys(graph.persons)) adj.set(id, []);
  for (const edge of graph.edges) {
    if (edge.type === 'PARENT_OF') {
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

function bfs01(adj: Map<string, AdjEntry[]>, fromId: string, toId: string): BFSNode[] | null {
  const dist = new Map<string, number>();
  const nodeInfo = new Map<string, BFSNode>();
  const deque: string[] = [];

  dist.set(fromId, 0);
  nodeInfo.set(fromId, { id: fromId, dist: 0, prev: null, direction: 'start' });
  deque.push(fromId);

  while (deque.length > 0) {
    const currentId = deque.shift();
    if (!currentId) break;
    const currentDist = dist.get(currentId);
    if (currentDist === undefined) continue;

    if (currentId === toId) {
      const path: BFSNode[] = [];
      let cur: string | null = toId;
      while (cur !== null) {
        path.unshift(nodeInfo.get(cur)!);
        cur = nodeInfo.get(cur)!.prev;
      }
      return path;
    }

    for (const entry of (adj.get(currentId) || [])) {
      const newDist = currentDist + entry.weight;
      const existingDist = dist.get(entry.neighborId);
      if (existingDist === undefined || newDist < existingDist) {
        dist.set(entry.neighborId, newDist);
        nodeInfo.set(entry.neighborId, {
          id: entry.neighborId, dist: newDist, prev: currentId, direction: entry.direction,
        });
        if (entry.weight === 0) deque.unshift(entry.neighborId);
        else deque.push(entry.neighborId);
      }
    }
  }
  return null;
}

// 인척 유형: 'none' | 'spouse-side' (배우자 쪽 가족) | 'blood-side' (혈족의 배우자)
export type InLawType = 'none' | 'spouse-side' | 'blood-side';

interface PathAnalysis {
  ascent: number;
  descent: number;
  lineage: Lineage;
  isInLaw: boolean;
  inLawType: InLawType;
  maternalDescent: boolean; // 하강 경로에 여성 부모를 통해 내려감 (외손)
  bloodRelativeForSeniority: string | null; // 인척 장유 판단용 혈족 ID
  peerAncestorId: string | null; // 대상과 같은 세대의 나의 직계 조상 (장유 비교용)
  isMidSpouse: boolean; // 혈족의 배우자의 혈족 (사돈 패턴): 중간 배우자 이후 추가 이동
  inLawFamilyDepth: number; // 중간 배우자 이후 이동 단계 수
}

function analyzePath(path: BFSNode[], graph: FamilyGraph): PathAnalysis {
  let ascent = 0;
  let descent = 0;
  let reachedPeak = false;
  let lineage: Lineage = 'self';
  let firstUpTarget: string | null = null;

  // 배우자 간선 위치 분석
  let hasSpouseEdge = false;
  let spouseBeforeBlood = false; // 첫 이동이 배우자 → 배우자 쪽 가족
  let spouseAfterBlood = false;  // 혈연 이동 후 배우자 → 혈족의 배우자
  let maternalDescent = false;
  let bloodRelativeForSeniority: string | null = null;

  // 경로에서 배우자 간선 위치 파악
  const steps = path.slice(1).map(n => n.direction);
  const firstNonSpouse = steps.findIndex(s => s !== 'spouse');
  const lastNonSpouse = steps.length - 1 - [...steps].reverse().findIndex(s => s !== 'spouse');

  if (steps.includes('spouse')) {
    hasSpouseEdge = true;
    // 첫 이동이 배우자면 → 배우자 쪽 가족 탐색
    if (steps[0] === 'spouse') {
      spouseBeforeBlood = true;
    }
    // 마지막 이동이 배우자면 → 혈족의 배우자
    if (steps[steps.length - 1] === 'spouse') {
      spouseAfterBlood = true;
      // 배우자 직전 사람이 혈족 (장유 판단용)
      if (path.length >= 3) {
        bloodRelativeForSeniority = path[path.length - 2].id;
      }
    }
    // 중간 경유 배우자 감지: up→spouse→up 패턴은 부부 간 경유일 뿐 인척이 아님
    if (!spouseBeforeBlood && !spouseAfterBlood) {
      let allPassThrough = true;
      for (let si = 0; si < steps.length; si++) {
        if (steps[si] === 'spouse') {
          let prev: string | null = null;
          for (let j = si - 1; j >= 0; j--) { if (steps[j] !== 'spouse') { prev = steps[j]; break; } }
          let next: string | null = null;
          for (let j = si + 1; j < steps.length; j++) { if (steps[j] !== 'spouse') { next = steps[j]; break; } }
          if (!(prev === 'up' && next === 'up')) { allPassThrough = false; break; }
        }
      }
      if (allPassThrough) hasSpouseEdge = false;
    }
  }

  // 사돈 패턴: 중간 배우자가 있고 pass-through(up→spouse→up)가 아닌 경우
  // 예: [누나, 부모, 나, 배우자, 배우자의엄마] → steps[up, down, spouse, up]
  let isMidSpouse = false;
  let midSpouseStepIdx = -1;
  let inLawFamilyDepth = 0;

  if (hasSpouseEdge && !spouseBeforeBlood && !spouseAfterBlood) {
    for (let si = 0; si < steps.length; si++) {
      if (steps[si] === 'spouse') {
        let prevStep: string | null = null;
        for (let j = si - 1; j >= 0; j--) { if (steps[j] !== 'spouse') { prevStep = steps[j]; break; } }
        let nextStep: string | null = null;
        for (let j = si + 1; j < steps.length; j++) { if (steps[j] !== 'spouse') { nextStep = steps[j]; break; } }
        // 사돈: 배우자를 통해 그쪽 가족의 윗 세대로 올라가는 패턴 (nextStep='up')
        // nextStep='down'이면 배우자의 자녀 등 다른 관계 → 사돈 아님
        if (nextStep === 'up' && !(prevStep === 'up' && nextStep === 'up')) {
          isMidSpouse = true;
          midSpouseStepIdx = si;
          for (let j = si + 1; j < steps.length; j++) {
            if (steps[j] !== 'spouse') inLawFamilyDepth++;
          }
          break;
        }
      }
    }
  }

  for (let i = 1; i < path.length; i++) {
    const node = path[i];
    if (node.direction === 'spouse') continue;
    // 사돈 패턴: 중간 배우자 이후 단계는 ascent/descent에 포함하지 않음
    if (isMidSpouse && (i - 1) > midSpouseStepIdx) continue;

    if (node.direction === 'up') {
      ascent++;
      if (firstUpTarget === null) firstUpTarget = node.id;
    } else if (node.direction === 'down') {
      reachedPeak = true;
      descent++;
      // 외손 판단: 첫 번째 하강 인물이 여성이면 외손 계열
      if (descent === 1) {
        const firstDescendant = graph.persons[node.id];
        if (firstDescendant?.gender === 'F') {
          maternalDescent = true;
        }
      }
    }
  }

  if (firstUpTarget) {
    // 경유 배우자 보정: up→spouse→up이면 spouse 대상을 실제 부모로 사용
    // (hasSpouseEdge 여부와 무관하게 항상 적용 — 끝에 유의미한 spouse가 있어도 시작부 경유는 보정)
    let effectiveParentId = firstUpTarget;
    for (let i = 1; i < path.length; i++) {
      if (path[i].id === firstUpTarget && path[i].direction === 'up') {
        if (i + 1 < path.length && path[i + 1].direction === 'spouse'
            && i + 2 < path.length && path[i + 2].direction === 'up') {
          effectiveParentId = path[i + 1].id;
        }
        break;
      }
    }
    const parent = graph.persons[effectiveParentId];
    if (parent) lineage = parent.gender === 'M' ? 'paternal' : 'maternal';
  }

  // ascent > descent일 때 동세대 직계 조상 찾기 (예: 삼촌 ↔ 아버지 비교용)
  let peerAncestorId: string | null = null;
  if (ascent > descent) {
    let upsSeen = 0;
    for (let i = 1; i < path.length; i++) {
      if (path[i].direction === 'up') {
        upsSeen++;
        if (upsSeen === ascent - descent) {
          peerAncestorId = path[i].id;
          // 경유 배우자 보정: peer가 up→spouse→up 경유 중이면 spouse 대상 사용
          if (i + 1 < path.length && path[i + 1].direction === 'spouse'
              && i + 2 < path.length && path[i + 2].direction === 'up') {
            peerAncestorId = path[i + 1].id;
          }
          break;
        }
      }
    }
  }

  let inLawType: InLawType = 'none';
  if (hasSpouseEdge) {
    if (spouseBeforeBlood && !spouseAfterBlood) inLawType = 'spouse-side';
    else if (spouseAfterBlood && !spouseBeforeBlood) inLawType = 'blood-side';
    else if (spouseBeforeBlood && spouseAfterBlood) inLawType = 'spouse-side'; // 양쪽 다
    else inLawType = 'blood-side'; // 중간에 있으면 혈족의 배우자
  }

  return { ascent, descent, lineage, isInLaw: hasSpouseEdge, inLawType, maternalDescent, bloodRelativeForSeniority, peerAncestorId, isMidSpouse, inLawFamilyDepth };
}

function determineSeniority(
  from: Person,
  to: Person,
  ascent: number,
  descent: number,
  graph: FamilyGraph,
  bloodRelativeId: string | null,
  peerAncestorId: string | null,
): 'elder' | 'younger' | 'unknown' {
  // 인척이면 혈족 기준으로 판단 (예: 형수 → 형의 나이로 판단)
  const target = bloodRelativeId ? graph.persons[bloodRelativeId] : to;
  if (!target) return 'unknown';

  if (ascent !== descent) {
    // ascent > descent (삼촌/이모 등): 대상과 나의 동세대 직계 조상 비교
    if (ascent > descent && peerAncestorId) {
      const peer = graph.persons[peerAncestorId];
      if (peer?.birthYear && target.birthYear) {
        return target.birthYear < peer.birthYear ? 'elder'
             : target.birthYear > peer.birthYear ? 'younger'
             : 'unknown';
      }
    }
    return 'unknown';
  }

  // ascent === descent (형제/사촌 등): 대상과 나 비교
  if (from.birthYear && target.birthYear) {
    return target.birthYear < from.birthYear ? 'elder'
         : target.birthYear > from.birthYear ? 'younger'
         : 'unknown';
  }
  return 'unknown';
}

function getSpouseId(graph: FamilyGraph, personId: string): string | null {
  for (const edge of graph.edges) {
    if (edge.type === 'SPOUSE_OF') {
      if (edge.from === personId) return edge.to;
      if (edge.to === personId) return edge.from;
    }
  }
  return null;
}

export function calculateRelationship(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
  prebuiltAdj?: Map<string, AdjEntry[]>,
): RelationshipResult | null {
  if (fromId === toId) {
    return { chon: 0, path: [fromId], title: '본인', lineage: 'self', isInLaw: false };
  }

  const spouseId = getSpouseId(graph, fromId);
  if (spouseId === toId) {
    const from = graph.persons[fromId];
    return {
      chon: -1, path: [fromId, toId],
      title: from.gender === 'M' ? '아내' : '남편',
      lineage: 'self', isInLaw: false,
    };
  }

  const adj = prebuiltAdj || buildAdjacency(graph);
  const pathNodes = bfs01(adj, fromId, toId);
  if (!pathNodes) return null;

  const from = graph.persons[fromId];
  const to = graph.persons[toId];
  if (!from || !to) return null;

  const analysis = analyzePath(pathNodes, graph);
  const { ascent, descent, lineage, isInLaw, inLawType, maternalDescent, bloodRelativeForSeniority, peerAncestorId, isMidSpouse, inLawFamilyDepth } = analysis;

  // 사돈 패턴: 혈족의 배우자의 가족 (예: 나의 형제의 배우자의 부모)
  if (isMidSpouse) {
    return {
      chon: ascent + descent + inLawFamilyDepth,
      path: pathNodes.map(n => n.id),
      title: '사돈',
      lineage,
      isInLaw: true,
    };
  }

  const chon = ascent + descent;
  const seniority = determineSeniority(from, to, ascent, descent, graph, bloodRelativeForSeniority, peerAncestorId);

  const title = lookupTitle(ascent, descent, lineage, to.gender, from.gender, isInLaw, inLawType, seniority, maternalDescent);

  return { chon, path: pathNodes.map(n => n.id), title, lineage, isInLaw };
}

export function calculateAllRelationships(
  graph: FamilyGraph,
  perspectiveId: string,
): Map<string, RelationshipResult> {
  const adj = buildAdjacency(graph);
  const results = new Map<string, RelationshipResult>();
  for (const personId of Object.keys(graph.persons)) {
    const result = calculateRelationship(graph, perspectiveId, personId, adj);
    if (result) results.set(personId, result);
  }
  return results;
}

// === 다중 경로 탐색 ===

interface MultiPredInfo {
  dist: number;
  preds: { prevId: string; direction: 'up' | 'down' | 'spouse' | 'start' }[];
}

function bfs01AllPreds(adj: Map<string, AdjEntry[]>, fromId: string): Map<string, MultiPredInfo> {
  const info = new Map<string, MultiPredInfo>();
  info.set(fromId, { dist: 0, preds: [] });
  const deque: string[] = [fromId];

  while (deque.length > 0) {
    const currentId = deque.shift()!;
    const currentDist = info.get(currentId)!.dist;

    for (const entry of (adj.get(currentId) || [])) {
      const newDist = currentDist + entry.weight;
      const existing = info.get(entry.neighborId);

      if (!existing) {
        info.set(entry.neighborId, {
          dist: newDist,
          preds: [{ prevId: currentId, direction: entry.direction }],
        });
        if (entry.weight === 0) deque.unshift(entry.neighborId);
        else deque.push(entry.neighborId);
      } else if (newDist < existing.dist) {
        existing.dist = newDist;
        existing.preds = [{ prevId: currentId, direction: entry.direction }];
        if (entry.weight === 0) deque.unshift(entry.neighborId);
        else deque.push(entry.neighborId);
      } else if (newDist === existing.dist) {
        existing.preds.push({ prevId: currentId, direction: entry.direction });
      }
    }
  }
  return info;
}

function reconstructPaths(
  info: Map<string, MultiPredInfo>,
  fromId: string,
  toId: string,
  maxPaths: number,
): BFSNode[][] {
  const results: BFSNode[][] = [];

  function backtrack(currentId: string, path: BFSNode[]) {
    if (results.length >= maxPaths) return;
    if (currentId === fromId) {
      results.push([{ id: fromId, dist: 0, prev: null, direction: 'start' }, ...path]);
      return;
    }
    const node = info.get(currentId);
    if (!node) return;
    for (const pred of node.preds) {
      backtrack(pred.prevId, [
        { id: currentId, dist: node.dist, prev: pred.prevId, direction: pred.direction },
        ...path,
      ]);
    }
  }

  backtrack(toId, []);
  return results;
}

export interface AlternativePath {
  path: string[];
  chon: number;
  title: string;
  lineage: 'paternal' | 'maternal' | 'self';
  isInLaw: boolean;
}

export function findAlternativePaths(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
  maxPaths: number = 5,
): AlternativePath[] {
  if (fromId === toId) return [];

  const adj = buildAdjacency(graph);
  const predInfo = bfs01AllPreds(adj, fromId);

  if (!predInfo.has(toId)) return [];

  const allPaths = reconstructPaths(predInfo, fromId, toId, maxPaths + 5);
  const from = graph.persons[fromId];
  const to = graph.persons[toId];
  if (!from || !to) return [];

  const seen = new Set<string>();
  const results: AlternativePath[] = [];

  // 배우자 직접 관계 확인
  const spouseId = getSpouseId(graph, fromId);

  for (const pathNodes of allPaths) {
    if (results.length >= maxPaths) break;

    const analysis = analyzePath(pathNodes, graph);
    const { ascent, descent, lineage, isInLaw, inLawType, maternalDescent, bloodRelativeForSeniority, peerAncestorId, isMidSpouse, inLawFamilyDepth } = analysis;
    const chon = isMidSpouse ? ascent + descent + inLawFamilyDepth : ascent + descent;
    const seniority = determineSeniority(from, to, ascent, descent, graph, bloodRelativeForSeniority, peerAncestorId);

    // 배우자 특수 처리: chon=0이고 직접 배우자면 호칭 직접 지정
    let title: string;
    if (isMidSpouse) {
      title = '사돈';
    } else if (chon === 0 && spouseId === toId && pathNodes.length === 2) {
      title = from.gender === 'M' ? '아내' : '남편';
    } else {
      title = lookupTitle(ascent, descent, lineage, to.gender, from.gender, isInLaw, inLawType, seniority, maternalDescent);
    }
    const pathIds = pathNodes.map(n => n.id);

    // 중복 제거: 같은 호칭 + 같은 경로는 스킵
    const key = `${title}|${pathIds.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const displayChon = (chon === 0 && spouseId === toId && pathNodes.length === 2) ? -1 : chon;
    results.push({ path: pathIds, chon: displayChon, title, lineage, isInLaw });
  }

  return results;
}
