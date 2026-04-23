import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { FamilyGraph, Person, Edge, Gender } from '../models/types';
import { RelationshipResult } from '../models/types';
import { calculateAllRelationships } from '../engine/chonCalculator';
import {
  saveGraph, saveGraphImmediate, loadGraph,
  isDarkMode as checkDarkMode,
  onStorageChange,
  loadPhotos, savePhotos,
} from '../storage/StorageService';
import { nanoid } from 'nanoid';

export interface FamilyState {
  graph: FamilyGraph;
  perspectivePersonId: string;
  selectedPersonId: string | null;
  darkMode: boolean;
  relationships: Map<string, RelationshipResult>;
  activeTab: 'tree' | 'settings' | 'search' | 'quiz';
  showAddForm: boolean;
  editingPersonId: string | null;
  undoStack: FamilyGraph[];
  redoStack: FamilyGraph[];
  photos: Record<string, string>;
}

type FamilyAction =
  | { type: 'ADD_PERSON'; person: Person; edge: Edge }
  | { type: 'REMOVE_PERSON'; personId: string }
  | { type: 'UPDATE_PERSON'; personId: string; updates: Partial<Person> }
  | { type: 'SET_PERSPECTIVE'; personId: string }
  | { type: 'SELECT_PERSON'; personId: string | null }
  | { type: 'IMPORT_GRAPH'; graph: FamilyGraph }
  | { type: 'SET_DARK_MODE'; darkMode: boolean }
  | { type: 'SET_TAB'; tab: 'tree' | 'settings' | 'search' | 'quiz' }
  | { type: 'SHOW_ADD_FORM'; show: boolean }
  | { type: 'SET_EDITING'; personId: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SYNC_GRAPH'; graph: FamilyGraph }
  | { type: 'SET_PHOTO'; personId: string; dataUrl: string }
  | { type: 'REMOVE_PHOTO'; personId: string }
  | { type: 'ADD_SIBLING'; sibling: Person; siblingEdge: Edge; parent: Person; parentEdge: Edge }
  | { type: 'REORDER_CHILD'; parentId: string; orderedIds: string[] }
  | { type: 'SORT_CHILDREN_BY_AGE' };

function createDefaultGraph(): FamilyGraph {
  const myId = nanoid();
  return {
    persons: { [myId]: { id: myId, name: '나', gender: 'M' as Gender } },
    edges: [],
    rootPersonId: myId,
    version: 1,
  };
}

function recalc(graph: FamilyGraph, pid: string) {
  return calculateAllRelationships(graph, pid);
}

function pushUndo(state: FamilyState): { undoStack: FamilyGraph[]; redoStack: FamilyGraph[] } {
  return {
    undoStack: [...state.undoStack.slice(-19), state.graph],
    redoStack: [],
  };
}

function familyReducer(state: FamilyState, action: FamilyAction): FamilyState {
  switch (action.type) {
    case 'ADD_PERSON': {
      const newGraph: FamilyGraph = {
        ...state.graph,
        persons: { ...state.graph.persons, [action.person.id]: action.person },
        edges: [...state.graph.edges, action.edge],
      };
      return {
        ...state, ...pushUndo(state),
        graph: newGraph,
        relationships: recalc(newGraph, state.perspectivePersonId),
        showAddForm: false,
      };
    }
    case 'REMOVE_PERSON': {
      if (action.personId === state.graph.rootPersonId) return state;
      // 삭제 대상 + 고아가 될 자녀를 재귀적으로 수집
      const toRemove = new Set<string>();
      function collectOrphans(pid: string) {
        toRemove.add(pid);
        const children = state.graph.edges
          .filter(e => e.type === 'PARENT_OF' && e.from === pid)
          .map(e => e.to);
        for (const childId of children) {
          if (childId === state.graph.rootPersonId) continue;
          // 다른 부모가 있으면 고아가 아님
          const otherParent = state.graph.edges.some(
            e => e.type === 'PARENT_OF' && e.to === childId && !toRemove.has(e.from)
          );
          if (!otherParent) collectOrphans(childId);
        }
      }
      collectOrphans(action.personId);

      const remainingPersons = { ...state.graph.persons };
      const remainingPhotos = { ...state.photos };
      for (const id of toRemove) {
        delete remainingPersons[id];
        delete remainingPhotos[id];
      }
      const remainingEdges = state.graph.edges.filter(
        e => !toRemove.has(e.from) && !toRemove.has(e.to)
      );
      const cleanedChildOrder: Record<string, string[]> = {};
      for (const [parentId, ids] of Object.entries(state.graph.childOrder || {})) {
        if (!toRemove.has(parentId)) {
          const kept = ids.filter(id => !toRemove.has(id));
          if (kept.length > 0) cleanedChildOrder[parentId] = kept;
        }
      }
      const newGraph: FamilyGraph = { ...state.graph, persons: remainingPersons, edges: remainingEdges, childOrder: cleanedChildOrder };
      const newPerspective = toRemove.has(state.perspectivePersonId)
        ? state.graph.rootPersonId : state.perspectivePersonId;
      return {
        ...state, ...pushUndo(state),
        graph: newGraph,
        perspectivePersonId: newPerspective,
        selectedPersonId: null, editingPersonId: null,
        relationships: recalc(newGraph, newPerspective),
        photos: remainingPhotos,
      };
    }
    case 'UPDATE_PERSON': {
      const { id: _ignoreId, ...safeUpdates } = action.updates as Partial<Person> & { id?: string };
      const updated = { ...state.graph.persons[action.personId], ...safeUpdates };
      const newGraph: FamilyGraph = {
        ...state.graph, persons: { ...state.graph.persons, [action.personId]: updated },
      };
      return {
        ...state, ...pushUndo(state),
        graph: newGraph,
        relationships: recalc(newGraph, state.perspectivePersonId),
        editingPersonId: null,
      };
    }
    case 'SET_PERSPECTIVE':
      return { ...state, perspectivePersonId: action.personId, relationships: recalc(state.graph, action.personId) };
    case 'SELECT_PERSON':
      return { ...state, selectedPersonId: action.personId };
    case 'IMPORT_GRAPH':
      return {
        ...state, ...pushUndo(state),
        graph: action.graph,
        perspectivePersonId: action.graph.rootPersonId,
        selectedPersonId: null, editingPersonId: null,
        relationships: recalc(action.graph, action.graph.rootPersonId),
      };
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.darkMode };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, selectedPersonId: null };
    case 'SHOW_ADD_FORM':
      return { ...state, showAddForm: action.show };
    case 'SET_EDITING':
      return { ...state, editingPersonId: action.personId };
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prevGraph = state.undoStack[state.undoStack.length - 1];
      const pid = prevGraph.persons[state.perspectivePersonId] ? state.perspectivePersonId : prevGraph.rootPersonId;
      return {
        ...state, graph: prevGraph,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack.slice(-19), state.graph],
        perspectivePersonId: pid,
        selectedPersonId: null, editingPersonId: null,
        relationships: recalc(prevGraph, pid),
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const nextGraph = state.redoStack[state.redoStack.length - 1];
      const pid = nextGraph.persons[state.perspectivePersonId] ? state.perspectivePersonId : nextGraph.rootPersonId;
      return {
        ...state, graph: nextGraph,
        undoStack: [...state.undoStack.slice(-19), state.graph],
        redoStack: state.redoStack.slice(0, -1),
        perspectivePersonId: pid,
        selectedPersonId: null, editingPersonId: null,
        relationships: recalc(nextGraph, pid),
      };
    }
    case 'SYNC_GRAPH': {
      const pid = action.graph.persons[state.perspectivePersonId] ? state.perspectivePersonId : action.graph.rootPersonId;
      return {
        ...state, graph: action.graph, perspectivePersonId: pid,
        selectedPersonId: null, editingPersonId: null,
        relationships: recalc(action.graph, pid),
      };
    }
    case 'ADD_SIBLING': {
      const newGraph: FamilyGraph = {
        ...state.graph,
        persons: {
          ...state.graph.persons,
          [action.parent.id]: action.parent,
          [action.sibling.id]: action.sibling,
        },
        edges: [...state.graph.edges, action.parentEdge, action.siblingEdge],
      };
      return {
        ...state, ...pushUndo(state),
        graph: newGraph,
        relationships: recalc(newGraph, state.perspectivePersonId),
        showAddForm: false,
        selectedPersonId: null,
      };
    }
    case 'SET_PHOTO': {
      if (action.dataUrl.length > 500 * 1024) {
        showToast('사진이 너무 큽니다 (500KB 초과). 더 작은 사진을 선택해주세요', 'error');
        return state;
      }
      return { ...state, photos: { ...state.photos, [action.personId]: action.dataUrl } };
    }
    case 'REMOVE_PHOTO': {
      const { [action.personId]: _, ...rest } = state.photos;
      return { ...state, photos: rest };
    }
    case 'SORT_CHILDREN_BY_AGE': {
      const newChildOrder: Record<string, string[]> = { ...state.graph.childOrder };
      const seen = new Set<string>();
      for (const edge of state.graph.edges) {
        if (edge.type !== 'PARENT_OF' || seen.has(edge.from)) continue;
        const parentId = edge.from;
        const spouseEdge = state.graph.edges.find(e => e.type === 'SPOUSE_OF' && (e.from === parentId || e.to === parentId));
        const spouseId = spouseEdge ? (spouseEdge.from === parentId ? spouseEdge.to : spouseEdge.from) : null;
        const childIds = state.graph.edges
          .filter(e => e.type === 'PARENT_OF' && (e.from === parentId || e.from === spouseId))
          .map(e => e.to);
        const unique = [...new Set(childIds)];
        if (unique.length < 2) { seen.add(parentId); if (spouseId) seen.add(spouseId); continue; }
        const sorted = [...unique].sort((a, b) => {
          const yA = state.graph.persons[a]?.birthYear ?? 9999;
          const yB = state.graph.persons[b]?.birthYear ?? 9999;
          return yA - yB;
        });
        newChildOrder[parentId] = sorted;
        seen.add(parentId);
        if (spouseId) seen.add(spouseId);
      }
      const newGraph = { ...state.graph, childOrder: newChildOrder };
      return { ...state, ...pushUndo(state), graph: newGraph, relationships: recalc(newGraph, state.perspectivePersonId) };
    }
    case 'REORDER_CHILD': {
      const newGraph: FamilyGraph = {
        ...state.graph,
        childOrder: { ...state.graph.childOrder, [action.parentId]: action.orderedIds },
      };
      return {
        ...state, ...pushUndo(state),
        graph: newGraph,
        relationships: recalc(newGraph, state.perspectivePersonId),
      };
    }
    default:
      return state;
  }
}

const FamilyContext = createContext<{
  state: FamilyState;
  dispatch: React.Dispatch<FamilyAction>;
} | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(familyReducer, null, () => {
    const loaded = loadGraph();
    const initialGraph = loaded || createDefaultGraph();
    const pid = initialGraph.rootPersonId;
    return {
      graph: initialGraph,
      perspectivePersonId: pid,
      selectedPersonId: null,
      darkMode: checkDarkMode(),
      relationships: recalc(initialGraph, pid),
      activeTab: 'tree' as const,
      showAddForm: false,
      editingPersonId: null,
      undoStack: [],
      redoStack: [],
      photos: loadPhotos(),
    };
  });

  useEffect(() => { saveGraph(state.graph); }, [state.graph]);
  useEffect(() => {
    const flush = () => saveGraphImmediate(state.graph);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [state.graph]);
  useEffect(() => { savePhotos(state.photos); }, [state.photos]);
  useEffect(() => {
    return onStorageChange((graph) => { dispatch({ type: 'SYNC_GRAPH', graph }); });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  return (
    <FamilyContext.Provider value={{ state, dispatch }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}
