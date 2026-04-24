import { fireInterstitialAd } from './InterstitialAd';

// 놀이 탭 게임 완료 카운터
const GAME_COUNT_KEY = 'chonmap_game_play_count';
const AD_EVERY_N_GAMES = 5;

/**
 * 게임 재시작 시점에 호출.
 * - 플레이 횟수 카운트 증가
 * - 5회째 마다 전면 광고 트리거 (자동)
 * - 반환값: 광고 트리거됐는지 (로깅/통계용)
 */
export function maybeFireGameOverAd(gameName?: string): boolean {
  const count = parseInt(localStorage.getItem(GAME_COUNT_KEY) || '0') + 1;
  localStorage.setItem(GAME_COUNT_KEY, String(count));
  if (count % AD_EVERY_N_GAMES === 0) {
    fireInterstitialAd(gameName ? `${gameName} ${count}회 플레이 완료!` : '계속 플레이하세요!');
    return true;
  }
  return false;
}
