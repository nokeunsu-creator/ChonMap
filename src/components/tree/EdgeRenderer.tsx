import React from 'react';
import { FamilyGraph } from '../../models/types';
import { NodePosition, NODE_WIDTH, NODE_HEIGHT } from './TreeLayout';

interface EdgeRendererProps {
  graph: FamilyGraph;
  positions: Map<string, NodePosition>;
}

export const EdgeRenderer = React.memo(function EdgeRenderer({ graph, positions }: EdgeRendererProps) {
  const lines: React.ReactNode[] = [];

  for (const edge of graph.edges) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;

    if (edge.type === 'SPOUSE_OF') {
      // 배우자: 수평 점선 + 하트 (항상 왼쪽→오른쪽)
      const leftPos = fromPos.x < toPos.x ? fromPos : toPos;
      const rightPos = fromPos.x < toPos.x ? toPos : fromPos;
      const y = leftPos.y + NODE_HEIGHT / 2;
      const x1 = leftPos.x + NODE_WIDTH;
      const x2 = rightPos.x;
      const midX = (x1 + x2) / 2;
      lines.push(
        <g key={edge.id}>
          <line
            x1={x1} y1={y} x2={x2} y2={y}
            stroke="#F472B6"
            strokeWidth={2}
            strokeDasharray="6,3"
          />
          <text x={midX} y={y + 5} textAnchor="middle" fontSize={14}>
            &#9829;
          </text>
        </g>
      );
    } else if (edge.type === 'PARENT_OF') {
      // 부모→자녀: 꺾이는 세로선
      const parentX = fromPos.x + NODE_WIDTH / 2;
      const parentY = fromPos.y + NODE_HEIGHT;
      const childX = toPos.x + NODE_WIDTH / 2;
      const childY = toPos.y;
      const midY = (parentY + childY) / 2;

      lines.push(
        <polyline
          key={edge.id}
          points={`${parentX},${parentY} ${parentX},${midY} ${childX},${midY} ${childX},${childY}`}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={2}
        />
      );
    }
  }

  return <g>{lines}</g>;
});
