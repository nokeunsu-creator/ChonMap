import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { computeLayout, NodePosition } from './TreeLayout';
import { PersonNode } from './PersonNode';
import { EdgeRenderer } from './EdgeRenderer';

interface FamilyTreeSVGProps {
  searchQuery?: string;
}

export function FamilyTreeSVG({ searchQuery }: FamilyTreeSVGProps) {
  const { state, dispatch } = useFamily();
  const { graph, perspectivePersonId, selectedPersonId, relationships, photos, darkMode } = state;

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [showLineageColors, setShowLineageColors] = useState(
    () => localStorage.getItem('chonmap_lineage_colors') === 'true'
  );
  const toggleLineageColors = useCallback(() => {
    setShowLineageColors(prev => {
      const next = !prev;
      localStorage.setItem('chonmap_lineage_colors', next ? 'true' : 'false');
      return next;
    });
  }, []);
  const toggleCollapse = useCallback((personId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId); else next.add(personId);
      return next;
    });
  }, []);

  const layout = useMemo(() => computeLayout(graph, collapsedIds), [graph, collapsedIds]);
  const { positions, generationYs, minGeneration, maxGeneration } = layout;

  const [horizontal, setHorizontal] = useState(() => localStorage.getItem('chonmap_horizontal') === 'true');

  const toggleHorizontal = useCallback(() => {
    setHorizontal(prev => {
      const next = !prev;
      localStorage.setItem('chonmap_horizontal', next ? 'true' : 'false');
      return next;
    });
  }, []);

  // 가로 모드: x↔y 스왑
  const transformedPositions = useMemo((): Map<string, NodePosition> => {
    if (!horizontal) return positions;
    const result = new Map<string, NodePosition>();
    for (const [id, pos] of positions) {
      result.set(id, { ...pos, x: pos.y, y: pos.x });
    }
    return result;
  }, [positions, horizontal]);

  // 검색 매칭
  const searchMatches = useMemo(() => {
    if (!searchQuery?.trim()) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    const matches = new Set<string>();
    for (const person of Object.values(graph.persons)) {
      if (person.name.toLowerCase().includes(q)) matches.add(person.id);
    }
    return matches;
  }, [graph.persons, searchQuery]);

  const autoViewBox = useMemo(() => {
    const allPos = Array.from(transformedPositions.values());
    if (allPos.length === 0) return { x: 0, y: 0, w: 400, h: 300 };
    const minX = Math.min(...allPos.map(p => p.x)) - 80;
    const maxX = Math.max(...allPos.map(p => p.x)) + 60;
    const minY = Math.min(...allPos.map(p => p.y)) - 55;
    const maxY = Math.max(...allPos.map(p => p.y)) + 65;
    return { x: minX, y: minY, w: Math.max(maxX - minX, 200), h: Math.max(maxY - minY, 150) };
  }, [transformedPositions]);

  const handleNodeClick = useCallback((personId: string) => {
    dispatch({ type: 'SELECT_PERSON', personId: null });
    dispatch({ type: 'SET_PERSPECTIVE', personId });
  }, [dispatch]);

  const highlightPath = useMemo(() => {
    if (!selectedPersonId || selectedPersonId === perspectivePersonId) return undefined;
    const rel = relationships.get(selectedPersonId);
    return rel?.path;
  }, [selectedPersonId, perspectivePersonId, relationships]);

  const personEntries = Object.values(graph.persons);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  // 드래그 상태
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState(0); // SVG x (세로) 또는 y (가로)
  const [dragTargetOrder, setDragTargetOrder] = useState<string[] | null>(null);
  const dragInfoRef = useRef<{ parentId: string; siblings: string[]; currentOrder: string[] } | null>(null);

  const startDrag = useCallback((personId: string, pointerId: number) => {
    const parentEdge = graph.edges.find(e => e.type === 'PARENT_OF' && e.to === personId);
    if (!parentEdge) return;
    const parentId = parentEdge.from;
    const parentSpouseEdge = graph.edges.find(e => e.type === 'SPOUSE_OF' && (e.from === parentId || e.to === parentId));
    const parentSpouseId = parentSpouseEdge
      ? (parentSpouseEdge.from === parentId ? parentSpouseEdge.to : parentSpouseEdge.from)
      : null;
    const siblingIds = graph.edges
      .filter(e => e.type === 'PARENT_OF' && (e.from === parentId || e.from === parentSpouseId))
      .map(e => e.to);
    const unique = [...new Set(siblingIds)];
    if (unique.length < 2) return;
    const sorted = unique.sort((a, b) => {
      const pa = transformedPositions.get(a);
      const pb = transformedPositions.get(b);
      return ((horizontal ? pa?.y : pa?.x) ?? 0) - ((horizontal ? pb?.y : pb?.x) ?? 0);
    });
    dragInfoRef.current = { parentId, siblings: sorted, currentOrder: sorted };
    svgRef.current?.setPointerCapture(pointerId);
    setDraggingId(personId);
    const pos = transformedPositions.get(personId);
    setDragPos(horizontal ? pos?.y ?? 0 : pos?.x ?? 0);
    setDragTargetOrder(sorted);
    if (navigator.vibrate) navigator.vibrate(25);
  }, [graph, transformedPositions, horizontal]);

  const endDrag = useCallback(() => {
    if (!dragInfoRef.current) { setDraggingId(null); return; }
    const { parentId, siblings, currentOrder } = dragInfoRef.current;
    if (currentOrder.some((id, i) => id !== siblings[i])) {
      dispatch({ type: 'REORDER_CHILD', parentId, orderedIds: currentOrder });
    }
    setDraggingId(null);
    setDragTargetOrder(null);
    dragInfoRef.current = null;
  }, [dispatch]);

  const handleNodeLongPress = useCallback((personId: string, pointerId: number) => {
    dispatch({ type: 'SELECT_PERSON', personId });
    startDrag(personId, pointerId);
  }, [dispatch, startDrag]);

  useEffect(() => { setVb(autoViewBox); }, [autoViewBox]);

  // 검색 결과로 뷰 이동
  useEffect(() => {
    if (searchMatches.size === 1) {
      const matchId = [...searchMatches][0];
      const pos = transformedPositions.get(matchId);
      if (pos) {
        setVb(prev => ({ ...prev, x: pos.x - prev.w / 2, y: pos.y - prev.h / 2 }));
      }
    }
  }, [searchMatches, transformedPositions]);

  const resetView = useCallback(() => setVb(autoViewBox), [autoViewBox]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingId && dragInfoRef.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      const newDragPos = horizontal
        ? vb.y + (e.clientY - rect.top) / rect.height * vb.h
        : vb.x + (e.clientX - rect.left) / rect.width * vb.w;
      setDragPos(newDragPos);
      const { siblings } = dragInfoRef.current;
      const others = siblings.filter(id => id !== draggingId);
      let insertIdx = others.length;
      for (let i = 0; i < others.length; i++) {
        const p = transformedPositions.get(others[i]);
        const pv = horizontal ? p?.y ?? 0 : p?.x ?? 0;
        if (newDragPos < pv) { insertIdx = i; break; }
      }
      const newOrder = [...others];
      newOrder.splice(insertIdx, 0, draggingId);
      dragInfoRef.current.currentOrder = newOrder; // ref는 항상 최신값 유지
      setDragTargetOrder(newOrder);
      return;
    }
    if (!isPanning.current) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const dx = (e.clientX - lastPos.current.x) * (vb.w / rect.width);
    const dy = (e.clientY - lastPos.current.y) * (vb.h / rect.height);
    lastPos.current = { x: e.clientX, y: e.clientY };
    setVb(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
  };
  const handlePointerUp = () => {
    if (draggingId) { endDrag(); return; }
    isPanning.current = false;
  };

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const rect = svgEl.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      setVb(prev => {
        const nw = Math.max(100, Math.min(3000, prev.w * factor));
        const nh = Math.max(75, Math.min(2250, prev.h * factor));
        return { x: prev.x + (prev.w - nw) * mx, y: prev.y + (prev.h - nh) * my, w: nw, h: nh };
      });
    };
    svgEl.addEventListener('wheel', handler, { passive: false });
    return () => svgEl.removeEventListener('wheel', handler);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const factor = lastPinchDist.current / dist;
        setVb(prev => {
          const nw = Math.max(100, Math.min(3000, prev.w * factor));
          const nh = Math.max(75, Math.min(2250, prev.h * factor));
          return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
        });
      }
      lastPinchDist.current = dist;
    }
  }, []);
  const handleTouchEnd = useCallback(() => { lastPinchDist.current = null; }, []);

  // 세대 라벨
  const genLabels = useMemo(() => {
    const labels: { gen: number; lx: number; ly: number }[] = [];
    if (horizontal) {
      // 가로 모드: 세대가 X축, 라벨은 상단 고정 위치
      for (let g = minGeneration; g <= maxGeneration; g++) {
        const origY = generationYs.get(g);
        if (origY !== undefined) {
          labels.push({ gen: g, lx: origY, ly: autoViewBox.y + 18 });
        }
      }
    } else {
      // 세로 모드: 세대가 Y축, 라벨은 좌측 고정 위치
      for (let g = minGeneration; g <= maxGeneration; g++) {
        const y = generationYs.get(g);
        if (y !== undefined) labels.push({ gen: g, lx: autoViewBox.x + 30, ly: y });
      }
    }
    return labels;
  }, [generationYs, minGeneration, maxGeneration, horizontal, autoViewBox]);

  const dk = darkMode;
  const bgColor = dk ? '#1F2937' : 'white';
  const borderColor = dk ? '#374151' : '#F0E6D6';
  const btnBg = dk ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)';
  const btnBorder = dk ? '#4B5563' : '#E8DCC8';
  const btnColor = dk ? '#FBBF24' : '#8B6914';

  return (
    <div style={{
      background: bgColor, borderRadius: 20, margin: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${borderColor}`,
      overflow: 'hidden', flex: 1, position: 'relative',
    }}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={e => e.preventDefault()}
        role="img"
        aria-label="가계도"
      >
        {/* 세대 라벨 */}
        {genLabels.map(({ gen, lx, ly }) => (
          <g key={`gen-${gen}`}>
            <rect x={lx - 18} y={ly - 9} width={36} height={18} rx={9}
              fill={dk ? 'rgba(251,191,36,0.12)' : 'rgba(139,105,20,0.08)'}
              stroke={dk ? 'rgba(251,191,36,0.3)' : 'rgba(139,105,20,0.15)'} strokeWidth={0.5} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize={8} fontWeight={600}
              fill={dk ? '#FBBF24' : '#8B6914'} style={{ pointerEvents: 'none' }}>
              {gen + 1}세대
            </text>
          </g>
        ))}

        <EdgeRenderer graph={graph} positions={transformedPositions} highlightPath={highlightPath} horizontal={horizontal} />

        {/* 드래그 드롭 위치 인디케이터 */}
        {draggingId && dragTargetOrder && dragInfoRef.current && (() => {
          const { siblings } = dragInfoRef.current;
          const others = siblings.filter(id => id !== draggingId);
          const targetIdx = dragTargetOrder.indexOf(draggingId);
          const draggingPos = transformedPositions.get(draggingId);
          if (!draggingPos) return null;
          let indicatorVal: number;
          if (others.length === 0) return null;
          if (targetIdx === 0) {
            const p = transformedPositions.get(others[0]);
            indicatorVal = (horizontal ? p?.y ?? 0 : p?.x ?? 0) - 52;
          } else if (targetIdx >= others.length) {
            const p = transformedPositions.get(others[others.length - 1]);
            indicatorVal = (horizontal ? p?.y ?? 0 : p?.x ?? 0) + 52;
          } else {
            const pPrev = transformedPositions.get(others[targetIdx - 1]);
            const pNext = transformedPositions.get(others[targetIdx]);
            const prev = horizontal ? pPrev?.y ?? 0 : pPrev?.x ?? 0;
            const next = horizontal ? pNext?.y ?? 0 : pNext?.x ?? 0;
            indicatorVal = (prev + next) / 2;
          }
          return (
            <circle
              cx={horizontal ? draggingPos.x : indicatorVal}
              cy={horizontal ? indicatorVal : draggingPos.y}
              r={7} fill="#C4961A" opacity={0.85}
            />
          );
        })()}

        {personEntries.map(person => {
          const pos = transformedPositions.get(person.id);
          if (!pos) return null;
          const isOnPath = highlightPath?.includes(person.id) || false;
          const isDragging = draggingId === person.id;
          const nodeX = isDragging ? (horizontal ? pos.x : dragPos) : pos.x;
          const nodeY = isDragging ? (horizontal ? dragPos : pos.y) : pos.y;
          const hasChildren = graph.edges.some(e => e.type === 'PARENT_OF' && e.from === person.id);
          return (
            <PersonNode
              key={person.id}
              person={person}
              x={nodeX}
              y={nodeY}
              relationship={relationships.get(person.id)}
              isPerspective={person.id === perspectivePersonId}
              isSelected={person.id === selectedPersonId}
              isOnPath={isOnPath}
              isSearchMatch={searchMatches.has(person.id)}
              photoUrl={photos[person.id]}
              horizontal={horizontal}
              isDragging={isDragging}
              showLineageColors={showLineageColors}
              hasChildren={hasChildren}
              isCollapsed={collapsedIds.has(person.id)}
              onClick={() => handleNodeClick(person.id)}
              onLongPress={(pid) => handleNodeLongPress(person.id, pid)}
              onCollapseToggle={() => toggleCollapse(person.id)}
            />
          );
        })}
      </svg>

      {/* 선택된 노드 수정 버튼 */}
      {selectedPersonId && (() => {
        const selPos = transformedPositions.get(selectedPersonId);
        const svgEl = svgRef.current;
        if (!selPos || !svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const scaleX = rect.width / vb.w;
        const scaleY = rect.height / vb.h;
        const screenX = (selPos.x - vb.x) * scaleX;
        const screenY = (selPos.y - vb.y) * scaleY + 55 * scaleY;
        return (
          <div style={{
            position: 'absolute', left: screenX, top: screenY,
            transform: 'translateX(-50%)', zIndex: 10,
            display: 'flex', gap: 6,
          }}>
            <button
              onClick={() => dispatch({ type: 'SET_EDITING', personId: selectedPersonId })}
              style={{
                background: 'linear-gradient(135deg, #8B6914, #C4961A)',
                color: 'white', border: 'none', borderRadius: 20,
                padding: '6px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 3px 12px rgba(139,105,20,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              &#9998; 수정
            </button>
            <button
              onClick={() => dispatch({ type: 'SELECT_PERSON', personId: null })}
              style={{
                background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                borderRadius: '50%', width: 28, height: 28, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              &times;
            </button>
          </div>
        );
      })()}

      {/* 우상단 버튼 그룹 */}
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        <button
          onClick={() => dispatch({ type: 'SORT_CHILDREN_BY_AGE' })}
          title="형제/자녀를 나이순으로 정렬"
          style={{
            background: btnBg, border: `1px solid ${btnBorder}`,
            borderRadius: 8, padding: '4px 8px', fontSize: 11, color: btnColor,
            cursor: 'pointer', fontWeight: 600,
          }}
        >↕ 나이순</button>
        <button
          onClick={toggleLineageColors}
          title={showLineageColors ? '계통 색상 끄기' : '부계/모계 색상 구분'}
          style={{
            background: showLineageColors ? (dk ? '#1E3A5F' : '#DBEAFE') : btnBg,
            border: `1px solid ${showLineageColors ? '#3B82F6' : btnBorder}`,
            borderRadius: 8, padding: '4px 8px', fontSize: 11,
            color: showLineageColors ? '#3B82F6' : btnColor,
            cursor: 'pointer', fontWeight: 600,
          }}
        >🎨 계통</button>
        <button
          onClick={toggleHorizontal}
          title={horizontal ? '세로 보기' : '가로 보기'}
          style={{
            background: horizontal ? (dk ? '#92400E' : '#FFF3C4') : btnBg,
            border: `1px solid ${horizontal ? (dk ? '#D97706' : '#D4A017') : btnBorder}`,
            borderRadius: 8, padding: '4px 8px', fontSize: 11,
            color: horizontal ? (dk ? '#FBBF24' : '#8B6914') : btnColor,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          {horizontal ? '↕ 세로' : '↔ 가로'}
        </button>
        <button
          onClick={resetView}
          style={{
            background: btnBg, border: `1px solid ${btnBorder}`,
            borderRadius: 8, padding: '4px 8px', fontSize: 11, color: btnColor,
            cursor: 'pointer', fontWeight: 600,
          }}
        >전체보기</button>
      </div>

      {/* 검색 결과 안내 */}
      {searchQuery && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8,
          background: dk ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
          border: `1px solid ${borderColor}`,
          borderRadius: 8, padding: '4px 10px', fontSize: 11,
          color: dk ? '#9CA3AF' : '#8B7355', textAlign: 'center',
        }}>
          {searchMatches.size > 0
            ? `"${searchQuery}" 검색결과: ${searchMatches.size}명`
            : `"${searchQuery}" 검색결과 없음`}
        </div>
      )}
    </div>
  );
}
