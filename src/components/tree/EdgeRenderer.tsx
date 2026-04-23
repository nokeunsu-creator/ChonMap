import React from 'react';
import { FamilyGraph } from '../../models/types';
import { NodePosition } from './TreeLayout';

interface EdgeRendererProps {
  graph: FamilyGraph;
  positions: Map<string, NodePosition>;
  highlightPath?: string[];
  horizontal?: boolean;
}

const LINE_COLOR = '#B8A88A';
const SPOUSE_COLOR = '#E8A0B0';
const HIGHLIGHT_COLOR = '#F59E0B';

export const EdgeRenderer = React.memo(function EdgeRenderer({ graph, positions, highlightPath, horizontal }: EdgeRendererProps) {
  const pathSet = new Set<string>();
  if (highlightPath) {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      pathSet.add(`${highlightPath[i]}-${highlightPath[i+1]}`);
      pathSet.add(`${highlightPath[i+1]}-${highlightPath[i]}`);
    }
  }
  const isHighlighted = (a: string, b: string) => pathSet.has(`${a}-${b}`);
  const lines: React.ReactNode[] = [];

  const spouseMap = new Map<string, string>();
  for (const edge of graph.edges) {
    if (edge.type === 'SPOUSE_OF') {
      spouseMap.set(edge.from, edge.to);
      spouseMap.set(edge.to, edge.from);
    }
  }

  const childParents = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.type === 'PARENT_OF') {
      if (!childParents.has(edge.to)) childParents.set(edge.to, []);
      childParents.get(edge.to)!.push(edge.from);
    }
  }

  // 배우자 선
  const drawnSpouse = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type === 'SPOUSE_OF') {
      const key = [edge.from, edge.to].sort().join('-');
      if (drawnSpouse.has(key)) continue;
      drawnSpouse.add(key);
      const p1 = positions.get(edge.from);
      const p2 = positions.get(edge.to);
      if (!p1 || !p2) continue;
      const hl = isHighlighted(edge.from, edge.to);
      lines.push(
        <line key={`sp-${key}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={hl ? HIGHLIGHT_COLOR : SPOUSE_COLOR} strokeWidth={hl ? 2.5 : 1.5}
          strokeDasharray="4,3" opacity={hl ? 1 : 0.7} />
      );
    }
  }

  // 부모-자녀 브래킷
  const coupleChildren = new Map<string, Set<string>>();
  const coupleParentIds = new Map<string, string[]>();

  for (const [childId, parents] of childParents) {
    const allParents = new Set<string>();
    for (const pid of parents) {
      allParents.add(pid);
      const sp = spouseMap.get(pid);
      if (sp) allParents.add(sp);
    }
    const coupleKey = [...allParents].sort().join('+');
    if (!coupleChildren.has(coupleKey)) {
      coupleChildren.set(coupleKey, new Set());
      coupleParentIds.set(coupleKey, [...allParents]);
    }
    coupleChildren.get(coupleKey)!.add(childId);
  }

  for (const [coupleKey, childSet] of coupleChildren) {
    const parentIds = coupleParentIds.get(coupleKey) || [];
    const parentPositions = parentIds.map(id => positions.get(id)).filter(Boolean) as NodePosition[];
    if (parentPositions.length === 0) continue;

    const children = [...childSet];
    const childPositions = children.map(id => positions.get(id)).filter(Boolean) as NodePosition[];
    if (childPositions.length === 0) continue;

    const anyChildHighlighted = children.some(cid => parentIds.some(pid => isHighlighted(pid, cid)));
    const lineColor = anyChildHighlighted ? HIGHLIGHT_COLOR : LINE_COLOR;
    const lineWidth = anyChildHighlighted ? 2.5 : 1.5;

    if (horizontal) {
      // 가로 모드: 부모는 왼쪽, 자녀는 오른쪽
      const parentMidY = parentPositions.reduce((s, p) => s + p.y, 0) / parentPositions.length;
      const parentX = parentPositions[0].x;
      const midX = parentX + 55;

      // 부모 → 브래킷 수평선
      lines.push(
        <line key={`v-${coupleKey}`} x1={parentX + 22} y1={parentMidY} x2={midX} y2={parentMidY}
          stroke={lineColor} strokeWidth={lineWidth} />
      );

      if (childPositions.length === 1) {
        const cp = childPositions[0];
        lines.push(
          <g key={`c1-${coupleKey}`}>
            <line x1={midX} y1={parentMidY} x2={midX} y2={cp.y} stroke={lineColor} strokeWidth={lineWidth} />
            <line x1={midX} y1={cp.y} x2={cp.x - 28} y2={cp.y} stroke={lineColor} strokeWidth={lineWidth} />
          </g>
        );
      } else {
        const minY = Math.min(...childPositions.map(p => p.y));
        const maxY = Math.max(...childPositions.map(p => p.y));
        const barMinY = Math.min(minY, parentMidY);
        const barMaxY = Math.max(maxY, parentMidY);

        // 수직 바 (브래킷)
        lines.push(
          <line key={`h-${coupleKey}`} x1={midX} y1={barMinY} x2={midX} y2={barMaxY}
            stroke={lineColor} strokeWidth={lineWidth} />
        );
        for (const cp of childPositions) {
          const childHl = parentIds.some(pid => isHighlighted(pid, cp.personId));
          lines.push(
            <line key={`drop-${cp.personId}`} x1={midX} y1={cp.y} x2={cp.x - 28} y2={cp.y}
              stroke={childHl ? HIGHLIGHT_COLOR : LINE_COLOR} strokeWidth={childHl ? 2.5 : 1.5} />
          );
        }
      }
    } else {
      // 세로 모드 (기본)
      const parentMidX = parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length;
      const parentY = parentPositions[0].y;
      const midY = parentY + 55;

      lines.push(
        <line key={`v-${coupleKey}`} x1={parentMidX} y1={parentY + 22} x2={parentMidX} y2={midY}
          stroke={lineColor} strokeWidth={lineWidth} />
      );

      if (childPositions.length === 1) {
        const cp = childPositions[0];
        lines.push(
          <g key={`c1-${coupleKey}`}>
            <line x1={parentMidX} y1={midY} x2={cp.x} y2={midY} stroke={lineColor} strokeWidth={lineWidth} />
            <line x1={cp.x} y1={midY} x2={cp.x} y2={cp.y - 28} stroke={lineColor} strokeWidth={lineWidth} />
          </g>
        );
      } else {
        const minX = Math.min(...childPositions.map(p => p.x));
        const maxX = Math.max(...childPositions.map(p => p.x));
        const barMinX = Math.min(minX, parentMidX);
        const barMaxX = Math.max(maxX, parentMidX);

        lines.push(
          <line key={`h-${coupleKey}`} x1={barMinX} y1={midY} x2={barMaxX} y2={midY}
            stroke={lineColor} strokeWidth={lineWidth} />
        );
        for (const cp of childPositions) {
          const childHl = parentIds.some(pid => isHighlighted(pid, cp.personId));
          lines.push(
            <line key={`drop-${cp.personId}`} x1={cp.x} y1={midY} x2={cp.x} y2={cp.y - 28}
              stroke={childHl ? HIGHLIGHT_COLOR : LINE_COLOR} strokeWidth={childHl ? 2.5 : 1.5} />
          );
        }
      }
    }
  }

  return <g role="img" aria-label="가계도 연결선">{lines}</g>;
});
