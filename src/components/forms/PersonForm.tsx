import React, { useState } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { Gender, EdgeType } from '../../models/types';
import { nanoid } from 'nanoid';
import { showToast } from '../../utils/toast';
import { fireInterstitialAd, incrementSaveCount } from '../ads/InterstitialAd';

type RelationType = 'father' | 'mother' | 'son' | 'daughter' | 'spouse' | 'brother' | 'sister';

const RELATION_OPTIONS: { value: RelationType; label: string; emoji: string }[] = [
  { value: 'father', label: '아버지', emoji: '\u{1F468}' },
  { value: 'mother', label: '어머니', emoji: '\u{1F469}' },
  { value: 'son', label: '아들', emoji: '\u{1F466}' },
  { value: 'daughter', label: '딸', emoji: '\u{1F467}' },
  { value: 'spouse', label: '배우자', emoji: '\u{1F491}' },
  { value: 'brother', label: '형제(남)', emoji: '\u{1F468}' },
  { value: 'sister', label: '자매(여)', emoji: '\u{1F469}' },
];

const CURRENT_YEAR = new Date().getFullYear();

function validateYear(value: string): string | null {
  if (!value) return null;
  const year = parseInt(value);
  if (isNaN(year) || year < 1900 || year > CURRENT_YEAR) return `1900~${CURRENT_YEAR} 사이로 입력하세요`;
  return null;
}

function validateMonthDay(value: string): string | null {
  if (!value) return null;
  if (!/^\d{2}-\d{2}$/.test(value)) return '월일 4자리를 입력하세요 (예: 1219)';
  const [m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '유효한 월-일을 입력하세요';
  return null;
}

function formatMonthDay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '-' + digits.slice(2);
}

