// pocket-money에서 가져온 학습 게임들이 사용하는 외부 의존성 스텁.
// ChonMap에는 백엔드/업적/실명 설정이 없으므로 no-op / 기본값으로 대체.

// api/api.js 대체: submitQuizScore 등 백엔드 호출은 no-op
export async function submitQuizScore() { return null; }
export async function getEntries() { return []; }
export async function createEntry() { return null; }
export async function deleteEntry() { return null; }

// config/names.js 대체: ChonMap은 가계도 기반이므로 제네릭 이름 사용
export const CHILD1 = '플레이어1';
export const CHILD2 = '플레이어2';
export const MOM = '엄마';
export const DAD = '아빠';
export const ME = '나';
export const WIFE = '배우자';
export const HUB_USERS = [CHILD1, CHILD2];

// achievements 대체: no-op
export function unlock() { /* no-op */ }
export function isUnlocked() { return false; }
export function getUnlocked() { return []; }
export const ACHIEVEMENTS = [];
