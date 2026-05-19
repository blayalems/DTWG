
/* ===== APP VERSION ===== */
const APP_VERSION = '1.6.3';
const UPDATE_CHECK_URL = 'https://blayalems.github.io/DTWG/version.json';

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
  blue:  { general:'#BBDEFB', promise:'#B2DFDB', command:'#D1C4E9', warning:'#FFE0B2', principle:'#E1F5FE' },
  green: { general:'#C8E6C9', promise:'#DCEDC8', command:'#B2EBF2', warning:'#FFCCBC', principle:'#F0F4C3' },
  amber: { general:'#FFE0B2', promise:'#FFECB3', command:'#FFE082', warning:'#FFCDD2', principle:'#FFF8E1' },
  rose:  { general:'#FCE4EC', promise:'#F8BBD0', command:'#E1BEE7', warning:'#FFCDD2', principle:'#FFF9C4' }
};

/* ===== THEME & COLOR SYSTEM ===== */
const SURFACE_VARS = ['--md-surface','--md-background','--md-surface-variant','--md-on-surface','--md-on-surface-variant','--md-outline'];

function nativeBridge() {
  return window.DTWGAndroid || null;
}

function isDarkSurfaceTheme() {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' || theme === 'oled';
}

function readNativeAccentColor() {
  const bridge = nativeBridge();
  if (!bridge || typeof bridge.getSystemAccentColor !== 'function') return null;
  try {
    const hex = String(bridge.getSystemAccentColor() || '').trim();
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
  } catch {
    return null;
  }
}

function syncNativeSystemBars() {
  const bridge = nativeBridge();
  if (!bridge || typeof bridge.setStatusBarStyle !== 'function') return;
  const rootStyle = getComputedStyle(document.documentElement);
  const barColor = rootStyle.getPropertyValue('--md-surface').trim()
    || rootStyle.getPropertyValue('--md-primary').trim()
    || '#6750A4';
  try { bridge.setStatusBarStyle(barColor, isDarkSurfaceTheme()); } catch {}
}

window.__dtwgSetNativeInsets = function(top, right, bottom, left) {
  const root = document.documentElement;
  const px = value => `${Math.max(0, Number(value) || 0)}px`;
  root.style.setProperty('--native-safe-top', px(top));
  root.style.setProperty('--native-safe-right', px(right));
  root.style.setProperty('--native-safe-bottom', px(bottom));
  root.style.setProperty('--native-safe-left', px(left));
};

function setAppColor(colorName) {
  const preset = COLOR_PRESETS[colorName] || COLOR_PRESETS.purple;
  const root = document.documentElement;
  root.style.setProperty('--md-primary', preset.primary);
  root.style.setProperty('--md-on-primary', preset.onPrimary);
  root.style.setProperty('--md-secondary', preset.secondary);
  if (!isDarkSurfaceTheme()) {
    root.style.setProperty('--md-surface', preset.surface);
    root.style.setProperty('--md-background', preset.background);
    root.style.setProperty('--md-surface-variant', preset.surfaceVariant);
    root.style.setProperty('--md-on-surface', preset.onSurface);
    root.style.setProperty('--md-on-surface-variant', preset.onSurfaceVariant);
    root.style.setProperty('--md-outline', preset.outline);
  }
  document.getElementById('meta-theme-color').content = preset.primary;
  syncNativeSystemBars();
}

