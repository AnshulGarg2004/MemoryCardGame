'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './MemoryCardGame.css';

const THEMES = {
  emoji: [
    '😀','😄','😁','😆','🥹','😅','😂','🙂','😊','😉','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪',
    '🤗','🤔','🤨','😐','😑','😶','🙄','😏','😴','🤤','🤧','🤒','😷','🤕','🥳','😎','🧐','🤓','😇','🥸',
    '🤠','👻','💩','👾','🤖','🎃','😺','😸','😹','😻','😼','🙀','😿','😾','🦄','🐵','🐶','🐱','🐭','🐹',
    '🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐙','🐵'
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🐴','🦄',
    '🦓','🦍','🦧','🦣','🦛','🦏','🐘','🦒','🦌','🦬','🐂','🐃','🐄','🐖','🐏','🐑','🐐','🦙','🦥','🦦',
    '🦨','🦘','🦡','🦫','🦔','🦝'
  ],
  fruits: [
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍍','🥭','🥝','🍅','🍑','🥥','🥑','🌶️','🍈','🥕',
    '🍆','🥒','🥬','🥦','🧄','🧅','🥔','🌽','🍠','🍤','🍲'
  ],
  tech: [
    '💻','🖥️','⌨️','🖱️','🖨️','🕹️','💾','📱','📲','🔋','🔌','🧠','🤖','🛰️','📡','💡','🧪','⚙️','🪛','🧰',
    '🧯','🧲','🧬','🧫','🧮','🔭','🔬','📷','📹','🎥','📺','📻','📼','📠','📞','☎️','📟','📡','🔦','🔧','🔨'
  ],
  shapes: [
    '⭐','🌙','☀️','🌈','❄️','🔥','💧','⚡','💫','✨','🎈','🎯','🎲','🧩','🔶','🔷','⚪','⚫','🔺','🔻','🔳',
    '🔲','⬜','⬛','🔴','🟠','🟡','🟢','🔵','🟣','🟤','🟥','🟧','🟨','🟩','🟦','🟪','🟫','◼️','◻️','◾','◽',
    '▪️','▫️','◉','◊','⬠','⬡','⬢','⬣','⬤','⏺️'
  ]
};

const DIFFICULTY_TO_SIZE = { '4x4': 4, '6x6': 6, '8x8': 8 };
const DIFFICULTY_LABELS = { '4x4': 'Easy (4×4)', '6x6': 'Medium (6×6)', '8x8': 'Hard (8×8)' };
const COUNTDOWN_LIMITS = { '4x4': 60, '6x6': 120, '8x8': 180 };

interface GameState {
  first: HTMLButtonElement | null;
  second: HTMLButtonElement | null;
  lock: boolean;
  moves: number;
  matchedPairs: number;
  totalPairs: number;
  timerId: NodeJS.Timeout | null;
  seconds: number;
  started: boolean;
  score: number;
  inProgress: boolean;
}

