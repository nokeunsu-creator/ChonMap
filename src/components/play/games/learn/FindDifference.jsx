import { useState, useEffect, useRef, useMemo } from 'react'

// 테마별 이모지 풀 (한 테마 안에서만 서로 치환되어야 함)
const THEMES = [
  { key: 'animal', label: '동물', icon: '🐶', pool: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦄','🐢','🐙'] },
  { key: 'fruit',  label: '과일', icon: '🍎', pool: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🍍','🥝','🥭','🍈','🥥','🍏','🫐','🍐'] },
  { key: 'food',   label: '음식', icon: '🍕', pool: ['🍕','🍔','🍟','🌭','🌮','🍣','🍜','🍱','🍙','🍛','🍝','🥗','🥪','🍞','🧀','🍰','🍩','🍪','🧁','🍫'] },
  { key: 'vehicle',label: '탈것', icon: '🚗', pool: ['🚗','🚕','🚌','🚓','🚑','🚒','🚚','🚜','🏎️','🛵','🚲','✈️','🚀','⛵','🚁','🛴','🚂','🚤'] },
  { key: 'shape',  label: '도형', icon: '🔷', pool: ['🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','🟥','🟩','🟦','🟨','🟧','🟪','🟫'] },
  { key: 'sky',    label: '우주', icon: '🌟', pool: ['⭐','🌟','✨','☀️','🌙','🌈','⚡','🔥','❄️','☁️','🌞','🌛','🌜','🌠','☄️','🪐','🌍','🌕','🌑','💫'] },
]

const DIFFICULTIES = [
  { key: 'easy',   label: '쉬움',   gridSize: 3, diffCount: 1, time: 30, color: '#06D6A0', desc: '3×3 · 1곳' },
  { key: 'medium', label: '보통',   gridSize: 4, diffCount: 3, time: 45, color: '#4895EF', desc: '4×4 · 3곳' },
  { key: 'hard',   label: '어려움', gridSize: 5, diffCount: 5, time: 60, color: '#EF476F', desc: '5×5 · 5곳' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPuzzle(theme, difficulty) {
  const total = difficulty.gridSize * difficulty.gridSize
  const left = []
  for (let i = 0; i < total; i++) {
    left.push(theme.pool[Math.floor(Math.random() * theme.pool.length)])
  }
  const right = [...left]
  const indices = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, difficulty.diffCount)
  const diffSet = new Set(indices)
  indices.forEach(idx => {
    const current = right[idx]
    const alternatives = theme.pool.filter(e => e !== current)
    right[idx] = alternatives[Math.floor(Math.random() * alternatives.length)]
  })
  return { left, right, diffSet }
}

export default function FindDifference({ onBack }) {
  const [phase, setPhase] = useState('setup') // setup | playing | result
  const [theme, setTheme] = useState(THEMES[0])
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0])
  const [puzzle, setPuzzle] = useState(null) // { left, right, diffSet }
  const [found, setFound] = useState(() => new Set())
  const [mistakes, setMistakes] = useState(0)
  const [wrongIdx, setWrongIdx] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)

  const timerRef = useRef(null)
  const startRef = useRef(0)
  const wrongTimerRef = useRef(null)

  const startGame = (t = theme, d = difficulty) => {
    const p = buildPuzzle(t, d)
    setTheme(t)
    setDifficulty(d)
    setPuzzle(p)
    setFound(new Set())
    setMistakes(0)
    setWrongIdx(null)
    setTimeLeft(d.time)
    setElapsed(0)
    setWon(false)
    startRef.current = Date.now()
    setPhase('playing')
  }

  // 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
          setPhase('result')
          setWon(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(wrongTimerRef.current)
    }
  }, [])

  const handleCellClick = (idx) => {
    if (phase !== 'playing' || !puzzle) return
    if (found.has(idx)) return
    if (puzzle.diffSet.has(idx)) {
      const next = new Set(found)
      next.add(idx)
      setFound(next)
      if (next.size === puzzle.diffSet.size) {
        clearInterval(timerRef.current)
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        setWon(true)
        setPhase('result')
      }
    } else {
      setMistakes(m => m + 1)
      setWrongIdx(idx)
      clearTimeout(wrongTimerRef.current)
      wrongTimerRef.current = setTimeout(() => setWrongIdx(null), 400)
    }
  }

  const score = useMemo(() => {
    if (!puzzle) return 0
    const base = found.size * 100
    const penalty = mistakes * 10
    const timeBonus = won ? Math.max(0, timeLeft) * 5 : 0
    return Math.max(0, base - penalty + timeBonus)
  }, [found, mistakes, timeLeft, won, puzzle])

  const stars = useMemo(() => {
    if (!won) return 0
    const ratio = timeLeft / difficulty.time
    if (ratio > 0.6 && mistakes <= 1) return 3
    if (ratio > 0.3 && mistakes <= 3) return 2
    return 1
  }, [won, timeLeft, difficulty.time, mistakes])

  // ===== 설정 화면 =====
  if (phase === 'setup') {
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--gray)', cursor: 'pointer', marginBottom: 16 }}>
          ← 돌아가기
        </button>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🔍</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>틀린 그림 찾기</h2>
          <p style={{ fontSize: 13, color: '#888' }}>두 그림에서 다른 곳을 모두 찾아보세요!</p>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: '#555', marginBottom: 10 }}>주제 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          {THEMES.map(t => (
            <button key={t.key} onClick={() => setTheme(t)}
              style={{
                padding: '14px 6px', borderRadius: 12, cursor: 'pointer',
                border: theme.key === t.key ? '3px solid #4895EF' : '2px solid #EEE',
                background: theme.key === t.key ? '#EBF5FF' : '#FFF',
                fontWeight: 600,
              }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontSize: 13 }}>{t.label}</div>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: '#555', marginBottom: 10 }}>난이도 선택</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => setDifficulty(d)}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                border: difficulty.key === d.key ? `3px solid ${d.color}` : '2px solid #EEE',
                background: difficulty.key === d.key ? `${d.color}15` : '#FFF',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                textAlign: 'left',
              }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: d.color }}>{d.label}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{d.desc} · {d.time}초</div>
              </div>
              {difficulty.key === d.key && <div style={{ fontSize: 20, color: d.color }}>✓</div>}
            </button>
          ))}
        </div>

        <button onClick={() => startGame(theme, difficulty)}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #4895EF, #3A7BD5)',
            color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>
          시작하기 🚀
        </button>
      </div>
    )
  }

  // ===== 결과 화면 =====
  if (phase === 'result') {
    const emoji = won ? (stars === 3 ? '🏆' : stars === 2 ? '🥇' : '🥈') : '⏰'
    const title = won ? '클리어!' : '시간 종료'
    return (
      <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          textAlign: 'center', padding: '32px 20px', borderRadius: 20,
          background: won ? 'linear-gradient(135deg, #FFF9E6, #FFF3CD)' : 'linear-gradient(135deg, #F5F5F5, #EEE)',
          border: `2px solid ${won ? '#F1C40F' : '#BBB'}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
          {won && (
            <div style={{ fontSize: 28, marginBottom: 8 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} style={{ opacity: i < stars ? 1 : 0.25 }}>⭐</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 36, fontWeight: 800, color: '#E67E22', marginBottom: 8 }}>{score}점</div>
          <div style={{ fontSize: 13, color: '#888' }}>
            찾은 차이 {found.size}/{puzzle?.diffSet.size ?? 0} · 실수 {mistakes}번 · {elapsed}초
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => startGame(theme, difficulty)}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#4895EF', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다시 도전
          </button>
          <button onClick={() => setPhase('setup')}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#F0F0F0', color: '#555', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            다른 주제
          </button>
        </div>
      </div>
    )
  }

  // ===== 플레이 화면 =====
  if (!puzzle) return null
  const cols = difficulty.gridSize
  const cellSize = cols === 3 ? 52 : cols === 4 ? 42 : 34
  const fontSize = cols === 3 ? 28 : cols === 4 ? 22 : 18
  const timerColor = timeLeft <= 5 ? '#EF476F' : timeLeft <= 15 ? '#F39C12' : '#06D6A0'

  const renderGrid = (cells, interactive) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
      gap: 4,
      padding: 8,
      borderRadius: 12,
      background: '#F8F9FA',
      border: '2px solid #E0E0E0',
    }}>
      {cells.map((emo, idx) => {
        const isFound = interactive && found.has(idx)
        const isWrong = interactive && wrongIdx === idx
        return (
          <div key={idx}
            onClick={() => interactive && handleCellClick(idx)}
            style={{
              width: cellSize, height: cellSize, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize,
              background: isFound ? '#D4EDDA' : isWrong ? '#F8D7DA' : '#FFF',
              border: isFound ? '2px solid #06D6A0' : isWrong ? '2px solid #EF476F' : '1px solid #EEE',
              cursor: interactive && !isFound ? 'pointer' : 'default',
              position: 'relative',
              userSelect: 'none',
              transition: 'background 0.15s, border 0.15s',
            }}>
            <span>{emo}</span>
            {isFound && (
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: fontSize + 6, color: '#06D6A0', fontWeight: 800,
                textShadow: '0 0 4px rgba(255,255,255,0.9)',
              }}>⭕</span>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { clearInterval(timerRef.current); setPhase('setup') }}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#555' }}>
          ←
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>🔍 {theme.label} · {difficulty.label}</h2>
        <div style={{ fontSize: 13, color: timerColor, fontWeight: 700 }}>⏱ {timeLeft}s</div>
      </div>

      {/* 진행률 */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
        {Array.from({ length: puzzle.diffSet.size }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            background: i < found.size ? '#06D6A0' : '#E0E0E0',
            transition: 'background 0.2s',
          }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
          {found.size} / {puzzle.diffSet.size} · ❌ {mistakes}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 10 }}>
        오른쪽 그림에서 왼쪽과 <strong>다른 부분</strong>을 찾아 누르세요
      </p>

      {/* 두 그림 나란히 */}
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>원본</div>
          {renderGrid(puzzle.left, false)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>다른 그림</div>
          {renderGrid(puzzle.right, true)}
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#AAA', textAlign: 'center', marginTop: 14 }}>
        정답 +100점 · 실수 -10점 · 남은 시간 보너스 🎯
      </div>
    </div>
  )
}