function applyTheme(mode) {
  const root = document.documentElement;
  let isDark;
  if (mode === 'oled') { isDark = true; }
  else if (mode === 'dark') { isDark = true; }
  else if (mode === 'light') { isDark = false; }
  else {
    if (typeof window.DTWG_SYSTEM_IS_DARK !== 'undefined') {
      isDark = window.DTWG_SYSTEM_IS_DARK;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }
  root.setAttribute('data-theme', mode === 'oled' ? 'oled' : (isDark ? 'dark' : 'light'));

  if (isDark) {
    // Remove inline surface styles so dark/oled CSS rules can take effect
    SURFACE_VARS.forEach(p => root.style.removeProperty(p));
    if (mode === 'oled') document.getElementById('meta-theme-color').content = '#000000';
  } else {
    // Re-apply the light color preset so surface vars are restored
    const colorName = (state && state.settings) ? (state.settings.appColor || 'purple') : 'purple';
    if (colorName === 'system') {
      applyAppColor('system');
    } else if (colorName !== 'custom') {
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
  syncNativeSystemBars();
}

function applyAppColor(colorName, customHex) {
  if (colorName === 'system') {
    const accent = readNativeAccentColor() || customHex || COLOR_PRESETS.purple.primary;
    const root = document.documentElement;
    root.style.setProperty('--md-primary', accent);
    root.style.setProperty('--md-on-primary', '#FFFFFF');
    root.style.setProperty('--md-secondary', COLOR_PRESETS.purple.secondary);
    document.getElementById('meta-theme-color').content = accent;
  } else if (colorName === 'custom' && customHex) {
    const root = document.documentElement;
    root.style.setProperty('--md-primary', customHex);
    root.style.setProperty('--md-on-primary', '#FFFFFF');
    document.getElementById('meta-theme-color').content = customHex;
  } else {
    setAppColor(colorName || 'purple');
  }
  syncNativeSystemBars();
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
  updateHlPickerUI();
}

function updateHlPickerUI() {
  ['general','promise','command','warning','principle'].forEach(type => {
    const btn   = document.getElementById(`hl-btn-${type}`);
    const input = document.getElementById(`hl-color-${type}`);
    if (btn)   btn.style.background = state.settings.hlColors[type] || '';
    if (input) input.value = state.settings.hlColors[type] || '#E8D5FF';
  });
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--user-font-size', size + 'px');
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
  const bridge = nativeBridge();
  if (bridge && typeof bridge.haptic === 'function') {
    try {
      if (bridge.haptic(JSON.stringify(pattern))) return;
    } catch {}
  }
  if (navigator.vibrate) navigator.vibrate(pattern);
}

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
const STATE_VERSION = 13;

const DEFAULT_STATE = {
  version: STATE_VERSION,
  onboardingComplete: false,
  userName: 'Friend',
  readingPlan: 'standard',
  startDate: null,
  readingPlanId: 'standard',
  customPlan: [],
  startOtIndex: 0,
  startNtIndex: 0,
  startPsalmIndex: 0,
  startPrIndex: 0,
  completed: {},
  highlights: {},
  verseNotes: {},
  journal: {},
  timeSpent: {},
  streak: 0,
  longestStreak: 0,
  streakFreezes: 2,
  frozenDays: [],
  streakMilestones: 0,
  apiKeys: { apiBible: '', esv: '', anthropic: '', bibleBrain: '', supabaseUrl: '', supabaseAnon: '' },
  audio: { autoplay: false, voice: 'ENGESVN2DA' },
  cloudSync: { enabled: false, userId: null, salt: null, lastSyncTs: 0 },
  notifications: { perChapter: true, streak: true, inlineReply: false },
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
const DB_VERSION = 2;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      ['chapters', 'audio', 'ai', 'sync'].forEach(store => {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
  return dbPromise;
}

async function getCachedBible(key) {
  return getCachedStore('chapters', key);
}

async function setCachedBible(key, data) {
  return setCachedStore('chapters', key, data);
}

async function getCachedStore(storeName, key) {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const req = db.transaction(storeName,'readonly').objectStore(storeName).get(key);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function setCachedStore(storeName, key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName,'readwrite');
    tx.objectStore(storeName).put(data, key);
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
  let needsSave = false;
  if (saved && saved.version) {
    state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...saved };
    state.settings = { ...DEFAULT_STATE.settings, ...saved.settings };
    if (!state.settings.hlColors) state.settings.hlColors = { ...DEFAULT_STATE.settings.hlColors };
    if (!state.settings.reminderTime) state.settings.reminderTime = '07:00';
    if (!state.settings.fontSize) state.settings.fontSize = 16;
    if (!state.readingPlanId) state.readingPlanId = state.readingPlan || DEFAULT_STATE.readingPlanId;
    state.customPlan = Array.isArray(saved.customPlan) ? saved.customPlan : [];
    if ((saved.version || 0) < 13 && migrateStartOtIndexToReadingBooks()) needsSave = true;
    if ((state.readingPlanId === 'custom' || state.readingPlan === 'custom') && state.customPlan.length === 0) {
      state.readingPlanId = 'standard';
      state.readingPlan = 'standard';
      needsSave = true;
    }
    state.verseNotes = { ...DEFAULT_STATE.verseNotes, ...(saved.verseNotes || {}) };
    state.apiKeys = { ...DEFAULT_STATE.apiKeys, ...(saved.apiKeys || {}) };
    state.audio = { ...DEFAULT_STATE.audio, ...(saved.audio || {}) };
    state.cloudSync = { ...DEFAULT_STATE.cloudSync, ...(saved.cloudSync || {}) };
    state.notifications = { ...DEFAULT_STATE.notifications, ...(saved.notifications || {}) };
    needsSave = needsSave
      || saved.version !== STATE_VERSION
      || !Object.prototype.hasOwnProperty.call(saved, 'startDate')
      || !Object.prototype.hasOwnProperty.call(saved, 'readingPlanId')
      || !Object.prototype.hasOwnProperty.call(saved, 'customPlan')
      || !Object.prototype.hasOwnProperty.call(saved, 'verseNotes')
      || !Object.prototype.hasOwnProperty.call(saved, 'apiKeys')
      || !Object.prototype.hasOwnProperty.call(saved, 'audio')
      || !Object.prototype.hasOwnProperty.call(saved, 'cloudSync')
      || !Object.prototype.hasOwnProperty.call(saved, 'notifications');
    state.version = STATE_VERSION;
  }
  if (!state.startDate) {
    // Anchor to today so daysDiff=0 for today's reading regardless of prior history.
    state.startDate = formatDateKey(new Date());
    needsSave = true;
  }
  if (migrateCompletedReadingKeys()) needsSave = true;
  if (needsSave) saveState();
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

function getReadingPlan(dateKey) {
  return getReadingPlanForState(state, dateKey);
}

function readingCompletionKey(reading) {
  if (!reading || !reading.book || reading.chapter == null) return '';
  const label = reading.label || reading.type || 'Reading';
  return `${reading.book} ${reading.chapter}|${label}`;
}

function normalizeCompletionEntry(entry, readings) {
  if (typeof entry === 'string') return entry;
  if (Number.isInteger(entry) && readings && readings[entry]) return readingCompletionKey(readings[entry]);
  return '';
}

function getCompletedKeys(dateKey, readings = getReadingPlan(dateKey)) {
  const rawEntries = state.completed?.[dateKey];
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const keys = [];
  entries.forEach(entry => {
    const key = normalizeCompletionEntry(entry, readings);
    if (key && !keys.includes(key)) keys.push(key);
  });
  if ((rawEntries !== undefined && !Array.isArray(rawEntries)) || keys.length !== entries.length || entries.some((entry, idx) => entry !== keys[idx])) {
    if (!state.completed) state.completed = {};
    state.completed[dateKey] = keys;
  }
  return keys;
}

function setCompletedKeys(dateKey, keys) {
  if (!state.completed) state.completed = {};
  state.completed[dateKey] = [...new Set((keys || []).filter(Boolean))];
}

function isReadingCompleted(reading, completedKeys) {
  return completedKeys.includes(readingCompletionKey(reading));
}

function completedReadingCount(readings, completedKeys) {
  const keys = new Set(completedKeys || []);
  return (readings || []).reduce((count, reading) => keys.has(readingCompletionKey(reading)) ? count + 1 : count, 0);
}

function isFullCompletionDay(dateKey) {
  const readings = getReadingPlan(dateKey);
  if (!readings.length) return false;
  return completedReadingCount(readings, getCompletedKeys(dateKey, readings)) >= readings.length;
}

function hasAnyCompletedReading(dateKey) {
  const readings = getReadingPlan(dateKey);
  return completedReadingCount(readings, getCompletedKeys(dateKey, readings)) > 0;
}

function migrateCompletedReadingKeys() {
  if (!state.completed || typeof state.completed !== 'object') {
    state.completed = {};
    return true;
  }

  let changed = false;
  Object.keys(state.completed).forEach(dateKey => {
    const wasArray = Array.isArray(state.completed[dateKey]);
    const before = wasArray ? state.completed[dateKey] : [];
    const readings = getReadingPlan(dateKey);
    const after = getCompletedKeys(dateKey, readings);
    if (!wasArray || before.length !== after.length || before.some((entry, idx) => entry !== after[idx])) changed = true;
  });
  return changed;
}

function migrateStartOtIndexToReadingBooks() {
  if (typeof OT_READING_BOOKS === 'undefined' || !Array.isArray(OT_READING_BOOKS)) return false;
  const oldIndex = Number(state.startOtIndex || 0);
  const oldChapter = getBookAndChapterFromIndex(OT_BOOKS, oldIndex);
  let newBookIdx = OT_READING_BOOKS.findIndex(([name]) => name === oldChapter.book);
  let newChapter = oldChapter.chapter;

  if (newBookIdx < 0) {
    const oldBookIdx = OT_BOOKS.findIndex(([name]) => name === oldChapter.book);
    const nextBook = OT_BOOKS.slice(oldBookIdx + 1).find(([name]) =>
      OT_READING_BOOKS.some(([readingName]) => readingName === name)
    );
    newBookIdx = nextBook ? OT_READING_BOOKS.findIndex(([name]) => name === nextBook[0]) : 0;
    newChapter = 1;
  }

  if (newBookIdx < 0) return false;
  const nextIndex = getAbsoluteIndexFromSelection(OT_READING_BOOKS, newBookIdx, newChapter);
  if (nextIndex === oldIndex) return false;
  state.startOtIndex = nextIndex;
  return true;
}

/* ===== STATS & STREAK ===== */
function recomputeAllStats() {
  const today = formatDateKey(new Date());
  const allDays = [
    ...Object.keys(state.completed).filter(d => isFullCompletionDay(d)),
    ...(state.frozenDays || [])
  ];
  const sortedDays = [...new Set(allDays)].sort();

  if (sortedDays.length === 0) { state.streak = 0; return; }

  // Current streak: walk back from today
  let currentStreak = 0;
  const checkDate = stripTime(new Date());
  while (true) {
    const key = formatDateKey(checkDate);
    const hasReading = isFullCompletionDay(key) || (state.frozenDays || []).includes(key);
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
  const completed = getCompletedKeys(dateKey, readings);
  const doneCount = completedReadingCount(readings, completed);

  // Progress
  const pct = readings.length > 0 ? Math.round((doneCount / readings.length) * 100) : 0;
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${doneCount} / ${readings.length}`;

  // Mercy banner
  const banner = document.getElementById('mercy-banner');
  if (banner && state.streak > 0 && isToday && doneCount >= readings.length && readings.length > 0) {
    banner.hidden = false;
    document.getElementById('mercy-banner-text').textContent = `Day complete! ${state.streak} day streak! \u{1F525}`;
  } else if (banner) {
    banner.hidden = true;
  }

  // Plan cards
  const container = document.getElementById('plan-container');
  container.innerHTML = '';
  readings.forEach((reading, idx) => {
    const checked = isReadingCompleted(reading, completed);
    const card = document.createElement('div');
    card.className = 'plan-card' + (checked ? ' checked' : '');

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
    checkBtn.className = 'check-btn' + (checked ? ' checked' : '');
    checkBtn.setAttribute('aria-label', checked ? 'Mark as unread' : 'Mark as read');
    const checkIcon = document.createElement('span');
    checkIcon.className = 'material-symbols-rounded';
    checkIcon.textContent = checked ? 'check_circle' : 'radio_button_unchecked';
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
  const prevStreak = state.streak || 0;
  const readings = getReadingPlan(dateKey);
  const reading = readings[idx];
  if (!reading) return;
  const key = readingCompletionKey(reading);
  const arr = getCompletedKeys(dateKey, readings);
  const i = arr.indexOf(key);
  if (i >= 0) {
    arr.splice(i, 1);
    doHaptic([10]);
  } else {
    arr.push(key);
    playCheckSound();
    doHaptic([10,50,10]);
    if (completedReadingCount(readings, arr) >= readings.length) setTimeout(triggerCompletion, 200);
  }
  setCompletedKeys(dateKey, arr);
  saveState();
  recomputeAllStats();
  checkMilestoneNotifications(prevStreak);
  saveState();
  renderDashboard();
  updateStatDisplays();
  notifyProgress(dateKey);
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
  const dayCount = Object.keys(state.completed || {}).filter(d => hasAnyCompletedReading(d)).length;

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

const ROUTED_PAGES = new Set(['dashboard', 'notebook', 'history', 'settings']);
let activePage = 'dashboard';
let routeHistoryReady = false;
let webWakeLock = null;

function isBibleModalOpen() {
  const modal = document.getElementById('bible-modal');
  return !!modal && !modal.hasAttribute('hidden');
}

function bibleModalRouteState() {
  if (!isBibleModalOpen() || !currentModalReading) return null;
  return {
    book: currentModalReading.book,
    chapter: currentModalReading.chapter,
    idx: currentModalIdx
  };
}

function routeState(overrides = {}) {
  return {
    dtwg: true,
    page: overrides.page || activePage || 'dashboard',
    bibleModal: Object.prototype.hasOwnProperty.call(overrides, 'bibleModal')
      ? overrides.bibleModal
      : bibleModalRouteState()
  };
}

function replaceRouteState(overrides = {}) {
  if (!history.replaceState) return;
  history.replaceState(routeState(overrides), '', location.href);
}

function pushRouteState(overrides = {}) {
  if (!routeHistoryReady || !history.pushState) return;
  history.pushState(routeState(overrides), '', location.href);
}

function setupRouteHistory() {
  if (!history.replaceState || routeHistoryReady) return;
  const active = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (ROUTED_PAGES.has(active)) activePage = active;
  replaceRouteState({ bibleModal: null });
  window.addEventListener('popstate', event => {
    const next = event.state;
    if (!next || next.dtwg !== true) {
      if (isBibleModalOpen()) closeModal({ updateHistory: false });
      return;
    }
    if (ROUTED_PAGES.has(next.page)) switchPage(next.page, { pushHistory: false });
    if (next.bibleModal) {
      openBibleModal(next.bibleModal.book, next.bibleModal.chapter, next.bibleModal.idx, { pushHistory: false });
    } else if (isBibleModalOpen()) {
      closeModal({ updateHistory: false });
    }
  });
  routeHistoryReady = true;
}

function closeTopLayerForNativeBack() {
  const palette = document.getElementById('command-palette');
  if (palette && !palette.hasAttribute('hidden')) { closePalette(); return true; }
  const drawer = document.getElementById('side-drawer');
  if (drawer && !drawer.hasAttribute('hidden')) { closeSideDrawer(); return true; }
  if (isBibleModalOpen()) { closeModal(); return true; }
  if (activePage !== 'dashboard') {
    if (history.state?.dtwg) history.back();
    else switchPage('dashboard', { pushHistory: false });
    return true;
  }
  return false;
}

window.__dtwgHandleNativeBack = closeTopLayerForNativeBack;

async function setReadingKeepAwake(enabled) {
  const bridge = nativeBridge();
  if (bridge && typeof bridge.setKeepScreenOn === 'function') {
    try { bridge.setKeepScreenOn(!!enabled); } catch {}
  }
  try {
    if (!('wakeLock' in navigator)) return;
    if (enabled) {
      if (!webWakeLock) {
        webWakeLock = await navigator.wakeLock.request('screen');
        webWakeLock.addEventListener('release', () => { webWakeLock = null; });
      }
    } else if (webWakeLock) {
      await webWakeLock.release();
      webWakeLock = null;
    }
  } catch {}
}

function switchPage(pageName, options = {}) {
  if (!ROUTED_PAGES.has(pageName)) return;
  activePage = pageName;
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
  if (options.pushHistory !== false) pushRouteState({ page: pageName, bibleModal: null });
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

    const isFrozen = (state.frozenDays || []).includes(dateKey);
    const readings = getReadingPlan(dateKey);
    const completed = getCompletedKeys(dateKey, readings);
    const done = completedReadingCount(readings, completed);

    if (isFrozen) {
      cell.classList.add('frozen');
    } else if (done > 0) {
      const total = readings.length;
      const safeDone = Math.min(done, total);
      cell.classList.add(safeDone >= total ? 'complete' : 'partial');

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
      const pct = total > 0 ? safeDone / total : 0;
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

function getVerseNoteEntriesForDate(dateKey) {
  const readingChapters = new Set(getReadingPlan(dateKey).map(r => `${r.book} ${r.chapter}`));
  return Object.entries(state.verseNotes || {}).filter(([ref, note]) => {
    if (!note || !String(note.text || '').trim()) return false;
    if (note.date) return note.date === dateKey;
    return readingChapters.has(String(ref).split(':')[0]);
  });
}

function formatVerseNoteDate(note) {
  if (note?.date) return note.date;
  if (note?.ts) return formatDateKey(new Date(note.ts));
  return '';
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
    const journalEntries = Object.entries(journals).filter(([,v]) => v && v.trim());
    const verseEntries = Object.entries(state.verseNotes || {})
      .filter(([,v]) => v && String(v.text || '').trim())
      .sort((a,b) => (b[1].ts || 0) - (a[1].ts || 0));

    if (journalEntries.length === 0 && verseEntries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No notes yet. Add verse notes while reading, or write in the journal on the Read page.';
      list.appendChild(empty);
      return;
    }

    verseEntries.forEach(([ref, note]) => {
      const item = document.createElement('div');
      item.className = 'history-item verse-note-item';

      const refEl = document.createElement('div');
      refEl.className = 'history-ref';
      refEl.textContent = ref;

      const content = document.createElement('p');
      content.className = 'history-text';
      content.textContent = note.text || '';

      const meta = document.createElement('div');
      meta.className = 'history-meta';
      const badge = document.createElement('span');
      badge.className = 'hl-badge hl-badge-general';
      badge.textContent = 'Verse Note';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'history-date';
      dateSpan.textContent = formatVerseNoteDate(note);
      meta.appendChild(badge);
      meta.appendChild(dateSpan);

      item.appendChild(refEl);
      item.appendChild(content);
      item.appendChild(meta);
      const dateKey = note.date || formatVerseNoteDate(note);
      if (dateKey) item.addEventListener('click', () => { viewedDate = dateKey; switchPage('dashboard'); });
      list.appendChild(item);
    });

    journalEntries.sort((a,b) => b[0].localeCompare(a[0]));

    journalEntries.forEach(([dateKey, text]) => {
      const item = document.createElement('div');
      item.className = 'history-item journal-item';

      const dateEl = document.createElement('div');
      dateEl.className = 'history-ref';
      dateEl.textContent = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

      const content = document.createElement('p');
      content.className = 'history-text';
      content.textContent = text;

      const meta = document.createElement('div');
      meta.className = 'history-meta';
      const badge = document.createElement('span');
      badge.className = 'hl-badge hl-badge-principle';
      badge.textContent = 'Journal';
      meta.appendChild(badge);

      item.appendChild(dateEl);
      item.appendChild(content);
      item.appendChild(meta);
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

  const dayVerseNotes = getVerseNoteEntriesForDate(dateKey);
  if (dayHighlights.length === 0 && dayVerseNotes.length === 0 && !journalEntry) {
    const exportBtn = document.getElementById('nb-export-btn');
    if (exportBtn) exportBtn.hidden = true;
    const empty = document.createElement('div');
    empty.className = 'notebook-empty';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded notebook-empty-icon';
    icon.textContent = 'book_2';
    const msg = document.createElement('p');
    msg.className = 'notebook-empty-text';
    msg.textContent = 'No highlights, verse notes, or journal entry for this day.';
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
  readingsH.textContent = '\uD83D\uDCD6 Today\u2019s Readings';
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
    { type: 'general',   label: 'General \u2728' },
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

  if (dayVerseNotes.length) {
    const notesSection = document.createElement('div');
    notesSection.className = 'notebook-section';
    const notesH = document.createElement('h3');
    notesH.className = 'notebook-chapter-heading';
    notesH.textContent = 'Verse Notes ✍️';
    notesSection.appendChild(notesH);

    dayVerseNotes.forEach(([ref, note]) => {
      const noteEl = document.createElement('div');
      noteEl.className = 'notebook-highlight notebook-verse-note';
      const verseRef = document.createElement('div');
      verseRef.className = 'notebook-verse-ref';
      verseRef.textContent = ref;
      const noteText = document.createElement('p');
      noteText.className = 'notebook-verse-text';
      noteText.textContent = note.text || '';
      noteEl.appendChild(verseRef);
      if (note.verseText) {
        const verseText = document.createElement('p');
        verseText.className = 'notebook-category-empty';
        verseText.textContent = note.verseText;
        noteEl.appendChild(verseText);
      }
      noteEl.appendChild(noteText);
      notesSection.appendChild(noteEl);
    });
    paper.appendChild(notesSection);
  }

  // APPLICATION
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

  // Show export button when notebook has content
  const exportBtn = document.getElementById('nb-export-btn');
  if (exportBtn) exportBtn.hidden = false;
}

function exportNotebookPDF() {
  const dateKey = notebookDate;
  const dateObj = new Date(dateKey + 'T00:00:00');
  const opts = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
  const dateStr = dateObj.toLocaleDateString('en-US', opts);

  const dayHighlights = Object.entries(state.highlights || {}).filter(([,v]) => v.date === dateKey);
  const dayVerseNotes = getVerseNoteEntriesForDate(dateKey);
  const journalEntry  = state.journal[dateKey] || '';
  const readings = getReadingPlan(dateKey);

  const categories = [
    { type: 'general',   label: 'General \u2728' },
    { type: 'promise',   label: 'Promises \uD83E\uDD1D' },
    { type: 'command',   label: 'Commands \uD83D\uDCCB' },
    { type: 'warning',   label: 'Warnings \u26A0\uFE0F' },
    { type: 'principle', label: 'Principles \uD83D\uDCA1' }
  ];

  // Build HTML for the print window
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>DTWG Notebook - ${esc(dateStr)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 32px 24px; color: #1C1B1F; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 18px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .readings { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { display: inline-block; padding: 3px 10px; font-size: 12px; background: #eee; border-radius: 12px; }
  .hl { margin: 6px 0; padding: 8px 10px; border-left: 3px solid #6750A4; background: #f9f7fd; border-radius: 4px; }
  .hl-ref { font-weight: bold; font-size: 13px; color: #6750A4; }
  .hl-text { font-size: 14px; margin-top: 2px; }
  .note { margin: 6px 0; padding: 8px 10px; border-left: 3px solid #455A64; background: #f3f6fa; border-radius: 4px; }
  .empty { font-style: italic; color: #888; font-size: 13px; }
  .journal { white-space: pre-wrap; font-size: 14px; line-height: 1.7; background: #f5f5f5; padding: 12px; border-radius: 6px; }
  .footer { margin-top: 24px; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>`;

  html += `<h1>\uD83D\uDCD6 Daily Time with God</h1>`;
  html += `<p style="margin:0 0 16px;color:#555;">${esc(dateStr)}</p>`;

  html += `<h2>\uD83D\uDCD6 Today\u2019s Readings</h2><div class="readings">`;
  readings.forEach(r => { html += `<span class="chip">${esc(r.book)} ${esc(r.chapter)}</span>`; });
  html += `</div>`;

  categories.forEach(cat => {
    html += `<h2>${esc(cat.label)}</h2>`;
    const items = dayHighlights.filter(([, v]) => v.type === cat.type);
    if (items.length === 0) {
      html += `<p class="empty">No ${esc(cat.type)} highlights yet.</p>`;
    } else {
      items.forEach(([ref, hl]) => {
        html += `<div class="hl"><div class="hl-ref">${esc(ref)}</div>`;
        if (hl.text) html += `<div class="hl-text">${esc(hl.text)}</div>`;
        html += `</div>`;
      });
    }
  });

  html += `<h2>Verse Notes \u270D\uFE0F</h2>`;
  if (dayVerseNotes.length === 0) {
    html += `<p class="empty">No verse notes yet.</p>`;
  } else {
    dayVerseNotes.forEach(([ref, note]) => {
      html += `<div class="note"><div class="hl-ref">${esc(ref)}</div>`;
      if (note.verseText) html += `<div class="hl-text">${esc(note.verseText)}</div>`;
      html += `<div class="hl-text">${esc(note.text || '')}</div></div>`;
    });
  }

  html += `<h2>Application \u270D\uFE0F</h2>`;
  if (journalEntry) {
    html += `<div class="journal">${esc(journalEntry)}</div>`;
  } else {
    html += `<p class="empty">No application entry yet.</p>`;
  }

  html += `<div class="footer">Exported from Daily Time with God</div>`;
  html += `</body></html>`;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    showToast('Please allow pop-ups to export PDF');
    return;
  }
  printWin.document.write(html);
  printWin.document.close();
  printWin.onload = () => { printWin.print(); };
}

/* ===== BIBLE MODAL ===== */
let currentModalReading   = null;
let currentModalIdx       = -1;
let currentReadingStartTime = null;
let lastActivity          = Date.now();
let touchStartX           = 0;
let touchStartY           = 0;
let currentChapterData    = null;

document.addEventListener('touchstart', () => { lastActivity = Date.now(); }, { passive: true });
document.addEventListener('mousemove',  () => { lastActivity = Date.now(); }, { passive: true });

const BIBLE_API_TRANSLATIONS = [
  { value:'web', label:'WEB' },
  { value:'kjv', label:'KJV' },
  { value:'bbe', label:'BBE' },
  { value:'asv', label:'ASV' },
  { value:'darby', label:'Darby' }
];

const API_BIBLE_IDS = {
  niv: '78a9f6124f344018-01',
  nlt: 'd6e14a625393b4da-01',
  nkjv: '63097d2a0a2f7db3-01'
};

const API_BIBLE_LABELS = {
  niv: 'NIV (API.Bible)',
  nlt: 'NLT (API.Bible)',
  nkjv: 'NKJV (API.Bible)'
};

const BOOK_ID3 = {
  Genesis:'GEN', Exodus:'EXO', Leviticus:'LEV', Numbers:'NUM', Deuteronomy:'DEU', Joshua:'JOS', Judges:'JDG', Ruth:'RUT',
  '1 Samuel':'1SA', '2 Samuel':'2SA', '1 Kings':'1KI', '2 Kings':'2KI', '1 Chronicles':'1CH', '2 Chronicles':'2CH',
  Ezra:'EZR', Nehemiah:'NEH', Esther:'EST', Job:'JOB', Psalms:'PSA', Proverbs:'PRO', Ecclesiastes:'ECC',
  'Song of Solomon':'SNG', Isaiah:'ISA', Jeremiah:'JER', Lamentations:'LAM', Ezekiel:'EZK', Daniel:'DAN',
  Hosea:'HOS', Joel:'JOL', Amos:'AMO', Obadiah:'OBA', Jonah:'JON', Micah:'MIC', Nahum:'NAM', Habakkuk:'HAB',
  Zephaniah:'ZEP', Haggai:'HAG', Zechariah:'ZEC', Malachi:'MAL', Matthew:'MAT', Mark:'MRK', Luke:'LUK',
  John:'JHN', Acts:'ACT', Romans:'ROM', '1 Corinthians':'1CO', '2 Corinthians':'2CO', Galatians:'GAL',
  Ephesians:'EPH', Philippians:'PHP', Colossians:'COL', '1 Thessalonians':'1TH', '2 Thessalonians':'2TH',
  '1 Timothy':'1TI', '2 Timothy':'2TI', Titus:'TIT', Philemon:'PHM', Hebrews:'HEB', James:'JAS',
  '1 Peter':'1PE', '2 Peter':'2PE', '1 John':'1JN', '2 John':'2JN', '3 John':'3JN', Jude:'JUD', Revelation:'REV'
};

const BibleProviders = {
  'bible-api': { needsKey: false, translations: BIBLE_API_TRANSLATIONS.map(t => t.value), fetch: fetchBibleApi },
  'api-bible': { needsKey: true, translations: Object.keys(API_BIBLE_IDS), fetch: fetchApiBible },
  'esv': { needsKey: true, translations: ['esv'], fetch: fetchEsv }
};

function getActiveProvider(translation) {
  if (translation === 'nkv') translation = 'nkjv';
  if (translation === 'esv' && state.apiKeys.esv) return 'esv';
  if (API_BIBLE_IDS[translation] && state.apiKeys.apiBible) return 'api-bible';
  return 'bible-api';
}

function cacheKeyForChapter(provider, translation, book, chapter) {
  return `dtwg_bible_${provider}_${translation}_${book}_${chapter}`;
}

async function fetchBibleApi(book, chapter, translation) {
  const bookSlug = book.toLowerCase().replace(/\s+/g, '+');
  const resp = await fetch(`https://bible-api.com/${bookSlug}+${chapter}?translation=${translation}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return {
    verses: (data.verses || []).map(v => ({ verse: v.verse, text: v.text })),
    reference: data.reference || `${book} ${chapter}`,
    translation_name: data.translation_name || translation.toUpperCase()
  };
}

async function fetchApiBible(book, chapter, translation) {
  if (translation === 'nkv') translation = 'nkjv';
  const bibleId = API_BIBLE_IDS[translation] || API_BIBLE_IDS.niv;
  const passageId = `${BOOK_ID3[book] || book}.${chapter}`.replace(/\s+/g, '');
  const resp = await fetch(`https://rest.api.bible/v1/bibles/${bibleId}/chapters/${encodeURIComponent(passageId)}?content-type=text&include-notes=false&include-titles=false`, {
    headers: { 'api-key': state.apiKeys.apiBible }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const content = data.data?.content || '';
  return {
    verses: splitPlainChapter(content),
    reference: data.data?.reference || `${book} ${chapter}`,
    translation_name: translation.toUpperCase(),
    crossrefs: []
  };
}

async function fetchEsv(book, chapter) {
  const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(`${book} ${chapter}`)}&include-footnotes=false&include-headings=false`;
  const resp = await fetch(url, {
    headers: { Authorization: `Token ${state.apiKeys.esv}` }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return {
    verses: splitPlainChapter((data.passages || [''])[0]),
    reference: data.canonical || `${book} ${chapter}`,
    translation_name: 'ESV'
  };
}

function splitPlainChapter(text) {
  const withMarkers = String(text || '').replace(/\[(\d+)\]/g, ' $1 ');
  const clean = withMarkers.replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.split(/(?=\s\d+\s)/).filter(Boolean);
  if (parts.length <= 1) return [{ verse: 1, text: clean }];
  return parts.map((part, idx) => {
    const m = part.match(/^\s*(\d+)\s+(.*)$/);
    return { verse: m ? Number(m[1]) : idx + 1, text: m ? m[2] : part.trim() };
  });
}

async function fetchChapter(book, chapter, translation) {
  const provider = getActiveProvider(translation);
  const key = cacheKeyForChapter(provider, translation, book, chapter);
  let data = await getCachedBible(key);
  if (!data) {
    data = await BibleProviders[provider].fetch(book, chapter, translation);
    data.provider = provider;
    await setCachedBible(key, data);
    searchIndex = null;
    setCachedStore('sync', 'dtwg_search_index', null).catch(() => {});
  }
  return data;
}

async function openBibleModal(book, chapter, idx, options = {}) {
  const wasOpen = isBibleModalOpen();
  if (currentReadingStartTime && currentModalReading &&
      (currentModalReading.book !== book || currentModalReading.chapter !== chapter || currentModalIdx !== idx)) {
    commitReadingTime();
  }
  currentModalReading     = { book, chapter };
  currentModalIdx         = idx;
  currentReadingStartTime = Date.now();
  lastActivity            = Date.now();

  const modal = document.getElementById('bible-modal');
  modal.removeAttribute('hidden');
  setReadingKeepAwake(true);
  if (options.pushHistory !== false) {
    const modalState = { book, chapter, idx };
    if (wasOpen || history.state?.bibleModal) replaceRouteState({ bibleModal: modalState });
    else pushRouteState({ bibleModal: modalState });
  }

  document.getElementById('modal-title').textContent = `${book} ${chapter} (${(state.settings.translation || 'web').toUpperCase()})`;
  document.getElementById('modal-loading').style.display = 'flex';
  document.getElementById('modal-verses').style.display  = 'none';
  document.getElementById('modal-verses').innerHTML = '';

  const dateKey  = viewedDate;
  const modalReadings = getReadingPlan(dateKey);
  const isChecked = isReadingCompleted(modalReadings[idx], getCompletedKeys(dateKey, modalReadings));
  updateModalActionBtn(isChecked);

  // Disable prev/next at reading plan boundaries
  const readings = getReadingPlan(viewedDate);
  document.getElementById('modal-prev-btn').disabled = (idx <= 0);
  document.getElementById('modal-next-btn').disabled = (idx >= readings.length - 1);

  // Scroll to top
  document.getElementById('modal-body').scrollTop = 0;

  try {
    const translation = state.settings.translation || 'web';
    const data = await fetchChapter(book, chapter, translation);
    currentChapterData = data;
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
    if (state.verseNotes?.[refKey]?.text) p.classList.add('has-note');

    p.appendChild(num);
    p.appendChild(text);
    p.addEventListener('click', () => showHighlightMenu(p, refKey, v.text));
    attachLongPressNote(p, refKey, v.text);
    versesEl.appendChild(p);
  });

  if (Array.isArray(data.crossrefs) && data.crossrefs.length) {
    const strip = document.createElement('div');
    strip.className = 'crossref-output';
    data.crossrefs.slice(0, 12).forEach(ref => {
      const chip = document.createElement('button');
      chip.className = 'secondary-btn';
      chip.textContent = ref.reference || ref;
      chip.addEventListener('click', () => openSideDrawer('Cross-reference', ref.text || ref.reference || ref));
      strip.appendChild(chip);
    });
    versesEl.appendChild(strip);
  }

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

  const noteBtn = document.createElement('button');
  noteBtn.className = 'hl-circle-btn';
  noteBtn.setAttribute('aria-label', 'Note');
  noteBtn.textContent = 'Note';
  noteBtn.addEventListener('click', e => {
    e.stopPropagation();
    openNotePopover(verseEl, refKey, verseText);
  });
  menu.appendChild(noteBtn);

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  }, 10);

  verseEl.insertAdjacentElement('afterend', menu);
}

function attachLongPressNote(verseEl, refKey, verseText) {
  let timer = null;
  verseEl.addEventListener('pointerdown', () => {
    timer = setTimeout(() => openNotePopover(verseEl, refKey, verseText), 500);
  });
  ['pointerup','pointercancel','pointermove'].forEach(type => {
    verseEl.addEventListener(type, () => { clearTimeout(timer); timer = null; });
  });
}

function openNotePopover(verseEl, refKey, verseText) {
  document.querySelectorAll('.hl-menu').forEach(m => m.remove());
  const pop = document.createElement('div');
  pop.className = 'hl-menu note-popover';
  const textarea = document.createElement('textarea');
  textarea.value = state.verseNotes?.[refKey]?.text || '';
  textarea.placeholder = `Note on ${refKey}`;
  const saveBtn = document.createElement('button');
  saveBtn.className = 'secondary-btn';
  saveBtn.textContent = 'Save';
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'secondary-btn';
  deleteBtn.textContent = 'Delete';
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!state.verseNotes) state.verseNotes = {};
    const text = textarea.value.trim();
    if (text) {
      state.verseNotes[refKey] = { text, ts: Date.now(), date: viewedDate, verseText };
      verseEl.classList.add('has-note');
    } else {
      delete state.verseNotes[refKey];
      verseEl.classList.remove('has-note');
    }
    saveState();
    pop.remove();
  });
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    delete state.verseNotes[refKey];
    verseEl.classList.remove('has-note');
    saveState();
    pop.remove();
  });
  pop.appendChild(textarea);
  pop.appendChild(saveBtn);
  pop.appendChild(deleteBtn);
  verseEl.insertAdjacentElement('afterend', pop);
  textarea.focus();
}

function openSideDrawer(title, bodyNodeOrText) {
  const drawer = document.getElementById('side-drawer');
  const body = document.getElementById('side-drawer-body');
  document.getElementById('side-drawer-title').textContent = title;
  body.innerHTML = '';
  if (typeof bodyNodeOrText === 'string') {
    const div = document.createElement('div');
    div.className = 'ai-output';
    div.textContent = bodyNodeOrText;
    body.appendChild(div);
  } else if (bodyNodeOrText) {
    body.appendChild(bodyNodeOrText);
  }
  drawer.hidden = false;
}

function closeSideDrawer() {
  document.getElementById('side-drawer').hidden = true;
}

async function getAudioUrl(book, chapter, voice) {
  if (!state.apiKeys.bibleBrain) throw new Error('Bible Brain key required');
  const fileset = voice || state.audio.voice || 'ENGESVN2DA';
  const params = new URLSearchParams({ key: state.apiKeys.bibleBrain, fileset_id: fileset, book_id: BOOK_ID3[book] || book.slice(0, 3).toUpperCase(), chapter_id: String(chapter) });
  const resp = await fetch(`https://4.dbt.io/api/bibles/filesets/audio?${params}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data?.data?.[0]?.path || data?.data?.[0]?.url || '';
}

async function cacheAudio(url, key) {
  const cached = await getCachedStore('audio', key);
  if (cached) return URL.createObjectURL(cached);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  await setCachedStore('audio', key, blob);
  return URL.createObjectURL(blob);
}

function setupMediaSession(meta) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: meta.title,
    artist: 'Daily Time with God',
    album: state.settings.translation?.toUpperCase() || 'Bible'
  });
}

async function mountAudioBar(refKey) {
  const bar = document.getElementById('audio-bar');
  bar.hidden = false;
  bar.innerHTML = '<div class="audio-meta">Loading audio...</div>';
  try {
    const { book, chapter } = currentModalReading;
    const remoteUrl = await getAudioUrl(book, chapter, state.audio.voice);
    if (!remoteUrl) throw new Error('No audio file available');
    const shouldCache = !navigator.connection || navigator.connection.effectiveType === '4g' || state.audio.autoplay;
    const src = shouldCache ? await cacheAudio(remoteUrl, `audio_${state.audio.voice}_${refKey}`) : remoteUrl;
    bar.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'audio-meta';
    meta.textContent = `${book} ${chapter} audio`;
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = src;
    bar.appendChild(meta);
    bar.appendChild(audio);
    setupMediaSession({ title: `${book} ${chapter}` });
    if (state.audio.autoplay) audio.play().catch(() => {});
  } catch (err) {
    bar.innerHTML = `<div class="audio-meta">${err.message}</div>`;
  }
}

async function getCachedAI(key) {
  return getCachedStore('ai', key);
}

async function streamClaude(systemPrompt, userPrompt, onToken) {
  if (!state.apiKeys.anthropic) throw new Error('Claude API key required');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': state.apiKeys.anthropic,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    chunk.split('\n').forEach(line => {
      if (!line.startsWith('data:')) return;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') return;
      try {
        const event = JSON.parse(raw);
        const text = event.delta?.text || event.content_block?.text || '';
        if (text) { out += text; onToken(text); }
      } catch {}
    });
  }
  return out;
}

