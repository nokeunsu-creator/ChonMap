import React, { useState, useMemo } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { calculateRelationship, calculateAllRelationships, findAlternativePaths } from '../../engine/chonCalculator';

type SearchMode = 'pair' | 'filter';

export function RelationshipSearch() {
  const { state } = useFamily();
  const { graph } = state;
  const persons = Object.values(graph.persons);

  const [mode, setMode] = useState<SearchMode>('pair');
  const [showAltPaths, setShowAltPaths] = useState(false);

  // === 쌍 검색 모드 ===
  const [personA, setPersonA] = useState(graph.rootPersonId);
  const [personB, setPersonB] = useState('');

  const result = useMemo(() => {
    if (!personA || !personB || personA === personB) return null;
    return calculateRelationship(graph, personA, personB);
  }, [graph, personA, personB]);

  const reverseResult = useMemo(() => {
    if (!personA || !personB || personA === personB) return null;
    return calculateRelationship(graph, personB, personA);
  }, [graph, personA, personB]);

  // 다중 경로
  const altPaths = useMemo(() => {
    if (!personA || !personB || personA === personB) return [];
    return findAlternativePaths(graph, personA, personB, 5);
  }, [graph, personA, personB]);

  // === 필터 검색 모드 ===
  const [filterPerson, setFilterPerson] = useState(graph.rootPersonId);
  const [filterChon, setFilterChon] = useState<number | ''>('');
  const [filterTitle, setFilterTitle] = useState('');

  const allRels = useMemo(() => {
    return calculateAllRelationships(graph, filterPerson);
  }, [graph, filterPerson]);

  const filteredResults = useMemo(() => {
    const entries: { personId: string; name: string; title: string; chon: number; isInLaw: boolean }[] = [];
    for (const [pid, rel] of allRels) {
      if (pid === filterPerson) continue;
      const p = graph.persons[pid];
      if (!p) continue;
      entries.push({ personId: pid, name: p.name, title: rel.title, chon: rel.chon, isInLaw: rel.isInLaw });
    }

    return entries.filter(e => {
      if (filterChon !== '' && e.chon !== filterChon) return false;
      if (filterTitle && !e.title.includes(filterTitle)) return false;
      return true;
    }).sort((a, b) => {
      const chonA = a.chon === -1 ? 0 : a.chon;
      const chonB = b.chon === -1 ? 0 : b.chon;
      return chonA - chonB || a.name.localeCompare(b.name);
    });
  }, [allRels, filterPerson, filterChon, filterTitle, graph.persons]);

  return (
    <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#3D2B1F', marginBottom: 6 }}>
        &#128269; 관계 검색
      </h1>
      <p style={{ fontSize: 12, color: '#8B7355', marginBottom: 12 }}>
        두 사람의 관계를 검색하거나, 촌수별로 필터링하세요
      </p>

      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setMode('pair')} style={{
          flex: 1, padding: '8px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: mode === 'pair' ? '#8B6914' : '#F5F0E0',
          color: mode === 'pair' ? 'white' : '#8B7355',
        }}>
          두 사람 관계
        </button>
        <button onClick={() => setMode('filter')} style={{
          flex: 1, padding: '8px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: mode === 'filter' ? '#8B6914' : '#F5F0E0',
          color: mode === 'filter' ? 'white' : '#8B7355',
        }}>
          촌수별 검색
        </button>
      </div>

      {mode === 'pair' ? (
        <>
          {/* 인물 A */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>
              기준 인물
            </label>
            <select value={personA} onChange={e => setPersonA(e.target.value)} style={selectStyle}>
              {persons.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 인물 B */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>
              대상 인물
            </label>
            <select value={personB} onChange={e => setPersonB(e.target.value)} style={selectStyle}>
              <option value="">-- 선택하세요 --</option>
              {persons.filter(p => p.id !== personA).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 결과 */}
          {result && personB && (
            <div style={{
              background: 'linear-gradient(135deg, #FFF8DC, #FAEBD7)',
              borderRadius: 16, padding: 20, border: '1px solid #E8DCC8',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#8B7355' }}>
                  <strong>{graph.persons[personA]?.name}</strong> 에게
                </div>
                <div style={{ fontSize: 14, color: '#8B7355' }}>
                  <strong>{graph.persons[personB]?.name}</strong> 은(는)
                </div>
              </div>

              <div style={{
                textAlign: 'center', background: 'white', borderRadius: 12,
                padding: '16px', marginBottom: 12,
              }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#8B6914' }}>
                  {result.title}
                </div>
                {result.chon >= 0 && (
                  <div style={{ fontSize: 16, color: '#C4961A', marginTop: 4 }}>
                    {result.chon}촌 {result.isInLaw ? '(인척)' : ''}
                  </div>
                )}
                {result.chon === -1 && (
                  <div style={{ fontSize: 16, color: '#C4961A', marginTop: 4 }}>배우자 (무촌)</div>
                )}
              </div>

              {/* 역방향 */}
              {reverseResult && (
                <div style={{
                  textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 10,
                  padding: '10px',
                }}>
                  <div style={{ fontSize: 11, color: '#A09080', marginBottom: 2 }}>반대로</div>
                  <div style={{ fontSize: 13, color: '#8B7355' }}>
                    <strong>{graph.persons[personB]?.name}</strong>에게{' '}
                    <strong>{graph.persons[personA]?.name}</strong>은(는){' '}
                    <span style={{ color: '#8B6914', fontWeight: 700 }}>{reverseResult.title}</span>
                  </div>
                </div>
              )}

              {/* 경로 표시 */}
              {result.path.length > 2 && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#A09080', marginBottom: 4 }}>경로</div>
                  <div style={{ fontSize: 12, color: '#8B7355' }}>
                    {result.path.map((id, i) => (
                      <span key={id}>
                        {i > 0 && ' \u2192 '}
                        <strong>{graph.persons[id]?.name || '?'}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 다중 경로 */}
              {altPaths.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => setShowAltPaths(prev => !prev)} style={{
                    width: '100%', background: 'rgba(139,105,20,0.08)', border: '1px solid rgba(139,105,20,0.2)',
                    borderRadius: 10, padding: '8px', fontSize: 12, color: '#8B6914',
                    cursor: 'pointer', fontWeight: 600,
                  }}>
                    {showAltPaths ? '\u25B2 다른 경로 닫기' : `\u25BC 다른 경로 보기 (${altPaths.length}개)`}
                  </button>
                  {showAltPaths && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {altPaths.map((alt, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(255,255,255,0.7)', borderRadius: 10,
                          padding: '10px', border: '1px solid #E8DCC8',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', marginBottom: 4 }}>
                            경로 {idx + 1}: {alt.title}
                            {alt.isInLaw ? ' (인척)' : ''}
                            <span style={{ fontWeight: 400, color: '#A09080' }}> {alt.chon >= 0 ? `${alt.chon}촌` : '무촌'}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#8B7355' }}>
                            {alt.path.map((id, i) => (
                              <span key={`${idx}-${id}-${i}`}>
                                {i > 0 && ' \u2192 '}
                                <strong>{graph.persons[id]?.name || '?'}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {personB && !result && (
            <div style={{ textAlign: 'center', padding: 20, color: '#A09080', fontSize: 14 }}>
              관계를 찾을 수 없습니다
            </div>
          )}

          {!personB && (
            <div style={{ textAlign: 'center', padding: 20, color: '#A09080', fontSize: 13 }}>
              대상 인물을 선택하세요
            </div>
          )}
        </>
      ) : (
        /* 필터 검색 모드 */
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>
              기준 인물
            </label>
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={selectStyle}>
              {persons.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>촌수</label>
              <select value={filterChon} onChange={e => setFilterChon(e.target.value ? Number(e.target.value) : '')} style={selectStyle}>
                <option value="">전체</option>
                <option value={-1}>무촌 (배우자)</option>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n}촌</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>호칭 검색</label>
              <input value={filterTitle} onChange={e => setFilterTitle(e.target.value)}
                placeholder="예: 사촌" style={{
                  ...selectStyle, padding: '9px 12px',
                }} />
            </div>
          </div>

          {/* 필터 결과 */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filteredResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredResults.map(item => (
                  <div key={item.personId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'white', borderRadius: 12, padding: '10px 14px',
                    border: '1px solid #E8DCC8',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#3D2B1F' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#A09080' }}>
                        {item.title} {item.isInLaw ? '(인척)' : ''}
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #FFF8DC, #FAEBD7)',
                      borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700, color: '#8B6914',
                    }}>
                      {item.chon === -1 ? '무촌' : `${item.chon}촌`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#A09080', fontSize: 13 }}>
                {filterChon !== '' || filterTitle ? '조건에 맞는 가족이 없습니다' : '가족이 없습니다'}
              </div>
            )}
          </div>

          {filteredResults.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#A09080' }}>
              총 {filteredResults.length}명
            </div>
          )}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E8DCC8', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, outline: 'none', background: 'white',
  appearance: 'auto',
};
