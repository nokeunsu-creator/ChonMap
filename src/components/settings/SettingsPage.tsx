import React, { useRef } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { exportGraphJSON, importGraphJSON, clearAllData, setPremium } from '../../storage/StorageService';

export function SettingsPage() {
  const { state, dispatch } = useFamily();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const personCount = Object.keys(state.graph.persons).length;
  const edgeCount = state.graph.edges.length;

  const handleExport = () => {
    exportGraphJSON(state.graph);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const graph = await importGraphJSON(file);
      if (confirm(`${Object.keys(graph.persons).length}명의 가계도를 불러옵니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`)) {
        dispatch({ type: 'IMPORT_GRAPH', graph });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '파일을 불러올 수 없습니다.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    if (confirm('모든 가계도 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.')) {
      clearAllData();
      window.location.reload();
    }
  };

  const handleTogglePremium = () => {
    // 개발용 프리미엄 토글 (실제로는 인앱결제로 대체)
    const newValue = !state.isPremium;
    setPremium(newValue);
    dispatch({ type: 'SET_PREMIUM', isPremium: newValue });
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">설정</h1>

      {/* 통계 */}
      <div className="bg-indigo-50 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-indigo-700 mb-2">가계도 현황</h3>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{personCount}</div>
            <div className="text-xs text-gray-500">가족 수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{edgeCount}</div>
            <div className="text-xs text-gray-500">관계 수</div>
          </div>
        </div>
      </div>

      {/* 프리미엄 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-gray-800">프리미엄</h3>
            <p className="text-xs text-gray-500">3촌 이상 관계 보기 + 광고 제거</p>
          </div>
          <button
            onClick={handleTogglePremium}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              state.isPremium
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {state.isPremium ? '활성' : '비활성'}
          </button>
        </div>
      </div>

      {/* 데이터 관리 */}
      <div className="space-y-2">
        <button
          onClick={handleExport}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:bg-gray-50"
        >
          <div className="font-medium text-gray-800">데이터 내보내기</div>
          <div className="text-xs text-gray-500">JSON 파일로 백업</div>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:bg-gray-50"
        >
          <div className="font-medium text-gray-800">데이터 가져오기</div>
          <div className="text-xs text-gray-500">백업 파일에서 복원</div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        <button
          onClick={handleClear}
          className="w-full bg-white border border-red-200 rounded-xl p-4 text-left hover:bg-red-50"
        >
          <div className="font-medium text-red-600">데이터 초기화</div>
          <div className="text-xs text-red-400">모든 가계도 데이터 삭제</div>
        </button>
      </div>

      {/* 앱 정보 */}
      <div className="mt-6 text-center text-xs text-gray-400">
        <p>촌맵 v1.0.0</p>
        <p>한국 촌수 기반 가계도 앱</p>
      </div>
    </div>
  );
}