async function explainPassage(book, chapter, verseRange) {
  const key = `dtwg_ai_${book}_${chapter}_${verseRange || 'chapter'}_claude-haiku-4-5-20251001`;
  const cached = await getCachedAI(key);
  const out = document.createElement('div');
  out.className = 'ai-output';
  openSideDrawer(`Explain ${book} ${chapter}`, out);
  if (cached) { out.textContent = cached.text; return; }
  const systemPrompt = 'You are a concise devotional Bible study assistant. Be ecumenical, practical, and about 250 words. Avoid denominational debate.';
  const verses = (currentChapterData?.verses || []).map(v => `${v.verse}. ${v.text}`).join('\n');
  const text = await streamClaude(systemPrompt, `Explain ${book} ${chapter}${verseRange ? ':' + verseRange : ''} devotionally.\n\n${verses}`, token => { out.textContent += token; });
  await setCachedStore('ai', key, { text, ts: Date.now() });
}

function buildIcs(reminderTime, startDate) {
  const uid = `dtwg-${startDate}@blayalems.github.io`;
  const dt = (startDate || formatDateKey(new Date())).replace(/-/g, '') + 'T' + (reminderTime || '07:00').replace(':', '') + '00';
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DTWG//Daily Time with God//EN','BEGIN:VEVENT',
    `UID:${uid}`,`DTSTART:${dt}`,'RRULE:FREQ=DAILY','SUMMARY:Daily Time with God',
    "DESCRIPTION:Open DTWG and complete today's readings.",'BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY',
    'DESCRIPTION:Daily Time with God','END:VALARM','END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
}

