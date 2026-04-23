import React from 'react';

interface Props {
  dark: boolean;
  onRate: () => void;
  onLater: () => void;
  onNever: () => void;
}

export function RatingDialog({ dark, onRate, onLater, onNever }: Props) {
  const bg = dark ? '#1F2937' : 'white';
  const border = dark ? '#374151' : '#E8DCC8';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const gold = dark ? '#FBBF24' : '#8B6914';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: bg, borderRadius: 20, padding: 24, maxWidth: 320, width: '100%',
        border: `1px solid ${border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary, marginBottom: 8 }}>
          촌맵이 마음에 드셨나요?
        </div>
        <div style={{ fontSize: 13, color: textSecondary, marginBottom: 24, lineHeight: 1.6 }}>
          별점 5점을 주시면 개발자에게<br/>큰 힘이 됩니다 🙏
        </div>
        <button onClick={onRate} style={{
          width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg, ${dark ? '#92400E' : '#8B6914'}, ${dark ? '#D97706' : '#C4961A'})`,
          color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8,
        }}>
          ⭐ 지금 평가하기
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onLater} style={{
            flex: 1, padding: '10px 0', borderRadius: 12,
            border: `1px solid ${border}`, background: 'none',
            color: textSecondary, fontSize: 13, cursor: 'pointer',
          }}>
            나중에
          </button>
          <button onClick={onNever} style={{
            flex: 1, padding: '10px 0', borderRadius: 12,
            border: `1px solid ${border}`, background: 'none',
            color: textSecondary, fontSize: 13, cursor: 'pointer',
          }}>
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}

const RATING_KEY = 'chonmap_rating';

export function getRatingState(): { never: boolean; nextShowDate: string } {
  try {
    return JSON.parse(localStorage.getItem(RATING_KEY) || '{}');
  } catch { return { never: false, nextShowDate: '' }; }
}

export function setRatingNever() {
  localStorage.setItem(RATING_KEY, JSON.stringify({ never: true, nextShowDate: '' }));
}

export function setRatingLater() {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  localStorage.setItem(RATING_KEY, JSON.stringify({ never: false, nextShowDate: next.toISOString().slice(0, 10) }));
}

export function incrementAppOpen(): number {
  const count = parseInt(localStorage.getItem('chonmap_open_count') || '0', 10) + 1;
  localStorage.setItem('chonmap_open_count', String(count));
  return count;
}
