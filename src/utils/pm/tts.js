// 영어 TTS 공유 유틸. 모든 영어 게임이 동일한 음소거 상태를 공유한다.
const MUTE_KEY = 'pm-tts-muted'

export function isTtsMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}

export function setTtsMuted(muted) {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch (_) {}
  if (muted) cancelSpeech()
}

export function cancelSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try { window.speechSynthesis.cancel() } catch (_) {}
}

export function speakEn(text, muted) {
  if (muted) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!text) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(String(text))
    u.lang = 'en-US'
    u.rate = 0.9
    u.pitch = 1.0
    window.speechSynthesis.speak(u)
  } catch (_) {}
}
