export type Gender = 'M' | 'F';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  memo?: string;
}

export type EdgeType = 'PARENT_OF' | 'SPOUSE_OF';

export interface Edge {
  id: string;
  type: EdgeType;
  from: string; // PARENT_OF: parent id, SPOUSE_OF: either
  to: string;   // PARENT_OF: child id,  SPOUSE_OF: other
}

export interface FamilyGraph {
  persons: Record<string, Person>;
  edges: Edge[];
  rootPersonId: string;
  version: number;
}

export type Lineage = 'paternal' | 'maternal' | 'self';

export interface RelationshipResult {
  chon: number;          // 촌수 (0=본인, -1=배우자/무촌)
  path: string[];        // 경로 상의 person ID들
  title: string;         // 한국식 호칭
  lineage: Lineage;
  isInLaw: boolean;      // 인척 여부
}
