
/* ===== TOAST & CONFIRM UTILITIES ===== */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  const el = document.getElementById('app-toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => { el.hidden = true; }, 300);
  }, duration);
}

function showConfirm(message, okLabel, onOk) {
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-title').textContent = message;
  document.getElementById('confirm-ok-btn').textContent = okLabel || 'Confirm';
  dialog.hidden = false;
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  const close = () => { dialog.hidden = true; };
  okBtn.onclick = () => { close(); onOk(); };
  cancelBtn.onclick = close;
  dialog.onclick = (e) => { if (e.target === dialog) close(); };
  okBtn.focus();
}

/* ===== COLOR PRESETS ===== */
const COLOR_PRESETS = {
  purple:{ primary:'#6750A4', onPrimary:'#FFFFFF', secondary:'#625B71', surface:'#FFFBFE', background:'#FFFBFE', surfaceVariant:'#E7E0EC', onSurface:'#1C1B1F', onSurfaceVariant:'#49454F', outline:'#79747E' },
  blue:  { primary:'#1565C0', onPrimary:'#FFFFFF', secondary:'#455A64', surface:'#FAFCFF', background:'#FAFCFF', surfaceVariant:'#E3EAF4', onSurface:'#171C21', onSurfaceVariant:'#404850', outline:'#72787E' },
  green: { primary:'#2E7D32', onPrimary:'#FFFFFF', secondary:'#37693E', surface:'#F8FBF7', background:'#F8FBF7', surfaceVariant:'#D9EDD8', onSurface:'#181D18', onSurfaceVariant:'#3C4A3D', outline:'#71796F' },
  amber: { primary:'#E65100', onPrimary:'#FFFFFF', secondary:'#7D5700', surface:'#FFFBF6', background:'#FFFBF6', surfaceVariant:'#F4DDB6', onSurface:'#201A0E', onSurfaceVariant:'#4E4328', outline:'#7C6E43' },
  rose:  { primary:'#AD1457', onPrimary:'#FFFFFF', secondary:'#7D374D', surface:'#FFF8F9', background:'#FFF8F9', surfaceVariant:'#F5DCE3', onSurface:'#21191C', onSurfaceVariant:'#4D3840', outline:'#7B6068' }
};

const DEFAULT_HL_COLORS = {
  purple:{ general:'#E8D5FF', promise:'#C8E6C9', command:'#BBDEFB', warning:'#FFCCBC', principle:'#FFF9C4' },
  blue:  { general:'#BBDEFB', promise:'#C8E6C9', command:'#D1C4E9', warning:'#FFCCBC', principle:'#FFF9C4' },
  green: { general:'#C8E6C9', promise:'#E8D5FF', command:'#BBDEFB', warning:'#FFCCBC', principle:'#FFF9C4' },
  amber: { general:'#FFE0B2', promise:'#C8E6C9', command:'#BBDEFB', warning:'#FFCDD2', principle:'#FFF9C4' },
  rose:  { general:'#FCE4EC', promise:'#C8E6C9', command:'#BBDEFB', warning:'#FFCCBC', principle:'#FFF9C4' }
};

/* ===== THEME & COLOR SYSTEM ===== */
const SURFACE_VARS = ['--md-surface','--md-background','--md-surface-variant','--md-on-surface','--md-on-surface-variant','--md-outline'];

function setAppColor(colorName) {
  const preset = COLOR_PRESETS[colorName] || COLOR_PRESETS.purple;
  const root = document.documentElement;
  root.style.setProperty('--md-primary', preset.primary);
  root.style.setProperty('--md-on-primary', preset.onPrimary);
  root.style.setProperty('--md-secondary', preset.secondary);
  if (document.documentElement.getAttribute('data-theme') !== 'dark') {
    root.style.setProperty('--md-surface', preset.surface);
    root.style.setProperty('--md-background', preset.background);
    root.style.setProperty('--md-surface-variant', preset.surfaceVariant);
    root.style.setProperty('--md-on-surface', preset.onSurface);
    root.style.setProperty('--md-on-surface-variant', preset.onSurfaceVariant);
    root.style.setProperty('--md-outline', preset.outline);
  }
  document.getElementById('meta-theme-color').content = preset.primary;
}

function applyTheme(mode) {
  const root = document.documentElement;
  let isDark;
  if (mode === 'dark') { isDark = true; }
  else if (mode === 'light') { isDark = false; }
  else { isDark = window.matchMedia('(prefers-color-scheme: dark)').matches; }
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  if (isDark) {
    // Remove inline surface styles so [data-theme="dark"] CSS rules can take effect
    SURFACE_VARS.forEach(p => root.style.removeProperty(p));
  } else {
    // Re-apply the light color preset so surface vars are restored
    const colorName = (state && state.settings) ? (state.settings.appColor || 'purple') : 'purple';
    if (colorName !== 'custom') {
      setAppColor(colorName);
    } else if (state && state.settings && state.settings.customColor) {
      root.style.setProperty('--md-primary', state.settings.customColor);
      root.style.setProperty('--md-on-primary', '#FFFFFF');
      // Restore default purple surface vars for custom color
      const base = COLOR_PRESETS.purple;
      root.style.setProperty('--md-surface', base.surface);
      root.style.setProperty('--md-background', base.background);
      root.style.setProperty('--md-surface-variant', base.surfaceVariant);
      root.style.setProperty('--md-on-surface', base.onSurface);
      root.style.setProperty('--md-on-surface-variant', base.onSurfaceVariant);
      root.style.setProperty('--md-outline', base.outline);
    }
  }
}

function applyAppColor(colorName, customHex) {
  if (colorName === 'custom' && customHex) {
    const root = document.documentElement;
    root.style.setProperty('--md-primary', customHex);
    root.style.setProperty('--md-on-primary', '#FFFFFF');
    document.getElementById('meta-theme-color').content = customHex;
  } else {
    setAppColor(colorName || 'purple');
  }
}

function applyHighlightColors(colors) {
  if (!colors) return;
  const root = document.documentElement;
  root.style.setProperty('--hl-general',   colors.general   || '#E8D5FF');
  root.style.setProperty('--hl-promise',   colors.promise   || '#C8E6C9');
  root.style.setProperty('--hl-command',   colors.command   || '#BBDEFB');
  root.style.setProperty('--hl-warning',   colors.warning   || '#FFCCBC');
  root.style.setProperty('--hl-principle', colors.principle || '#FFF9C4');
}

function saveThemeSetting(mode) {
  state.settings.themeMode = mode;
  saveState();
  applyTheme(mode);
}

function saveHlColor(type, hex) {
  state.settings.hlColors[type] = hex;
  saveState();
  applyHighlightColors(state.settings.hlColors);
}

function syncHlWithTheme() {
  const colorName = state.settings.appColor || 'purple';
  const defaults = DEFAULT_HL_COLORS[colorName] || DEFAULT_HL_COLORS.purple;
  state.settings.hlColors = { ...defaults };
  saveState();
  applyHighlightColors(state.settings.hlColors);
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--user-font-size', size + 'px');
  document.documentElement.style.fontSize = size + 'px';
}

