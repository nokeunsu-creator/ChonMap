import React from 'react';

export function ToyHammer({ size = 48, rotation = 0, swinging = false }: { size?: number; rotation?: number; swinging?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        transform: `rotate(${rotation}deg)${swinging ? ' scale(1.1)' : ''}`,
        transition: 'transform 0.12s ease-out',
        transformOrigin: '50% 80%',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
      }}
    >
      <rect x="46" y="48" width="8" height="48" rx="3" fill="#92400E" />
      <rect x="47" y="48" width="2" height="48" fill="rgba(255,255,255,0.35)" />
      <rect x="44" y="82" width="12" height="3" fill="#451A03" />
      <rect x="44" y="88" width="12" height="3" fill="#451A03" />
      <ellipse cx="50" cy="32" rx="40" ry="24" fill="#EF4444" />
      <rect x="8" y="29" width="84" height="7" fill="#FBBF24" />
      <rect x="8" y="29" width="84" height="2" fill="#FCD34D" />
      <ellipse cx="11" cy="32" rx="4" ry="8" fill="#3B82F6" />
      <ellipse cx="89" cy="32" rx="4" ry="8" fill="#3B82F6" />
      <ellipse cx="50" cy="21" rx="34" ry="5" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}
