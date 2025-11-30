// Memory Card Game
document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const boardEl = document.getElementById('board');
  const movesEl = document.getElementById('moves');
  const timeEl = document.getElementById('time');
  const scoreEl = document.getElementById('score');
  const difficultyEl = document.getElementById('difficulty');
  const themeEl = document.getElementById('theme');
  const newGameBtn = document.getElementById('newGame');
  const timerModeEl = document.getElementById('timerMode');

  // Modals
  const modal = document.getElementById('modal');
  const playAgainBtn = document.getElementById('playAgain');
  const closeModalBtn = document.getElementById('closeModal');
  const finalMovesEl = document.getElementById('finalMoves');
  const finalTimeEl = document.getElementById('finalTime');
  const finalScoreEl = document.getElementById('finalScore');
  const bestBox = document.getElementById('bestBox');
  const bestText = document.getElementById('bestText');

  const confirmModal = document.getElementById('confirmModal');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  // --- Config ---
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
  const COUNTDOWN_LIMITS = { '4x4': 60, '6x6': 120, '8x8': 180 };

  // --- State ---
  let state = {
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
    inProgress: false,
    lastDifficulty: difficultyEl.value,
    lastTheme: themeEl.value
  };

  let countdownTimeout = null;

  // --- Helpers ---
  function updateNewGameBtn(isOver = false) {
    newGameBtn.textContent = isOver ? 'New Game' : 'Restart';
  }

  function confirmRestart() {
    return new Promise((resolve) => {
      confirmModal.classList.remove('hidden');
      confirmModal.setAttribute('aria-hidden', 'false');

      function cleanup(result) {
        confirmModal.classList.add('hidden');
        confirmModal.setAttribute('aria-hidden', 'true');
        confirmYes.removeEventListener('click', onYes);
        confirmNo.removeEventListener('click', onNo);
        resolve(result);
      }

      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }

      confirmYes.addEventListener('click', onYes);
      confirmNo.addEventListener('click', onNo);
    });
  }

  function setBoardColumns(cols) {
    boardEl.style.setProperty('--cols', cols);
    boardEl.setAttribute('data-columns', String(cols));
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function resetTimer() {
    if (state.timerId) clearInterval(state.timerId);
    if (countdownTimeout) clearTimeout(countdownTimeout);
    state.seconds = 0;
    state.timerId = null;
    state.started = false;
    timeEl.textContent = timerModeEl.value === 'down'
      ? formatTime(getCountdownLimit())
      : '00:00';
  }

  function getCountdownLimit() {
    return COUNTDOWN_LIMITS[difficultyEl.value] || 120;
  }

  // --- Timer ---
  function startTimer() {
    if (state.started) return;
    state.started = true;
    state.inProgress = true;
    updateNewGameBtn(false);

    if (timerModeEl.value === 'down') {
      state.seconds = getCountdownLimit();
      timeEl.textContent = formatTime(state.seconds);
      state.timerId = setInterval(() => {
        state.seconds--;
        timeEl.textContent = formatTime(state.seconds);
        if (state.seconds <= 0) {
          clearInterval(state.timerId);
          state.timerId = null;
          handleTimeUp();
        }
      }, 1000);
    } else {
      state.seconds = 0;
      state.timerId = setInterval(() => {
        state.seconds++;
        timeEl.textContent = formatTime(state.seconds);
      }, 1000);
    }
  }

  function handleTimeUp() {
    setTimeout(() => {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      finalMovesEl.textContent = String(state.moves);
      finalTimeEl.textContent = formatTime(0);
      finalScoreEl.textContent = String(state.score);
      bestBox.classList.add('hidden');
      modal.querySelector('#modalTitle').textContent = "⏰ Time's up!";
      modal.querySelector('p').textContent = "You ran out of time!";
      state.inProgress = false;
      updateNewGameBtn(true);
    }, 400);
  }

  // --- Scoring ---
  function calcScore(moves, seconds, totalPairs) {
    const optimalMoves = totalPairs;
    const moveFactor = Math.max(0.2, optimalMoves / Math.max(moves, 1));
    const timeFactor = Math.max(0.2, (totalPairs * 8) / Math.max(seconds, 1));
    let score = Math.round(2000 * moveFactor + 2000 * timeFactor + totalPairs * 120);
    return Math.min(10000, score);
  }

  // --- Deck & Cards ---
  function buildDeck(theme, size) {
    const pairsNeeded = (size * size) / 2;
    const pool = THEMES[theme] || THEMES.emoji;

    if (pool.length < pairsNeeded) {
      const base = [...pool];
      while (base.length < pairsNeeded) base.push(...THEMES.emoji);
      const picks = shuffle(base).slice(0, pairsNeeded);
      return shuffle([...picks, ...picks]);
    }

    const picks = shuffle([...pool]).slice(0, pairsNeeded);
    return shuffle([...picks, ...picks]);
  }

  function createCard(symbol, idx) {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('role', 'gridcell');
    card.setAttribute('aria-label', 'Memory card');
    card.dataset.symbol = symbol;
    card.dataset.index = String(idx);

    const front = document.createElement('div');
    front.className = 'face front';
    front.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="6" y="6" width="52" height="52" rx="12" stroke="url(#g)" stroke-width="2" fill="url(#f)" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a78bfa" stop-opacity=".9" />
            <stop offset="100%" stop-color="#22d3ee" stop-opacity=".9" />
          </linearGradient>
          <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,.06)" />
            <stop offset="100%" stop-color="rgba(255,255,255,.02)" />
          </linearGradient>
        </defs>
      </svg>`;

    const back = document.createElement('div');
    back.className = 'face back';
    back.textContent = symbol;

    card.appendChild(front);
    card.appendChild(back);
    card.addEventListener('click', onCardClick);
    return card;
  }

  // --- Gameplay ---
  function onCardClick(e) {
    const card = e.currentTarget;
    if (state.lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    startTimer();
    card.classList.add('flipped');

    if (!state.first) {
      state.first = card;
      return;
    }

    state.second = card;
    state.moves += 1;
    movesEl.textContent = String(state.moves);
    checkMatch();
  }

  function checkMatch() {
    const a = state.first;
    const b = state.second;
    if (!a || !b) return;

    if (a.dataset.symbol === b.dataset.symbol) {
      a.classList.add('matched', 'celebrate');
      b.classList.add('matched', 'celebrate');
      a.setAttribute('aria-disabled', 'true');
      b.setAttribute('aria-disabled', 'true');
      state.matchedPairs += 1;
      state.score += 1000;
      state.first = null;
      state.second = null;
      updateScore();

      setTimeout(() => {
        a.classList.remove('celebrate');
        b.classList.remove('celebrate');
      }, 700);

      if (state.matchedPairs === state.totalPairs) endGame();
    } else {
      state.lock = true;
      state.score -= 100;
      updateScore();
      setTimeout(() => {
        a.classList.remove('flipped');
        b.classList.remove('flipped');
        state.first = null;
        state.second = null;
        state.lock = false;
      }, 700);
    }
  }

  function updateScore() {
    scoreEl.textContent = String(state.score);
  }

  // --- Best score storage ---
  function saveBest(difficulty, moves, seconds, score) {
    const key = `memory-best-${difficulty}`;
    const existing = JSON.parse(localStorage.getItem(key) || 'null');
    const current = { moves, seconds, score, ts: Date.now() };
    if (!existing || score > existing.score) {
      localStorage.setItem(key, JSON.stringify(current));
      return current;
    }
    return existing;
  }

  function loadBest(difficulty) {
    const key = `memory-best-${difficulty}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  }

  // --- End Game ---
  function endGame() {
    if (state.timerId) clearInterval(state.timerId);

    modal.querySelector('#modalTitle').textContent = "🎉 Congratulations!";
    modal.querySelector('p').textContent = "You matched all pairs.";

    finalMovesEl.textContent = String(state.moves);
    finalTimeEl.textContent = formatTime(state.seconds);
    finalScoreEl.textContent = String(state.score);

    const best = saveBest(difficultyEl.value, state.moves, state.seconds, state.score);
    if (best) {
      bestBox.classList.remove('hidden');
      bestText.textContent = `Score ${best.score} • ${best.moves} moves • ${formatTime(best.seconds)}`;
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    state.inProgress = false;
    updateNewGameBtn(true);
  }

  // --- Reset ---
  function clearBoard() {
    boardEl.innerHTML = '';
    state.first = null;
    state.second = null;
    state.lock = false;
    state.moves = 0;
    state.matchedPairs = 0;
    state.score = 0;
    state.inProgress = false;
    movesEl.textContent = '0';
    scoreEl.textContent = '0';
    resetTimer();
    updateNewGameBtn(true);
  }

  // --- Handlers ---
  async function handleNewGameBtn() {
    if (state.inProgress) {
      if (await confirmRestart()) newGame();
    } else {
      newGame();
    }
  }

  async function handleDifficultyChange() {
    if (state.inProgress) {
      if (await confirmRestart()) newGame();
      else difficultyEl.value = state.lastDifficulty;
    } else {
      newGame();
    }
    state.lastDifficulty = difficultyEl.value;
  }

  async function handleThemeChange() {
    if (state.inProgress) {
      if (await confirmRestart()) newGame();
      else themeEl.value = state.lastTheme;
    } else {
      newGame();
    }
    state.lastTheme = themeEl.value;
  }

  function handleTimerModeChange() {
    resetTimer();
  }

  // --- Events ---
  newGameBtn.addEventListener('click', handleNewGameBtn);
  difficultyEl.addEventListener('change', handleDifficultyChange);
  themeEl.addEventListener('change', handleThemeChange);
  playAgainBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    newGame();
});

  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  });
  timerModeEl.addEventListener('change', handleTimerModeChange);

  // Close modal with Esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  // --- Init ---
  newGame();

  function newGame() {
    clearBoard();
    const size = DIFFICULTY_TO_SIZE[difficultyEl.value] || 6;
    setBoardColumns(size);
    const deck = buildDeck(themeEl.value, size);
    state.totalPairs = deck.length / 2;
    deck.forEach((symbol, idx) => {
      boardEl.appendChild(createCard(symbol, idx));
    });
  }
});
