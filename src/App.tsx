/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  MapPin, 
  ShoppingBag, 
  Ship, 
  Fish, 
  ChevronRight, 
  RotateCcw, 
  Home, 
  CheckCircle2, 
  XCircle,
  Star,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { generateQuestionsPool } from './questions';

// --- Assets ---
const MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3';

type SfxName = 'CORRECT' | 'WRONG' | 'WIN' | 'CLICK';

let _audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _audioCtx;
};

// Synthesize SFX with Web Audio API — no external URLs to break
const synthesizeSfx = (name: SfxName) => {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;

  const beep = (freq: number, start: number, dur: number, vol = 0.25, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0 + start);
    gain.gain.setValueAtTime(0, t0 + start);
    gain.gain.linearRampToValueAtTime(vol, t0 + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.02);
  };

  switch (name) {
    case 'CORRECT':
      beep(880, 0, 0.12, 0.25, 'sine');     // A5
      beep(1318, 0.1, 0.22, 0.25, 'sine');  // E6
      break;
    case 'WRONG':
      beep(220, 0, 0.18, 0.25, 'square');   // A3 buzz
      beep(165, 0.12, 0.25, 0.22, 'square'); // E3
      break;
    case 'WIN':
      [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.1, 0.35, 0.22, 'triangle')); // C-E-G-C arpeggio
      break;
    case 'CLICK':
      beep(1500, 0, 0.04, 0.18, 'square');
      break;
  }
};

// --- Types ---
type GameState = 'MENU' | 'LEVEL_SELECT' | 'PLAYING' | 'RESULT';
type Level = {
  id: string;
  title: string;
  location: string;
  description: string;
  icon: React.ReactNode;
  topic: string;
  color: string;
  character: string;
};

type Question = {
  text: string;
  answer: number | string;
  options: (number | string)[];
};

type UserAnswer = {
  question: string;
  correctAnswer: number | string;
  userValue: number | string;
  isCorrect: boolean;
};

// --- Levels Data ---
const LEVELS: Level[] = [
  {
    id: 'mongkok',
    title: '旺角大搜查',
    location: '旺角',
    description: '喺鬧市幫媽媽買嘢，計下要整幾多至啱！',
    icon: <ShoppingBag className="w-8 h-8" />,
    topic: '四位數加減',
    color: 'bg-red-500',
    character: 'melon_bun.png', // Green creature -> Melon Bun
  },
  {
    id: 'starferry',
    title: '天星小輪航行',
    location: '維多利亞港',
    description: '計下小輪有幾多位乘客，準時啟航！',
    icon: <Ship className="w-8 h-8" />,
    topic: '基本乘除法',
    color: 'bg-blue-500',
    character: 'dolphin.png', // Dolphin
  },
  {
    id: 'oceanpark',
    title: '海洋公園餵飼員',
    location: '海洋公園',
    description: '將食物分畀可愛嘅小動物，認識分數！',
    icon: <Fish className="w-8 h-8" />,
    topic: '同分母分數',
    color: 'bg-teal-500',
    character: 'cow.png', // Cow
  },
  {
    id: 'spacemuseum',
    title: '太空館之旅',
    location: '尖沙咀',
    description: '嚟到太空館，記住準時睇天象節目呀！',
    icon: <Star className="w-8 h-8" />,
    topic: '時間與日曆',
    color: 'bg-indigo-500',
    character: 'owl.png', // Owl
  },
  {
    id: 'bigbuddha',
    title: '大嶼山尋寶',
    location: '昂坪',
    description: '喺昂坪高原探索，認識各種圖形！',
    icon: <MapPin className="w-8 h-8" />,
    topic: '平面圖形與周界',
    color: 'bg-amber-500',
    character: 'lion.png', // Lion
  },
];

