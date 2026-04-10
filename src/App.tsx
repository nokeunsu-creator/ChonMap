import React from 'react';
import { useFamily } from './state/FamilyContext';
import { FamilyTreeSVG } from './components/tree/FamilyTreeSVG';
import { PersonForm } from './components/forms/PersonForm';
import { EditForm } from './components/forms/EditForm';
import { SettingsPage } from './components/settings/SettingsPage';

export default function App() {
  const { state, dispatch } = useFamily();
  const { activeTab, showAddForm, editingPersonId, selectedPersonId, perspectivePersonId, graph, relationships } = state;
  const perspectivePerson = graph.persons[perspectivePersonId];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold">촌맵</h1>
          {perspectivePerson && activeTab === 'tree' && (
            <p className="text-xs text-indigo-200">
              기준: {perspectivePerson.name} (탭하여 변경)
            </p>
          )}
        </div>
        {activeTab === 'tree' && (
          <div className="flex gap-2">
            {selectedPersonId && selectedPersonId !== graph.rootPersonId && (
              <button
                onClick={() => dispatch({ type: 'SET_EDITING', personId: selectedPersonId })}
                className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-400"
              >
                수정
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'SHOW_ADD_FORM', show: true })}
              className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow"
            >
              +
            </button>
          </div>
        )}
      </header>

      {/* 선택된 인물 정보 바 */}
      {activeTab === 'tree' && selectedPersonId && (
        <div className="bg-violet-50 px-4 py-2 flex items-center justify-between border-b border-violet-100 shrink-0">
          <div className="text-sm">
            <span className="font-medium text-violet-800">
              {graph.persons[selectedPersonId]?.name}
            </span>
            {relationships.get(selectedPersonId) && (
              <span className="text-violet-500 ml-2">
                ({relationships.get(selectedPersonId)!.title}
                {relationships.get(selectedPersonId)!.chon >= 0 &&
                  ` / ${relationships.get(selectedPersonId)!.chon}촌`}
                )
              </span>
            )}
          </div>
          <button
            onClick={() => dispatch({ type: 'SELECT_PERSON', personId: null })}
            className="text-violet-400 text-sm"
          >
            닫기
          </button>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'tree' ? <FamilyTreeSVG /> : <SettingsPage />}
      </main>

      {/* 하단 탭바 */}
      <nav className="bg-white border-t border-gray-200 flex shrink-0">
        <button
          onClick={() => dispatch({ type: 'SET_TAB', tab: 'tree' })}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'tree'
              ? 'text-indigo-600 border-t-2 border-indigo-600'
              : 'text-gray-400'
          }`}
        >
          <div className="text-lg">&#128332;</div>
          가계도
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', tab: 'settings' })}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'settings'
              ? 'text-indigo-600 border-t-2 border-indigo-600'
              : 'text-gray-400'
          }`}
        >
          <div className="text-lg">&#9881;</div>
          설정
        </button>
      </nav>

      {/* 모달 폼 */}
      {showAddForm && <PersonForm />}
      {editingPersonId && <EditForm />}
    </div>
  );
}
