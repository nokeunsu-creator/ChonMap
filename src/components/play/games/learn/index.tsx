// 학습 게임 래퍼 — pocket-money에서 포팅된 .jsx 게임들을 ChonMap용으로 감쌈
import React from 'react';
// @ts-ignore
import GradeQuizRaw from './GradeQuiz.jsx';
// @ts-ignore
import BadukClassroomRaw from './BadukClassroom.jsx';
// @ts-ignore
import EnglishChampionshipRaw from './EnglishChampionship.jsx';
// @ts-ignore
import HistoryQuizRaw from './HistoryQuiz.jsx';
// @ts-ignore
import ScienceQuizRaw from './ScienceQuiz.jsx';
// @ts-ignore
import NonsenseQuizRaw from './NonsenseQuiz.jsx';
// @ts-ignore
import WordMatchingRaw from './WordMatching.jsx';
// @ts-ignore
import MathSpeedQuizRaw from './MathSpeedQuiz.jsx';
// @ts-ignore
import ShapeQuizRaw from './ShapeQuiz.jsx';
// @ts-ignore
import MathChampionshipRaw from './MathChampionship.jsx';
// @ts-ignore
import WordBattleRaw from './WordBattle.jsx';
// @ts-ignore
import WordSprintRaw from './WordSprint.jsx';

// 데이터
// @ts-ignore
import badukQuizData from '../../../../data/badukQuiz.js';
// @ts-ignore
import proverbQuizData from '../../../../data/proverbQuiz.js';
// @ts-ignore
import spellingQuizData from '../../../../data/spellingQuiz.js';
// @ts-ignore
import flagQuizData from '../../../../data/flagQuiz.js';
// @ts-ignore
import continentQuizData from '../../../../data/continentQuiz.js';
// @ts-ignore
import dinosaurQuizData from '../../../../data/dinosaurQuiz.js';
// @ts-ignore
import spaceQuizData from '../../../../data/spaceQuiz.js';
// @ts-ignore
import hanjaQuizData from '../../../../data/hanjaQuiz.js';
// @ts-ignore
import logicQuizData from '../../../../data/logicQuiz.js';
// @ts-ignore
import safetyQuizData from '../../../../data/safetyQuiz.js';

const GradeQuiz = GradeQuizRaw as any;
const BadukClassroom = BadukClassroomRaw as any;
const EnglishChampionship = EnglishChampionshipRaw as any;
const HistoryQuiz = HistoryQuizRaw as any;
const ScienceQuiz = ScienceQuizRaw as any;
const NonsenseQuiz = NonsenseQuizRaw as any;
const WordMatching = WordMatchingRaw as any;
const MathSpeedQuiz = MathSpeedQuizRaw as any;
const ShapeQuiz = ShapeQuizRaw as any;
const MathChampionship = MathChampionshipRaw as any;
const WordBattle = WordBattleRaw as any;
const WordSprint = WordSprintRaw as any;

interface Props { onBack: () => void }

// GradeQuiz 기반 10개 게임
export const BadukQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="baduk" title="바둑 퀴즈" icon="❓" color="#8B6914" grades={badukQuizData} onBack={onBack} />;
export const ProverbQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="proverb" title="사자성어/속담" icon="📜" color="#8B4513" grades={proverbQuizData} onBack={onBack} />;
export const SpellingQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="spelling" title="맞춤법" icon="✏️" color="#2C3E50" grades={spellingQuizData} onBack={onBack} />;
export const FlagQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="flag" title="세계 국기/수도" icon="🌍" color="#27AE60" grades={flagQuizData} onBack={onBack} />;
export const ContinentQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="continent" title="지도 나라 찾기" icon="🗺️" color="#16A085" grades={continentQuizData} onBack={onBack} />;
export const DinosaurQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="dinosaur" title="공룡 퀴즈" icon="🦖" color="#8B5A2B" grades={dinosaurQuizData} onBack={onBack} />;
export const SpaceQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="space" title="우주 퀴즈" icon="🌌" color="#6A1B9A" grades={spaceQuizData} onBack={onBack} />;
export const HanjaQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="hanja" title="한자" icon="漢" color="#C0392B" grades={hanjaQuizData} onBack={onBack} />;
export const LogicQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="logic" title="코딩/논리" icon="🧩" color="#8E44AD" grades={logicQuizData} onBack={onBack} />;
export const SafetyQuizGame = ({ onBack }: Props) =>
  <GradeQuiz quizId="safety" title="안전/생활상식" icon="🛡️" color="#E67E22" grades={safetyQuizData} onBack={onBack} />;

// 독립 게임
export const BadukClassroomGame = ({ onBack }: Props) => <BadukClassroom onBack={onBack} />;
export const EnglishChampionshipGame = ({ onBack }: Props) => <EnglishChampionship onBack={onBack} />;
export const HistoryQuizGame = ({ onBack }: Props) => <HistoryQuiz onBack={onBack} />;
export const ScienceQuizGame = ({ onBack }: Props) => <ScienceQuiz onBack={onBack} />;
export const NonsenseQuizGame = ({ onBack }: Props) => <NonsenseQuiz onBack={onBack} />;
export const WordMatchingGame = ({ onBack }: Props) => <WordMatching onBack={onBack} />;
export const MathSpeedQuizGame = ({ onBack }: Props) => <MathSpeedQuiz onBack={onBack} />;
export const ShapeQuizGame = ({ onBack }: Props) => <ShapeQuiz onBack={onBack} />;
export const MathChampionshipGame = ({ onBack }: Props) => <MathChampionship onBack={onBack} />;
export const WordBattleGame = ({ onBack }: Props) => <WordBattle onBack={onBack} />;
export const WordSprintGame = ({ onBack }: Props) => <WordSprint onBack={onBack} />;