function downloadIcs() {
  const blob = new Blob([buildIcs(state.settings.reminderTime, state.startDate)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dtwg-daily-reminder.ics';
  a.click();
  URL.revokeObjectURL(url);
}

async function shareIcs() {
  const file = new File([buildIcs(state.settings.reminderTime, state.startDate)], 'dtwg-daily-reminder.ics', { type: 'text/calendar' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'DTWG Daily Reminder' });
  else downloadIcs();
}

function postToSW(message) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage(message);
}

function notificationPermissionLabel() {
  const web = 'Notification' in window ? Notification.permission : 'unsupported';
  const bridge = nativeBridge();
  let native = '';
  if (bridge && typeof bridge.getNotificationPermissionState === 'function') {
    try { native = `; native: ${bridge.getNotificationPermissionState()}`; } catch {}
  }
  return `${web}${native}`;
}

function updateNotificationSupportText() {
  const support = document.getElementById('notification-support');
  if (!support) return;
  support.textContent = `Notifications: ${notificationPermissionLabel()}; inline reply: ${('Notification' in window && 'actions' in Notification.prototype) ? 'fallback capable' : 'fallback only'}.`;
}

async function ensureNotificationPermission({ prompt = false } = {}) {
  const bridge = nativeBridge();
  let nativeGranted = false;
  if (bridge && typeof bridge.getNotificationPermissionState === 'function') {
    try { nativeGranted = bridge.getNotificationPermissionState() === 'granted'; } catch {}
  }
  if (!nativeGranted && prompt && bridge && typeof bridge.requestNotificationPermission === 'function') {
    try { nativeGranted = bridge.requestNotificationPermission() === true; } catch {}
  }

  let webGranted = !('Notification' in window) || Notification.permission === 'granted';
  if ('Notification' in window && Notification.permission === 'default' && prompt) {
    try { webGranted = await Notification.requestPermission() === 'granted'; } catch {}
  }
  updateNotificationSupportText();
  return webGranted || nativeGranted;
}

function scheduleNativeReminderIfAvailable() {
  const bridge = nativeBridge();
  if (!bridge || typeof bridge.scheduleNativeReminder !== 'function') return false;
  try { return bridge.scheduleNativeReminder(state.settings.reminderTime || '07:00') === true; } catch { return false; }
}

function cancelNativeReminderIfAvailable() {
  const bridge = nativeBridge();
  if (!bridge || typeof bridge.cancelNativeReminder !== 'function') return;
  try { bridge.cancelNativeReminder(); } catch {}
}

async function scheduleReminderIfEnabled(options = {}) {
  if (!state.settings.reminder) {
    cancelNativeReminderIfAvailable();
    return true;
  }
  const hasPermission = await ensureNotificationPermission({ prompt: options.prompt === true });
  const nativeScheduled = scheduleNativeReminderIfAvailable();
  if (!hasPermission && !nativeScheduled) return false;
  const reg = await navigator.serviceWorker?.ready;
  if (!reg) return nativeScheduled || hasPermission;
  try {
    if ('periodicSync' in reg) await reg.periodicSync.register('dtwg-daily', { minInterval: 12 * 60 * 60 * 1000 });
  } catch {}
  postToSW({ type: 'scheduleReminder', time: state.settings.reminderTime, state });
  return true;
}

function notifyProgress(dateKey) {
  const readings = getReadingPlan(dateKey);
  const done = completedReadingCount(readings, getCompletedKeys(dateKey, readings));
  if (state.notifications?.perChapter) {
    postToSW({ type: 'updateProgress', dateKey, done, total: readings.length, readings, state });
  }
  if (dateKey === formatDateKey(new Date())) postNativeReadingProgress(dateKey, readings, done);
  updateAppBadge();
}

function postNativeReadingProgress(dateKey, readings, done) {
  const bridge = window.DTWGAndroid;
  if (!bridge || typeof bridge.onReadingState !== 'function') return;
  const total = readings.length;
  const next = readings[done] || null;
  const snap = {
    phase: total > 0 && done >= total ? 'complete' : 'reading',
    dateKey,
    dayTitle: 'Daily Time with God',
    progressText: `${done}/${total} readings`,
    done,
    total,
    nextTitle: next ? `${next.book} ${next.chapter}` : '',
    startedAt: Date.now()
  };
  try { bridge.onReadingState(JSON.stringify(snap)); } catch {}
}

function checkMilestoneNotifications(prevStreak) {
  const milestones = [7, 30, 100];
  milestones.forEach(n => {
    if ((prevStreak || 0) < n && state.streak >= n && state.notifications?.streak) {
      postToSW({ type: 'milestone', milestone: n });
    }
  });
}

/* ===== APP BADGE (Android 16 Live Updates) ===== */
function updateAppBadge() {
  if (!('setAppBadge' in navigator)) return;
  const dateKey = formatDateKey(new Date());
  const readings = getReadingPlan(dateKey);
  const done = completedReadingCount(readings, getCompletedKeys(dateKey, readings));
  const remaining = readings.length - done;
  if (remaining <= 0) {
    navigator.clearAppBadge?.().catch(() => {});
  } else {
    navigator.setAppBadge(remaining).catch(() => {});
  }
}

function handleNativeNotificationAction(action, dateOverride) {
  const dateKey = dateOverride || formatDateKey(new Date());
  if (action === 'complete') {
    const prevStreak = state.streak || 0;
    state.completed[dateKey] = getReadingPlan(dateKey).map(readingCompletionKey);
    saveState();
    recomputeAllStats();
    saveState();
    checkMilestoneNotifications(prevStreak);
    updateStatDisplays();
    viewedDate = dateKey;
    switchPage('dashboard');
    notifyProgress(dateKey);
    return;
  }
  viewedDate = dateKey;
  switchPage('dashboard');
}

function bindNativeAndroidBridge() {
  window.__dtwgNativeActionReady = true;
  window.__dtwgDispatchNativeAction = handleNativeNotificationAction;
  (window.__dtwgPendingNativeActions || []).splice(0).forEach(handleNativeNotificationAction);
  window.addEventListener('dtwgNativeAction', event => handleNativeNotificationAction(event.detail || 'open'));
  const params = new URLSearchParams(location.search);
  const action = params.get('notifAction');
  if (action) handleNativeNotificationAction(action, params.get('date'));
}

/* ===== AUTO-UPDATE ===== */
let _updateDismissed = false;

async function checkForUpdate() {
  try {
    const res = await fetch(UPDATE_CHECK_URL + '?_=' + Date.now(), {
      cache: 'no-store',
      signal: AbortSignal.timeout?.(8000)
    });
    if (!res.ok) return null;
    const remote = await res.json();
    const onlineEl = document.getElementById('online-version');
    if (onlineEl) onlineEl.textContent = 'v' + (remote.version || '?');
    document.getElementById('online-version-row')?.removeAttribute('hidden');
    if (remote.version && remote.version !== APP_VERSION && !_updateDismissed) {
      showUpdateBanner(remote.version, remote.notes);
    }
    return remote;
  } catch {
    return null;
  }
}

function showUpdateBanner(version, notes) {
  const banner = document.getElementById('update-banner');
  if (!banner) return;
  const titleEl = document.getElementById('update-banner-title');
  const notesEl = document.getElementById('update-banner-notes');
  if (titleEl) titleEl.textContent = `Version ${version} available`;
  if (notesEl) notesEl.textContent = notes || 'A new version is ready to install.';
  banner.hidden = false;
  document.getElementById('update-available-row')?.removeAttribute('hidden');
}

async function applyUpdate() {
  document.getElementById('update-banner')?.setAttribute('hidden', '');
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    } catch {}
  }
  const keys = await caches.keys().catch(() => []);
  await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
  location.reload();
}

