import React, { useMemo, useState } from 'react';
import { useFamily } from '../../state/FamilyContext';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export function CalendarView() {
  const { state } = useFamily();
  const { graph, relationships, darkMode } = state;
  const dk = darkMode;

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = 전체보기

  const events = useMemo(() => {
    const result: { month: number; day: number; name: string; type: 'birthday' | 'memorial'; title: string }[] = [];
    for (const person of Object.values(graph.persons)) {
      const rel = relationships.get(person.id);
      const title = rel ? (rel.chon === 0 ? '나' : rel.title) : person.name;
      if (person.birthMonthDay && !person.deathYear) {
        const [m, d] = person.birthMonthDay.split('-').map(Number);
        if (m && d) result.push({ month: m, day: d, name: person.name, type: 'birthday', title });
      }
      if (person.deathMonthDay && person.deathYear) {
        const [m, d] = person.deathMonthDay.split('-').map(Number);
        if (m && d) result.push({ month: m, day: d, name: person.name, type: 'memorial', title });
      }
    }
    return result.sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day);
  }, [graph.persons, relationships]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<number, typeof events>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    for (const ev of events) map.get(ev.month)?.push(ev);
    return map;
  }, [events]);

  const displayMonths = selectedMonth !== null ? [selectedMonth] : Array.from({ length: 12 }, (_, i) => i + 1);
  const todayMD = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const cardBg = dk ? '#1F2937' : 'white';
  const cardBorder = dk ? '#374151' : '#E8DCC8';
  const textPrimary = dk ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dk ? '#9CA3AF' : '#A09080';

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: textSecondary, fontSize: 13 }}>
        생일이나 기일을 입력한 가족이 없습니다.<br/>
        <span style={{ fontSize: 11 }}>가족 정보 수정에서 MM-DD 형식으로 입력하세요.</span>
      </div>
    );
  }

  return (
    <div>
      {/* 월 선택 탭 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => setSelectedMonth(null)} style={{
          padding: '4px 10px', borderRadius: 12, border: `1px solid ${cardBorder}`, fontSize: 11,
          background: selectedMonth === null ? '#C4961A' : cardBg,
          color: selectedMonth === null ? 'white' : textSecondary, cursor: 'pointer',
        }}>전체</button>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const hasEvent = (eventsByMonth.get(m)?.length ?? 0) > 0;
          const isCurrent = m === today.getMonth() + 1;
          return (
            <button key={m} onClick={() => setSelectedMonth(m === selectedMonth ? null : m)} style={{
              padding: '4px 10px', borderRadius: 12, border: `1px solid ${isCurrent ? '#C4961A' : cardBorder}`,
              fontSize: 11, cursor: 'pointer', position: 'relative',
              background: selectedMonth === m ? '#C4961A' : isCurrent ? (dk ? '#374151' : '#FFF8DC') : cardBg,
              color: selectedMonth === m ? 'white' : textPrimary,
              opacity: hasEvent ? 1 : 0.4,
            }}>
              {MONTHS[m-1]}
              {hasEvent && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, width: 7, height: 7,
                  borderRadius: '50%', background: '#C4961A',
                  border: '1px solid white',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 월별 이벤트 */}
      {displayMonths.map(m => {
        const monthEvents = eventsByMonth.get(m) ?? [];
        if (monthEvents.length === 0 && selectedMonth === null) return null;
        return (
          <div key={m} style={{
            background: cardBg, border: `1px solid ${cardBorder}`,
            borderRadius: 14, padding: '12px 14px', marginBottom: 8,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: dk ? '#FBBF24' : '#8B6914', marginBottom: 8 }}>
              {m === today.getMonth() + 1 ? `📅 ${MONTHS[m-1]} (이번 달)` : MONTHS[m-1]}
            </div>
            {monthEvents.length === 0 ? (
              <div style={{ fontSize: 12, color: textSecondary }}>이번 달 기념일 없음</div>
            ) : (
              monthEvents.map((ev, i) => {
                const mdStr = `${String(ev.month).padStart(2,'0')}-${String(ev.day).padStart(2,'0')}`;
                const isToday = mdStr === todayMD;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                    borderBottom: i < monthEvents.length - 1 ? `1px solid ${cardBorder}` : 'none',
                    background: isToday ? (dk ? 'rgba(251,191,36,0.1)' : 'rgba(212,160,23,0.08)') : 'transparent',
                    borderRadius: 8, paddingLeft: isToday ? 6 : 0,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: ev.type === 'birthday'
                        ? (dk ? 'rgba(251,191,36,0.15)' : '#FFF8DC')
                        : (dk ? 'rgba(156,163,175,0.15)' : '#F3F4F6'),
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: dk ? '#FBBF24' : '#8B6914' }}>
                        {String(ev.day).padStart(2,'0')}
                      </div>
                      <div style={{ fontSize: 8, color: textSecondary }}>
                        {String(ev.month).padStart(2,'0')}월
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                        {ev.type === 'birthday' ? '🎂' : '🙏'} {ev.name}
                      </div>
                      <div style={{ fontSize: 11, color: textSecondary }}>
                        {ev.title} · {ev.type === 'birthday' ? '생일' : '기일'}
                        {isToday && <span style={{ color: '#C4961A', fontWeight: 700, marginLeft: 6 }}>오늘!</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
