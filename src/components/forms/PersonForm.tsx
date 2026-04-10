import React, { useState } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { Gender, EdgeType } from '../../models/types';
import { nanoid } from 'nanoid';

type RelationType = 'father' | 'mother' | 'son' | 'daughter' | 'spouse' | 'brother' | 'sister';

const RELATION_OPTIONS: { value: RelationType; label: string }[] = [
  { value: 'father', label: '아버지' },
  { value: 'mother', label: '어머니' },
  { value: 'son', label: '아들' },
  { value: 'daughter', label: '딸' },
  { value: 'spouse', label: '배우자' },
  { value: 'brother', label: '형제 (남)' },
  { value: 'sister', label: '자매 (여)' },
];

export function PersonForm() {
  const { state, dispatch } = useFamily();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [birthYear, setBirthYear] = useState('');
  const [relation, setRelation] = useState<RelationType>('father');

  // 기준 인물: 선택된 인물 또는 기준 인물
  const targetPersonId = state.selectedPersonId || state.perspectivePersonId;
  const targetPerson = state.graph.persons[targetPersonId];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = nanoid();
    const newPerson = {
      id: newId,
      name: name.trim(),
      gender: getGenderFromRelation(relation, gender),
      birthYear: birthYear ? parseInt(birthYear) : undefined,
    };

    const edge = createEdge(newId, targetPersonId, relation);
    if (!edge) return;

    dispatch({ type: 'ADD_PERSON', person: newPerson, edge });
    dispatch({ type: 'SELECT_PERSON', personId: null });
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
        // 부모 2명 제한 확인
        const existingParents = state.graph.edges.filter(
          e => e.type === 'PARENT_OF' && e.to === targetId
        );
        if (existingParents.length >= 2) {
          alert('이미 부모가 2명 등록되어 있습니다.');
          return null;
        }
        return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: newId, to: targetId };
      }
      case 'son':
      case 'daughter':
        // 새 사람이 자녀 → PARENT_OF: target → new
        return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: targetId, to: newId };
      case 'spouse': {
        // 배우자 중복 확인
        const hasSpouse = state.graph.edges.some(
          e => e.type === 'SPOUSE_OF' && (e.from === targetId || e.to === targetId)
        );
        if (hasSpouse) {
          alert('이미 배우자가 등록되어 있습니다.');
          return null;
        }
        return { id: edgeId, type: 'SPOUSE_OF' as EdgeType, from: targetId, to: newId };
      }
      case 'brother':
      case 'sister': {
        // 형제: 같은 부모 필요. 기존 부모가 있으면 그 부모의 자녀로 추가
        const parentEdge = state.graph.edges.find(
          e => e.type === 'PARENT_OF' && e.to === targetId
        );
        if (parentEdge) {
          return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: parentEdge.from, to: newId };
        }
        // 부모 없으면 임시 부모 생성
        const tempParentId = nanoid();
        const tempParent = { id: tempParentId, name: '(부모)', gender: 'M' as Gender };
        const edge1 = { id: nanoid(), type: 'PARENT_OF' as EdgeType, from: tempParentId, to: targetId };
        dispatch({ type: 'ADD_PERSON', person: tempParent, edge: edge1 });
        return { id: edgeId, type: 'PARENT_OF' as EdgeType, from: tempParentId, to: newId };
      }
      default:
        return null;
    }
  };

  const resetForm = () => {
    setName('');
    setGender('M');
    setBirthYear('');
    setRelation('father');
  };

  const handleClose = () => {
    dispatch({ type: 'SHOW_ADD_FORM', show: false });
    dispatch({ type: 'SELECT_PERSON', personId: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            가족 추가
          </h2>
          <button onClick={handleClose} className="text-gray-400 text-xl">&times;</button>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          <span className="font-semibold text-indigo-600">{targetPerson?.name}</span>의 가족을 추가합니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 관계 선택 */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">관계</label>
            <div className="grid grid-cols-4 gap-1">
              {RELATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRelation(opt.value)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition ${
                    relation === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* 성별 (배우자일 때만) */}
          {relation === 'spouse' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">성별</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGender('M')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    gender === 'M' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  남
                </button>
                <button
                  type="button"
                  onClick={() => setGender('F')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    gender === 'F' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  여
                </button>
              </div>
            </div>
          )}

          {/* 출생년도 */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">출생년도 (선택)</label>
            <input
              type="number"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="예: 1990"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            추가하기
          </button>
        </form>
      </div>
    </div>
  );
}