/* ===== BACKUP EXPORT / IMPORT ===== */
const BACKUP_FIELDS = [
  'userName', 'readingPlan', 'readingPlanId', 'startDate',
  'startOtIndex', 'startNtIndex', 'startPsalmIndex', 'startPrIndex',
  'customPlan', 'completed', 'highlights', 'verseNotes', 'journal',
  'timeSpent', 'streak', 'longestStreak', 'streakFreezes', 'frozenDays',
  'streakMilestones', 'settings', 'notifications', 'onboardingComplete'
];

function exportBackup() {
  const payload = { _dtwg: true, exportedAt: new Date().toISOString(), appVersion: APP_VERSION, data: {} };
  BACKUP_FIELDS.forEach(f => { if (state[f] !== undefined) payload.data[f] = state[f]; });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dtwg-backup-${formatDateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup exported');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      // Accept both wrapped format { _dtwg, data } and raw state objects (forward compat)
      const data = parsed._dtwg ? parsed.data : parsed;
      if (!data || typeof data !== 'object') throw new Error('Unrecognised format');
      // Field-by-field merge — unknown fields are ignored, missing fields keep current value
      BACKUP_FIELDS.forEach(f => {
        if (data[f] === undefined) return;
        if (f === 'settings' && typeof data[f] === 'object') {
          state.settings = { ...DEFAULT_STATE.settings, ...state.settings, ...data[f] };
        } else {
          state[f] = data[f];
        }
      });
      state.version = STATE_VERSION;
      state.onboardingComplete = true;
      migrateCompletedReadingKeys();
      saveState();
      recomputeAllStats();
      applyTheme(state.settings.themeMode || 'system');
      applyAppColor(state.settings.appColor, state.settings.customColor);
      applyHighlightColors(state.settings.hlColors);
      renderDashboard();
      updateHeaderName();
      updateStatDisplays();
      showToast('Backup restored successfully');
    } catch (err) {
      showToast('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

let searchIndex = null;
async function buildSearchIndex() {
  if (searchIndex) return searchIndex;
  const warm = await getCachedStore('sync', 'dtwg_search_index');
  if (warm) { searchIndex = warm; return searchIndex; }
  searchIndex = { terms: {}, refs: {} };
  const db = await openDB();
  await new Promise(resolve => {
    const req = db.transaction('chapters','readonly').objectStore('chapters').openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) { resolve(); return; }
      const data = cursor.value;
      (data.verses || []).forEach(v => {
        const ref = `${data.reference || cursor.key}:${v.verse}`;
        searchIndex.refs[ref] = { ref, text: v.text, book: ref.replace(/\s+\d+.*/, ''), chapter: Number((ref.match(/\s(\d+)/) || [0, 1])[1]) };
        String(v.text).toLowerCase().match(/[a-z]{3,}/g)?.forEach(word => {
          if (!searchIndex.terms[word]) searchIndex.terms[word] = [];
          if (!searchIndex.terms[word].includes(ref)) searchIndex.terms[word].push(ref);
        });
      });
      cursor.continue();
    };
    req.onerror = () => resolve();
  });
  await setCachedStore('sync', 'dtwg_search_index', searchIndex);
  return searchIndex;
}

function openPalette() {
  const palette = document.getElementById('command-palette');
  palette.hidden = false;
  const input = document.getElementById('palette-input');
  input.value = '';
  renderPaletteResults('');
  input.focus();
}

function closePalette() {
  document.getElementById('command-palette').hidden = true;
}

async function renderPaletteResults(query) {
  const results = document.getElementById('palette-results');
  results.innerHTML = '';
  const jump = parseReference(query);
  if (jump) {
    results.appendChild(paletteItem(`${jump.book} ${jump.chapter}${jump.verse ? ':' + jump.verse : ''}`, 'Open passage', () => {
      closePalette();
      openBibleModal(jump.book, jump.chapter, 0);
    }));
    return;
  }
  if (!query || query.trim().length < 3) {
    results.innerHTML = '<div class="palette-result"><span>Type at least 3 letters to search cached chapters.</span></div>';
    return;
  }
  const idx = await buildSearchIndex();
  const terms = query.toLowerCase().match(/[a-z]{3,}/g) || [];
  const refs = [...new Set(terms.flatMap(t => idx.terms[t] || []))].slice(0, 20);
  refs.forEach(ref => {
    const item = idx.refs[ref];
    if (item) results.appendChild(paletteItem(item.ref, item.text, () => {
      closePalette();
      openBibleModal(item.book, item.chapter, 0);
    }));
  });
  if (!refs.length) results.innerHTML = '<div class="palette-result"><span>No cached matches yet.</span></div>';
}

function paletteItem(title, text, onClick) {
  const el = document.createElement('div');
  el.className = 'palette-result';
  el.innerHTML = `<strong></strong><span></span>`;
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = text;
  el.addEventListener('click', onClick);
  return el;
}

function parseReference(query) {
  const m = String(query || '').trim().match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+):?(\d+)?$/);
  if (!m) return null;
  return { book: m[1].replace(/\s+/g, ' ').trim(), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : null };
}