/* ===== AUDIO ENGINE ===== */
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration, type = 'sine', vol = 0.25) {
  if (!state.settings.sound) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function playCheckSound() {
  playTone(800, 0.12, 'sine', 0.18);
  setTimeout(() => playTone(1200, 0.15, 'sine', 0.18), 90);
}

function playConfettiSound() {
  playTone(523, 0.1);
  setTimeout(() => playTone(659, 0.1), 100);
  setTimeout(() => playTone(784, 0.2), 200);
  setTimeout(() => playTone(1047, 0.25), 320);
}

function doHaptic(pattern = [10]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ===== BIBLE BOOK DATA ===== */
const OT_BOOKS = [
  ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
  ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],
  ['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],
  ['Ezra',10],['Nehemiah',13],['Esther',10],['Job',42],['Psalms',150],
  ['Proverbs',31],['Ecclesiastes',12],['Song of Solomon',8],['Isaiah',66],
  ['Jeremiah',52],['Lamentations',5],['Ezekiel',48],['Daniel',12],['Hosea',14],
  ['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],['Micah',7],['Nahum',3],
  ['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],['Malachi',4]
];

const NT_BOOKS = [
  ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],
  ['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],
  ['Ephesians',6],['Philippians',4],['Colossians',4],['1 Thessalonians',5],
  ['2 Thessalonians',3],['1 Timothy',6],['2 Timothy',4],['Titus',3],
  ['Philemon',1],['Hebrews',13],['James',5],['1 Peter',5],['2 Peter',3],
  ['1 John',5],['2 John',1],['3 John',1],['Jude',1],['Revelation',22]
];

const TOTAL_OT      = OT_BOOKS.reduce((s,b) => s + b[1], 0);
const TOTAL_NT      = NT_BOOKS.reduce((s,b) => s + b[1], 0);
const TOTAL_PSALMS  = 150;
const TOTAL_PROVERBS = 31;

const JOURNAL_PROMPTS = [
  "What stood out to you in today's reading?",
  "How does today's passage apply to your life?",
  "What is God saying to you through Scripture today?",
  "Is there a promise, command, or principle you want to remember?",
  "How can you apply what you read today in a practical way?",
  "Write a short prayer inspired by today's reading.",
  "What questions does today's passage raise for you?"
];

/* ===== STATE ===== */
const STATE_VERSION = 11;

const DEFAULT_STATE = {
  version: STATE_VERSION,
  onboardingComplete: false,
  userName: 'Friend',
  readingPlan: 'standard',
  startOtIndex: 0,
  startNtIndex: 0,
  startPsalmIndex: 0,
  startPrIndex: 0,
  completed: {},
  highlights: {},
  journal: {},
  timeSpent: {},
  streak: 0,
  longestStreak: 0,
  streakFreezes: 2,
  frozenDays: [],
  streakMilestones: 0,
  settings: {
    themeMode: 'system',
    appColor: 'purple',
    customColor: null,
    hlColors: { general:'#E8D5FF', promise:'#C8E6C9', command:'#BBDEFB', warning:'#FFCCBC', principle:'#FFF9C4' },
    hlSync: true,
    translation: 'web',
    sound: true,
    reminder: false,
    reminderTime: '07:00',
    fontSize: 16
  }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

/* ===== INDEXEDDB ===== */
const DB_NAME = 'dtwg-bible-cache';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('chapters'); };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
  return dbPromise;
}

async function getCachedBible(key) {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const req = db.transaction('chapters','readonly').objectStore('chapters').get(key);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function setCachedBible(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('chapters','readwrite');
    tx.objectStore('chapters').put(data, key);
  } catch {}
}

/* ===== STORAGE ===== */
function getStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function setStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function loadState() {
  const saved = getStorage('dtwg_state');
  if (saved && saved.version) {
    state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...saved };
    state.settings = { ...DEFAULT_STATE.settings, ...saved.settings };
    if (!state.settings.hlColors) state.settings.hlColors = { ...DEFAULT_STATE.settings.hlColors };
    if (!state.settings.reminderTime) state.settings.reminderTime = '07:00';
    if (!state.settings.fontSize) state.settings.fontSize = 16;
    state.version = STATE_VERSION;
  }
}

function saveState() {
  setStorage('dtwg_state', state);
}

window.addEventListener('storage', e => {
  if (e.key === 'dtwg_state') {
    loadState();
    recomputeAllStats();
    renderDashboard();
  }
});

/* ===== UTILITIES ===== */
function mod(n, m) { return ((n % m) + m) % m; }

function stripTime(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

function formatDateKey(date) {
  const d = stripTime(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDaysDiff(a, b) {
  return Math.round((stripTime(b) - stripTime(a)) / 86400000);
}

function getAbsoluteIndexFromSelection(books, bookIdx, chap) {
  let idx = 0;
  for (let i = 0; i < bookIdx; i++) idx += books[i][1];
  return idx + (chap - 1);
}

function getBookAndChapterFromIndex(books, absIdx) {
  const total = books.reduce((s,b) => s+b[1], 0);
  let remaining = mod(absIdx, total);
  for (let i = 0; i < books.length; i++) {
    if (remaining < books[i][1]) return { book: books[i][0], chapter: remaining + 1, bookIdx: i };
    remaining -= books[i][1];
  }
  return { book: books[0][0], chapter: 1, bookIdx: 0 };
}

function getChapterFromIndex(type, idx) {
  if (type === 'ot')      return getBookAndChapterFromIndex(OT_BOOKS, mod(idx, TOTAL_OT));
  if (type === 'nt')      return getBookAndChapterFromIndex(NT_BOOKS, mod(idx, TOTAL_NT));
  if (type === 'psalm')   return { book:'Psalms',   chapter: mod(idx, TOTAL_PSALMS)   + 1 };
  if (type === 'proverb') return { book:'Proverbs', chapter: mod(idx, TOTAL_PROVERBS) + 1 };
}

function getReadingPlan(dateKey) {
  const today = formatDateKey(new Date());
  const daysDiff = getDaysDiff(new Date(today + 'T00:00:00'), new Date(dateKey + 'T00:00:00'));
  const plan = state.readingPlan || 'standard';
  const readings = [];

  // Proverbs: use the calendar day of month (1–31) so it cycles with the month
  const dateObj = new Date(dateKey + 'T00:00:00');
  const provChap = Math.min(dateObj.getDate(), 31);

  if (plan === 'standard') {
    for (let i = 0; i < 3; i++) {
      const c = getChapterFromIndex('ot', state.startOtIndex + daysDiff * 3 + i);
      readings.push({ type:'ot', label:'Old Testament', ...c });
    }
    readings.push({ type:'psalm',   label:'Psalm',    ...getChapterFromIndex('psalm', state.startPsalmIndex + daysDiff) });
    readings.push({ type:'proverb', label:'Proverb',  book:'Proverbs', chapter: provChap });
    for (let i = 0; i < 2; i++) {
      const c = getChapterFromIndex('nt', state.startNtIndex + daysDiff * 2 + i);
      readings.push({ type:'nt', label:'New Testament', ...c });
    }
  } else if (plan === 'ot-focus') {
    for (let i = 0; i < 5; i++) {
      const c = getChapterFromIndex('ot', state.startOtIndex + daysDiff * 5 + i);
      readings.push({ type:'ot', label:'Old Testament', ...c });
    }
    readings.push({ type:'psalm', label:'Psalm', ...getChapterFromIndex('psalm', state.startPsalmIndex + daysDiff) });
    readings.push({ type:'nt',   label:'New Testament', ...getChapterFromIndex('nt', state.startNtIndex + daysDiff) });
  } else if (plan === 'nt-focus') {
    for (let i = 0; i < 2; i++) {
      const c = getChapterFromIndex('ot', state.startOtIndex + daysDiff * 2 + i);
      readings.push({ type:'ot', label:'Old Testament', ...c });
    }
    readings.push({ type:'psalm', label:'Psalm', ...getChapterFromIndex('psalm', state.startPsalmIndex + daysDiff) });
    for (let i = 0; i < 4; i++) {
      const c = getChapterFromIndex('nt', state.startNtIndex + daysDiff * 4 + i);
      readings.push({ type:'nt', label:'New Testament', ...c });
    }
  }
  return readings;
}

/* ===== STATS & STREAK ===== */
function recomputeAllStats() {
  const today = formatDateKey(new Date());
  const allDays = [
    ...Object.keys(state.completed).filter(d => Array.isArray(state.completed[d]) && state.completed[d].length > 0),
    ...(state.frozenDays || [])
  ];
  const sortedDays = [...new Set(allDays)].sort();

  if (sortedDays.length === 0) { state.streak = 0; return; }

  // Current streak: walk back from today
  let currentStreak = 0;
  const checkDate = stripTime(new Date());
  while (true) {
    const key = formatDateKey(checkDate);
    const hasReading = (state.completed[key] && state.completed[key].length > 0) || (state.frozenDays || []).includes(key);
    if (hasReading) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }
  state.streak = currentStreak;

  // Longest streak
  let longest = 0, current = 0, prev = null;
  for (const day of sortedDays) {
    if (!prev) { current = 1; }
    else {
      const diff = getDaysDiff(new Date(prev + 'T00:00:00'), new Date(day + 'T00:00:00'));
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > longest) longest = current;
    prev = day;
  }
  state.longestStreak = Math.max(state.longestStreak, longest);

  // Streak freeze milestones
  if (!state.streakMilestones) state.streakMilestones = 0;
  const newMilestones = Math.floor(state.streak / 7);
  if (newMilestones > state.streakMilestones) {
    state.streakFreezes = Math.min(state.streakFreezes + (newMilestones - state.streakMilestones), 3);
    state.streakMilestones = newMilestones;
  }
}

function restoreStreak() {
  if (state.streakFreezes <= 0) { showToast('No streak freezes available!'); return; }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = formatDateKey(yesterday);
  if (!state.frozenDays) state.frozenDays = [];
  if (!state.frozenDays.includes(key)) {
    state.frozenDays.push(key);
    state.streakFreezes--;
    saveState();
    recomputeAllStats();
    saveState();
    renderDashboard();
    renderCalendar();
    updateStatDisplays();
  }
}

/* ===== HEADER ===== */
function updateHeaderName() {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  document.getElementById('header-greeting').textContent = greeting + ',';
  document.getElementById('header-name').textContent = state.userName || 'Friend';
  document.getElementById('streak-count').textContent = state.streak || 0;
}

/* ===== DASHBOARD ===== */
let viewedDate = formatDateKey(new Date());
let journalSaveTimer = null;

function renderDashboard() {
  updateHeaderName();
  const dateKey = viewedDate;
  const isToday = dateKey === formatDateKey(new Date());

  const dateObj = new Date(dateKey + 'T00:00:00');
  const opts = { weekday:'long', month:'long', day:'numeric' };
  document.getElementById('date-display').textContent = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', opts);

  // Disable next-day button when viewing today or future
  const nextBtn = document.getElementById('next-day-btn');
  if (nextBtn) nextBtn.disabled = isToday;

  const readings = getReadingPlan(dateKey);
  const completed = state.completed[dateKey] || [];

  // Progress
  const pct = readings.length > 0 ? Math.round((completed.length / readings.length) * 100) : 0;
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${completed.length} / ${readings.length}`;

  // Mercy banner
  const banner = document.getElementById('mercy-banner');
  if (state.streak > 0 && isToday && completed.length === readings.length && readings.length > 0) {
    banner.hidden = false;
    document.getElementById('mercy-banner-text').textContent = `Day complete! ${state.streak} day streak! \u{1F525}`;
  }

  // Plan cards
  const container = document.getElementById('plan-container');
  container.innerHTML = '';
  readings.forEach((reading, idx) => {
    const card = document.createElement('div');
    card.className = 'plan-card' + (completed.includes(idx) ? ' checked' : '');

    const info = document.createElement('div');
    info.className = 'plan-card-info';

    const labelEl = document.createElement('span');
    labelEl.className = 'plan-card-label';
    labelEl.textContent = reading.label;

    const title = document.createElement('h3');
    title.className = 'plan-card-title';
    title.textContent = `${reading.book} ${reading.chapter}`;

    info.appendChild(labelEl);
    info.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'plan-card-actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'plan-card-open-btn';
    openBtn.setAttribute('aria-label', `Open ${reading.book} ${reading.chapter}`);
    const openIcon = document.createElement('span');
    openIcon.className = 'material-symbols-rounded';
    openIcon.textContent = 'open_in_new';
    openBtn.appendChild(openIcon);
    openBtn.addEventListener('click', e => { e.stopPropagation(); openBibleModal(reading.book, reading.chapter, idx); });

    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-btn' + (completed.includes(idx) ? ' checked' : '');
    checkBtn.setAttribute('aria-label', completed.includes(idx) ? 'Mark as unread' : 'Mark as read');
    const checkIcon = document.createElement('span');
    checkIcon.className = 'material-symbols-rounded';
    checkIcon.textContent = completed.includes(idx) ? 'check_circle' : 'radio_button_unchecked';
    checkBtn.appendChild(checkIcon);
    checkBtn.addEventListener('click', e => { e.stopPropagation(); toggleCheck(idx); });

    actions.appendChild(openBtn);
    actions.appendChild(checkBtn);
    card.appendChild(info);
    card.appendChild(actions);
    card.addEventListener('click', () => openBibleModal(reading.book, reading.chapter, idx));
    container.appendChild(card);
  });

  // Journal
  const textarea = document.getElementById('journal-textarea');
  textarea.value = state.journal[dateKey] || '';
}

function saveJournal() {
  state.journal[viewedDate] = document.getElementById('journal-textarea').value;
  saveState();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('journal-textarea').addEventListener('input', () => {
    clearTimeout(journalSaveTimer);
    journalSaveTimer = setTimeout(saveJournal, 500);
  });
});

/* ===== CHECK & COMPLETION ===== */
function toggleCheck(idx) {
  const dateKey = viewedDate;
  if (!state.completed[dateKey]) state.completed[dateKey] = [];
  const arr = state.completed[dateKey];
  const i = arr.indexOf(idx);
  if (i >= 0) {
    arr.splice(i, 1);
    doHaptic([10]);
  } else {
    arr.push(idx);
    playCheckSound();
    doHaptic([10,50,10]);
    const readings = getReadingPlan(dateKey);
    if (arr.length === readings.length) setTimeout(triggerCompletion, 200);
  }
  saveState();
  recomputeAllStats();
  saveState();
  renderDashboard();
  updateStatDisplays();
}

function triggerCompletion() {
  playConfettiSound();
  doHaptic([50,100,50,100,200]);
  shootConfetti();
  const banner = document.getElementById('mercy-banner');
  banner.hidden = false;
  document.getElementById('mercy-banner-text').textContent = `Day complete! ${state.streak} day streak! \u{1F525}`;
}

let showingAvgTime = false;

function updateStatDisplays() {
  document.getElementById('stat-streak').textContent  = state.streak || 0;
  document.getElementById('stat-longest').textContent = state.longestStreak || 0;
  document.getElementById('stat-freezes').textContent = state.streakFreezes ?? 2;

  const totalSeconds = Object.values(state.timeSpent || {}).reduce((s,v) => s+v, 0);
  const dayCount = Object.keys(state.completed || {}).filter(d => state.completed[d] && state.completed[d].length > 0).length;

  if (showingAvgTime) {
    const avg = dayCount > 0 ? Math.round(totalSeconds / dayCount) : 0;
    const mins = Math.floor(avg / 60), secs = avg % 60;
    document.getElementById('stat-time').textContent = mins > 0 ? `${mins}m${secs > 0 ? secs+'s' : ''}` : `${secs}s`;
    document.getElementById('stat-time-label').textContent = 'Avg/Day';
  } else {
    const mins = Math.floor(totalSeconds / 60);
    document.getElementById('stat-time').textContent = mins > 0 ? `${mins}m` : `${totalSeconds}s`;
    document.getElementById('stat-time-label').textContent = 'Total Time';
  }
}

function toggleTimeDisplay() {
  showingAvgTime = !showingAvgTime;
  updateStatDisplays();
}

/* ===== DATE NAVIGATION ===== */
function changeDate(delta) {
  const d = new Date(viewedDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const newDate = formatDateKey(d);
  // Block navigation to future dates
  if (delta > 0 && newDate > formatDateKey(new Date())) return;
  viewedDate = newDate;
  renderDashboard();
}

function switchPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageName}`).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[data-page="${pageName}"]`)?.classList.add('active');

  if (pageName === 'history') {
    updateStatDisplays();
    renderCalendar();
    renderHistoryList();
  } else if (pageName === 'notebook') {
    renderNotebook();
  } else if (pageName === 'dashboard') {
    renderDashboard();
  }
}

/* ===== CALENDAR ===== */
let calendarYear  = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  document.getElementById('cal-month-year').textContent = `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  ['S','M','T','W','T','F','S'].forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = formatDateKey(new Date());

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    const comp = state.completed[dateKey];
    const isFrozen = (state.frozenDays || []).includes(dateKey);

    if (isFrozen) {
      cell.classList.add('frozen');
    } else if (comp && comp.length > 0) {
      const readings = getReadingPlan(dateKey);
      const total = readings.length;
      const done = Math.min(comp.length, total);
      cell.classList.add(done >= total ? 'complete' : 'partial');

      // SVG ring progress
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'cal-ring');
      svg.setAttribute('viewBox', '0 0 36 36');
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', '18');
      bgCircle.setAttribute('cy', '18');
      bgCircle.setAttribute('r', '15.9');
      bgCircle.setAttribute('class', 'cal-ring-bg');
      svg.appendChild(bgCircle);
      const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      prog.setAttribute('cx', '18');
      prog.setAttribute('cy', '18');
      prog.setAttribute('r', '15.9');
      prog.setAttribute('class', 'cal-ring-fill');
      const circ = 2 * Math.PI * 15.9;
      const pct = done / total;
      prog.setAttribute('stroke-dasharray', `${pct * circ} ${circ}`);
      svg.appendChild(prog);
      cell.appendChild(svg);
    }
    if (dateKey === today) cell.classList.add('today');

    const num = document.createElement('span');
    num.className = 'cal-day-num';
    num.textContent = d;
    cell.appendChild(num);

    cell.addEventListener('click', () => { viewedDate = dateKey; switchPage('dashboard'); });
    grid.appendChild(cell);
  }
}

function changeMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }
  renderCalendar();
}

