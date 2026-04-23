import React, { useEffect } from 'react';
import { Person, RelationshipResult } from '../../models/types';

// 모듈 레벨: 페이지 로드 시 1회 계산 (일간 체크용)
const _today = new Date();
const TODAY_MD = `${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;

interface PersonNodeProps {
  person: Person;
  x: number;
  y: number;
  relationship: RelationshipResult | undefined;
  isPerspective: boolean;
  isSelected: boolean;
  isOnPath: boolean;
  isSearchMatch?: boolean;
  photoUrl?: string;
  horizontal?: boolean;
  isDragging?: boolean;
  showLineageColors?: boolean;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onClick: () => void;
  onLongPress: (pointerId: number) => void;
  onCollapseToggle?: () => void;
}

function getEmoji(person: Person): string {
  const isDeceased = !!person.deathYear;
  if (isDeceased) return person.gender === 'M' ? '\u{1F9D4}' : '\u{1F9D3}';
  if (person.birthYear && person.birthYear < 1970) return person.gender === 'M' ? '\u{1F474}' : '\u{1F475}';
  if (person.birthYear && person.birthYear > 2005) return person.gender === 'M' ? '\u{1F466}' : '\u{1F467}';
  return person.gender === 'M' ? '\u{1F468}' : '\u{1F469}';
}

function formatTitle(rel: RelationshipResult | undefined): string {
  if (!rel) return '';
  const { title, chon } = rel;
  if (chon === 0) return title;
  if (chon === -1) return title;
  if (title.includes('촌')) return title;
  return `${title} (${chon}촌)`;
}

export const PersonNode = React.memo(function PersonNode({
  person, x, y, relationship, isPerspective, isSelected, isOnPath,
  isSearchMatch, photoUrl, horizontal, isDragging, showLineageColors,
  hasChildren, isCollapsed, onClick, onLongPress, onCollapseToggle,
}: PersonNodeProps) {
  const title = formatTitle(relationship);
  const emoji = getEmoji(person);
  const isMale = person.gender === 'M';
  const isDeceased = !!person.deathYear;

  // 계통 색상
  const lineage = relationship?.lineage;
  const isInLaw = relationship?.isInLaw;
  const lineageBorder = showLineageColors && lineage && !isPerspective && !isSelected && !isOnPath && !isSearchMatch
    ? (lineage === 'paternal' && !isInLaw ? '#3B82F6'
      : lineage === 'maternal' && !isInLaw ? '#EC4899'
      : isInLaw ? '#8B5CF6' : null)
    : null;
  const borderColor = isSearchMatch ? '#10B981'
    : isPerspective ? '#D4A017'
    : isSelected ? '#0EA5E9'
    : isOnPath ? '#F59E0B'
    : lineageBorder ?? (isMale ? '#4A90D9' : '#D97B8A');
  const bgColor = isDeceased ? '#F3F4F6'
    : isPerspective ? '#FFF8DC'
    : isSelected ? '#E0F2FE'
    : isMale ? '#EBF4FF' : '#FFF0F3';
  const labelColor = isPerspective ? '#8B6914' : isMale ? '#1E56A0' : '#A0344A';
  const labelBg = isPerspective ? '#FFF3C4' : isMale ? '#DBEAFE' : '#FCE4EC';
  const labelBorder = isPerspective ? '#D4A017' : isMale ? '#93C5FD' : '#F9A8D4';

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = React.useRef<number>(0);
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    timerRef.current = setTimeout(() => { onLongPress(e.pointerId); timerRef.current = null; }, 500);
  };
  const handlePointerUp = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; onClick(); }
  };
  const handlePointerLeave = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  };

  // 한글/영문 구분 라벨 너비 계산
  const labelFontSize = title.length >= 12 ? 7 : title.length >= 8 ? 8 : 9;
  const labelWidth = Math.max(
    [...title].reduce((w, ch) => w + (/[\uAC00-\uD7AF]/.test(ch) ? 9 : 5.5) * (labelFontSize / 9), 0) + 14,
    30
  );
  const ariaLabel = `${person.name}, ${relationship?.title || ''}${relationship?.chon !== undefined && relationship.chon >= 1 ? ` ${relationship.chon}촌` : ''}${isDeceased ? ', 고인' : ''}`;
  const hasPhoto = !!photoUrl;

  const isBirthday = !isDeceased && person.birthMonthDay === TODAY_MD;
  const isMemorialDay = isDeceased && person.deathMonthDay === TODAY_MD;

  return (
    <g onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerLeave}
       onKeyDown={handleKeyDown}
       style={{ cursor: isDragging ? 'grabbing' : 'pointer', outline: isSelected ? '2.5px solid #0EA5E9' : 'none', WebkitTapHighlightColor: 'transparent' }}
       opacity={isDragging ? 0.6 : isDeceased ? 0.7 : 1}
       transform={isDragging ? `scale(1.08) translate(${-x * 0.08},${-y * 0.08})` : undefined}
       role="button" aria-label={ariaLabel} tabIndex={0}>

      {isSearchMatch && (
        <circle cx={x} cy={y} r={32} fill="none" stroke="#10B981" strokeWidth={3} opacity={0.8}>
          <animate attributeName="r" values="30;34;30" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isPerspective && (
        <circle cx={x} cy={y} r={30} fill="none" stroke="rgba(212,160,23,0.4)" strokeWidth={3} strokeDasharray="4,3">
          <animate attributeName="stroke-dashoffset" values="0;14" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isOnPath && !isPerspective && (
        <circle cx={x} cy={y} r={28} fill="none" stroke="#F59E0B" strokeWidth={2} opacity={0.5} />
      )}

      <circle cx={x} cy={y} r={22} fill={bgColor} stroke={borderColor}
        strokeWidth={isPerspective || isOnPath || isSearchMatch || isSelected ? 3 : 2}
        strokeDasharray={isDeceased && !isPerspective ? '3,2' : 'none'} />

      {hasPhoto ? (
        <>
          <clipPath id={`clip-${person.id}`}>
            <circle cx={x} cy={y} r={20} />
          </clipPath>
          <image href={photoUrl} x={x - 20} y={y - 20} width={40} height={40}
            clipPath={`url(#clip-${person.id})`}
            style={{ pointerEvents: 'none' }} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text x={x} y={y + 7} textAnchor="middle" fontSize={20} style={{ pointerEvents: 'none' }}>
          {emoji}
        </text>
      )}

      {isDeceased && (
        <text x={x + 16} y={y - 14} textAnchor="middle" fontSize={10} fill="#6B7280"
          style={{ pointerEvents: 'none' }}>&#10013;</text>
      )}

      {horizontal ? (
        // 가로 모드: 호칭+이름을 노드 오른쪽에 세로로 배치
        <>
          {title && (
            <>
              <rect x={x + 26} y={y - 17} width={labelWidth} height={17} rx={8}
                fill={labelBg} stroke={labelBorder} strokeWidth={1} />
              <text x={x + 26 + labelWidth / 2} y={y - 5} textAnchor="middle" fontSize={labelFontSize} fontWeight={700} fill={labelColor}
                style={{ pointerEvents: 'none' }}>{title}</text>
            </>
          )}
          <text x={x + 26} y={y + 12} textAnchor="start" fontSize={11} fontWeight={500}
            fill={isDeceased ? '#9CA3AF' : '#666'} style={{ pointerEvents: 'none' }}>
            {person.name}
          </text>
        </>
      ) : (
        // 세로 모드 (기본): 호칭은 위, 이름은 아래
        <>
          {title && (
            <>
              <rect x={x - labelWidth / 2} y={y - 42} width={labelWidth} height={17} rx={8}
                fill={labelBg} stroke={labelBorder} strokeWidth={1} />
              <text x={x} y={y - 30} textAnchor="middle" fontSize={labelFontSize} fontWeight={700} fill={labelColor}
                style={{ pointerEvents: 'none' }}>{title}</text>
            </>
          )}
          <text x={x} y={y + 38} textAnchor="middle" fontSize={11} fontWeight={500}
            fill={isDeceased ? '#9CA3AF' : '#666'} style={{ pointerEvents: 'none' }}>
            {person.name}
          </text>
        </>
      )}

      {isDeceased && person.birthYear && (
        <text
          x={horizontal ? x + 26 : x}
          y={horizontal ? y + 24 : y + 50}
          textAnchor={horizontal ? 'start' : 'middle'}
          fontSize={8} fill="#9CA3AF"
          style={{ pointerEvents: 'none' }}>
          {person.birthYear}~{person.deathYear}
        </text>
      )}

      {person.memo && !isBirthday && !isMemorialDay && (
        <text x={x + 18} y={y + 12} textAnchor="middle" fontSize={8} fill="#A09080"
          style={{ pointerEvents: 'none' }}>&#128221;</text>
      )}

      {/* 생일 배지 */}
      {isBirthday && (
        <g>
          <circle cx={x + 18} cy={y - 18} r={9} fill="#FF6B6B" />
          <text x={x + 18} y={y - 14} textAnchor="middle" fontSize={10}
            style={{ pointerEvents: 'none' }}>&#127874;</text>
        </g>
      )}

      {/* 기일 배지 */}
      {isMemorialDay && (
        <g>
          <circle cx={x + 18} cy={y - 18} r={9} fill="#6B7280" />
          <text x={x + 18} y={y - 14} textAnchor="middle" fontSize={10}
            style={{ pointerEvents: 'none' }}>&#128591;</text>
        </g>
      )}

      {/* 브랜치 접기/펼치기 버튼 */}
      {hasChildren && onCollapseToggle && (
        <g onClick={e => { e.stopPropagation(); onCollapseToggle(); }} style={{ cursor: 'pointer' }}>
          <circle cx={x} cy={horizontal ? y + 28 : y + 28} r={8}
            fill={isCollapsed ? '#F59E0B' : '#E5E7EB'} stroke="#D1D5DB" strokeWidth={1} />
          <text x={x} y={y + 32} textAnchor="middle" fontSize={9} fontWeight={700}
            fill={isCollapsed ? 'white' : '#6B7280'} style={{ pointerEvents: 'none' }}>
            {isCollapsed ? '▶' : '▼'}
          </text>
          {isCollapsed && (
            <text x={x + 16} y={y + 34} textAnchor="start" fontSize={8} fill="#9CA3AF"
              style={{ pointerEvents: 'none' }}>접힘</text>
          )}
        </g>
      )}
    </g>
  );
});