export function PersonForm() {
  const { state, dispatch } = useFamily();
  const dk = state.darkMode;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [birthMonthDay, setBirthMonthDay] = useState('');
  const [deathMonthDay, setDeathMonthDay] = useState('');
  const [memo, setMemo] = useState('');
  const [relation, setRelation] = useState<RelationType>('father');

  const targetPersonId = state.selectedPersonId || state.perspectivePersonId;
  const targetPerson = state.graph.persons[targetPersonId];

  const birthYearError = validateYear(birthYear);
  const deathYearError = deathYear ? (validateYear(deathYear) || (birthYear && parseInt(deathYear) < parseInt(birthYear) ? '사망년도는 출생년도 이후여야 합니다' : null)) : null;
  const birthMDError = validateMonthDay(birthMonthDay);
  const deathMDError = validateMonthDay(deathMonthDay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetPerson || birthYearError || deathYearError || birthMDError || deathMDError) return;

    const newId = nanoid();
    const newPerson = {
      id: newId,
      name: name.trim(),
      gender: getGenderFromRelation(relation, gender),
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      deathYear: deathYear ? parseInt(deathYear) : undefined,
      birthMonthDay: birthMonthDay || undefined,
      deathMonthDay: deathMonthDay || undefined,
      memo: memo.trim() || undefined,
    };

    // 형제 추가 시 부모가 없으면 부모+형제를 한 번에 추가 (undo 일관성)
    if ((relation === 'brother' || relation === 'sister') &&
        !state.graph.edges.find(e => e.type === 'PARENT_OF' && e.to === targetPersonId)) {
      const tempParentId = nanoid();
      const tempParent = { id: tempParentId, name: '(부모)', gender: 'M' as Gender };
      const parentEdge = { id: nanoid(), type: 'PARENT_OF' as EdgeType, from: tempParentId, to: targetPersonId };
      const siblingEdge = { id: nanoid(), type: 'PARENT_OF' as EdgeType, from: tempParentId, to: newId };
      dispatch({ type: 'ADD_SIBLING', sibling: newPerson, siblingEdge, parent: tempParent, parentEdge });
      if (incrementSaveCount()) fireInterstitialAd('가족을 추가했어요!');
      resetForm();
      return;
    }

    const edge = createEdge(newId, targetPersonId, relation);
    if (!edge) return;

    dispatch({ type: 'ADD_PERSON', person: newPerson, edge });
    dispatch({ type: 'SELECT_PERSON', personId: null });
    if (incrementSaveCount()) fireInterstitialAd('가족을 추가했어요!');
    resetForm();
  };

  const getGenderFromRelation = (rel: RelationType, defaultGender: Gender): Gender => {
    switch (rel) {
      case 'father': case 'son': case 'brother': return 'M';
      case 'mother': case 'daughter': case 'sister': return 'F';
      default: return defaultGender;
    }
  };

  const createEdge = (newId: string, targetId: string, rel: RelationType) => {
    const edgeId = nanoid();
    switch (rel) {
      case 'father':
      case 'mother': {
        const existingParents = state.graph.edges.filter(
          e => e.type === 'PARENT_OF' && e.to === targetId
        );
        if (existingParents.length >= 2) {
          showToast('이미 부모가 2명 등록되어 있습니다', 'error');
          return null;
        }
        return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: newId, to: targetId };
      }
      case 'son':
      case 'daughter':
        return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: targetId, to: newId };
      case 'spouse': {
        const hasSpouse = state.graph.edges.some(
          e => e.type === 'SPOUSE_OF' && (e.from === targetId || e.to === targetId)
        );
        if (hasSpouse) {
          showToast('이미 배우자가 등록되어 있습니다', 'error');
          return null;
        }
        return { id: edgeId, type: 'SPOUSE_OF' as EdgeType, from: targetId, to: newId };
      }
      case 'brother':
      case 'sister': {
        const parentEdge = state.graph.edges.find(
          e => e.type === 'PARENT_OF' && e.to === targetId
        );
        if (parentEdge) {
          return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: parentEdge.from, to: newId };
        }
        return null; // 부모 없는 경우 handleSubmit의 ADD_SIBLING에서 처리
      }
      default:
        return null;
    }
  };

  const resetForm = () => {
    setName(''); setGender('M'); setBirthYear(''); setDeathYear(''); setBirthMonthDay(''); setDeathMonthDay(''); setMemo(''); setRelation('father');
  };

  const handleClose = () => {
    dispatch({ type: 'SHOW_ADD_FORM', show: false });
    dispatch({ type: 'SELECT_PERSON', personId: null });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: `1px solid ${dk ? '#4B5563' : '#E8DCC8'}`, borderRadius: 10,
    padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    background: dk ? '#374151' : 'white', color: dk ? '#F3F4F6' : '#3D2B1F',
  };

  return (
    <div onClick={handleClose} role="dialog" aria-modal="true" aria-label="가족 추가" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{
        background: dk ? '#1F2937' : 'white', width: '100%', maxWidth: 420,
        borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: dk ? '#F3F4F6' : '#3D2B1F' }}>가족 추가</h2>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', fontSize: 22, color: '#A09080', cursor: 'pointer',
          }}>&times;</button>
        </div>

        <p style={{ fontSize: 13, color: '#8B7355', marginBottom: 14 }}>
          <strong style={{ color: '#8B6914' }}>{targetPerson?.name}</strong>의 가족을 추가합니다
        </p>

        <form onSubmit={handleSubmit}>
          {/* 관계 선택 */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6, display: 'block' }}>관계</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {RELATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRelation(opt.value)}
                  style={{
                    padding: '8px 4px', borderRadius: 10,
                    border: relation === opt.value ? '2px solid #8B6914' : '1px solid #E8DCC8',
                    background: relation === opt.value ? '#FFF8DC' : 'white',
                    color: relation === opt.value ? '#8B6914' : '#666',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 16 }}>{opt.emoji}</div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="이름을 입력하세요" autoFocus maxLength={50} style={inputStyle} />
          </div>

          {/* 성별 (배우자만) */}
          {relation === 'spouse' && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>성별</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['M', 'F'] as Gender[]).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)} style={{
                    flex: 1, padding: 10, borderRadius: 10, border: 'none',
                    background: gender === g ? (g === 'M' ? '#4A90D9' : '#D97B8A') : '#F5F0E0',
                    color: gender === g ? 'white' : '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}>{g === 'M' ? '남' : '여'}</button>
                ))}
              </div>
            </div>
          )}

          {/* 출생년도 */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>출생년도 (선택)</label>
            <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)}
              placeholder="예: 1990" min={1900} max={CURRENT_YEAR} style={{
                ...inputStyle, borderColor: birthYearError ? '#EF4444' : '#E8DCC8',
              }} />
            {birthYearError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{birthYearError}</div>}
          </div>

          {/* 사망년도 */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>사망년도 (선택)</label>
            <input type="number" value={deathYear} onChange={e => setDeathYear(e.target.value)}
              placeholder="생존시 비워두세요" min={1900} max={CURRENT_YEAR} style={{
                ...inputStyle, borderColor: deathYearError ? '#EF4444' : '#E8DCC8',
              }} />
            {deathYearError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{deathYearError}</div>}
          </div>

          {/* 생일 */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>생일 월-일 (선택)</label>
            <input type="text" inputMode="numeric" value={birthMonthDay} onChange={e => setBirthMonthDay(formatMonthDay(e.target.value))}
              placeholder="예: 1219" maxLength={5} style={{
                ...inputStyle, borderColor: birthMDError ? '#EF4444' : inputStyle.borderColor,
              }} />
            {birthMDError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{birthMDError}</div>}
          </div>

          {/* 기일 (사망년도 입력 시에만) */}
          {deathYear && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>기일 월-일 (선택)</label>
              <input type="text" inputMode="numeric" value={deathMonthDay} onChange={e => setDeathMonthDay(formatMonthDay(e.target.value))}
                placeholder="예: 0920" maxLength={5} style={{
                  ...inputStyle, borderColor: deathMDError ? '#EF4444' : inputStyle.borderColor,
                }} />
              {deathMDError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{deathMDError}</div>}
            </div>
          )}

          {/* 메모 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 4, display: 'block' }}>메모 (선택)</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="기일, 연락처, 메모 등" maxLength={200} style={inputStyle} />
          </div>

          <button type="submit" disabled={!name.trim() || !!birthYearError || !!deathYearError || !!birthMDError || !!deathMDError}
            style={{
              width: '100%',
              background: name.trim() && !birthYearError && !deathYearError && !birthMDError && !deathMDError ? 'linear-gradient(135deg, #8B6914, #C4961A)' : '#E8DCC8',
              color: name.trim() && !birthYearError && !deathYearError && !birthMDError && !deathMDError ? 'white' : '#A09080',
              border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 15,
              cursor: name.trim() && !birthYearError && !deathYearError && !birthMDError && !deathMDError ? 'pointer' : 'not-allowed',
            }}>
            추가하기
          </button>
        </form>
      </div>
    </div>
  );
}