/* ===== HISTORY LIST ===== */
let historyTab      = 'highlights';
let highlightFilter = 'all';

function setHistoryTab(tab) {
  historyTab = tab;
  document.getElementById('tab-highlights').classList.toggle('active', tab === 'highlights');
  document.getElementById('tab-notes').classList.toggle('active', tab === 'notes');
  document.getElementById('filter-chips').style.display = tab === 'highlights' ? 'flex' : 'none';
  renderHistoryList();
}

function setHighlightFilter(filter) {
  highlightFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
  renderHistoryList();
}

function renderHistoryList() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (historyTab === 'highlights') {
    const highlights = state.highlights || {};
    let entries = Object.entries(highlights);
    if (highlightFilter !== 'all') entries = entries.filter(([,v]) => v.type === highlightFilter);

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No highlights yet. Tap a verse while reading to highlight it.';
      list.appendChild(empty);
      return;
    }

    entries.sort((a,b) => (b[1].date || '').localeCompare(a[1].date || ''));

    entries.forEach(([key, hl]) => {
      const item = document.createElement('div');
      item.className = `history-item hl-item-${hl.type || 'general'}`;

      const ref = document.createElement('div');
      ref.className = 'history-ref';
      ref.textContent = key;

      const text = document.createElement('p');
      text.className = 'history-text';
      text.textContent = hl.text || '';

      const meta = document.createElement('div');
      meta.className = 'history-meta';

      const badge = document.createElement('span');
      badge.className = `hl-badge hl-badge-${hl.type || 'general'}`;
      badge.textContent = (hl.type || 'general').charAt(0).toUpperCase() + (hl.type || 'general').slice(1);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'history-date';
      dateSpan.textContent = hl.date || '';

      meta.appendChild(badge);
      meta.appendChild(dateSpan);
      item.appendChild(ref);
      item.appendChild(text);
      item.appendChild(meta);
      list.appendChild(item);
    });

  } else {
    const journals = state.journal || {};
    const entries = Object.entries(journals).filter(([,v]) => v && v.trim());

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No journal entries yet. Write in the journal on the Read page.';
      list.appendChild(empty);
      return;
    }

    entries.sort((a,b) => b[0].localeCompare(a[0]));

    entries.forEach(([dateKey, text]) => {
      const item = document.createElement('div');
      item.className = 'history-item journal-item';

      const dateEl = document.createElement('div');
      dateEl.className = 'history-ref';
      dateEl.textContent = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

      const content = document.createElement('p');
      content.className = 'history-text';
      content.textContent = text;

      item.appendChild(dateEl);
      item.appendChild(content);
      item.addEventListener('click', () => { viewedDate = dateKey; switchPage('dashboard'); });
      list.appendChild(item);
    });
  }
}

