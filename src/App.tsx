import React, { useEffect, useMemo, useState } from 'react';
import { useFamily } from './state/FamilyContext';
import { FamilyTreeSVG } from './components/tree/FamilyTreeSVG';
import { PersonForm } from './components/forms/PersonForm';
import { EditForm } from './components/forms/EditForm';
import { SettingsPage } from './components/settings/SettingsPage';
import { RelationshipSearch } from './components/search/RelationshipSearch';
import { PlayHub } from './components/play/PlayHub';
import { TEMPLATES } from './storage/templates';
import { AdBanner } from './components/ads/AdBanner';
import { InterstitialAd, useInterstitialAd } from './components/ads/InterstitialAd';
import { OnboardingTutorial, useOnboarding } from './components/onboarding/OnboardingTutorial';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { RatingDialog, getRatingState, setRatingNever, setRatingLater, incrementAppOpen } from './components/ui/RatingDialog';
import { BirthdayBanner } from './components/notifications/BirthdayBanner';
import { getBirthdayPersons, formatBirthdayMessage } from './utils/birthdayUtils';
import { getNotificationSettings, setNotificationSettings } from './storage/StorageService';

export default function App() {
  const { state, dispatch } = useFamily();
  const { activeTab, showAddForm, editingPersonId, selectedPersonId, perspectivePersonId, graph, relationships, undoStack, redoStack, darkMode } = state;
  const { showOnboarding, finishOnboarding } = useOnboarding();
  const { showAd, adReason, closeAd } = useInterstitialAd();
  const perspectivePerson = graph.persons[perspectivePersonId];
  const personCount = Object.keys(graph.persons).length;

  const [treeSearch, setTreeSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [templateConfirm, setTemplateConfirm] = useState<{ name: string; graph: typeof TEMPLATES[0]['graph'] } | null>(null);
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('chonmap_show_grid') !== 'false');
  const [showRating, setShowRating] = useState(false);

  const toggleGrid = (val: boolean) => {
    setShowGrid(val);
    localStorage.setItem('chonmap_show_grid', val ? 'true' : 'false');
  };

  // 앱 평점 다이얼로그: 5회 이상 실행 + 5명 이상 가족 + 미평가 시 표시
  useEffect(() => {
    const count = incrementAppOpen();
    if (count < 5) return;
    if (personCount < 5) return;
    const ratingState = getRatingState();
    if (ratingState.never) return;
    const today = new Date().toISOString().slice(0, 10);
    if (ratingState.nextShowDate && ratingState.nextShowDate > today) return;
    const timer = setTimeout(() => setShowRating(true), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2: 앱 실행 시 생일 알림 (Web Notifications)
  useEffect(() => {
    const settings = getNotificationSettings();
    if (!settings.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = new Date().toISOString().slice(0, 10);
    if (settings.lastCheckDate === today) return; // 오늘 이미 체크함

    const persons = getBirthdayPersons(graph, perspectivePersonId, relationships);
    if (persons.length === 0) {
      setNotificationSettings({ ...settings, lastCheckDate: today });
      return;
    }

    const { today: todayList, tomorrow: tomorrowList } = formatBirthdayMessage(persons);

    // SW를 통해 시스템 알림 표시
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BIRTHDAY_NOTIFY',
        todayList,
        tomorrowList,
      });
    }

    setNotificationSettings({ ...settings, lastCheckDate: today });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dk = darkMode;
  const bgGrad = dk ? '#111827' : 'linear-gradient(180deg, #FDF6E3 0%, #FAEBD7 100%)';
  const headerBg = dk ? 'linear-gradient(135deg, #92400E 0%, #B45309 50%, #D97706 100%)' : 'linear-gradient(135deg, #8B6914 0%, #C4961A 50%, #E8C547 100%)';
  const guideBg = dk ? 'rgba(55,65,81,0.8)' : 'rgba(255,248,220,0.8)';
  const guideColor = dk ? '#D1D5DB' : '#8B7355';
  const goldColor = dk ? '#FBBF24' : '#8B6914';
  const mutedColor = dk ? '#9CA3AF' : '#A09080';
  const cardBg = dk ? '#1F2937' : 'white';
  const cardBorder = dk ? '#374151' : '#F0E6D6';
  const navBg = dk ? '#1F2937' : 'white';
  const navBorder = dk ? '#374151' : '#E8DCC8';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingPersonId) dispatch({ type: 'SET_EDITING', personId: null });
        else if (showAddForm) dispatch({ type: 'SHOW_ADD_FORM', show: false });
        else if (showSearch) setShowSearch(false);
        else if (selectedPersonId) dispatch({ type: 'SELECT_PERSON', personId: null });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeTab === 'tree') {
        e.preventDefault(); setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingPersonId, showAddForm, selectedPersonId, showSearch, activeTab, dispatch]);

  useEffect(() => {
    if (selectedPersonId && !graph.persons[selectedPersonId]) {
      dispatch({ type: 'SELECT_PERSON', personId: null });
    }
  }, [selectedPersonId, graph.persons, dispatch]);

  // 촌수 통계
  const chonStats = useMemo(() => {
    const stats: Record<number, number> = {};
    let maxChon = 0;
    for (const [pid, rel] of relationships) {
      if (pid === perspectivePersonId) continue;
      const c = rel.chon === -1 ? 0 : rel.chon;
      stats[c] = (stats[c] || 0) + 1;
      if (c > maxChon) maxChon = c;
    }
    return { stats, maxChon };
  }, [relationships, perspectivePersonId]);

  const sortedPersons = useMemo(() =>
    Object.values(graph.persons)
      .filter(p => p.id !== perspectivePersonId)
      .map(p => {
        const rel = relationships.get(p.id);
        return { person: p, rel, sortChon: rel ? (rel.chon === -1 ? 0 : rel.chon) : 999 };
      })
      .sort((a, b) => a.sortChon - b.sortChon || a.person.name.localeCompare(b.person.name)),
    [graph.persons, perspectivePersonId, relationships]
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bgGrad }}>
      {/* 헤더 */}
      <header style={{
        background: headerBg, padding: '14px 16px 12px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 12px rgba(139,105,20,0.3)', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            &#127795; 촌맵 <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.75 }}>(촌수 + Map)</span>
          </h1>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>우리 가족 가계도</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeTab === 'tree' && perspectivePerson && (
            <div onClick={() => dispatch({ type: 'SET_PERSPECTIVE', personId: graph.rootPersonId })}
              style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '5px 10px', textAlign: 'center', lineHeight: 1.3, cursor: 'pointer' }}>
              <div style={{ fontSize: 10, opacity: 0.8 }}>기준</div>
              <div style={{ fontSize: 13, fontWeight: 700, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {perspectivePerson.name}
              </div>
            </div>
          )}
          {activeTab === 'tree' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowSearch(prev => !prev)} style={headerBtnStyle} title="검색 (Ctrl+F)" aria-label="검색">&#128269;</button>
              {undoStack.length > 0 && <button onClick={() => dispatch({ type: 'UNDO' })} style={headerBtnStyle} title="실행취소" aria-label="실행취소">&#8617;</button>}
              {redoStack.length > 0 && <button onClick={() => dispatch({ type: 'REDO' })} style={headerBtnStyle} title="다시실행" aria-label="다시실행">&#8618;</button>}
            </div>
          )}
        </div>
      </header>

      {/* 트리 검색바 */}
      {activeTab === 'tree' && showSearch && (
        <div style={{ padding: '6px 16px', background: dk ? '#374151' : '#FFF8DC', borderBottom: `1px solid ${navBorder}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <input type="text" value={treeSearch} onChange={e => setTreeSearch(e.target.value)}
            placeholder="이름으로 검색..." autoFocus
            style={{ flex: 1, border: `1px solid ${dk ? '#4B5563' : '#E8DCC8'}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', background: dk ? '#1F2937' : 'white', color: dk ? '#F3F4F6' : '#3D2B1F' }} />
          <button onClick={() => { setShowSearch(false); setTreeSearch(''); }}
            style={{ background: 'none', border: 'none', fontSize: 16, color: mutedColor, cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* 안내 바 */}
      {activeTab === 'tree' && !showSearch && (
        <div style={{ textAlign: 'center', padding: '7px 16px', fontSize: 12, color: guideColor, background: guideBg, flexShrink: 0 }}>
          {selectedPersonId ? (
            <span>
              <strong style={{ color: goldColor }}>{graph.persons[selectedPersonId]?.name}</strong>
              {relationships.get(selectedPersonId) && (
                <span> ({relationships.get(selectedPersonId)!.title}
                  {relationships.get(selectedPersonId)!.chon >= 0 && ` / ${relationships.get(selectedPersonId)!.chon}촌`}
                )</span>
              )}
              {graph.persons[selectedPersonId]?.memo && (
                <span style={{ color: mutedColor, marginLeft: 4 }}>- {graph.persons[selectedPersonId]?.memo}</span>
              )}
              <button onClick={() => dispatch({ type: 'SET_EDITING', personId: selectedPersonId })}
                style={{ background: goldColor, color: 'white', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}>수정</button>
              <button onClick={() => dispatch({ type: 'SELECT_PERSON', personId: null })}
                style={{ background: dk ? '#4B5563' : '#ccc', color: dk ? '#D1D5DB' : '#555', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}>닫기</button>
            </span>
          ) : (
            <span>&#9757; 탭=기준변경 &middot; 길게누르기=선택/수정</span>
          )}
        </div>
      )}

      {/* 메인 */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'tree' ? (
          <>
            {personCount === 1 && (
              <div style={{ margin: 8, padding: 20, background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>&#127795;</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: dk ? '#F3F4F6' : '#3D2B1F', marginBottom: 8 }}>가계도를 시작하세요!</div>
                <p style={{ fontSize: 13, color: dk ? '#9CA3AF' : '#8B7355', marginBottom: 14 }}>
                  우측 하단 <strong>+</strong> 버튼으로 가족을 추가하거나,<br/>아래 템플릿으로 빠르게 시작하세요
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => setTemplateConfirm({ name: t.name, graph: t.graph })}
                      style={{ background: dk ? 'linear-gradient(135deg, #374151, #1F2937)' : 'linear-gradient(135deg, #FFF8DC, #FAEBD7)', border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: goldColor }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: mutedColor }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 생일 배너 (Phase 1) */}
            <BirthdayBanner />

            {/* 촌수 통계 바 */}
            {personCount > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px',
                margin: '0 8px', background: dk ? '#1F2937' : 'white', borderRadius: 12,
                border: `1px solid ${cardBorder}`, flexShrink: 0, overflowX: 'auto',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: goldColor, whiteSpace: 'nowrap' }}>
                  {personCount}명
                </span>
                <span style={{ width: 1, height: 14, background: cardBorder, flexShrink: 0 }} />
                {Object.entries(chonStats.stats).sort(([a],[b]) => Number(a) - Number(b)).map(([chon, count]) => (
                  <span key={chon} style={{
                    fontSize: 10, color: dk ? '#9CA3AF' : '#8B7355', whiteSpace: 'nowrap',
                    background: dk ? '#374151' : '#FFF8DC', borderRadius: 8, padding: '2px 6px',
                  }}>
                    {Number(chon) === 0 ? '배우자' : `${chon}촌`} <strong style={{ color: goldColor }}>{count}</strong>
                  </span>
                ))}
              </div>
            )}

            <FamilyTreeSVG searchQuery={showSearch ? treeSearch : undefined} />

            {/* 관계 요약 그리드 */}
            {personCount > 1 && showGrid && (
              <div style={{ padding: '0 8px 4px', flexShrink: 0 }}>
                <div style={{ background: cardBg, borderRadius: 16, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${cardBorder}`, maxHeight: 130, overflowY: 'auto', position: 'relative' }}>
                  <button onClick={() => toggleGrid(false)} style={{
                    position: 'absolute', top: 6, right: 8,
                    background: 'none', border: 'none', fontSize: 16,
                    color: mutedColor, cursor: 'pointer', lineHeight: 1, padding: '2px 4px',
                  }}>&times;</button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {sortedPersons.map(({ person: p, rel }) => {
                      const isMale = p.gender === 'M';
                      const isDeceased = !!p.deathYear;
                      const titleText = rel ? `${rel.title}${rel.chon >= 1 ? ` (${rel.chon}촌)` : ''}` : '?';
                      return (
                        <div key={p.id} onClick={() => dispatch({ type: 'SET_PERSPECTIVE', personId: p.id })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 10, cursor: 'pointer',
                            background: dk ? (isMale ? '#1E3A5F' : '#3D1F2E') : (isMale ? '#F8FBFF' : '#FFFBFC'),
                            border: `1px solid ${dk ? (isMale ? '#2563EB44' : '#DB277744') : (isMale ? '#DBEAFE' : '#FCE4EC')}`,
                            opacity: isDeceased ? 0.65 : 1,
                          }}>
                          <span style={{ fontSize: 15 }}>{isDeceased ? '\u{271D}' : (isMale ? '\u{1F468}' : '\u{1F469}')}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: dk ? (isMale ? '#93C5FD' : '#F9A8D4') : (isMale ? '#1E56A0' : '#A0344A') }}>{titleText}</div>
                            <div style={{ fontSize: 10, color: dk ? '#6B7280' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 가족 목록 다시 열기 버튼 */}
            {personCount > 1 && !showGrid && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', flexShrink: 0 }}>
                <button onClick={() => toggleGrid(true)} style={{
                  background: dk ? '#374151' : '#FFF8DC',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 20, padding: '4px 14px',
                  fontSize: 11, color: goldColor, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  👥 가족 목록 보기
                </button>
              </div>
            )}

            {/* 범례 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11, color: mutedColor, padding: '4px 0', flexShrink: 0 }}>
              <span><span style={{ display: 'inline-block', width: 18, height: 2, background: '#B8A88A', verticalAlign: 'middle', marginRight: 4 }} />혈연</span>
              <span><span style={{ display: 'inline-block', width: 18, height: 0, borderTop: '2px dashed #E8A0B0', verticalAlign: 'middle', marginRight: 4 }} />배우자</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px dashed #D4A017', verticalAlign: 'middle', marginRight: 4 }} />기준</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px dashed #9CA3AF', verticalAlign: 'middle', marginRight: 4 }} />고인</span>
            </div>

            {/* 하단 광고 배너 */}
            <AdBanner />
          </>
        ) : activeTab === 'search' ? (
          <div style={{ flex: 1, overflow: 'auto', background: dk ? '#111827' : undefined }}><RelationshipSearch /></div>
        ) : activeTab === 'play' ? (
          <div style={{ flex: 1, overflow: 'auto', background: dk ? '#111827' : undefined }}><PlayHub /></div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', background: dk ? '#111827' : undefined }}><SettingsPage /></div>
        )}
      </main>

      {/* 하단 탭바 */}
      <nav style={{ background: navBg, borderTop: `1px solid ${navBorder}`, display: 'flex', flexShrink: 0 }}>
        {([
          { tab: 'tree' as const, icon: '\u{1F333}', label: '가계도' },
          { tab: 'search' as const, icon: '\u{1F50D}', label: '관계검색' },
          { tab: 'play' as const, icon: '\u{1F3AE}', label: '놀이' },
          { tab: 'settings' as const, icon: '\u2699', label: '설정' },
        ]).map(t => (
          <button key={t.tab} onClick={() => dispatch({ type: 'SET_TAB', tab: t.tab })}
            style={{
              flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12,
              fontWeight: activeTab === t.tab ? 700 : 400,
              color: activeTab === t.tab ? goldColor : mutedColor,
              background: 'none', border: 'none',
              borderTop: activeTab === t.tab ? `2px solid ${goldColor}` : '2px solid transparent',
              cursor: 'pointer',
            }}>
            <div style={{ fontSize: 18 }}>{t.icon}</div>{t.label}
          </button>
        ))}
      </nav>

      {/* FAB 스택: 수정 + 추가 */}
      {activeTab === 'tree' && personCount > 1 && !showAddForm && !editingPersonId && (
        <>
          {/* 수정 FAB */}
          <button
            onClick={() => dispatch({ type: 'SET_EDITING', personId: selectedPersonId || perspectivePersonId })}
            aria-label="수정"
            className="animate-fab-in"
            style={{
              position: 'fixed', bottom: 'calc(134px + env(safe-area-inset-bottom, 0px))', right: 20, zIndex: 40,
              width: 48, height: 48, borderRadius: '50%',
              background: dk ? '#374151' : 'white',
              color: dk ? '#FBBF24' : '#8B6914',
              border: `2px solid ${dk ? '#FBBF24' : '#C4961A'}`,
              fontSize: 18, lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            &#9998;
          </button>
          {/* 추가 FAB */}
          <button
            onClick={() => dispatch({ type: 'SHOW_ADD_FORM', show: true })}
            aria-label="가족 추가"
            className="animate-fab-in"
            style={{
              position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))', right: 16, zIndex: 40,
              width: 56, height: 56, borderRadius: '50%',
              background: dk
                ? 'linear-gradient(135deg, #92400E, #D97706)'
                : 'linear-gradient(135deg, #8B6914, #C4961A)',
              color: 'white', border: 'none',
              fontSize: 28, fontWeight: 300, lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(139,105,20,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
        </>
      )}

      {showAddForm && <PersonForm />}
      {editingPersonId && <EditForm />}
      {showOnboarding && <OnboardingTutorial onFinish={finishOnboarding} />}
      {templateConfirm && (
        <ConfirmDialog
          message={`"${templateConfirm.name}" 템플릿을 불러옵니다.`}
          confirmLabel="불러오기"
          dark={dk}
          onConfirm={() => { dispatch({ type: 'IMPORT_GRAPH', graph: templateConfirm.graph }); setTemplateConfirm(null); }}
          onCancel={() => setTemplateConfirm(null)}
        />
      )}
      {showRating && (
        <RatingDialog
          dark={dk}
          onRate={() => {
            setShowRating(false);
            setRatingNever();
            window.open('https://play.google.com/store/apps/details?id=app.vercel.chonmap.twa', '_blank');
          }}
          onLater={() => { setShowRating(false); setRatingLater(); }}
          onNever={() => { setShowRating(false); setRatingNever(); }}
        />
      )}
      {showAd && <InterstitialAd reason={adReason} onClose={closeAd} />}
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.9)', color: '#8B6914',
  width: 30, height: 30, borderRadius: '50%', border: 'none',
  fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
