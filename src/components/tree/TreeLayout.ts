import { FamilyGraph } from '../../models/types';

export interface NodePosition {
  x: number;
  y: number;
  personId: string;
}

const NODE_WIDTH = 100;
const NODE_HEIGHT = 70;
const H_GAP = 30;
const V_GAP = 80;
const COUPLE_GAP = 10;

interface TreeNode {
  personId: string;
  spouseId: string | null;
  children: TreeNode[];
  generation: number;
}

export function computeLayout(graph: FamilyGraph): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const persons = Object.keys(graph.persons);
  if (persons.length === 0) return positions;

  // 부모 찾기
  const parentOf = new Map<string, string[]>(); // childId -> parentIds
  const childOf = new Map<string, string[]>();  // parentId -> childIds
  const spouseOf = new Map<string, string>();   // personId -> spouseId

  for (const edge of graph.edges) {
    if (edge.type === 'PARENT_OF') {
      if (!childOf.has(edge.from)) childOf.set(edge.from, []);
      childOf.get(edge.from)!.push(edge.to);
      if (!parentOf.has(edge.to)) parentOf.set(edge.to, []);
      parentOf.get(edge.to)!.push(edge.from);
    } else if (edge.type === 'SPOUSE_OF') {
      spouseOf.set(edge.from, edge.to);
      spouseOf.set(edge.to, edge.from);
    }
  }

  // 루트 찾기: 부모가 없는 사람 중 가장 윗 세대
  const findRoots = (): string[] => {
    const roots = persons.filter(id => !parentOf.has(id) || parentOf.get(id)!.length === 0);
    if (roots.length === 0) return [graph.rootPersonId];
    // 배우자 제거 (한쪽만 루트로)
    const seen = new Set<string>();
    const uniqueRoots: string[] = [];
    for (const r of roots) {
      if (seen.has(r)) continue;
      uniqueRoots.push(r);
      seen.add(r);
      const sp = spouseOf.get(r);
      if (sp) seen.add(sp);
    }
    return uniqueRoots;
  };

  // 트리 구축
  const buildTree = (personId: string, generation: number, visited: Set<string>): TreeNode | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const sp = spouseOf.get(personId) || null;
    if (sp) visited.add(sp);

    const myChildren = childOf.get(personId) || [];
    const spouseChildren = sp ? (childOf.get(sp) || []) : [];
    const allChildIds = [...new Set([...myChildren, ...spouseChildren])];

    const childNodes: TreeNode[] = [];
    for (const cid of allChildIds) {
      if (visited.has(cid)) continue;
      const childNode = buildTree(cid, generation + 1, visited);
      if (childNode) childNodes.push(childNode);
    }

    return {
      personId,
      spouseId: sp,
      children: childNodes,
      generation,
    };
  };

  const roots = findRoots();
  const visited = new Set<string>();
  const trees: TreeNode[] = [];

  for (const rootId of roots) {
    const tree = buildTree(rootId, 0, visited);
    if (tree) trees.push(tree);
  }

  // 위치에 속하지 않은 사람 처리
  for (const pid of persons) {
    if (!visited.has(pid)) {
      trees.push({
        personId: pid,
        spouseId: null,
        children: [],
        generation: 0,
      });
      visited.add(pid);
    }
  }

  // 너비 계산 (재귀)
  const getSubtreeWidth = (node: TreeNode): number => {
    const coupleWidth = node.spouseId
      ? NODE_WIDTH * 2 + COUPLE_GAP
      : NODE_WIDTH;

    if (node.children.length === 0) return coupleWidth;

    const childrenWidth = node.children.reduce(
      (sum, child) => sum + getSubtreeWidth(child) + H_GAP, -H_GAP
    );

    return Math.max(coupleWidth, childrenWidth);
  };

  // 위치 할당 (재귀)
  const assignPositions = (node: TreeNode, x: number, y: number) => {
    const subtreeWidth = getSubtreeWidth(node);

    if (node.spouseId) {
      const coupleWidth = NODE_WIDTH * 2 + COUPLE_GAP;
      const coupleX = x + (subtreeWidth - coupleWidth) / 2;
      positions.set(node.personId, { x: coupleX, y, personId: node.personId });
      positions.set(node.spouseId, { x: coupleX + NODE_WIDTH + COUPLE_GAP, y, personId: node.spouseId });
    } else {
      positions.set(node.personId, { x: x + (subtreeWidth - NODE_WIDTH) / 2, y, personId: node.personId });
    }

    if (node.children.length > 0) {
      let childX = x;
      const childrenTotalWidth = node.children.reduce(
        (sum, child) => sum + getSubtreeWidth(child) + H_GAP, -H_GAP
      );
      childX = x + (subtreeWidth - childrenTotalWidth) / 2;

      for (const child of node.children) {
        const childWidth = getSubtreeWidth(child);
        assignPositions(child, childX, y + NODE_HEIGHT + V_GAP);
        childX += childWidth + H_GAP;
      }
    }
  };

  let treeX = 0;
  for (const tree of trees) {
    assignPositions(tree, treeX, 0);
    treeX += getSubtreeWidth(tree) + H_GAP * 2;
  }

  return positions;
}

export { NODE_WIDTH, NODE_HEIGHT };