const Mascot = ({ character, status }: { character: string; status: 'CORRECT' | 'WRONG' | null }) => {
  return (
    <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto pointer-events-none flex items-center justify-center">
      <motion.img
        src={`${import.meta.env.BASE_URL}${character}`}
        alt="Mascot"
        className="w-full h-full object-contain drop-shadow-xl"
        initial={{ y: 0 }}
        animate={
          status === 'CORRECT' 
            ? { 
                y: [0, -30, 0, -20, 0],
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.15, 1] 
              }
            : status === 'WRONG'
            ? { 
                x: [0, -15, 15, -15, 15, 0],
                rotate: [0, -15, 15, -15, 15, 0]
              }
            : { 
                y: [0, -8, 0],
                rotate: [0, 2, -2, 0]
              }
        }
        transition={
          status ? { duration: 0.6 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
      />
      
      {/* Speech Bubble */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-white font-bold text-sm whitespace-nowrap shadow-xl ${
              status === 'CORRECT' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {status === 'CORRECT' ? '你好叻呀！🎉' : '加油呀！下次會答啱！💪'}
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rotate-45 ${
              status === 'CORRECT' ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showFeedback, setShowFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [globalUsedQuestions, setGlobalUsedQuestions] = useState<Set<string>>(new Set());
  const [randomMascotIdx, setRandomMascotIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Background music: lazy-init on first user interaction (autoplay policy)
  const ensureMusic = useCallback(() => {
    if (!musicRef.current) {
      const audio = new Audio(MUSIC_URL);
      audio.loop = true;
      audio.volume = 0.15;
      musicRef.current = audio;
    }
    if (!isMuted) {
      musicRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  // React to mute toggle
  useEffect(() => {
    if (!musicRef.current) return;
    if (isMuted) musicRef.current.pause();
    else musicRef.current.play().catch(() => {});
  }, [isMuted]);

  // Sound Player — synthesizes via Web Audio API
  const playSound = useCallback((type: SfxName) => {
    ensureMusic();
    if (isMuted) return;
    try { synthesizeSfx(type); } catch (e) { console.warn('SFX failed', e); }
  }, [isMuted, ensureMusic]);

  // Update random mascot whenever we go to menu
  useEffect(() => {
    if (gameState === 'MENU') {
      setRandomMascotIdx(Math.floor(Math.random() * LEVELS.length));
    }
  }, [gameState]);

  const startLevel = (level: Level) => {
    setSelectedLevel(level);
    // Filter out globally used questions if pool allows
    let qs = generateQuestionsPool(level.id);
    const freshQs = qs.filter(q => !globalUsedQuestions.has(q.text));
    
    let selectedQs: Question[];
    if (freshQs.length >= 5) {
      selectedQs = freshQs.sort(() => Math.random() - 0.5).slice(0, 5);
    } else {
      // If we don't have enough fresh ones, take all fresh ones and pad with used ones
      const usedQs = qs.filter(q => globalUsedQuestions.has(q.text)).sort(() => Math.random() - 0.5);
      selectedQs = [...freshQs, ...usedQs].slice(0, 5);
    }
    
    setQuestions(selectedQs);
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswers([]);
    setGameState('PLAYING');
    setShowFeedback(null);
  };

  const handleAnswer = (val: number | string) => {
    if (showFeedback) return;
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = val === currentQ.answer;
    
    // Play feedback sound
    playSound(isCorrect ? 'CORRECT' : 'WRONG');

    // Track globally used
    setGlobalUsedQuestions(prev => new Set(prev).add(currentQ.text));

    setUserAnswers(prev => [...prev, {
      question: currentQ.text,
      correctAnswer: currentQ.answer,
      userValue: val,
      isCorrect
    }]);

    if (isCorrect) {
      setScore(s => s + 1);
      setShowFeedback('CORRECT');
    } else {
      setShowFeedback('WRONG');
    }

    setTimeout(() => {
      setShowFeedback(null);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(i => i + 1);
      } else {
        setGameState('RESULT');
        // Play win sound if score is good
        if (score >= 3) {
          playSound('WIN');
        }
      }
    }, 1800);
  };

  // --- Components ---

  const VolumeToggle = () => (
    <div className="fixed top-6 right-6 z-50">
      <button
        onClick={() => {
          ensureMusic();
          setIsMuted(m => !m);
        }}
        className="p-3 bg-white/80 backdrop-blur rounded-full shadow-lg border-2 border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors"
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>
    </div>
  );

  const MainMenu = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8 bg-gradient-to-b from-yellow-50 to-orange-100"
    >
      <VolumeToggle />
      <div className="relative">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-48 h-48 flex items-center justify-center"
        >
          <Mascot character={LEVELS[randomMascotIdx].character} status={null} />
        </motion.div>
        <Star className="absolute -top-4 -right-4 w-12 h-12 text-yellow-400 fill-current animate-pulse" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-5xl font-black text-orange-600 drop-shadow-sm tracking-tight">港數大冒險</h1>
        <p className="text-xl text-orange-800 font-medium italic">Math Quest: Hong Kong Adventure</p>
      </div>

      <p className="max-w-md text-gray-700 leading-relaxed text-lg">
        冒險者，準備好去香港各區挑戰數學難關未？<br/>
        收集星星，成為數學領航員！
      </p>

      <button
        onClick={() => {
          playSound('CLICK');
          setGameState('LEVEL_SELECT');
        }}
        className="group relative px-10 py-5 bg-orange-500 text-white text-2xl font-bold rounded-2xl shadow-xl hover:bg-orange-600 active:scale-95 transition-all transform hover:-translate-y-1"
        id="start-btn"
      >
        <span className="flex items-center gap-3">
          開始挑戰 <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </span>
      </button>
    </motion.div>
  );

  const LevelSelect = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 p-6 md:p-12 relative"
    >
      <VolumeToggle />
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <MapPin className="text-red-500" /> 選擇冒險地點
          </h2>
          <button 
            onClick={() => {
              playSound('CLICK');
              setGameState('MENU');
            }}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Home className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {LEVELS.map((level, idx) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="bg-white rounded-3xl shadow-lg border-b-4 border-gray-200 overflow-hidden cursor-pointer group flex flex-col"
              onClick={() => {
                playSound('CLICK');
                startLevel(level);
              }}
            >
              <div className={`${level.color} p-6 flex flex-col items-center justify-center text-white relative h-48`}>
                <img
                  src={`${import.meta.env.BASE_URL}${level.character}`}
                  alt={level.title}
                  className="w-32 h-32 object-contain group-hover:scale-110 transition-transform" 
                />
                <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  {level.icon}
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{level.topic}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{level.location}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">{level.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{level.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const Playing = () => {
    if (!selectedLevel || !questions[currentQuestionIndex]) return null;
    const q = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <VolumeToggle />
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className={`${selectedLevel.color} text-white p-2 rounded-lg`}>
              {selectedLevel.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 leading-none">{selectedLevel.title}</h3>
              <span className="text-xs text-gray-400">{selectedLevel.topic}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              playSound('CLICK');
              setGameState('MENU');
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Home className="w-5 h-5 text-gray-400" />
          </button>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 block">題目</span>
            <span className="text-lg font-black text-gray-700 font-mono tracking-tighter">{currentQuestionIndex + 1} / {questions.length}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100">
          <motion.div 
            className={`h-full ${selectedLevel.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        {/* Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto w-full">
          <Mascot character={selectedLevel.character} status={showFeedback} />

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-8 w-full"
            >
              <div className="p-8 md:p-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 shadow-inner">
                <h4 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                  {q.text}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {q.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={showFeedback !== null}
                    onClick={() => handleAnswer(opt)}
                    className="py-6 px-4 bg-white border-2 border-gray-200 rounded-2xl text-2xl font-bold text-gray-700 shadow-sm hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-50"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feedback Overlay */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 px-6"
            >
              {showFeedback === 'CORRECT' ? (
                <div className="bg-green-500 text-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
                  <CheckCircle2 className="w-16 h-16" />
                  <span className="text-3xl font-bold">答啱喇！你真係叻！</span>
                </div>
              ) : (
                <div className="bg-red-500 text-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
                  <XCircle className="w-16 h-16" />
                  <span className="text-3xl font-bold">差少少呀，加油呀！</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const Result = () => {
    const isPassed = score >= 3;
    
    useEffect(() => {
      if (isPassed) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, [isPassed]);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-4 relative"
      >
        <VolumeToggle />
        <div className="mb-4">
          <Mascot character={selectedLevel?.character || ''} status={isPassed ? 'CORRECT' : 'WRONG'} />
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[3.5rem] shadow-2xl border-b-[10px] border-gray-200 max-w-2xl w-full space-y-8 overflow-y-auto max-h-[90vh]">
          <div className="relative inline-block">
             <Trophy className={`w-20 h-20 md:w-28 md:h-28 mx-auto ${isPassed ? 'text-yellow-500 drop-shadow-lg' : 'text-gray-300'}`} />
             {isPassed && <div className="absolute inset-0 animate-ping bg-yellow-500 rounded-full opacity-10" />}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-gray-800">
              {isPassed ? '挑戰成功！' : '再接再厲！'}
            </h2>
            <p className="text-md md:text-lg text-gray-500 font-medium">
              {isPassed ? '你好有數學天分呀！' : '爭少少咋，快啲再挑戰多次！'}
            </p>
          </div>

          <div className="bg-orange-50 p-6 rounded-3xl border-2 border-orange-100">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">最終得分</span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl md:text-6xl font-black text-orange-500">{score}</span>
              <span className="text-xl md:text-2xl font-bold text-orange-300">/ {questions.length}</span>
            </div>
          </div>

          {/* Answer Summary */}
          <div className="space-y-4 text-left">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
              <Star className="text-yellow-500" /> 答案回顧
            </h3>
            <div className="space-y-3">
              {userAnswers.map((ans, i) => (
                <div key={i} className={`p-4 rounded-2xl border-l-8 ${ans.isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                  <p className="font-bold text-gray-800 mb-1">{i + 1}. {ans.question}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm">
                    <span className="text-gray-600 font-medium whitespace-nowrap">正確答案: <span className="text-green-700 font-bold">{ans.correctAnswer}</span></span>
                    <span className="text-gray-600 font-medium whitespace-nowrap">你嘅答案: <span className={`font-bold ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{ans.userValue}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <button 
              onClick={() => {
                playSound('CLICK');
                startLevel(selectedLevel!);
              }}
              className="flex-1 py-4 bg-orange-500 text-white text-xl font-bold rounded-2xl shadow-xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> 重新挑戰
            </button>
            <button 
              onClick={() => {
                playSound('CLICK');
                setGameState('LEVEL_SELECT');
                setSelectedLevel(null);
              }}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-600 text-xl font-bold rounded-2xl hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" /> 返去大地圖
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="font-sans antialiased text-gray-900 bg-gray-50 selection:bg-orange-200">
      <AnimatePresence mode="wait">
        {gameState === 'MENU' && <MainMenu key="menu" />}
        {gameState === 'LEVEL_SELECT' && <LevelSelect key="select" />}
        {gameState === 'PLAYING' && <Playing key="play" />}
        {gameState === 'RESULT' && <Result key="result" />}
      </AnimatePresence>
    </div>
  );
}
