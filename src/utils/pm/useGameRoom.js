// 온라인 게임 방(Firebase) 스텁 — ChonMap은 온라인 모드 미지원.
// 원본 API 모양을 유지해서 pocket-money 컴포넌트들이 깨지지 않게 함.
export function useGameRoom() {
  return {
    gameState: null,
    roomCode: '',
    myColor: null,
    role: null,
    connected: false,
    error: null,
    createRoom: async () => null,
    joinRoom: async () => false,
    leaveRoom: () => {},
    updateState: () => {},
    setError: () => {},
  };
}