async function deriveKey(passphrase, salt, iterations = 250000) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

async function encryptState(payload, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { ciphertext: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv) };
}

async function decryptState(blob, passphrase) {
  const salt = base64ToBytes(blob.salt);
  const key = await deriveKey(passphrase, salt, blob.iterations || 250000);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(blob.iv) }, key, base64ToBytes(blob.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function syncNow() {
  if (!state.cloudSync.enabled) { showToast('Enable sync first'); return; }
  const url = state.apiKeys.supabaseUrl;
  const anon = state.apiKeys.supabaseAnon;
  const userId = state.cloudSync.userId;
  const passphrase = document.getElementById('sync-passphrase')?.value;
  if (!url || !anon || !userId || !passphrase) { showToast('Sync settings incomplete'); return; }
  if (!state.cloudSync.salt) state.cloudSync.salt = arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const remoteResp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/state_blobs?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` }
  });
  if (remoteResp.ok) {
    const rows = await remoteResp.json();
    const remote = rows?.[0];
    const remoteTs = remote?.updated_at ? Date.parse(remote.updated_at) : 0;
    if (remote && remoteTs > (state.cloudSync.lastSyncTs || 0)) {
      const pulled = await decryptState(remote, passphrase);
      state = { ...state, ...pulled, cloudSync: { ...state.cloudSync, ...pulled.cloudSync, lastSyncTs: remoteTs } };
      saveState();
      applyTheme(state.settings.themeMode || 'system');
      applyAppColor(state.settings.appColor, state.settings.customColor);
      applyHighlightColors(state.settings.hlColors);
      updateHeaderName();
      renderDashboard();
      updateStatDisplays();
      showToast('Cloud backup restored');
      return;
    }
  }
  const salt = base64ToBytes(state.cloudSync.salt);
  const key = await deriveKey(passphrase, salt);
  const encrypted = await encryptState({ ...state, apiKeys: { ...state.apiKeys, anthropic: '', apiBible: '', esv: '', bibleBrain: '' } }, key);
  const row = { user_id: userId, ciphertext: encrypted.ciphertext, iv: encrypted.iv, salt: state.cloudSync.salt, iterations: 250000, updated_at: new Date().toISOString() };
  const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/state_blobs`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row)
  });
  if (!resp.ok) throw new Error(`Sync HTTP ${resp.status}`);
  state.cloudSync.lastSyncTs = Date.now();
  saveState();
  showToast('Cloud backup updated');
}

