import { FamilyGraph } from '../../models/types';

export interface NodePosition {
  x: number;
  y: number;
  personId: string;
  generation: number;
}

const NODE_RADIUS = 22;
const H_GAP = 105;
const COUPLE_GAP = 75;
const V_GAP = 150;

export { NODE_RADIUS, H_GAP, V_GAP, COUPLE_GAP };

interface TreeNode {
  personId: string;
  spouseId: string | null;
  children: TreeNode[];
  generation: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  generationYs: Map<number, number>; // generation -> y coordinate
  minGeneration: number;
  maxGeneration: number;
}

export function computeLayout(graph: FamilyGraph, collapsedIds?: Set<string>): LayoutResult {
  const positions = new Map<string, NodePosition>();
  const generationYs = new Map<number, number>();
  const persons = Object.keys(graph.persons);
  if (persons.length === 0) return { positions, generationYs, minGeneration: 0, maxGeneration: 0 };

  const parentOf = new Map<string, string[]>();
  const childOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string>();

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

  const findRoots = (): string[] => {
    const roots = persons.filter(id => !parentOf.has(id) || parentOf.get(id)!.length === 0);
    if (roots.length === 0) return [graph.rootPersonId];
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

  const buildTree = (personId: string, generation: number, visited: Set<string>): TreeNode | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const sp = spouseOf.get(personId) || null;
    if (sp) visited.add(sp);

    const myChildren = childOf.get(personId) || [];
    const spouseChildren = sp ? (childOf.get(sp) || []) : [];
    const rawChildIds = [...new Set([...myChildren, ...spouseChildren])];
    const storedOrder = graph.childOrder?.[personId] ?? (sp ? graph.childOrder?.[sp] : undefined);
    const allChildIds = storedOrder
      ? [...storedOrder.filter(id => rawChildIds.includes(id)), ...rawChildIds.filter(id => !storedOrder.includes(id))]
      : rawChildIds;

    const childNodes: TreeNode[] = [];
    if (!collapsedIds?.has(personId)) {
      for (const cid of allChildIds) {
        if (visited.has(cid)) continue;
        const childNode = buildTree(cid, generation + 1, visited);
        if (childNode) childNodes.push(childNode);
      }
    }

    return { personId, spouseId: sp, children: childNodes, generation };
  };

  // Find the topmost ancestor of rootPersonId via parent edges.
  // Uses depth-first search to find the root ancestor reachable via the LONGEST parent chain,
  // so that if 나 has parents on different branches (e.g. 아버지→할머니 vs 어머니 with no parents),
  // we always follow the deeper branch rather than stopping at a shallow root.
  const findAncestorRoot = (): string => {
    const getDeepest = (id: string, seen: Set<string>): { root: string; depth: number } => {
      if (seen.has(id)) return { root: id, depth: 0 };
      const next = new Set(seen);
      next.add(id);
      const parents = parentOf.get(id) || [];
      if (parents.length === 0) return { root: id, depth: 0 };
      let best = { root: id, depth: 0 };
      for (const p of parents) {
        const r = getDeepest(p, next);
        if (r.depth + 1 > best.depth) best = { root: r.root, depth: r.depth + 1 };
      }
      return best;
    };
    return getDeepest(graph.rootPersonId, new Set()).root;
  };

  const roots = findRoots();

  // Sort roots so the main lineage root comes first.
  // This guarantees the primary family tree is positioned before in-law trees.
  const ancestorRoot = findAncestorRoot();
  let primaryRoot = roots.includes(ancestorRoot) ? ancestorRoot : (spouseOf.get(ancestorRoot) && roots.includes(spouseOf.get(ancestorRoot)!) ? spouseOf.get(ancestorRoot)! : roots[0]);
  const sortedRoots = [primaryRoot, ...roots.filter(r => r !== primaryRoot)];

  const visited = new Set<string>();
  const trees: TreeNode[] = [];

  for (const rootId of sortedRoots) {
    const tree = buildTree(rootId, 0, visited);
    if (tree) trees.push(tree);
  }

  for (const pid of persons) {
    if (!visited.has(pid)) {
      trees.push({ personId: pid, spouseId: null, children: [], generation: 0 });
      visited.add(pid);
    }
  }

  const getSubtreeWidth = (node: TreeNode): number => {
    const coupleWidth = node.spouseId ? COUPLE_GAP : 0;
    if (node.children.length === 0) return coupleWidth || H_GAP;
    const childrenWidth = node.children.reduce(
      (sum, child) => sum + getSubtreeWidth(child), 0
    ) + (node.children.length - 1) * H_GAP;
    return Math.max(coupleWidth || H_GAP, childrenWidth);
  };

  // genOffset shifts all generation numbers for a sub-tree (in-law family alignment)
  const assignPositions = (node: TreeNode, centerX: number, y: number, genOffset: number) => {
    const gen = node.generation + genOffset;
    if (node.spouseId) {
      positions.set(node.personId, { x: centerX - COUPLE_GAP / 2, y, personId: node.personId, generation: gen });
      positions.set(node.spouseId, { x: centerX + COUPLE_GAP / 2, y, personId: node.spouseId, generation: gen });
    } else {
      positions.set(node.personId, { x: centerX, y, personId: node.personId, generation: gen });
    }
    generationYs.set(gen, y);

    if (node.children.length > 0) {
      const childrenTotalWidth = node.children.reduce(
        (sum, child) => sum + getSubtreeWidth(child), 0
      ) + (node.children.length - 1) * H_GAP;

      let childX = centerX - childrenTotalWidth / 2;
      for (const child of node.children) {
        const childWidth = getSubtreeWidth(child);
        assignPositions(child, childX + childWidth / 2, y + V_GAP, genOffset);
        childX += childWidth + H_GAP;
      }
    }
  };

  // For in-law/spouse family trees: if any direct children are already positioned
  // (because they appear as a spouse in the main tree), align this tree relative to them.
  const getStartY = (node: TreeNode): number => {
    const sp = node.spouseId;
    const myChildren = childOf.get(node.personId) || [];
    const spChildren = sp ? (childOf.get(sp) || []) : [];
    const allChildIds = [...new Set([...myChildren, ...spChildren])];
    for (const cid of allChildIds) {
      const pos = positions.get(cid);
      if (pos !== undefined) return pos.y - V_GAP;
    }
    return 55;
  };

  let treeX = 0;
  for (const tree of trees) {
    const w = getSubtreeWidth(tree);
    const startY = getStartY(tree);
    const genOffset = Math.round((startY - 55) / V_GAP);
    assignPositions(tree, treeX + w / 2, startY, genOffset);
    treeX += w + H_GAP;
  }

  let minGen = Infinity, maxGen = -Infinity;
  for (const gen of generationYs.keys()) {
    if (gen < minGen) minGen = gen;
    if (gen > maxGen) maxGen = gen;
  }
  if (minGen === Infinity) { minGen = 0; maxGen = 0; }

  return { positions, generationYs, minGeneration: minGen, maxGeneration: maxGen };
}
