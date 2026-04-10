import React, { useMemo } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { computeLayout } from './TreeLayout';
import { PersonNode } from './PersonNode';
import { EdgeRenderer } from './EdgeRenderer';
import { usePanZoom } from './usePanZoom';

export function FamilyTreeSVG() {
  const { state, dispatch } = useFamily();
  const { graph, perspectivePersonId, selectedPersonId, isPremium, relationships } = state;

  const positions = useMemo(() => computeLayout(graph), [graph]);

  const {
    viewBoxString,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleTouchMove,
    handleTouchEnd,
    resetView,
  } = usePanZoom();

  const handleNodeClick = (personId: string) => {
    dispatch({ type: 'SET_PERSPECTIVE', personId });
  };

  const handleNodeLongPress = (personId: string) => {
    dispatch({ type: 'SELECT_PERSON', personId });
  };

  const personEntries = Object.values(graph.persons);

  return (
    <div className="relative w-full h-full">
      <svg
        className="w-full h-full touch-none"
        viewBox={viewBoxString}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <EdgeRenderer graph={graph} positions={positions} />
        {personEntries.map(person => {
          const pos = positions.get(person.id);
          if (!pos) return null;
          return (
            <PersonNode
              key={person.id}
              person={person}
              x={pos.x}
              y={pos.y}
              relationship={relationships.get(person.id)}
              isPerspective={person.id === perspectivePersonId}
              isSelected={person.id === selectedPersonId}
              isPremium={isPremium}
              onClick={() => handleNodeClick(person.id)}
              onLongPress={() => handleNodeLongPress(person.id)}
            />
          );
        })}
      </svg>

      {/* 컨트롤 버튼 */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={resetView}
          className="bg-white/90 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow text-sm"
        >
          R
        </button>
      </div>

      {/* 안내 텍스트 */}
      {personEntries.length === 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm">
          + 버튼으로 가족을 추가하세요
        </div>
      )}
    </div>
  );
}
