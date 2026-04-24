import { useEffect, useRef } from 'react';

type BackHandler = () => void;

// 전역 뒤로가기 스택 — 가장 나중에 등록된 핸들러가 먼저 실행됨
const backStack: BackHandler[] = [];
let popstateBound = false;
let suppressNextPop = false;

function onGlobalPopstate() {
  if (suppressNextPop) { suppressNextPop = false; return; }
  if (backStack.length > 0) {
    const h = backStack.pop()!;
    h();
  }
}

function bindPopstate() {
  if (popstateBound || typeof window === 'undefined') return;
  popstateBound = true;
  window.addEventListener('popstate', onGlobalPopstate);
}

/**
 * 안드로이드 뒤로가기 / 브라우저 back 버튼을 SPA 내부 네비게이션으로 사용.
 *
 * - active=true일 때 history.pushState로 1단계 쌓음
 * - 뒤로가기 시 handler 호출 (state를 이전으로 되돌리는 용도)
 * - UI 버튼으로 state가 먼저 바뀌면 (active=false) 쌓아둔 history만 조용히 pop
 *
 * 여러 컴포넌트/여러 레벨에서 동시에 써도 됨. 가장 깊은 레벨이 먼저 소비됨.
 */
export function useAndroidBack(active: boolean, handler: BackHandler) {
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
        suppressNextPop = true;
        try { window.history.back(); } catch { suppressNextPop = false; }
      }
      // idx < 0: 이미 popstate로 처리됨 (Android back으로 왔던 경우)
    };
  }, [active]);
}