/* ===== NOTEBOOK ===== */
let notebookDate = formatDateKey(new Date());

function renderNotebook() {
  const dateKey = notebookDate;
  const isToday = dateKey === formatDateKey(new Date());
  const dateObj = new Date(dateKey + 'T00:00:00');
  const opts = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
  document.getElementById('nb-date-display').textContent = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', opts);

  // Disable next-day button when viewing today or future
  const nbNextBtn = document.getElementById('nb-next-day-btn');
  if (nbNextBtn) nbNextBtn.disabled = isToday;

  const paper = document.getElementById('notebook-paper');
  paper.innerHTML = '';

  const dayHighlights = Object.entries(state.highlights || {}).filter(([,v]) => v.date === dateKey);
  const journalEntry  = state.journal[dateKey] || '';

  if (dayHighlights.length === 0 && !journalEntry) {
    const empty = document.createElement('div');
    empty.className = 'notebook-empty';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded notebook-empty-icon';
    icon.textContent = 'book_2';
    const msg = document.createElement('p');
    msg.className = 'notebook-empty-text';
    msg.textContent = 'No highlights or journal entry for this day.';
    const hint = document.createElement('p');
    hint.className = 'notebook-empty-hint';
    hint.textContent = 'Tap verses while reading to highlight them, or write in the journal.';
    empty.appendChild(icon); empty.appendChild(msg); empty.appendChild(hint);
    paper.appendChild(empty);
    return;
  }

  // 1. DATE HEADER
  const heading = document.createElement('h2');
  heading.className = 'notebook-date-heading';
  heading.textContent = dateObj.toLocaleDateString('en-US', opts);
  paper.appendChild(heading);

  // 2. TODAY'S READINGS
  const readings = getReadingPlan(dateKey);
  const readingsSection = document.createElement('div');
  readingsSection.className = 'notebook-section';
  const readingsH = document.createElement('h3');
  readingsH.className = 'notebook-chapter-heading';
  readingsH.textContent = "\uD83D\uDCD6 Today\u2019s Readings";
  readingsSection.appendChild(readingsH);
  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'notebook-readings-chips';
  readings.forEach(r => {
    const chip = document.createElement('span');
    chip.className = 'notebook-reading-chip';
    chip.textContent = `${r.book} ${r.chapter}`;
    chipsWrap.appendChild(chip);
  });
  readingsSection.appendChild(chipsWrap);
  paper.appendChild(readingsSection);

  // 3–6. HIGHLIGHT CATEGORIES (read-only)
  const categories = [
    { type: 'promise',   label: 'Promises \uD83E\uDD1D' },
    { type: 'command',   label: 'Commands \uD83D\uDCCB' },
    { type: 'warning',   label: 'Warnings \u26A0\uFE0F' },
    { type: 'principle', label: 'Principles \uD83D\uDCA1' }
  ];
  categories.forEach(cat => {
    const items = dayHighlights.filter(([, v]) => v.type === cat.type);
    const section = document.createElement('div');
    section.className = 'notebook-section';
    const catH = document.createElement('h3');
    catH.className = 'notebook-chapter-heading';
    catH.textContent = cat.label;
    section.appendChild(catH);

    if (items.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'notebook-category-empty';
      emptyMsg.textContent = `No ${cat.type} highlights yet.`;
      section.appendChild(emptyMsg);
    } else {
      items.forEach(([ref, hl]) => {
        const hlEl = document.createElement('div');
        hlEl.className = `notebook-highlight hl-${hl.type}`;
        const verseRef = document.createElement('span');
        verseRef.className = 'notebook-verse-ref';
        verseRef.textContent = ref;
        const verseText = document.createElement('p');
        verseText.className = 'notebook-verse-text';
        verseText.textContent = hl.text || '';
        hlEl.appendChild(verseRef);
        hlEl.appendChild(verseText);
        section.appendChild(hlEl);
      });
    }
    paper.appendChild(section);
  });

  // 7. APPLICATION ✍️
  const appSection = document.createElement('div');
  appSection.className = 'notebook-section notebook-journal';
  const appH = document.createElement('h3');
  appH.className = 'notebook-chapter-heading';
  appH.textContent = 'Application \u270D\uFE0F';
  appSection.appendChild(appH);
  const appTextarea = document.createElement('textarea');
  appTextarea.className = 'notebook-app-textarea';
  appTextarea.placeholder = 'Write your personal reflection, prayer, or notes here\u2026';
  appTextarea.rows = 5;
  appTextarea.value = journalEntry;
  let nbSaveTimer = null;
  appTextarea.addEventListener('input', () => {
    clearTimeout(nbSaveTimer);
    nbSaveTimer = setTimeout(() => {
      state.journal[dateKey] = appTextarea.value;
      saveState();
    }, 500);
  });
  appSection.appendChild(appTextarea);
  paper.appendChild(appSection);
}

