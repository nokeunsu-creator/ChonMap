import React, { useEffect, useRef } from 'react';

// TODO: Google AdSense 승인 후 아래 값을 교체하세요
// 1. index.html에 AdSense 스크립트 추가 (아래 주석 참고)
// 2. AD_CLIENT를 본인의 퍼블리셔 ID로 교체
// 3. AD_SLOT을 생성한 광고 단위 ID로 교체
const AD_CLIENT = 'ca-pub-5109908749535030';
const AD_SLOT = '';   // AdSense 승인 후 광고 단위 생성하여 슬롯 ID 입력

export function AdBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT || !AD_SLOT) return; // 미설정 시 플레이스홀더만 표시
    if (pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* AdSense 미로드 시 무시 */ }
  }, []);

  // AdSense 미설정 시 플레이스홀더 (실제 배너 크기: 320x50 ~ 320x100)
  if (!AD_CLIENT || !AD_SLOT) {
    return (
      <div style={{
        margin: '0 8px 6px', background: 'linear-gradient(135deg, #F5F0E0, #E8DCC8)',
        borderRadius: 14, padding: '14px', textAlign: 'center', flexShrink: 0,
        border: '1px dashed #C4961A', minHeight: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#8B7355' }}>
          &#128226; 광고 영역
        </div>
      </div>
    );
  }

  return (
    <div ref={adRef} style={{ margin: '0 8px 6px', flexShrink: 0, textAlign: 'center', minHeight: 50 }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
