import React, { useState, useMemo, useCallback } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { BackBar } from '../play/PlayHub';

interface QuizQuestion {
  personId: string;
  personName: string;
  correctTitle: string;
  options: string[];
}

interface KinshipQuizProps {
  onBack?: () => void;
}

const TITLE_POOL = [
  '아버지', '어머니', '할아버지', '할머니', '형', '오빠', '누나', '언니',
  '남동생', '여동생', '삼촌', '고모', '외삼촌', '이모', '사촌형', '사촌누나',
  '조카', '손자', '손녀', '증조부', '증조모', '큰아버지', '작은아버지',
  '며느리', '사위', '시아버지', '시어머니', '장인', '장모', '처남', '처제',
  '형수', '제수', '올케', '매형', '매제',
];

export function KinshipQuiz({ onBack }: KinshipQuizProps = {}) {
  const { state } = useFamily();
  const { relationships, graph, perspectivePersonId, darkMode: dark } = state;

  const [phase, setPhase] = useState<'idle' | 'playing' | 'result'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const personCount = Object.keys(graph.persons).length;

  const allTitles = useMemo(() => {
    const titles = new Set<string>(TITLE_POOL);
    for (const rel of relationships.values()) {
      if (rel.title) titles.add(rel.title);
    }
    return [...titles];
  }, [relationships]);

  const generateQuestions = useCallback((): QuizQuestion[] => {
    const candidates = [...relationships.entries()].filter(
      ([id, rel]) => id !== perspectivePersonId && rel.title && graph.persons[id]
    );
    if (candidates.length < 2) return [];

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    return selected.map(([id, rel]) => {
      const person = graph.persons[id];
      const correct = rel.title;
      const wrongPool = allTitles.filter(t => t !== correct);
      const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);
      return { personId: id, personName: person.name, correctTitle: correct, options };
    });
  }, [relationships, perspectivePersonId, graph.persons, allTitles]);

  const startQuiz = () => {
    const qs = generateQuestions();
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
    setPhase('playing');
  };

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === questions[current].correctTitle) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const startBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8B6914, #C4961A)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  };

  const backHeader = onBack ? <BackBar title="호칭 퀴즈" onBack={onBack} dark={dark} /> : null;

  if (personCount < 3) {
    return (
      <>
        {backHeader}
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginTop: 8 }}>호칭 퀴즈</div>
          <div style={{ fontSize: 13, color: textSecondary, marginTop: 8, lineHeight: 1.6 }}>
            퀴즈를 시작하려면<br />가족을 3명 이상 추가하세요.
          </div>
        </div>
      </>
    );
  }

  if (phase === 'idle') {
    return (
      <>
        {backHeader}
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎯</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>호칭 퀴즈</div>
          <div style={{ fontSize: 13, color: textSecondary, marginTop: 10, lineHeight: 1.7 }}>
            가계도 속 가족의 호칭을<br />맞춰보세요!
          </div>
          <button onClick={startQuiz} style={{ ...startBtnStyle, marginTop: 28 }}>
            시작하기
          </button>
        </div>
      </>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '😊' : '📚';
    return (
      <>
        {backHeader}
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>{emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>퀴즈 완료!</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: goldColor, marginTop: 16 }}>
            {score} / {questions.length}
          </div>
          <div style={{ fontSize: 14, color: textSecondary, marginTop: 4 }}>정답률 {pct}%</div>
          <div style={{ marginTop: 8, fontSize: 13, color: textSecondary }}>
            {pct >= 90 ? '완벽해요! 족보 박사 인정!' : pct >= 70 ? '잘 하셨어요!' : pct >= 50 ? '조금 더 연습해봐요.' : '호칭이 헷갈리시나요? 가계도를 다시 살펴보세요.'}
          </div>
          <button onClick={startQuiz} style={{ ...startBtnStyle, marginTop: 28 }}>
            다시 하기
          </button>
          <button onClick={() => setPhase('idle')} style={{
            marginTop: 10, background: 'none', border: `1px solid ${cardBorder}`,
            borderRadius: 14, padding: '12px 28px', fontSize: 14, color: textSecondary, cursor: 'pointer', display: 'block', width: '100%',
          }}>
            처음으로
          </button>
        </div>
      </>
    );
  }

  const q = questions[current];
  const perspPerson = graph.persons[perspectivePersonId];

  return (
    <>
    {backHeader}
    <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      {/* 진행 상황 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: textSecondary }}>{current + 1} / {questions.length}</div>
        <div style={{ fontSize: 13, color: goldColor, fontWeight: 700 }}>점수 {score}</div>
      </div>
      <div style={{ height: 5, background: cardBorder, borderRadius: 3, marginBottom: 20 }}>
        <div style={{
          height: '100%', background: goldColor, borderRadius: 3,
          width: `${((current + 1) / questions.length) * 100}%`, transition: 'width 0.3s',
        }} />
      </div>

      {/* 문제 카드 */}
      <div style={{
        background: cardBg, border: `1px solid ${cardBorder}`,
        borderRadius: 18, padding: '24px 20px', marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>
          <strong style={{ color: goldColor }}>{perspPerson?.name || '나'}</strong> 기준으로
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: textPrimary }}>{q.personName}</div>
        <div style={{ fontSize: 14, color: textSecondary, marginTop: 10 }}>은/는 뭐라고 부르나요?</div>
      </div>

      {/* 보기 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {q.options.map(option => {
          let bg = cardBg;
          let border = cardBorder;
          let color = textPrimary;
          if (answered) {
            if (option === q.correctTitle) {
              bg = dark ? '#064E3B' : '#D1FAE5'; border = '#10B981'; color = dark ? '#6EE7B7' : '#065F46';
            } else if (option === selected) {
              bg = dark ? '#450A0A' : '#FEE2E2'; border = '#EF4444'; color = dark ? '#FCA5A5' : '#991B1B';
            }
          }
          return (
            <button key={option} onClick={() => handleSelect(option)} style={{
              background: bg, border: `2px solid ${border}`, borderRadius: 13,
              padding: '16px 10px', fontSize: 16, fontWeight: 700, color,
              cursor: answered ? 'default' : 'pointer', textAlign: 'center', transition: 'all 0.15s',
            }}>
              {option}
            </button>
          );
        })}
      </div>

      {/* 정오답 피드백 */}
      {answered && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 12, textAlign: 'center',
          background: selected === q.correctTitle
            ? (dark ? '#064E3B' : '#D1FAE5')
            : (dark ? '#450A0A' : '#FEE2E2'),
          fontSize: 13, color: selected === q.correctTitle
            ? (dark ? '#6EE7B7' : '#065F46')
            : (dark ? '#FCA5A5' : '#991B1B'),
        }}>
          {selected === q.correctTitle
            ? '정답!'
            : `오답! 정답은 "${q.correctTitle}"`}
        </div>
      )}

      {answered && (
        <button onClick={handleNext} style={{
          marginTop: 12, width: '100%',
          background: 'linear-gradient(135deg, #8B6914, #C4961A)',
          color: 'white', border: 'none', borderRadius: 14,
          padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {current + 1 >= questions.length ? '결과 보기' : '다음 문제 →'}
        </button>
      )}
    </div>
    </>
  );
}