export default function MemoryCardGame() {
  const [difficulty, setDifficulty] = useState('4x4');
  const [theme, setTheme] = useState('emoji');
  const [timerMode, setTimerMode] = useState('up');
  const [gameState, setGameState] = useState<GameState>({
    first: null,
    second: null,
    lock: false,
    moves: 0,
    matchedPairs: 0,
    totalPairs: 0,
    timerId: null,
    seconds: 0,
    started: false,
    score: 0,
    inProgress: false
  });
  const [seconds, setSeconds] = useState(0);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', best: null as any });
  const [deck, setDeck] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalFlips, setTotalFlips] = useState(0);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const boardRef = useRef<HTMLDivElement>(null);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1500);
  };

  const getCountdownLimit = () => COUNTDOWN_LIMITS[difficulty as keyof typeof COUNTDOWN_LIMITS] || 120;

  const resetTimer = useCallback(() => {
    if (timerId) clearInterval(timerId);
    setTimerId(null);
    setGameStarted(false);
    const initialSeconds = timerMode === 'down' ? getCountdownLimit() : 0;
    setSeconds(initialSeconds);
  }, [timerId, timerMode, getCountdownLimit]);

  const startTimer = useCallback(() => {
    if (gameStarted) return;
    
    setGameStarted(true);
    setGameState(prev => ({ ...prev, inProgress: true }));

    const newTimerId = setInterval(() => {
      setSeconds(prev => {
        const newSeconds = timerMode === 'down' ? prev - 1 : prev + 1;
        
        if (timerMode === 'down') {
          if (newSeconds === 30) {
            showToast('⏰ 30 seconds left!', 'info');
          } else if (newSeconds === 10) {
            showToast('⚠️ 10 seconds left!', 'error');
          }
          
          if (newSeconds <= 0) {
            clearInterval(newTimerId);
            setTimerId(null);
            handleTimeUp();
            return 0;
          }
        }
        
        return newSeconds;
      });
    }, 1000);
    
    setTimerId(newTimerId);
  }, [gameStarted, timerMode]);

  const handleTimeUp = () => {
    setTimeout(() => {
      setModalData({
        title: "⏰ Time's up!",
        message: "You ran out of time!",
        best: null
      });
      setShowModal(true);
      setGameState(prev => ({ ...prev, inProgress: false }));
    }, 400);
  };

  const shuffle = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const buildDeck = (selectedTheme: string, size: number) => {
    const pairsNeeded = (size * size) / 2;
    const pool = THEMES[selectedTheme as keyof typeof THEMES] || THEMES.emoji;

    if (pool.length < pairsNeeded) {
      const base = [...pool];
      while (base.length < pairsNeeded) base.push(...THEMES.emoji);
      const picks = shuffle(base).slice(0, pairsNeeded);
      return shuffle([...picks, ...picks]);
    }

    const picks = shuffle([...pool]).slice(0, pairsNeeded);
    return shuffle([...picks, ...picks]);
  };

  const saveBest = (difficulty: string, moves: number, seconds: number, score: number) => {
    const key = `memory-best-${difficulty}`;
    const existing = JSON.parse(localStorage.getItem(key) || 'null');
    const current = { moves, seconds, score, ts: Date.now() };
    if (!existing || score > existing.score) {
      localStorage.setItem(key, JSON.stringify(current));
      return current;
    }
    return existing;
  };

  const endGame = useCallback(() => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    setGameStarted(false);
    setFinalSeconds(seconds);
    setGameState(prev => ({ ...prev, inProgress: false }));

    const best = saveBest(difficulty, gameState.moves, seconds, gameState.score);
    setModalData({
      title: "🎉 Congratulations!",
      message: "You matched all pairs.",
      best
    });
    setShowModal(true);
  }, [timerId, seconds, difficulty, gameState.moves, gameState.score]);

  const checkMatch = useCallback((first: HTMLButtonElement, second: HTMLButtonElement) => {
    setTotalFlips(prev => prev + 1);
    
    // MATCHED - Cards have the same symbol
    if (first.dataset.symbol === second.dataset.symbol) {
      // Add matched animation and celebrate effect
      first.classList.add('matched', 'celebrate');
      second.classList.add('matched', 'celebrate');
      
      // Force cards to stay flipped showing emoji
      first.style.transform = "rotateY(180deg)";
      second.style.transform = "rotateY(180deg)";
      
      // Hide front face (pattern) and show back face (emoji)
      const firstFront = first.querySelector('.face.front') as HTMLElement;
      const firstBack = first.querySelector('.face.back') as HTMLElement;
      const secondFront = second.querySelector('.face.front') as HTMLElement;
      const secondBack = second.querySelector('.face.back') as HTMLElement;
      
      if (firstFront) firstFront.style.opacity = '0';
      if (firstBack) firstBack.style.opacity = '1';
      if (secondFront) secondFront.style.opacity = '0';
      if (secondBack) secondBack.style.opacity = '1';
      
      // Disable interactions on matched cards
      first.setAttribute('aria-disabled', 'true');
      second.setAttribute('aria-disabled', 'true');
      first.style.pointerEvents = "none";
      second.style.pointerEvents = "none";

      // Update stats - increase streak and add to move history
      setStreak(prev => prev + 1);
      setMoveHistory(prev => [...prev, `✅ Matched ${first.dataset.symbol}`].slice(-5));
      showToast(`Perfect match! ${first.dataset.symbol}`, 'success');

      // Update game state
      setGameState(prev => {
        const newMatchedPairs = prev.matchedPairs + 1;
        const newState = {
          ...prev,
          matchedPairs: newMatchedPairs,
          score: prev.score + 1000,
          first: null,
          second: null,
          lock: false
        };

        // Check if all pairs are matched - end game
        if (newMatchedPairs === prev.totalPairs) {
          setTimeout(() => endGame(), 800);
        }

        return newState;
      });

      // Remove celebrate bounce effect after animation
      setTimeout(() => {
        first.classList.remove('celebrate');
        second.classList.remove('celebrate');
      }, 700);
    } 
    // NOT MATCHED - Cards have different symbols
    else {
      // Reset streak and add miss to history
      setStreak(0);
      setMoveHistory(prev => [...prev, `❌ Miss ${first.dataset.symbol} & ${second.dataset.symbol}`].slice(-5));
      showToast('No match! Try again', 'error');

      // Lock the board and deduct points
      setGameState(prev => ({ ...prev, lock: true, score: prev.score - 100 }));

      // Flip cards back after a delay
      setTimeout(() => {
        first.classList.remove('flipped');
        second.classList.remove('flipped');

        // Unlock the board and reset selected cards
        setGameState(prev => ({
          ...prev,
          first: null,
          second: null,
          lock: false
        }));
      }, 700);
    }
  }, [endGame]);

  const onCardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = e.currentTarget;
    if (gameState.lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    startTimer();
    card.classList.add('flipped');

    if (!gameState.first) {
      setGameState(prev => ({ ...prev, first: card }));
      return;
    }

    const firstCard = gameState.first;
    setGameState(prev => ({ ...prev, second: card, moves: prev.moves + 1 }));
    checkMatch(firstCard, card);
  };

  const createCard = (symbol: string, idx: number) => (
    <button
      key={idx}
      className="card"
      role="gridcell"
      aria-label="Memory card"
      data-symbol={symbol}
      data-index={String(idx)}
      onClick={onCardClick}
    >
      <div className="face front">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="6" y="6" width="52" height="52" rx="12" stroke={`url(#g${idx})`} strokeWidth="2" fill={`url(#f${idx})`} />
          <defs>
            <linearGradient id={`g${idx}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity=".9" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity=".9" />
            </linearGradient>
            <linearGradient id={`f${idx}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,.02)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="face back">{symbol}</div>
    </button>
  );

  const clearBoard = () => {
    if (boardRef.current) {
      const cards = boardRef.current.querySelectorAll('.card');
      cards.forEach(card => {
        card.classList.remove('flipped', 'matched', 'celebrate');
        card.removeAttribute('aria-disabled');
        (card as HTMLElement).style.pointerEvents = "";
        (card as HTMLElement).style.transform = "";
        
        // Clear inline styles from face elements
        const front = card.querySelector('.face.front') as HTMLElement;
        const back = card.querySelector('.face.back') as HTMLElement;
        if (front) front.style.opacity = "";
        if (back) back.style.opacity = "";
      });
    }
    
    setGameState({
      first: null,
      second: null,
      lock: false,
      moves: 0,
      matchedPairs: 0,
      totalPairs: 0,
      timerId: null,
      seconds: 0,
      started: false,
      score: 0,
      inProgress: false
    });
    setMoveHistory([]);
    setStreak(0);
    setTotalFlips(0);
    setFinalSeconds(0);
    resetTimer();
  };

  const newGame = useCallback(() => {
    clearBoard();
    const size = DIFFICULTY_TO_SIZE[difficulty as keyof typeof DIFFICULTY_TO_SIZE] || 4;
    const newDeck = buildDeck(theme, size);
    setDeck(newDeck);
    setGameState(prev => ({ ...prev, totalPairs: newDeck.length / 2 }));
  }, [difficulty, theme]);

  const handleNewGameBtn = () => {
    if (gameState.inProgress) {
      setShowConfirmModal(true);
    } else {
      newGame();
    }
  };

  const handleDifficultyChange = (newDifficulty: string) => {
    if (gameState.inProgress) {
      setShowConfirmModal(true);
      return;
    }
    setDifficulty(newDifficulty);
    newGame();
  };

  const handleThemeChange = (newTheme: string) => {
    if (gameState.inProgress) {
      setShowConfirmModal(true);
      return;
    }
    setTheme(newTheme);
    newGame();
  };

  const handleTimerModeChange = (newMode: string) => {
    setTimerMode(newMode);
    resetTimer();
  };

  const confirmRestart = (confirmed: boolean) => {
    setShowConfirmModal(false);
    if (confirmed) {
      newGame();
    }
  };

  const getBestScore = (difficulty: string) => {
    const key = `memory-best-${difficulty}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  };

  const getAllBestScores = () => {
    return {
      '4x4': getBestScore('4x4'),
      '6x6': getBestScore('6x6'),
      '8x8': getBestScore('8x8')
    };
  };

  useEffect(() => {
    newGame();
  }, [newGame]);

  useEffect(() => {
    if (!gameStarted) {
      const initialSeconds = timerMode === 'down' ? getCountdownLimit() : 0;
      setSeconds(initialSeconds);
    }
  }, [timerMode, difficulty, gameStarted, getCountdownLimit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const size = DIFFICULTY_TO_SIZE[difficulty as keyof typeof DIFFICULTY_TO_SIZE] || 4;
  const allBestScores = getAllBestScores();

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="logo">🎉</span>
          <h1 className="title-animated">
            Flip Fiesta
          </h1>
        </div>

        <div className="controls">
          <label className="control">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(e) => handleDifficultyChange(e.target.value)}>
              <option value="4x4">Easy (4x4)</option>
              <option value="6x6">Medium (6x6)</option>
              <option value="8x8">Hard (8x8)</option>
            </select>
          </label>

          <label className="control">
            <span>Theme</span>
            <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
              <option value="emoji">Emoji</option>
              <option value="animals">Animals</option>
              <option value="fruits">Fruits</option>
              <option value="tech">Tech</option>
              <option value="shapes">Shapes</option>
            </select>
          </label>

          <label className="control">
            <span>Timer Mode</span>
            <select value={timerMode} onChange={(e) => handleTimerModeChange(e.target.value)}>
              <option value="up">Count Up</option>
              <option value="down">Count Down</option>
            </select>
          </label>

          <button onClick={handleNewGameBtn} className="btn primary">
            {gameState.inProgress ? 'Restart' : 'New Game'}
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span>{gameState.moves}</span>
            <span className="label">Moves</span>
          </div>
          <div className="stat">
            <span>{formatTime(seconds)}</span>
            <span className="label">Time</span>
          </div>
          <div className="stat">
            <span>{gameState.score}</span>
            <span className="label">Score</span>
          </div>
        </div>
      </div>

      <div className="game-content">
        <div className="sidebar left-sidebar">
          <div className="sidebar-section">
            <h3><span className="trophy-icon">🏆</span> Best Scores</h3>
            {Object.entries(allBestScores).map(([diff, best]) => (
              <div key={diff} className="best-score" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="difficulty-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                    {DIFFICULTY_LABELS[diff as keyof typeof DIFFICULTY_LABELS]}
                  </span>
                  {diff === difficulty && <span style={{ fontSize: '12px', color: '#22d3ee' }}>● Current</span>}
                </div>
                {best && best.score > 0 ? (
                  <div className="score-details">
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#06b6d4' }}>{best.score} pts</div>
                    <div className="score-meta" style={{ fontSize: '12px', opacity: 0.7 }}>
                      {best.moves} moves • {formatTime(best.seconds)}
                    </div>
                  </div>
                ) : (
                  <div className="no-score" style={{ fontSize: '13px', opacity: 0.5 }}>No record yet</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="sidebar-section">
            <h3>📊 Progress</h3>
            <div className="progress-item">
              <span>Pairs Matched</span>
              <span className="progress-value">{gameState.matchedPairs} / {gameState.totalPairs}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${gameState.totalPairs > 0 ? (gameState.matchedPairs / gameState.totalPairs) * 100 : 0}%` }}
              />
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.7 }}>
              {gameState.totalPairs > 0 
                ? `${Math.round((gameState.matchedPairs / gameState.totalPairs) * 100)}% Complete`
                : 'Start playing to track progress'}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>🏅 Achievements</h3>
            <div className="achievements">
              <div className={`achievement ${gameState.moves > 0 ? 'unlocked' : ''}`}>
                <span className="achievement-icon">🎮</span>
                <span className="achievement-text">First Move</span>
              </div>
              <div className={`achievement ${streak >= 3 ? 'unlocked' : ''}`}>
                <span className="achievement-icon">🔥</span>
                <span className="achievement-text">On Fire (3x streak)</span>
              </div>
              <div className={`achievement ${gameState.score >= 5000 ? 'unlocked' : ''}`}>
                <span className="achievement-icon">⭐</span>
                <span className="achievement-text">High Scorer (5000+)</span>
              </div>
              <div className={`achievement ${gameState.matchedPairs === gameState.totalPairs && gameState.totalPairs > 0 ? 'unlocked' : ''}`}>
                <span className="achievement-icon">🎯</span>
                <span className="achievement-text">Perfect Match</span>
              </div>
            </div>
          </div>
        </div>

        <div className="board-container">
          {/* Toast Notification */}
          {toast && (
            <div className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
          <div 
            ref={boardRef}
            className="board" 
            data-columns={size}
            style={{ '--cols': size } as React.CSSProperties}
          >
            {deck.map((symbol, idx) => createCard(symbol, idx))}
          </div>
        </div>

        <div className="sidebar right-sidebar">
          <div className="sidebar-section">
            <h3>📊 Live Stats</h3>
            <div className="live-stats">
              <div className="stat-item">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">
                  {totalFlips > 0 ? Math.round((gameState.matchedPairs / totalFlips) * 100) : 0}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Streak</span>
                <span className={`stat-value ${streak > 0 ? 'streak-active' : ''}`}>
                  {streak > 0 ? `🔥 ${streak}x` : '0'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.6 }}>
              {totalFlips > 0 
                ? `${totalFlips} ${totalFlips === 1 ? 'flip' : 'flips'} made`
                : 'Make your first move!'}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>📋 Move History</h3>
            <div className="move-history">
              {moveHistory.length === 0 ? (
                <div className="no-moves">No moves yet</div>
              ) : (
                moveHistory.map((move, idx) => (
                  <div key={idx} className="move-item">{move}</div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>🏆 Scoring</h3>
            <div className="scoring-info">
              <div className="score-rule">
                <span>✅ Match: +1000 pts</span>
              </div>
              <div className="score-rule">
                <span>❌ Miss: -100 pts</span>
              </div>
              <div className="score-rule">
                <span>🎯 Target: {gameState.totalPairs * 1000} pts</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>💡 Tips</h3>
            <div className="tips">
              <div className="tip">
                <span className="tip-icon">🧠</span>
                <span>Remember card positions</span>
              </div>
              <div className="tip">
                <span className="tip-icon">⚡</span>
                <span>Speed = Higher score</span>
              </div>
              <div className="tip">
                <span className="tip-icon">🎯</span>
                <span>Fewer moves = Bonus points</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {showModal && (
        <div className="modal" aria-hidden="false" role="dialog" aria-labelledby="modalTitle">
          <div className="modal-dialog">
            <h2 id="modalTitle">{modalData.title}</h2>
            <p>{modalData.message}</p>

            <div className="results">
              <div>Moves: <span>{gameState.moves}</span></div>
              <div>Time: <span>{formatTime(finalSeconds)}</span></div>
              <div>Score: <span>{gameState.score}</span></div>
            </div>

            {modalData.best && (
              <>
                <p>Best Performance:</p>
                <div className="best">
                  <span>Score {modalData.best.score} • {modalData.best.moves} moves • {formatTime(modalData.best.seconds)}</span>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button onClick={() => { setShowModal(false); newGame(); }} className="btn primary">
                Play Again
              </button>
              <button onClick={() => setShowModal(false)} className="btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal" aria-hidden="false" role="dialog" aria-labelledby="confirmTitle">
          <div className="modal-dialog">
            <h2 id="confirmTitle">Restart Game?</h2>
            <p>Your current progress will be lost. Are you sure you want to restart?</p>
            <div className="modal-actions">
              <button onClick={() => confirmRestart(true)} className="btn primary">Yes</button>
              <button onClick={() => confirmRestart(false)} className="btn">No</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}