/* ===== BIBLE MODAL ===== */
let currentModalReading   = null;
let currentModalIdx       = -1;
let currentReadingStartTime = null;
let lastActivity          = Date.now();
let touchStartX           = 0;

document.addEventListener('touchstart', () => { lastActivity = Date.now(); }, { passive: true });
document.addEventListener('mousemove',  () => { lastActivity = Date.now(); }, { passive: true });

async function openBibleModal(book, chapter, idx) {
  currentModalReading     = { book, chapter };
  currentModalIdx         = idx;
  currentReadingStartTime = Date.now();
  lastActivity            = Date.now();

  const modal = document.getElementById('bible-modal');
  modal.removeAttribute('hidden');

  document.getElementById('modal-title').textContent = `${book} ${chapter} (${(state.settings.translation || 'web').toUpperCase()})`;
  document.getElementById('modal-loading').style.display = 'flex';
  document.getElementById('modal-verses').style.display  = 'none';
  document.getElementById('modal-verses').innerHTML = '';

  const dateKey  = viewedDate;
  const isChecked = (state.completed[dateKey] || []).includes(idx);
  updateModalActionBtn(isChecked);

  // Disable prev/next at reading plan boundaries
  const readings = getReadingPlan(viewedDate);
  document.getElementById('modal-prev-btn').disabled = (idx <= 0);
  document.getElementById('modal-next-btn').disabled = (idx >= readings.length - 1);

  // Scroll to top
  document.getElementById('modal-body').scrollTop = 0;

  const translation = state.settings.translation || 'web';
  const cacheKey    = `dtwg_bible_${translation}_${book}_${chapter}`;

  try {
    let data = await getCachedBible(cacheKey);
    if (!data) {
      const bookSlug = book.toLowerCase().replace(/\s+/g, '+');
      const url = `https://bible-api.com/${bookSlug}+${chapter}?translation=${translation}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      data = await resp.json();
      await setCachedBible(cacheKey, data);
    }
    renderBibleVerses(data, book, chapter);
  } catch(err) {
    document.getElementById('modal-loading').style.display = 'none';
    const versesEl = document.getElementById('modal-verses');
    versesEl.style.display = 'block';

    const errDiv = document.createElement('div');
    errDiv.className = 'modal-error';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = 'wifi_off';
    const msg = document.createElement('p');
    msg.textContent = 'Could not load scripture. Check your connection.';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => openBibleModal(book, chapter, idx));
    errDiv.appendChild(icon); errDiv.appendChild(msg); errDiv.appendChild(retryBtn);
    versesEl.appendChild(errDiv);
  }
}

function updateModalActionBtn(isChecked) {
  const btn = document.getElementById('modal-action-btn');
  const icon = document.createElement('span');
  icon.className = 'material-symbols-rounded';
  icon.textContent = isChecked ? 'check_circle' : 'radio_button_unchecked';
  btn.innerHTML = '';
  btn.appendChild(icon);
  btn.appendChild(document.createTextNode(' ' + (isChecked ? 'Marked as Read \u2713' : 'Mark as Read')));
}

function renderBibleVerses(data, book, chapter) {
  document.getElementById('modal-loading').style.display = 'none';
  const versesEl = document.getElementById('modal-verses');
  versesEl.innerHTML = '';
  versesEl.style.display = 'block';

  (data.verses || []).forEach(v => {
    const p = document.createElement('p');
    p.className = 'verse-para';
    p.dataset.book    = book;
    p.dataset.chapter = chapter;
    p.dataset.verse   = v.verse;

    const num = document.createElement('sup');
    num.className = 'verse-num';
    num.textContent = v.verse;

    const text = document.createElement('span');
    text.className = 'verse-text';
    text.textContent = v.text;

    const refKey  = `${book} ${chapter}:${v.verse}`;
    const existing = state.highlights[refKey];
    if (existing) p.classList.add(`hl-${existing.type}`);

    p.appendChild(num);
    p.appendChild(text);
    p.addEventListener('click', () => showHighlightMenu(p, refKey, v.text));
    versesEl.appendChild(p);
  });

  document.getElementById('modal-title').textContent = `${book} ${chapter} (${(state.settings.translation || 'web').toUpperCase()})`;
}

/* ===== HIGHLIGHT MENU (with labels) ===== */
const HIGHLIGHT_TYPES = [
  { type: 'general',   label: 'General' },
  { type: 'promise',   label: 'Promise' },
  { type: 'command',   label: 'Command' },
  { type: 'warning',   label: 'Warning' },
  { type: 'principle', label: 'Principle' }
];

function showHighlightMenu(verseEl, refKey, verseText) {
  document.querySelectorAll('.hl-menu').forEach(m => m.remove());

  const existing = state.highlights[refKey];
  const menu = document.createElement('div');
  menu.className = 'hl-menu';
  menu.setAttribute('role', 'menu');

  HIGHLIGHT_TYPES.forEach(({ type, label }) => {
    const btn = document.createElement('button');
    btn.className = `hl-circle-btn hl-circle-${type}${existing && existing.type === type ? ' active' : ''}`;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('role', 'menuitem');

    // Colored dot
    const dot = document.createElement('span');
    dot.className = 'hl-dot';
    dot.style.background = `var(--hl-${type})`;
    dot.style.border = '1.5px solid rgba(0,0,0,0.2)';

    // Text label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    btn.appendChild(dot);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (existing && existing.type === type) {
        delete state.highlights[refKey];
        verseEl.classList.remove(`hl-${type}`);
      } else {
        if (existing) verseEl.classList.remove(`hl-${existing.type}`);
        state.highlights[refKey] = { type, text: verseText, date: viewedDate };
        verseEl.classList.add(`hl-${type}`);
      }
      saveState();
      menu.remove();
      playTone(600, 0.1);
      doHaptic([10]);
    });
    menu.appendChild(btn);
  });

  const eraser = document.createElement('button');
  eraser.className   = 'hl-circle-btn hl-eraser';
  eraser.setAttribute('aria-label', 'Remove highlight');
  eraser.setAttribute('role', 'menuitem');
  const eraserIcon = document.createElement('span');
  eraserIcon.textContent = '\u2715';
  const eraserLabel = document.createElement('span');
  eraserLabel.textContent = 'Remove';
  eraser.appendChild(eraserIcon);
  eraser.appendChild(eraserLabel);

  eraser.addEventListener('click', e => {
    e.stopPropagation();
    if (state.highlights[refKey]) {
      verseEl.classList.remove(`hl-${state.highlights[refKey].type}`);
      delete state.highlights[refKey];
      saveState();
    }
    menu.remove();
  });
  menu.appendChild(eraser);

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  }, 10);

  verseEl.insertAdjacentElement('afterend', menu);
}

function closeModal() {
  const modal = document.getElementById('bible-modal');
  modal.setAttribute('hidden', '');

  if (currentReadingStartTime) {
    const elapsed = Math.floor((Date.now() - currentReadingStartTime) / 1000);
    const isActive = Date.now() - lastActivity < 120000;
    if (elapsed > 5 && elapsed < 1800 && isActive) {
      const dateKey = viewedDate;
      if (!state.timeSpent) state.timeSpent = {};
      state.timeSpent[dateKey] = (state.timeSpent[dateKey] || 0) + elapsed;
      saveState();
    }
    currentReadingStartTime = null;
  }

  document.getElementById('modal-verses').innerHTML = '';
  document.querySelectorAll('.hl-menu').forEach(m => m.remove());
}

function navigateBibleModal(direction) {
  const readings = getReadingPlan(viewedDate);
  const newIdx = currentModalIdx + direction;
  if (newIdx < 0 || newIdx >= readings.length) return;
  const reading = readings[newIdx];
  openBibleModal(reading.book, reading.chapter, newIdx);
}

function handleModalAction() {
  if (currentModalIdx >= 0) {
    toggleCheck(currentModalIdx);
    const isChecked = (state.completed[viewedDate] || []).includes(currentModalIdx);
    updateModalActionBtn(isChecked);
  }
}

/* ===== CONFETTI ===== */
let confettiRAF = null;

function shootConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }

  const colors = ['#6750A4','#9C27B0','#4CAF50','#2196F3','#FF9800','#E91E63','#FFD700','#00BCD4'];
  const particles = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    speedY: Math.random() * 3 + 2,
    speedX: (Math.random() - 0.5) * 2.5,
    rotSpeed: (Math.random() - 0.5) * 6
  }));

  let elapsed = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elapsed++;
    particles.forEach(p => {
      p.y += p.speedY; p.x += p.speedX; p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 170);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < 190) { confettiRAF = requestAnimationFrame(animate); }
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); confettiRAF = null; }
  }
  confettiRAF = requestAnimationFrame(animate);
}

/* ===== ONBOARDING ===== */
function initOnboardingDropdowns() {
  const otBookSel = document.getElementById('ob-ot-book');
  otBookSel.innerHTML = '';
  OT_BOOKS.forEach((b, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = b[0];
    otBookSel.appendChild(opt);
  });

  const ntBookSel = document.getElementById('ob-nt-book');
  ntBookSel.innerHTML = '';
  NT_BOOKS.forEach((b, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = b[0];
    ntBookSel.appendChild(opt);
  });

  const psalmChapSel = document.getElementById('ob-psalm-chap');
  psalmChapSel.innerHTML = '';
  for (let c = 1; c <= 150; c++) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = `Psalm ${c}`;
    psalmChapSel.appendChild(opt);
  }

  updateChapSelect('ot');
  updateChapSelect('nt');
  otBookSel.addEventListener('change', () => updateChapSelect('ot'));
  ntBookSel.addEventListener('change', () => updateChapSelect('nt'));
}

function updateChapSelect(type) {
  if (type === 'ot') {
    const bookIdx = parseInt(document.getElementById('ob-ot-book').value);
    const chapSel = document.getElementById('ob-ot-chap');
    chapSel.innerHTML = '';
    for (let c = 1; c <= OT_BOOKS[bookIdx][1]; c++) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `Chapter ${c}`;
      chapSel.appendChild(opt);
    }
  } else {
    const bookIdx = parseInt(document.getElementById('ob-nt-book').value);
    const chapSel = document.getElementById('ob-nt-chap');
    chapSel.innerHTML = '';
    for (let c = 1; c <= NT_BOOKS[bookIdx][1]; c++) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `Chapter ${c}`;
      chapSel.appendChild(opt);
    }
  }
}

function showOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  modal.removeAttribute('hidden');
  document.getElementById('ob-page-1').classList.add('active');
  document.getElementById('ob-page-2').classList.remove('active');
  document.getElementById('ob-progress-fill').style.width = '50%';
  initOnboardingDropdowns();
  setTimeout(() => document.getElementById('ob-name').focus(), 100);
}

function nextObPage() {
  document.getElementById('ob-page-1').classList.remove('active');
  document.getElementById('ob-page-2').classList.add('active');
  document.getElementById('ob-progress-fill').style.width = '100%';
}

function prevObPage() {
  document.getElementById('ob-page-2').classList.remove('active');
  document.getElementById('ob-page-1').classList.add('active');
  document.getElementById('ob-progress-fill').style.width = '50%';
}

function saveOnboarding() {
  const name       = document.getElementById('ob-name').value.trim() || 'Friend';
  const plan       = document.getElementById('ob-plan').value;
  const otBookIdx  = parseInt(document.getElementById('ob-ot-book').value);
  const otChap     = parseInt(document.getElementById('ob-ot-chap').value);
  const psalmChap  = parseInt(document.getElementById('ob-psalm-chap').value);
  const ntBookIdx  = parseInt(document.getElementById('ob-nt-book').value);
  const ntChap     = parseInt(document.getElementById('ob-nt-chap').value);
  const translation= document.getElementById('ob-translation').value;
  const selColor   = document.querySelector('#ob-color-palette .color-btn.active');
  const colorName  = selColor ? selColor.dataset.color : 'purple';

  state.userName         = name;
  state.readingPlan      = plan;
  state.startOtIndex     = getAbsoluteIndexFromSelection(OT_BOOKS, otBookIdx, otChap);
  state.startPsalmIndex  = psalmChap - 1;
  state.startNtIndex     = getAbsoluteIndexFromSelection(NT_BOOKS, ntBookIdx, ntChap);
  state.startPrIndex     = 0;
  state.settings.translation = translation;
  state.settings.appColor    = colorName;
  state.onboardingComplete   = true;

  applyAppColor(colorName, state.settings.customColor);
  if (state.settings.hlSync) syncHlWithTheme();

  saveState();
  document.getElementById('onboarding-modal').setAttribute('hidden', '');
  // Sync settings UI with onboarding selections
  document.getElementById('translation-select').value = translation;
  applyHighlightColors(state.settings.hlColors);
  renderDashboard();
  updateHeaderName();
}

/* ===== SETTINGS ===== */
const FONT_SIZES = [14, 16, 18, 20, 22];
const FONT_SIZE_LABELS = ['Small', 'Normal', 'Large', 'X-Large', 'XX-Large'];

function initSettings() {
  // Profile
  const nameInput = document.getElementById('settings-name');
  nameInput.value = state.userName || 'Friend';
  nameInput.addEventListener('change', () => {
    state.userName = nameInput.value.trim() || 'Friend';
    saveState(); updateHeaderName();
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeMode === (state.settings.themeMode || 'system'));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveThemeSetting(btn.dataset.themeMode);
    });
  });

  // Color palette
  document.querySelectorAll('#color-palette .color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === (state.settings.appColor || 'purple'));
    btn.addEventListener('click', () => {
      if (btn.classList.contains('custom-color-btn')) { document.getElementById('custom-color-input').click(); return; }
      document.querySelectorAll('#color-palette .color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.settings.appColor = btn.dataset.color;
      applyAppColor(btn.dataset.color);           // Always apply the color
      if (state.settings.hlSync) syncHlWithTheme(); // Also sync highlights if enabled
      saveState();
    });
  });

  document.getElementById('custom-color-input').addEventListener('change', e => {
    const hex = e.target.value;
    state.settings.customColor = hex;
    state.settings.appColor    = 'custom';
    document.querySelectorAll('#color-palette .color-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#color-palette .custom-color-btn').classList.add('active');
    applyAppColor('custom', hex);
    saveState();
  });

  // Highlight sync
  const hlSyncToggle = document.getElementById('hl-sync-toggle');
  hlSyncToggle.checked = state.settings.hlSync !== false;
  hlSyncToggle.addEventListener('change', () => {
    state.settings.hlSync = hlSyncToggle.checked;
    saveState();
    if (state.settings.hlSync) syncHlWithTheme();
  });

  // Highlight color pickers
  ['general','promise','command','warning','principle'].forEach(type => {
    const btn   = document.getElementById(`hl-btn-${type}`);
    const input = document.getElementById(`hl-color-${type}`);
    if (!btn || !input) return;
    btn.style.background = state.settings.hlColors[type] || '';
    btn.addEventListener('click', () => input.click());
    input.value = state.settings.hlColors[type] || '#E8D5FF';
    input.addEventListener('change', () => { saveHlColor(type, input.value); btn.style.background = input.value; });
  });

  // Translation
  const transSel = document.getElementById('translation-select');
  transSel.value = state.settings.translation || 'web';
  transSel.addEventListener('change', () => { state.settings.translation = transSel.value; saveState(); });

  // Sound
  const soundToggle = document.getElementById('sound-toggle');
  soundToggle.checked = state.settings.sound !== false;
  soundToggle.addEventListener('change', () => { state.settings.sound = soundToggle.checked; saveState(); });

  // Reminder toggle + time picker
  const reminderToggle   = document.getElementById('reminder-toggle');
  const reminderTimeRow  = document.getElementById('reminder-time-row');
  const reminderTimeInput = document.getElementById('reminder-time');
  reminderToggle.checked = state.settings.reminder === true;
  if (reminderTimeRow) reminderTimeRow.style.display = state.settings.reminder ? 'flex' : 'none';
  if (reminderTimeInput) reminderTimeInput.value = state.settings.reminderTime || '07:00';

  reminderToggle.addEventListener('change', () => {
    state.settings.reminder = reminderToggle.checked;
    if (reminderTimeRow) reminderTimeRow.style.display = reminderToggle.checked ? 'flex' : 'none';
    saveState();
    if (reminderToggle.checked && 'Notification' in window) Notification.requestPermission();
  });

  if (reminderTimeInput) {
    reminderTimeInput.addEventListener('change', () => {
      state.settings.reminderTime = reminderTimeInput.value;
      saveState();
    });
  }

  // Font size control
  const fontDecBtn   = document.getElementById('font-size-dec');
  const fontIncBtn   = document.getElementById('font-size-inc');
  const fontDisplay  = document.getElementById('font-size-display');
  const currentSize  = state.settings.fontSize || 16;
  const currentIdx   = FONT_SIZES.indexOf(currentSize);

  function updateFontUI(idx) {
    if (fontDisplay) fontDisplay.textContent = FONT_SIZE_LABELS[idx] || 'Normal';
    if (fontDecBtn)  fontDecBtn.disabled  = idx <= 0;
    if (fontIncBtn)  fontIncBtn.disabled  = idx >= FONT_SIZES.length - 1;
  }

  let fontIdx = currentIdx >= 0 ? currentIdx : 1;
  applyFontSize(FONT_SIZES[fontIdx]);
  updateFontUI(fontIdx);

  if (fontDecBtn) {
    fontDecBtn.addEventListener('click', () => {
      if (fontIdx > 0) {
        fontIdx--;
        state.settings.fontSize = FONT_SIZES[fontIdx];
        applyFontSize(FONT_SIZES[fontIdx]);
        updateFontUI(fontIdx);
        saveState();
      }
    });
  }
  if (fontIncBtn) {
    fontIncBtn.addEventListener('click', () => {
      if (fontIdx < FONT_SIZES.length - 1) {
        fontIdx++;
        state.settings.fontSize = FONT_SIZES[fontIdx];
        applyFontSize(FONT_SIZES[fontIdx]);
        updateFontUI(fontIdx);
        saveState();
      }
    });
  }

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    showConfirm('Reset all progress? This will erase everything and cannot be undone.', 'Reset', () => {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState();
      applyTheme(state.settings.themeMode);
      applyAppColor(state.settings.appColor);
      applyHighlightColors(state.settings.hlColors);
      applyFontSize(state.settings.fontSize || 16);
      recomputeAllStats();
      renderDashboard();
      updateHeaderName();
      showOnboarding();
    });
  });
}

/* ===== PWA INSTALL PROMPT ===== */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  // Show only if not dismissed and not in standalone
  const dismissed = getStorage('pwa-banner-dismissed');
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  if (dismissed || standalone) return;
  deferredInstallPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.hidden = true;
});

function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice => {
    const banner = document.getElementById('install-banner');
    if (banner) banner.hidden = true;
    deferredInstallPrompt = null;
  });
}

function dismissInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.hidden = true;
  deferredInstallPrompt = null;
  setStorage('pwa-banner-dismissed', true);
}

/* ===== NAVIGATION & KEYBOARD ===== */
function closeModalsFromOverlay(e) {
  if (e.target === document.getElementById('bible-modal')) closeModal();
}

document.addEventListener('keydown', e => {
  const bibleModal      = document.getElementById('bible-modal');
  const onboardingModal = document.getElementById('onboarding-modal');
  if (!bibleModal.hasAttribute('hidden')) {
    if (e.key === 'Escape')      closeModal();
    if (e.key === 'ArrowRight')  navigateBibleModal(1);
    if (e.key === 'ArrowLeft')   navigateBibleModal(-1);
  } else if (!onboardingModal.hasAttribute('hidden')) {
    if (e.key === 'Escape' && state.onboardingComplete) onboardingModal.setAttribute('hidden', '');
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.themeMode === 'system') applyTheme('system');
});

/* ===== BOOT ===== */
window.addEventListener('load', function() {
  loadState();
  recomputeAllStats();

  applyTheme(state.settings.themeMode || 'system');
  applyAppColor(state.settings.appColor || 'purple', state.settings.customColor);
  applyHighlightColors(state.settings.hlColors || DEFAULT_STATE.settings.hlColors);
  applyFontSize(state.settings.fontSize || 16);

  renderDashboard();
  initSettings();
  updateStatDisplays();

  // Bottom nav
  document.querySelectorAll('.nav-tab').forEach(tab =>
    tab.addEventListener('click', () => { doHaptic([5]); switchPage(tab.dataset.page); })
  );

  // Date nav - dashboard
  document.getElementById('prev-day-btn').addEventListener('click', () => { doHaptic([5]); changeDate(-1); });
  document.getElementById('next-day-btn').addEventListener('click', () => { doHaptic([5]); changeDate(1); });

  // Date nav - notebook
  document.getElementById('nb-prev-day-btn').addEventListener('click', () => {
    doHaptic([5]);
    const d = new Date(notebookDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    notebookDate = formatDateKey(d);
    renderNotebook();
  });
  document.getElementById('nb-next-day-btn').addEventListener('click', () => {
    doHaptic([5]);
    const d = new Date(notebookDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const newDate = formatDateKey(d);
    if (newDate <= formatDateKey(new Date())) {
      notebookDate = newDate;
      renderNotebook();
    }
  });

  // Calendar nav
  document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));

  // History tabs
  document.getElementById('tab-highlights').addEventListener('click', () => setHistoryTab('highlights'));
  document.getElementById('tab-notes').addEventListener('click',      () => setHistoryTab('notes'));

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip =>
    chip.addEventListener('click', () => setHighlightFilter(chip.dataset.filter))
  );

  // Bible modal controls
  document.getElementById('modal-close-btn').addEventListener('click',   closeModal);
  document.getElementById('bible-modal').addEventListener('click',        closeModalsFromOverlay);
  document.getElementById('modal-action-btn').addEventListener('click',   handleModalAction);
  document.getElementById('modal-prev-btn').addEventListener('click',     () => navigateBibleModal(-1));
  document.getElementById('modal-next-btn').addEventListener('click',     () => navigateBibleModal(1));

  // Swipe navigation in modal body
  const modalBody = document.getElementById('modal-body');
  modalBody.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  modalBody.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigateBibleModal(diff > 0 ? 1 : -1);
  }, { passive: true });

  // Mercy banner close
  document.getElementById('mercy-close-btn').addEventListener('click', () => {
    document.getElementById('mercy-banner').hidden = true;
  });

  // Streak chip
  document.getElementById('header-streak').addEventListener('click', () => {
    if (state.streak === 0 && state.streakFreezes > 0) {
      showConfirm(`Use a streak freeze to restore your streak? (${state.streakFreezes} remaining)`, 'Use Freeze', restoreStreak);
    }
  });

  // Stat time card toggle
  document.getElementById('stat-time-card').addEventListener('click', toggleTimeDisplay);

  // Onboarding color buttons
  document.querySelectorAll('#ob-color-palette .color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ob-color-palette .color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyAppColor(btn.dataset.color);
    });
  });

  // Onboarding next/back/save
  document.getElementById('ob-next-btn').addEventListener('click',  nextObPage);
  document.getElementById('ob-back-btn').addEventListener('click',  prevObPage);
  document.getElementById('ob-save-btn').addEventListener('click',  saveOnboarding);

  // Install banner buttons
  const installBtn = document.getElementById('install-btn');
  const installDismissBtn = document.getElementById('install-dismiss-btn');
  if (installBtn) installBtn.addEventListener('click', installApp);
  if (installDismissBtn) installDismissBtn.addEventListener('click', dismissInstallBanner);

  // Show onboarding if needed
  if (!state.onboardingComplete) showOnboarding();

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed:', err));
  }
});
