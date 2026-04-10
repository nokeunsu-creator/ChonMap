import React from 'react';
import { Person, RelationshipResult } from '../../models/types';
import { NODE_WIDTH, NODE_HEIGHT } from './TreeLayout';

interface PersonNodeProps {
  person: Person;
  x: number;
  y: number;
  relationship: RelationshipResult | undefined;
  isPerspective: boolean;
  isSelected: boolean;
  isPremium: boolean;
  onClick: () => void;
  onLongPress: () => void;
}

export const PersonNode = React.memo(function PersonNode({
  person,
  x,
  y,
  relationship,
  isPerspective,
  isSelected,
  isPremium,
  onClick,
  onLongPress,
}: PersonNodeProps) {
  const chon = relationship?.chon ?? 0;
  const isLocked = !isPremium && chon > 2 && chon !== -1;
  const title = isLocked ? '?' : (relationship?.title || '');

  const fillColor = isPerspective
    ? '#4F46E5'
    : isSelected
    ? '#7C3AED'
    : person.gender === 'M'
    ? '#3B82F6'
    : '#EC4899';

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    timerRef.current = setTimeout(() => {
      onLongPress();
      timerRef.current = null;
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onClick();
    }
  };

  const handlePointerLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <g
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={x}
        y={y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={10}
        fill={fillColor}
        stroke={isPerspective ? '#312E81' : isSelected ? '#5B21B6' : 'transparent'}
        strokeWidth={isPerspective || isSelected ? 3 : 0}
        opacity={isLocked ? 0.5 : 1}
      />
      {/* 이름 */}
      <text
        x={x + NODE_WIDTH / 2}
        y={y + 28}
        textAnchor="middle"
        fill="white"
        fontSize={14}
        fontWeight="bold"
      >
        {isLocked ? '***' : person.name}
      </text>
      {/* 호칭 */}
      <text
        x={x + NODE_WIDTH / 2}
        y={y + 48}
        textAnchor="middle"
        fill={isLocked ? '#fbbf24' : 'rgba(255,255,255,0.85)'}
        fontSize={11}
      >
        {title}
      </text>
      {/* 잠금 아이콘 */}
      {isLocked && (
        <text
          x={x + NODE_WIDTH / 2}
          y={y + 62}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={10}
        >
          잠금
        </text>
      )}
      {/* 기준 인물 표시 */}
      {isPerspective && (
        <circle cx={x + NODE_WIDTH - 8} cy={y + 8} r={6} fill="#FCD34D" />
      )}
    </g>
  );
});
