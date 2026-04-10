import { FamilyGraph } from '../models/types';

const STORAGE_KEY = 'chonmap_family_v1';
const PREMIUM_KEY = 'chonmap_premium';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveGraph(graph: FamilyGraph): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  }, 300);
}

export function saveGraphImmediate(graph: FamilyGraph): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
}

export function loadGraph(): FamilyGraph | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    const graph = JSON.parse(data) as FamilyGraph;
    if (!graph.persons || !graph.edges || !graph.rootPersonId || !graph.persons[graph.rootPersonId]) return null;
    return graph;
  } catch {
    return null;
  }
}

export function exportGraphJSON(graph: FamilyGraph): void {
  const json = JSON.stringify(graph, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `chonmap_backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGraphJSON(file: File): Promise<FamilyGraph> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const graph = JSON.parse(reader.result as string) as FamilyGraph;
        if (!graph.persons || !graph.edges || !graph.rootPersonId || !graph.persons[graph.rootPersonId]) {
          reject(new Error('유효하지 않은 가계도 데이터입니다.'));
          return;
        }
        resolve(graph);
      } catch {
        reject(new Error('JSON 파일을 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PREMIUM_KEY);
}

export function isPremium(): boolean {
  return localStorage.getItem(PREMIUM_KEY) === 'true';
}

export function setPremium(value: boolean): void {
  localStorage.setItem(PREMIUM_KEY, value ? 'true' : 'false');
}
