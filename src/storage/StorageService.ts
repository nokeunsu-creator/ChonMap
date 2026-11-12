import { FamilyGraph } from '../models/types';
import { showToast } from '../utils/toast';

const STORAGE_KEY = 'chonmap_family_v1';
const DARK_MODE_KEY = 'chonmap_darkmode';
const PHOTOS_KEY = 'chonmap_photos_v1';
const NOTIFICATION_KEY = 'chonmap_notifications';
const MAX_CLIPBOARD_SIZE = 1024 * 1024; // 1MB
// 저장/불러오기 검증 상한. 추가 UI(PersonForm)도 같은 값으로 막아 검증 실패로 데이터가 사라지지 않게 함
export const MAX_PERSONS = 2000;
// 검증에 실패한 저장본을 기본 그래프로 덮어쓰기 전에 보관하는 키
const RECOVERY_KEY = 'chonmap_family_v1_recovery';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
// 데이터 초기화 후 reload 전까지 저장 차단 (beforeunload flush가 지운 데이터를 되살리지 않도록)
let saveDisabled = false;
let quotaWarned = false;

function writeGraph(graph: FamilyGraph): void {
  if (saveDisabled) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
    quotaWarned = false;
  } catch (e) {
    console.warn('가계도 저장 실패 (저장 공간 부족 가능):', e);
    if (!quotaWarned) {
      quotaWarned = true;
      showToast('저장 공간이 부족해 저장하지 못했습니다. 사진을 줄이거나 백업해 주세요', 'error', 5000);
    }
  }
}

// PARENT_OF 간선이 순환(자기 조상이 자기 자손)을 이루면 true — 레이아웃·촌수 계산이 무한히 돌거나 틀어지므로 거부
function hasParentCycle(children: Map<string, string[]>): boolean {
  const state = new Map<string, 1 | 2>(); // 1=방문 중, 2=완료
  for (const start of children.keys()) {
    if (state.has(start)) continue;
    const stack: { id: string; next: number }[] = [{ id: start, next: 0 }];
    state.set(start, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const kids = children.get(frame.id) || [];
      if (frame.next >= kids.length) { state.set(frame.id, 2); stack.pop(); continue; }
      const kid = kids[frame.next++];
      const s = state.get(kid);
      if (s === 1) return true;
      if (s === undefined) { state.set(kid, 1); stack.push({ id: kid, next: 0 }); }
    }
  }
  return false;
}

// 그래프 무결성 검증 — 저장본 로드와 JSON 가져오기 양쪽에서 사용.
// UI로는 만들 수 없는 구조(키≠id, 자기 자신 간선, 부모 순환, childOrder 형식 오류)는 조작된 데이터로 보고 거부한다
export function validateGraph(graph: FamilyGraph): boolean {
  if (!graph || typeof graph !== 'object') return false;
  if (!graph.persons || typeof graph.persons !== 'object' || Array.isArray(graph.persons)) return false;
  if (!Array.isArray(graph.edges)) return false;
  if (typeof graph.rootPersonId !== 'string') return false;
  if (!graph.persons[graph.rootPersonId]) return false;

  const personCount = Object.keys(graph.persons).length;
  if (personCount === 0 || personCount > MAX_PERSONS) return false;

  // 엣지의 from/to가 실제 존재하는 사람인지 확인
  const children = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!edge || typeof edge !== 'object') return false;
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') return false;
    if (edge.from === edge.to) return false;
    if (!graph.persons[edge.from] || !graph.persons[edge.to]) return false;
    if (edge.type !== 'PARENT_OF' && edge.type !== 'SPOUSE_OF') return false;
    if (edge.type === 'PARENT_OF') {
      if (!children.has(edge.from)) children.set(edge.from, []);
      children.get(edge.from)!.push(edge.to);
    }
  }
  if (hasParentCycle(children)) return false;

  // childOrder: parentId → 문자열 배열만 허용 (TreeLayout이 .filter를 호출하므로 다른 타입이면 앱이 죽는다)
  if (graph.childOrder !== undefined) {
    if (!graph.childOrder || typeof graph.childOrder !== 'object' || Array.isArray(graph.childOrder)) return false;
    for (const ids of Object.values(graph.childOrder)) {
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) return false;
    }
  }

  // 각 Person 필드 검증 (persons의 키와 person.id가 일치해야 간선·수정·삭제가 같은 사람을 가리킨다)
  for (const [key, person] of Object.entries(graph.persons)) {
    if (!person || typeof person !== 'object') return false;
    if (person.id !== key || typeof person.name !== 'string') return false;
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
  saveTimer = setTimeout(() => writeGraph(graph), 300);
}

export function saveGraphImmediate(graph: FamilyGraph): void {
  writeGraph(graph);
}

// 읽을 수 없는 저장본은 버리지 않고 복구용 키에 남긴다 (이미 보관본이 있으면 유지)
function preserveUnreadable(data: string): void {
  try {
    if (!localStorage.getItem(RECOVERY_KEY)) localStorage.setItem(RECOVERY_KEY, data);
  } catch { /* 공간 부족 시 무시 */ }
}

export function loadGraph(): FamilyGraph | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    const graph = JSON.parse(data) as FamilyGraph;
    if (!validateGraph(graph)) { preserveUnreadable(data); return null; }
    return graph;
  } catch {
    preserveUnreadable(data);
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
  saveDisabled = true;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RECOVERY_KEY);
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
