import React, { useState, useEffect } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { Gender } from '../../models/types';

export function EditForm() {
  const { state, dispatch } = useFamily();
  const personId = state.editingPersonId;
  const person = personId ? state.graph.persons[personId] : undefined;

  const [name, setName] = useState(person?.name ?? '');
  const [gender, setGender] = useState<Gender>(person?.gender ?? 'M');
  const [birthYear, setBirthYear] = useState(person?.birthYear?.toString() || '');

  useEffect(() => {
    if (person) {
      setName(person.name);
      setGender(person.gender);
      setBirthYear(person.birthYear?.toString() || '');
    }
  }, [personId]);

  if (!personId || !person) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({
      type: 'UPDATE_PERSON',
      personId,
      updates: {
        name: name.trim(),
        gender,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
      },
    });
  };

  const handleDelete = () => {
    if (personId === state.graph.rootPersonId) {
      alert('기준 인물(나)은 삭제할 수 없습니다.');
      return;
    }
    const hasChildren = state.graph.edges.some(
      e => e.type === 'PARENT_OF' && e.from === personId
    );
    const msg = hasChildren
      ? `${person.name}을(를) 삭제하면 자녀와의 연결도 끊어집니다. 삭제하시겠습니까?`
      : `${person.name}을(를) 삭제하시겠습니까?`;
    if (confirm(msg)) {
      dispatch({ type: 'REMOVE_PERSON', personId });
    }
  };

  const handleClose = () => {
    dispatch({ type: 'SET_EDITING', personId: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">정보 수정</h2>
          <button onClick={handleClose} className="text-gray-400 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">출생년도</label>
            <input
              type="number"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="예: 1990"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-40"
            >
              저장
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
