import { useEffect, useRef } from 'react';

type BackHandler = () => void;

// 전역 뒤로가기 스택 — 가장 나중에 등록된 핸들러가 먼저 실행됨
const backStack: BackHandler[] = [];
let popstateBound = false;
// 조용히 되돌린(history.go) 횟수만큼 popstate를 무시한다.
// boolean 하나로는 cleanup 두 개가 연달아 back()을 부르면 두 번째 popstate가 핸들러를 잘못 소비함
let suppressPops = 0;
let pendingSilentBacks = 0;
// 페이지를 떠나는 중(reload 등)에는 history.go를 부르지 않는다 — 진행 중인 새로고침이 취소됨
// (예: 데이터 초기화 확인 → reload 직후 확인창 cleanup)
let leaving = false;

function onGlobalPopstate() {
  if (suppressPops > 0) { suppressPops--; return; }
  if (backStack.length > 0) {
    const h = backStack.pop()!;
    h();
  }
}

function bindPopstate() {
  if (popstateBound || typeof window === 'undefined') return;
  popstateBound = true;
  window.addEventListener('popstate', onGlobalPopstate);
  window.addEventListener('beforeunload', () => { leaving = true; });
  window.addEventListener('pageshow', () => { leaving = false; });
}

// 같은 커밋에서 여러 cleanup이 일어나도 history.go(-n) 한 번으로 묶는다 (popstate도 한 번)
function scheduleSilentBack() {
  pendingSilentBacks++;
  if (pendingSilentBacks > 1) return;
  queueMicrotask(() => {
    const n = pendingSilentBacks;
    pendingSilentBacks = 0;
    if (leaving) return;
    suppressPops++;
    try { window.history.go(-n); } catch { suppressPops--; }
  });
}

/**
 * 안드로이드 뒤로가기 / 브라우저 back 버튼을 SPA 내부 네비게이션으로 사용.
 *
 * - active=true일 때 history.pushState로 1단계 쌓음
 * - 뒤로가기 시 handler 호출 (state를 이전으로 되돌리는 용도)
 * - UI 버튼으로 state가 먼저 바뀌면 (active=false) 쌓아둔 history만 조용히 pop
 * - key: active가 계속 true인 채 하위 단계만 바뀌는 화면(예: 바둑 모드→크기→레벨)은
 *   단계 값을 key로 넘기면 단계가 바뀔 때마다 다시 등록되어 뒤로가기가 한 단계씩 동작한다
 *
 * 여러 컴포넌트/여러 레벨에서 동시에 써도 됨. 가장 깊은 레벨이 먼저 소비됨.
 */
export function useAndroidBack(active: boolean, handler: BackHandler, key?: string | number) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    bindPopstate();

    const wrapped: BackHandler = () => handlerRef.current();
    backStack.push(wrapped);
    try {
      window.history.pushState({ cm: Date.now() + Math.random() }, '');
    } catch {}

    return () => {
      const idx = backStack.lastIndexOf(wrapped);
      if (idx >= 0) {
        // 아직 popstate로 소비되지 않음 = UI에서 state를 먼저 바꿔 cleanup된 경우
        // → 쌓아둔 history entry를 조용히 pop (popstate 핸들러 한 번 무시)
        backStack.splice(idx, 1);
        scheduleSilentBack();
      }
      // idx < 0: 이미 popstate로 처리됨 (Android back으로 왔던 경우)
    };
  }, [active, key]);
}
