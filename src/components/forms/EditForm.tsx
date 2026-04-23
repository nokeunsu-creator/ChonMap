import React, { useState, useEffect, useRef } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { Gender } from '../../models/types';
import { compressImage } from '../../utils/imageUtils';
import { showToast } from '../../utils/toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { fireInterstitialAd, incrementSaveCount } from '../ads/InterstitialAd';

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

export function EditForm() {
  const { state, dispatch } = useFamily();
  const personId = state.editingPersonId;
  const person = personId ? state.graph.persons[personId] : undefined;
  const photoUrl = personId ? state.photos[personId] : undefined;
  const dark = state.darkMode;

  const [name, setName] = useState(person?.name ?? '');
  const [gender, setGender] = useState<Gender>(person?.gender ?? 'M');
  const [birthYear, setBirthYear] = useState(person?.birthYear?.toString() || '');
  const [deathYear, setDeathYear] = useState(person?.deathYear?.toString() || '');
  const [birthMonthDay, setBirthMonthDay] = useState(person?.birthMonthDay || '');
  const [deathMonthDay, setDeathMonthDay] = useState(person?.deathMonthDay || '');
  const [memo, setMemo] = useState(person?.memo || '');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (person) {
      setName(person.name);
      setGender(person.gender);
      setBirthYear(person.birthYear?.toString() || '');
      setDeathYear(person.deathYear?.toString() || '');
      setBirthMonthDay(person.birthMonthDay || '');
      setDeathMonthDay(person.deathMonthDay || '');
      setMemo(person.memo || '');
    }
  }, [personId, person]);

  if (!personId || !person) return null;

  const birthYearError = validateYear(birthYear);
  const deathYearError = deathYear
    ? validateYear(deathYear) || (birthYear && parseInt(deathYear) < parseInt(birthYear) ? '사망년도는 출생년도 이후여야 합니다' : null)
    : null;
  const birthMDError = validateMonthDay(birthMonthDay);
  const deathMDError = validateMonthDay(deathMonthDay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || birthYearError || deathYearError || birthMDError || deathMDError) return;
    dispatch({
      type: 'UPDATE_PERSON', personId,
      updates: {
        name: name.trim(), gender,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        deathYear: deathYear ? parseInt(deathYear) : undefined,
        birthMonthDay: birthMonthDay || undefined,
        deathMonthDay: deathMonthDay || undefined,
        memo: memo.trim() || undefined,
      },
    });
    showToast('저장되었습니다', 'success');
    if (incrementSaveCount()) fireInterstitialAd('가족 정보를 저장했어요!');
  };

  const handleDeleteClick = () => {
    if (personId === state.graph.rootPersonId) {
      showToast('기준 인물(나)은 삭제할 수 없습니다', 'error');
      return;
    }
    const hasChildren = state.graph.edges.some(e => e.type === 'PARENT_OF' && e.from === personId);
    setDeleteMsg(
      hasChildren
        ? `${person.name}을(를) 삭제하면 자녀와의 연결도 끊어집니다.\n삭제하시겠습니까?`
        : `${person.name}을(를) 삭제하시겠습니까?`
    );
    setConfirmDelete(true);
  };

  const handleClose = () => dispatch({ type: 'SET_EDITING', personId: null });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const dataUrl = await compressImage(file);
      dispatch({ type: 'SET_PHOTO', personId, dataUrl });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '사진을 처리할 수 없습니다', 'error');
    }
    setPhotoLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 다크모드 스타일
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#6B7280';
  const inputBg = dark ? '#111827' : 'white';
  const inputBorder = dark ? '#4B5563' : '#D1D5DB';
  const inputColor = dark ? '#F3F4F6' : '#3D2B1F';
  const labelColor = dark ? '#D1D5DB' : '#4B5563';

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', border: `1px solid ${hasError ? '#EF4444' : inputBorder}`,
    borderRadius: 10, padding: '9px 12px', fontSize: 14,
    background: inputBg, color: inputColor, outline: 'none', boxSizing: 'border-box',
  });

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: labelColor, display: 'block', marginBottom: 4 };
  const errorStyle: React.CSSProperties = { fontSize: 11, color: '#EF4444', marginTop: 3 };
  const fieldStyle: React.CSSProperties = { marginBottom: 12 };

  const emoji = person.gender === 'M' ? '\u{1F468}' : '\u{1F469}';

  return (
    <>
      <div
        onClick={handleClose}
        role="dialog" aria-modal="true" aria-label="정보 수정"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: cardBg, width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', maxHeight: '85vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>정보 수정</h2>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, color: textSecondary, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
          </div>

          {/* 프로필 사진 */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: photoUrl ? 'none' : (person.gender === 'M' ? '#EBF4FF' : '#FFF0F3'),
                border: `3px solid ${person.gender === 'M' ? '#4A90D9' : '#D97B8A'}`,
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}
            >
              {photoUrl
                ? <img src={photoUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 36 }}>{emoji}</span>}
              {photoLoading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>...</div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 12, color: '#4A90D9', background: 'none', border: 'none', cursor: 'pointer' }}>
                {photoUrl ? '사진 변경' : '사진 추가'}
              </button>
              {photoUrl && (
                <button type="button" onClick={() => dispatch({ type: 'REMOVE_PHOTO', personId })}
                  style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                  사진 삭제
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={50} style={inputStyle()} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>성별</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setGender('M')} style={{
                  flex: 1, padding: '9px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  background: gender === 'M' ? '#3B82F6' : (dark ? '#374151' : '#F3F4F6'),
                  color: gender === 'M' ? 'white' : textSecondary,
                }}>남</button>
                <button type="button" onClick={() => setGender('F')} style={{
                  flex: 1, padding: '9px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  background: gender === 'F' ? '#EC4899' : (dark ? '#374151' : '#F3F4F6'),
                  color: gender === 'F' ? 'white' : textSecondary,
                }}>여</button>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>출생년도</label>
              <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)}
                placeholder="예: 1990" min={1900} max={CURRENT_YEAR} style={inputStyle(!!birthYearError)} />
              {birthYearError && <div style={errorStyle}>{birthYearError}</div>}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>생일 (월-일)</label>
              <input type="text" inputMode="numeric" value={birthMonthDay} onChange={e => setBirthMonthDay(formatMonthDay(e.target.value))}
                placeholder="예: 1219" maxLength={5} style={inputStyle(!!birthMDError)} />
              {birthMDError && <div style={errorStyle}>{birthMDError}</div>}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>사망년도</label>
              <input type="number" value={deathYear} onChange={e => setDeathYear(e.target.value)}
                placeholder="생존시 비워두세요" min={1900} max={CURRENT_YEAR} style={inputStyle(!!deathYearError)} />
              {deathYearError && <div style={errorStyle}>{deathYearError}</div>}
            </div>

            {deathYear && (
              <div style={fieldStyle}>
                <label style={labelStyle}>기일 (월-일)</label>
                <input type="text" inputMode="numeric" value={deathMonthDay} onChange={e => setDeathMonthDay(formatMonthDay(e.target.value))}
                  placeholder="예: 0920" maxLength={5} style={inputStyle(!!deathMDError)} />
                {deathMDError && <div style={errorStyle}>{deathMDError}</div>}
              </div>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>메모</label>
              <input type="text" value={memo} onChange={e => setMemo(e.target.value)} maxLength={200}
                placeholder="기일, 연락처, 메모 등" style={inputStyle()} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                disabled={!name.trim() || !!birthYearError || !!deathYearError || !!birthMDError || !!deathMDError}
                style={{
                  flex: 1, background: '#4F46E5', color: 'white', border: 'none',
                  borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: (!name.trim() || !!birthYearError || !!deathYearError || !!birthMDError || !!deathMDError) ? 0.4 : 1,
                }}
              >
                저장
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                style={{
                  padding: '12px 20px', background: '#EF4444', color: 'white',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={deleteMsg}
          confirmLabel="삭제"
          danger
          dark={dark}
          onConfirm={() => { dispatch({ type: 'REMOVE_PERSON', personId }); handleClose(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