function closeModal(options = {}) {
  if (options.updateHistory !== false && history.state?.dtwg && history.state?.bibleModal) {
    history.back();
    return;
  }
  const modal = document.getElementById('bible-modal');
  modal.setAttribute('hidden', '');
  setReadingKeepAwake(false);

  commitReadingTime();
  if (typeof stopTts === 'function') stopTts();

  document.getElementById('modal-verses').innerHTML = '';
  const audioBar = document.getElementById('audio-bar');
  if (audioBar) { audioBar.hidden = true; audioBar.innerHTML = ''; }
  document.querySelectorAll('.hl-menu').forEach(m => m.remove());
  currentModalReading = null;
  currentModalIdx = -1;
  if (options.updateHistory !== false) replaceRouteState({ bibleModal: null });
}

function commitReadingTime() {
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
}

function navigateBibleModal(direction) {
  const readings = getReadingPlan(viewedDate);
  const newIdx = currentModalIdx + direction;
  if (newIdx < 0 || newIdx >= readings.length) return;
  const reading = readings[newIdx];
  commitReadingTime();
  openBibleModal(reading.book, reading.chapter, newIdx);
}

function handleModalAction() {
  if (currentModalIdx >= 0) {
    toggleCheck(currentModalIdx);
    const readings = getReadingPlan(viewedDate);
    const isChecked = isReadingCompleted(readings[currentModalIdx], getCompletedKeys(viewedDate, readings));
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
  const otBooks = typeof OT_READING_BOOKS !== 'undefined' ? OT_READING_BOOKS : OT_BOOKS;
  otBookSel.innerHTML = '';
  otBooks.forEach((b, i) => {
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
    const otBooks = typeof OT_READING_BOOKS !== 'undefined' ? OT_READING_BOOKS : OT_BOOKS;
    const bookIdx = parseInt(document.getElementById('ob-ot-book').value);
    const chapSel = document.getElementById('ob-ot-chap');
    chapSel.innerHTML = '';
    for (let c = 1; c <= otBooks[bookIdx][1]; c++) {
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
  const otBooks = typeof OT_READING_BOOKS !== 'undefined' ? OT_READING_BOOKS : OT_BOOKS;
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
  state.readingPlanId    = plan;
  state.startDate        = formatDateKey(new Date());
  state.startOtIndex     = getAbsoluteIndexFromSelection(otBooks, otBookIdx, otChap);
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
  document.querySelectorAll('#color-palette .color-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.color === colorName);
  });
  applyHighlightColors(state.settings.hlColors);
  renderDashboard();
  updateHeaderName();
}

/* ===== SETTINGS ===== */
const FONT_SIZES = [14, 16, 18, 20, 22];
const FONT_SIZE_LABELS = ['Small', 'Normal', 'Large', 'X-Large', 'XX-Large'];

function refreshTranslationOptions() {
  const options = [...BIBLE_API_TRANSLATIONS];
  if (state.apiKeys.apiBible) {
    Object.keys(API_BIBLE_IDS).forEach(value => {
      if (!options.some(o => o.value === value)) options.push({ value, label: API_BIBLE_LABELS[value] || `${value.toUpperCase()} (API.Bible)` });
    });
  }
  if (state.apiKeys.esv) options.push({ value: 'esv', label: 'ESV' });
  ['translation-select', 'ob-translation'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value || state.settings.translation || 'web';
    sel.innerHTML = '';
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    sel.value = options.some(o => o.value === current) ? current : 'web';
  });
}

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

      let appliedMode = btn.dataset.color;
      let appliedColor = null;
      if (btn.dataset.color === 'system') {
        state.settings.systemAccent = readNativeAccentColor() || null;
        if (state.settings.systemAccent) {
          appliedColor = state.settings.systemAccent;
        } else {
          appliedMode = 'purple';
        }
      } else if (btn.dataset.color === 'custom') {
        appliedColor = state.settings.customColor;
      }

      applyAppColor(appliedMode, appliedColor);           // Always apply the color
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
  refreshTranslationOptions();
  const transSel = document.getElementById('translation-select');
  transSel.value = state.settings.translation || 'web';
  transSel.addEventListener('change', () => { state.settings.translation = transSel.value; saveState(); });

  const keyFields = [
    ['api-bible-key', 'apiBible'],
    ['esv-key', 'esv'],
    ['bible-brain-key', 'bibleBrain'],
    ['anthropic-key', 'anthropic'],
    ['supabase-url', 'supabaseUrl'],
    ['supabase-anon', 'supabaseAnon']
  ];
  keyFields.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state.apiKeys[key] || '';
    el.addEventListener('change', () => {
      const firstAnthropic = key === 'anthropic' && !state.apiKeys.anthropic && el.value.trim();
      state.apiKeys[key] = el.value.trim();
      saveState();
      refreshTranslationOptions();
      if (firstAnthropic) showConfirm('Claude keys are stored locally in this browser and sent only to api.anthropic.com. Continue?', 'I Understand', () => {});
    });
  });
  document.getElementById('wipe-keys-btn')?.addEventListener('click', () => {
    state.apiKeys = { ...DEFAULT_STATE.apiKeys };
    saveState();
    keyFields.forEach(([id]) => { const el = document.getElementById(id); if (el) el.value = ''; });
    refreshTranslationOptions();
    showToast('API keys wiped');
  });

  const planSelect = document.getElementById('plan-select');
  if (planSelect) {
    planSelect.innerHTML = '';
    PLAN_PRESETS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const customUnavailable = p.id === 'custom' && (!Array.isArray(state.customPlan) || state.customPlan.length === 0);
      opt.textContent = customUnavailable ? 'Custom (not configured)' : p.label;
      opt.disabled = customUnavailable;
      planSelect.appendChild(opt);
    });
    planSelect.value = state.readingPlanId || state.readingPlan || 'standard';
    planSelect.addEventListener('change', () => {
      const next = planSelect.value;
      showConfirm("Changes today's readings. Your completed history is preserved.", 'Switch Plan', () => {
        state.readingPlanId = next;
        state.readingPlan = next;
        saveState();
        renderDashboard();
      });
      planSelect.value = state.readingPlanId || 'standard';
    });
  }

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

  reminderToggle.addEventListener('change', async () => {
    state.settings.reminder = reminderToggle.checked;
    if (reminderTimeRow) reminderTimeRow.style.display = reminderToggle.checked ? 'flex' : 'none';
    saveState();
    if (reminderToggle.checked) {
      const scheduled = await scheduleReminderIfEnabled({ prompt: true });
      if (!scheduled) {
        state.settings.reminder = false;
        reminderToggle.checked = false;
        if (reminderTimeRow) reminderTimeRow.style.display = 'none';
        saveState();
        showToast('Notifications are disabled for DTWG');
      }
    } else {
      cancelNativeReminderIfAvailable();
    }
  });

  if (reminderTimeInput) {
    reminderTimeInput.addEventListener('change', () => {
      state.settings.reminderTime = reminderTimeInput.value;
      saveState();
      scheduleReminderIfEnabled({ prompt: true });
    });
  }

  const notifyControls = [
    ['per-chapter-toggle', 'perChapter'],
    ['streak-notify-toggle', 'streak'],
    ['inline-reply-toggle', 'inlineReply']
  ];
  notifyControls.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = state.notifications[key] !== false;
    el.addEventListener('change', () => {
      state.notifications[key] = el.checked;
      saveState();
      if (el.checked && (key === 'streak' || key === 'perChapter')) {
        ensureNotificationPermission({ prompt: true });
      }
    });
  });
  updateNotificationSupportText();
  document.getElementById('calendar-ics-btn')?.addEventListener('click', () => shareIcs());

  const audioAutoplay = document.getElementById('audio-autoplay-toggle');
  if (audioAutoplay) {
    audioAutoplay.checked = !!state.audio.autoplay;
    audioAutoplay.addEventListener('change', () => { state.audio.autoplay = audioAutoplay.checked; saveState(); });
  }
  const audioVoice = document.getElementById('audio-voice');
  if (audioVoice) {
    audioVoice.value = state.audio.voice || 'ENGESVN2DA';
    audioVoice.addEventListener('change', () => { state.audio.voice = audioVoice.value.trim() || 'ENGESVN2DA'; saveState(); });
  }
  const syncToggle = document.getElementById('sync-toggle');
  if (syncToggle) {
    syncToggle.checked = !!state.cloudSync.enabled;
    syncToggle.addEventListener('change', () => {
      if (syncToggle.checked) {
        showConfirm('Cloud backup is encrypted with your passphrase. If you lose it, the backup cannot be recovered.', 'Enable Sync', () => {
          state.cloudSync.enabled = true;
          saveState();
        });
      } else {
        state.cloudSync.enabled = false;
        saveState();
      }
    });
  }
  const syncUser = document.getElementById('sync-user-id');
  if (syncUser) {
    syncUser.value = state.cloudSync.userId || '';
    syncUser.addEventListener('change', () => { state.cloudSync.userId = syncUser.value.trim() || null; saveState(); });
  }
  document.getElementById('sync-now-btn')?.addEventListener('click', () => syncNow().catch(err => showToast(err.message)));
  document.getElementById('recovery-hint-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ salt: state.cloudSync.salt, iterations: 250000 }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dtwg-recovery-hint.json';
    a.click();
    URL.revokeObjectURL(url);
  });

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
  const palette = document.getElementById('command-palette');
  if (!palette.hasAttribute('hidden')) {
    if (e.key === 'Escape') closePalette();
    return;
  }
  if (!bibleModal.hasAttribute('hidden')) {
    if (e.key === 'Escape')      closeModal();
    if (e.key === 'ArrowRight')  navigateBibleModal(1);
    if (e.key === 'ArrowLeft')   navigateBibleModal(-1);
  } else if (!onboardingModal.hasAttribute('hidden')) {
    if (e.key === 'Escape' && state.onboardingComplete) onboardingModal.setAttribute('hidden', '');
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (isBibleModalOpen()) setReadingKeepAwake(true);
    updateNotificationSupportText();
  }
  if (document.visibilityState === 'hidden') setReadingKeepAwake(false);
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
  setupRouteHistory();
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

  document.getElementById('nb-export-btn').addEventListener('click', () => exportNotebookPDF());

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
  document.getElementById('audio-load-btn').addEventListener('click', () => {
    if (!currentModalReading) return;
    mountAudioBar(`${currentModalReading.book}_${currentModalReading.chapter}`).catch(err => showToast(err.message));
  });
  document.getElementById('ai-explain-btn').addEventListener('click', () => {
    if (!currentModalReading) return;
    explainPassage(currentModalReading.book, currentModalReading.chapter).catch(err => openSideDrawer('AI Commentary', err.message));
  });
  document.getElementById('side-drawer-close').addEventListener('click', closeSideDrawer);
  document.getElementById('side-drawer').addEventListener('click', e => { if (e.target.id === 'side-drawer') closeSideDrawer(); });
  document.getElementById('command-palette').addEventListener('click', e => { if (e.target.id === 'command-palette') closePalette(); });
  document.getElementById('palette-input').addEventListener('input', e => renderPaletteResults(e.target.value));

  // Swipe navigation in modal body — only fires on clearly horizontal swipes
  // so that normal vertical scrolling never accidentally advances the chapter.
  const modalBody = document.getElementById('modal-body');
  modalBody.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  modalBody.addEventListener('touchend', e => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = touchStartY - e.changedTouches[0].clientY;
    // Require >60px horizontal travel AND horizontal must be 2.5× the vertical
    // drift so vertical scrolls with slight lean never trigger chapter advance.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2.5) {
      navigateBibleModal(dx > 0 ? 1 : -1);
    }
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

  // Update banner buttons
  document.getElementById('update-apply-btn')?.addEventListener('click', applyUpdate);
  document.getElementById('update-dismiss-btn')?.addEventListener('click', () => {
    _updateDismissed = true;
    document.getElementById('update-banner').hidden = true;
  });
  document.getElementById('settings-update-btn')?.addEventListener('click', applyUpdate);
  document.getElementById('check-update-btn')?.addEventListener('click', () => {
    showToast('Checking for updates…');
    checkForUpdate().then(r => { if (r && r.version === APP_VERSION) showToast('Already up to date'); });
  });

  // Version display
  const installedEl = document.getElementById('installed-version');
  if (installedEl) installedEl.textContent = 'v' + APP_VERSION;

  // Backup buttons
  document.getElementById('export-backup-btn')?.addEventListener('click', exportBackup);
  const importFile = document.getElementById('import-backup-file');
  if (importFile) {
    importFile.addEventListener('change', e => {
      importBackup(e.target.files[0]);
      e.target.value = '';
    });
  }

  // Show onboarding if needed
  if (!state.onboardingComplete) showOnboarding();
  const params = new URLSearchParams(location.search);
  if (params.get('focus') === 'journal') {
    const date = params.get('date');
    if (date) viewedDate = date;
    switchPage('dashboard');
    document.getElementById('journal-textarea').focus();
  }

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => scheduleReminderIfEnabled()).catch(err => console.warn('SW registration failed:', err));
    navigator.serviceWorker.addEventListener('message', event => {
      const msg = event.data || {};
      if (msg.type === 'markAllComplete') {
        const dateKey = msg.dateKey || formatDateKey(new Date());
        state.completed[dateKey] = getReadingPlan(dateKey).map(readingCompletionKey);
        saveState();
        recomputeAllStats();
        saveState();
        renderDashboard();
        updateStatDisplays();
        updateAppBadge();
      } else if (msg.type === 'focusJournal') {
        viewedDate = msg.dateKey || viewedDate;
        switchPage('dashboard');
        const textarea = document.getElementById('journal-textarea');
        if (msg.draft && String(msg.draft).trim()) {
          const draft = String(msg.draft).trim();
          const current = state.journal[viewedDate] || '';
          state.journal[viewedDate] = current ? `${current}\n\n${draft}` : draft;
          textarea.value = state.journal[viewedDate];
          saveState();
        }
        textarea.focus();
      } else if (msg.type === 'navigate') {
        viewedDate = msg.dateKey || formatDateKey(new Date());
        switchPage('dashboard');
        renderDashboard();
      } else if (msg.type === 'updateAvailable') {
        showUpdateBanner(msg.version, msg.notes);
      }
    });
  }

  // Auto-update check (deferred so it doesn't block render)
  setTimeout(() => checkForUpdate(), 3000);

  bindNativeAndroidBridge();

  // Update app badge for today on load
  updateAppBadge();
});
