import { FamilyGraph } from '../models/types';

const STORAGE_KEY = 'chonmap_family_v1';
const DARK_MODE_KEY = 'chonmap_darkmode';
const PHOTOS_KEY = 'chonmap_photos_v1';
const NOTIFICATION_KEY = 'chonmap_notifications';
const MAX_CLIPBOARD_SIZE = 1024 * 1024; // 1MB
const MAX_PERSONS = 500;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

// 그래프 무결성 검증
export function validateGraph(graph: FamilyGraph): boolean {
  if (!graph || typeof graph !== 'object') return false;
  if (!graph.persons || typeof graph.persons !== 'object') return false;
  if (!Array.isArray(graph.edges)) return false;
  if (typeof graph.rootPersonId !== 'string') return false;
  if (!graph.persons[graph.rootPersonId]) return false;

  const personCount = Object.keys(graph.persons).length;
  if (personCount === 0 || personCount > MAX_PERSONS) return false;

  // 엣지의 from/to가 실제 존재하는 사람인지 확인
  for (const edge of graph.edges) {
    if (!edge.type || !edge.from || !edge.to) return false;
    if (!graph.persons[edge.from] || !graph.persons[edge.to]) return false;
    if (edge.type !== 'PARENT_OF' && edge.type !== 'SPOUSE_OF') return false;
  }

  // 각 Person 필드 검증
  for (const person of Object.values(graph.persons)) {
    if (typeof person.id !== 'string' || typeof person.name !== 'string') return false;
    if (person.gender !== 'M' && person.gender !== 'F') return false;
    if (person.name.length > 100) return false;

    // memo: 문자열·200자 제한 (V-03)
    if (person.memo !== undefined) {
      if (typeof person.memo !== 'string') return false;
      if (person.memo.length > 500) return false; // UI는 200, import은 넉넉히 500 허용
    }
    // birthYear/deathYear: 숫자·범위 검증 (V-03)
    if (person.birthYear !== undefined) {
      if (typeof person.birthYear !== 'number' || !Number.isFinite(person.birthYear)) return false;
      if (person.birthYear < 1 || person.birthYear > 9999) return false;
    }
    if (person.deathYear !== undefined) {
      if (typeof person.deathYear !== 'number' || !Number.isFinite(person.deathYear)) return false;
      if (person.deathYear < 1 || person.deathYear > 9999) return false;
    }
    // MM-DD 형식만 허용
    if (person.birthMonthDay !== undefined) {
      if (typeof person.birthMonthDay !== 'string') return false;
      if (person.birthMonthDay && !/^\d{2}-\d{2}$/.test(person.birthMonthDay)) return false;
    }
    if (person.deathMonthDay !== undefined) {
      if (typeof person.deathMonthDay !== 'string') return false;
      if (person.deathMonthDay && !/^\d{2}-\d{2}$/.test(person.deathMonthDay)) return false;
    }
  }

  return true;
}

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
    if (!validateGraph(graph)) return null;
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
    if (file.size > MAX_CLIPBOARD_SIZE) {
      reject(new Error('파일이 너무 큽니다. (최대 1MB)'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const graph = JSON.parse(reader.result as string) as FamilyGraph;
        if (!validateGraph(graph)) {
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

// 프로필 사진 (별도 저장) — data URL 화이트리스트 (image/jpeg|png|webp base64만 허용)
const SAFE_PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_BYTES = 600 * 1024; // 압축 후 500KB 한도 + 여유

export function isSafePhotoDataUrl(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (s.length === 0 || s.length > MAX_PHOTO_BYTES) return false;
  return SAFE_PHOTO_RE.test(s);
}

export function savePhotos(photos: Record<string, string>): void {
  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
  } catch (e) {
    console.warn('사진 저장 실패 (용량 초과 가능):', e);
  }
}

export function loadPhotos(): Record<string, string> {
  try {
    const data = localStorage.getItem(PHOTOS_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && isSafePhotoDataUrl(v)) out[k] = v;
    }
    return out;
  } catch (e) {
    console.warn('사진 불러오기 실패:', e);
    return {};
  }
}

// 저장 용량 확인 (KB)
export function getStorageUsageKB(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) total += (localStorage.getItem(key)?.length ?? 0);
  }
  return Math.round(total / 1024);
}

export function clearAllData(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DARK_MODE_KEY);
  localStorage.removeItem(PHOTOS_KEY);
}

export function isDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function setDarkMode(value: boolean): void {
  localStorage.setItem(DARK_MODE_KEY, value ? 'true' : 'false');
}


// 알림 설정
export interface NotificationSettings {
  enabled: boolean;
  lastCheckDate: string; // YYYY-MM-DD
}

export function getNotificationSettings(): NotificationSettings {
  try {
    const data = localStorage.getItem(NOTIFICATION_KEY);
    return data ? JSON.parse(data) : { enabled: false, lastCheckDate: '' };
  } catch {
    return { enabled: false, lastCheckDate: '' };
  }
}

export function setNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings));
}

export function onStorageChange(callback: (graph: FamilyGraph) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const graph = JSON.parse(e.newValue) as FamilyGraph;
        if (validateGraph(graph)) {
          callback(graph);
        }
      } catch { /* ignore malformed data */ }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
