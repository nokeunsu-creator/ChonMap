import React from 'react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
  dark?: boolean;
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = '확인', danger = false, dark = false }: Props) {
  const cardBg = dark ? '#1F2937' : 'white';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#6B7280';
  const cancelBg = dark ? '#374151' : '#F3F4F6';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: cardBg, borderRadius: 20, padding: '24px 20px',
          width: '100%', maxWidth: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 14, color: textPrimary, lineHeight: 1.6, marginBottom: 20, textAlign: 'center', whiteSpace: 'pre-line' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: 12, border: 'none',
              background: cancelBg, color: textSecondary,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            style={{
              flex: 1, padding: '11px', borderRadius: 12, border: 'none',
              background: danger ? '#EF4444' : '#8B6914',
              color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
