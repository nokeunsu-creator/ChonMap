import React, { useState, useEffect, useCallback } from 'react';

// TODO: AdMob 연동 시 실제 전면 광고로 교체
// 현재는 자체 전면 광고 플레이스홀더 (닫기 가능)

const SESSION_KEY = 'chonmap_last_active';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

const SAVE_COUNT_KEY = 'chonmap_save_count';
const AD_EVERY_N_SAVES = 5;

/** 저장 횟수 카운트 → 5회마다 true 반환 */
export function incrementSaveCount(): boolean {
  const count = parseInt(localStorage.getItem(SAVE_COUNT_KEY) || '0') + 1;
  localStorage.setItem(SAVE_COUNT_KEY, String(count));
  return count % AD_EVERY_N_SAVES === 0;
}

/** 어디서든 전면 광고 트리거 (커스텀 이벤트) */
export function fireInterstitialAd(reason: string) {
  window.dispatchEvent(new CustomEvent('chonmap-interstitial', { detail: reason }));
}

/** 전면 광고 표시 상태를 관리하는 훅 */
export function useInterstitialAd() {
  const [showAd, setShowAd] = useState(false);
  const [adReason, setAdReason] = useState('');

  // 세션 복귀 감지 (30분+ 비활성 후 돌아올 때)
  useEffect(() => {
    const checkSession = () => {
      const lastActive = localStorage.getItem(SESSION_KEY);
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive);
        if (elapsed > SESSION_TIMEOUT) {
          setAdReason('다시 오셨군요!');
          setShowAd(true);
        }
      }
      localStorage.setItem(SESSION_KEY, String(Date.now()));
    };

    // 앱 복귀 시
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      } else {
        localStorage.setItem(SESSION_KEY, String(Date.now()));
      }
    };

    // 초기 체크
    checkSession();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 커스텀 이벤트로 어디서든 트리거 가능
  useEffect(() => {
    const handler = (e: Event) => {
      const reason = (e as CustomEvent).detail || '';
      setAdReason(reason);
      setShowAd(true);
    };
    window.addEventListener('chonmap-interstitial', handler);
    return () => window.removeEventListener('chonmap-interstitial', handler);
  }, []);

  const triggerAd = useCallback((reason: string) => {
    setAdReason(reason);
    setShowAd(true);
  }, []);

  const closeAd = useCallback(() => {
    setShowAd(false);
    setAdReason('');
  }, []);

  return { showAd, adReason, triggerAd, closeAd };
}

interface InterstitialAdProps {
  reason: string;
  onClose: () => void;
}

/** 전면 광고 오버레이 */
export function InterstitialAd({ reason, onClose }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(3);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [countdown]);

  // ESC로 닫기 (카운트다운 끝난 후)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canClose, onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 닫기 버튼 */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        {canClose ? (
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            &times;
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.3)', borderRadius: '50%',
            width: 36, height: 36, fontSize: 14, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {countdown}
          </div>
        )}
      </div>

      {/* 광고 영역 (AdMob 연동 전 플레이스홀더) */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF8DC, #FAEBD7)',
        borderRadius: 20, padding: 40, textAlign: 'center',
        maxWidth: 340, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#127795;</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#3D2B1F', marginBottom: 8 }}>
          촌맵
        </div>
        <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 20 }}>
          {reason}
        </div>

        {/* 실제 AdMob 광고 슬롯 자리 */}
        <div style={{
          background: 'white', borderRadius: 12, padding: 20,
          border: '1px dashed #C4961A', minHeight: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#A09080' }}>
            &#128226; 전면 광고 영역<br/>
            <span style={{ fontSize: 10 }}>(AdMob 연동 후 활성화)</span>
          </div>
        </div>

        {canClose && (
          <button onClick={onClose} style={{
            marginTop: 16, background: 'linear-gradient(135deg, #8B6914, #C4961A)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            계속하기
          </button>
        )}
      </div>

      {/* 광고 표시 안내 */}
      <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
        광고
      </div>
    </div>
  );
}
