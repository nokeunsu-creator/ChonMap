import React, { useState } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { getBirthdayPersons, formatBirthdayMessage } from '../../utils/birthdayUtils';

export function BirthdayBanner() {
  const { state } = useFamily();
  const { graph, perspectivePersonId, relationships, darkMode: dark } = state;
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const persons = getBirthdayPersons(graph, perspectivePersonId, relationships);
  if (persons.length === 0) return null;

  const { today, tomorrow } = formatBirthdayMessage(persons);

  const lines: string[] = [];
  if (today.length > 0) lines.push(`🎂 오늘: ${today.join(', ')} 생일`);
  if (tomorrow.length > 0) lines.push(`🎁 내일: ${tomorrow.join(', ')} 생일`);

  const handleDismiss = () => setDismissed(true);

  return (
    <div style={{
      margin: '0 8px 4px',
      padding: '10px 14px',
      borderRadius: 14,
      background: dark
        ? 'linear-gradient(135deg, #78350F, #92400E)'
        : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
      border: `1px solid ${dark ? '#D97706' : '#F59E0B'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexShrink: 0,
    }}>
      <div>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontSize: 13,
            fontWeight: i === 0 ? 700 : 600,
            color: dark ? '#FEF3C7' : '#92400E',
            lineHeight: 1.5,
          }}>
            {line}
          </div>
        ))}
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none',
          fontSize: 18, color: dark ? '#D97706' : '#B45309',
          cursor: 'pointer', flexShrink: 0, lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}
