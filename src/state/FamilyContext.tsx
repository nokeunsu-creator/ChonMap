import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { FamilyGraph, Person, Edge, Gender } from '../models/types';
import { RelationshipResult } from '../models/types';
import { calculateAllRelationships } from '../engine/chonCalculator';
import { saveGraph, saveGraphImmediate, loadGraph, isPremium as checkPremium } from '../storage/StorageService';
import { nanoid } from 'nanoid';

// === State ===
export interface FamilyState {
  graph: FamilyGraph;
  perspectivePersonId: string;
  selectedPersonId: string | null;
  isPremium: boolean;
  relationships: Map<string, RelationshipResult>;
  activeTab: 'tree' | 'settings';
  showAddForm: boolean;
  editingPersonId: string | null;
}

// === Actions ===
type FamilyAction =
  | { type: 'ADD_PERSON'; person: Person; edge: Edge }
  | { type: 'REMOVE_PERSON'; personId: string }
  | { type: 'UPDATE_PERSON'; personId: string; updates: Partial<Person> }
  | { type: 'SET_PERSPECTIVE'; personId: string }
  | { type: 'SELECT_PERSON'; personId: string | null }
  | { type: 'IMPORT_GRAPH'; graph: FamilyGraph }
  | { type: 'SET_PREMIUM'; isPremium: boolean }
  | { type: 'SET_TAB'; tab: 'tree' | 'settings' }
  | { type: 'SHOW_ADD_FORM'; show: boolean }
  | { type: 'SET_EDITING'; personId: string | null };

function createDefaultGraph(): FamilyGraph {
  const myId = nanoid();
  return {
    persons: {
      [myId]: { id: myId, name: '나', gender: 'M' as Gender },
    },
    edges: [],
    rootPersonId: myId,
    version: 1,
  };
}

function recalcRelationships(graph: FamilyGraph, perspectiveId: string): Map<string, RelationshipResult> {
  return calculateAllRelationships(graph, perspectiveId);
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
        ...state,
        graph: newGraph,
        relationships: recalcRelationships(newGraph, state.perspectivePersonId),
        showAddForm: false,
      };
    }
    case 'REMOVE_PERSON': {
      // 루트 인물은 삭제 불가
      if (action.personId === state.graph.rootPersonId) return state;

      const { [action.personId]: _, ...remainingPersons } = state.graph.persons;
      const remainingEdges = state.graph.edges.filter(
        e => e.from !== action.personId && e.to !== action.personId
      );
      const newGraph: FamilyGraph = {
        ...state.graph,
        persons: remainingPersons,
        edges: remainingEdges,
      };
      const newPerspective = action.personId === state.perspectivePersonId
        ? state.graph.rootPersonId
        : state.perspectivePersonId;
      return {
        ...state,
        graph: newGraph,
        perspectivePersonId: newPerspective,
        selectedPersonId: null,
        relationships: recalcRelationships(newGraph, newPerspective),
      };
    }
    case 'UPDATE_PERSON': {
      const updated = { ...state.graph.persons[action.personId], ...action.updates };
      const newGraph: FamilyGraph = {
        ...state.graph,
        persons: { ...state.graph.persons, [action.personId]: updated },
      };
      return {
        ...state,
        graph: newGraph,
        relationships: recalcRelationships(newGraph, state.perspectivePersonId),
        editingPersonId: null,
      };
    }
    case 'SET_PERSPECTIVE': {
      return {
        ...state,
        perspectivePersonId: action.personId,
        relationships: recalcRelationships(state.graph, action.personId),
      };
    }
    case 'SELECT_PERSON':
      return { ...state, selectedPersonId: action.personId };
    case 'IMPORT_GRAPH': {
      return {
        ...state,
        graph: action.graph,
        perspectivePersonId: action.graph.rootPersonId,
        selectedPersonId: null,
        relationships: recalcRelationships(action.graph, action.graph.rootPersonId),
      };
    }
    case 'SET_PREMIUM':
      return { ...state, isPremium: action.isPremium };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, selectedPersonId: null };
    case 'SHOW_ADD_FORM':
      return { ...state, showAddForm: action.show };
    case 'SET_EDITING':
      return { ...state, editingPersonId: action.personId };
    default:
      return state;
  }
}

// === Context ===
const FamilyContext = createContext<{
  state: FamilyState;
  dispatch: React.Dispatch<FamilyAction>;
} | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(familyReducer, null, () => {
    const loaded = loadGraph();
    const initialGraph = loaded || createDefaultGraph();
    const initialPerspective = initialGraph.rootPersonId;
    return {
      graph: initialGraph,
      perspectivePersonId: initialPerspective,
      selectedPersonId: null,
      isPremium: checkPremium(),
      relationships: recalcRelationships(initialGraph, initialPerspective),
      activeTab: 'tree' as const,
      showAddForm: false,
      editingPersonId: null,
    };
  });

  // 자동 저장
  useEffect(() => {
    saveGraph(state.graph);
  }, [state.graph]);

  // 페이지 닫을 때 즉시 저장
  useEffect(() => {
    const flush = () => saveGraphImmediate(state.graph);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [state.graph]);

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
