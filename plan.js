/* Shared reading-plan logic for DTWG. Loaded by app.js and sw.js. */
var OT_BOOKS = [
  ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
  ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],
  ['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],
  ['Ezra',10],['Nehemiah',13],['Esther',10],['Job',42],['Psalms',150],
  ['Proverbs',31],['Ecclesiastes',12],['Song of Solomon',8],['Isaiah',66],
  ['Jeremiah',52],['Lamentations',5],['Ezekiel',48],['Daniel',12],['Hosea',14],
  ['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],['Micah',7],['Nahum',3],
  ['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],['Malachi',4]
];

var NT_BOOKS = [
  ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],
  ['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],
  ['Ephesians',6],['Philippians',4],['Colossians',4],['1 Thessalonians',5],
  ['2 Thessalonians',3],['1 Timothy',6],['2 Timothy',4],['Titus',3],
  ['Philemon',1],['Hebrews',13],['James',5],['1 Peter',5],['2 Peter',3],
  ['1 John',5],['2 John',1],['3 John',1],['Jude',1],['Revelation',22]
];

var TOTAL_OT = OT_BOOKS.reduce(function(s,b) { return s + b[1]; }, 0);
var TOTAL_NT = NT_BOOKS.reduce(function(s,b) { return s + b[1]; }, 0);
var TOTAL_PSALMS = 150;
var TOTAL_PROVERBS = 31;

var PLAN_PRESETS = [
  { id: 'standard', label: 'Standard (3 OT + 1 Ps + 1 Pr + 2 NT)' },
  { id: 'ot-focus', label: 'OT Focus (5 OT + 1 Ps + 1 NT)' },
  { id: 'nt-focus', label: 'NT Focus (2 OT + 1 Ps + 4 NT)' },
  { id: 'chronological', label: 'Chronological' },
  { id: 'mcheyne', label: "M'Cheyne" },
  { id: 'bible90', label: 'Bible in 90 Days' },
  { id: 'custom', label: 'Custom' }
];

var CHRONOLOGICAL_BOOKS = [
  ['Genesis',50],['Job',42],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
  ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],['Psalms',150],
  ['1 Kings',22],['Proverbs',31],['Ecclesiastes',12],['Song of Solomon',8],['2 Kings',25],
  ['1 Chronicles',29],['2 Chronicles',36],['Isaiah',66],['Jeremiah',52],['Lamentations',5],
  ['Ezekiel',48],['Daniel',12],['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],
  ['Micah',7],['Nahum',3],['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],
  ['Malachi',4],['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],
  ['James',5],['Galatians',6],['1 Thessalonians',5],['2 Thessalonians',3],['1 Corinthians',16],
  ['2 Corinthians',13],['Romans',16],['Ephesians',6],['Philippians',4],['Colossians',4],
  ['Philemon',1],['1 Timothy',6],['Titus',3],['1 Peter',5],['Hebrews',13],['2 Timothy',4],
  ['2 Peter',3],['Jude',1],['1 John',5],['2 John',1],['3 John',1],['Revelation',22]
];

function mod(n, m) { return ((n % m) + m) % m; }

function stripTime(date) {
  var d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

function formatDateKey(date) {
  var d = stripTime(date);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getDaysDiff(a, b) {
  return Math.round((stripTime(b) - stripTime(a)) / 86400000);
}

function getAbsoluteIndexFromSelection(books, bookIdx, chap) {
  var idx = 0;
  for (var i = 0; i < bookIdx; i++) idx += books[i][1];
  return idx + (chap - 1);
}

function getBookAndChapterFromIndex(books, absIdx) {
  var total = books.reduce(function(s,b) { return s + b[1]; }, 0);
  var remaining = mod(absIdx, total);
  for (var i = 0; i < books.length; i++) {
    if (remaining < books[i][1]) return { book: books[i][0], chapter: remaining + 1, bookIdx: i };
    remaining -= books[i][1];
  }
  return { book: books[0][0], chapter: 1, bookIdx: 0 };
}

function getChapterFromIndex(type, idx) {
  if (type === 'ot') return getBookAndChapterFromIndex(OT_BOOKS, mod(idx, TOTAL_OT));
  if (type === 'nt') return getBookAndChapterFromIndex(NT_BOOKS, mod(idx, TOTAL_NT));
  if (type === 'psalm') return { book:'Psalms', chapter: mod(idx, TOTAL_PSALMS) + 1 };
  if (type === 'proverb') return { book:'Proverbs', chapter: mod(idx, TOTAL_PROVERBS) + 1 };
  return getBookAndChapterFromIndex(OT_BOOKS.concat(NT_BOOKS), idx);
}

function streamFromBooks(books, startIdx, count, label) {
  var out = [];
  for (var i = 0; i < count; i++) {
    var c = getBookAndChapterFromIndex(books, startIdx + i);
    out.push({ type: label.toLowerCase().replace(/\s+/g, '-'), label: label, book: c.book, chapter: c.chapter });
  }
  return out;
}

function computePlan(planId, startDate, dateKey, options) {
  options = options || {};
  planId = planId || options.readingPlan || 'standard';
  startDate = startDate || formatDateKey(new Date());
  var daysDiff = getDaysDiff(new Date(startDate + 'T00:00:00'), new Date(dateKey + 'T00:00:00'));
  var readings = [];
  var dateObj = new Date(dateKey + 'T00:00:00');
  var provChap = Math.min(dateObj.getDate(), 31);
  var startOtIndex = options.startOtIndex || 0;
  var startPsalmIndex = options.startPsalmIndex || 0;
  var startNtIndex = options.startNtIndex || 0;

  if (planId === 'standard') {
    for (var i = 0; i < 3; i++) readings.push(Object.assign({ type:'ot', label:'Old Testament' }, getChapterFromIndex('ot', startOtIndex + daysDiff * 3 + i)));
    readings.push(Object.assign({ type:'psalm', label:'Psalm' }, getChapterFromIndex('psalm', startPsalmIndex + daysDiff)));
    readings.push({ type:'proverb', label:'Proverb', book:'Proverbs', chapter: provChap });
    for (var j = 0; j < 2; j++) readings.push(Object.assign({ type:'nt', label:'New Testament' }, getChapterFromIndex('nt', startNtIndex + daysDiff * 2 + j)));
  } else if (planId === 'ot-focus') {
    for (var k = 0; k < 5; k++) readings.push(Object.assign({ type:'ot', label:'Old Testament' }, getChapterFromIndex('ot', startOtIndex + daysDiff * 5 + k)));
    readings.push(Object.assign({ type:'psalm', label:'Psalm' }, getChapterFromIndex('psalm', startPsalmIndex + daysDiff)));
    readings.push(Object.assign({ type:'nt', label:'New Testament' }, getChapterFromIndex('nt', startNtIndex + daysDiff)));
  } else if (planId === 'nt-focus') {
    for (var l = 0; l < 2; l++) readings.push(Object.assign({ type:'ot', label:'Old Testament' }, getChapterFromIndex('ot', startOtIndex + daysDiff * 2 + l)));
    readings.push(Object.assign({ type:'psalm', label:'Psalm' }, getChapterFromIndex('psalm', startPsalmIndex + daysDiff)));
    for (var m = 0; m < 4; m++) readings.push(Object.assign({ type:'nt', label:'New Testament' }, getChapterFromIndex('nt', startNtIndex + daysDiff * 4 + m)));
  } else if (planId === 'chronological') {
    readings = streamFromBooks(CHRONOLOGICAL_BOOKS, Math.max(0, daysDiff) * 4, 4, 'Chronological');
  } else if (planId === 'mcheyne') {
    readings = [
      getBookAndChapterFromIndex(OT_BOOKS, daysDiff),
      getBookAndChapterFromIndex(NT_BOOKS, daysDiff),
      getBookAndChapterFromIndex(OT_BOOKS, daysDiff + 365),
      getBookAndChapterFromIndex(NT_BOOKS, daysDiff + 180)
    ].map(function(c, i) { return { type:'mcheyne', label:"M'Cheyne " + (i + 1), book:c.book, chapter:c.chapter }; });
  } else if (planId === 'bible90') {
    readings = streamFromBooks(OT_BOOKS.concat(NT_BOOKS), Math.max(0, daysDiff) * 13, 13, 'Bible 90');
  } else if (planId === 'custom' && Array.isArray(options.customPlan) && options.customPlan.length) {
    readings = options.customPlan[mod(daysDiff, options.customPlan.length)] || [];
  } else {
    return computePlan('standard', startDate, dateKey, options);
  }
  return readings;
}

function getReadingPlanForState(appState, dateKey) {
  appState = appState || {};
  return computePlan(appState.readingPlanId || appState.readingPlan || 'standard', appState.startDate || formatDateKey(new Date()), dateKey, {
    readingPlan: appState.readingPlan,
    startOtIndex: appState.startOtIndex || 0,
    startPsalmIndex: appState.startPsalmIndex || 0,
    startNtIndex: appState.startNtIndex || 0,
    customPlan: appState.customPlan || []
  });
}

if (typeof self !== 'undefined') {
  self.DTWGPlan = { OT_BOOKS, NT_BOOKS, PLAN_PRESETS, computePlan, getReadingPlanForState, formatDateKey };
}
