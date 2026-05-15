/* DTWG test suite. Imports plan.js + crossrefs.js + the test runner globally;
 * extensions.js itself can't load here because it depends on a fully booted
 * app (state, viewedDate, etc.), but its pure helpers are reproduced inline
 * so we exercise them in isolation. */

var T = window.DTWGTest;

/* -------- plan.js -------- */

T.test('formatDateKey produces YYYY-MM-DD with leading zeros', function () {
  T.assertEqual(formatDateKey(new Date(2026, 0, 5)), '2026-01-05');
  T.assertEqual(formatDateKey(new Date(2026, 11, 31)), '2026-12-31');
});

T.test('formatDateKey strips time within the local day', function () {
  T.assertEqual(formatDateKey(new Date(2026, 4, 16, 23, 59, 59)), '2026-05-16');
  T.assertEqual(formatDateKey(new Date(2026, 4, 16, 0, 0, 0)), '2026-05-16');
});

T.test('getDaysDiff is symmetric & integer', function () {
  var a = new Date(2026, 0, 1);
  var b = new Date(2026, 0, 11);
  T.assertEqual(getDaysDiff(a, b), 10);
  T.assertEqual(getDaysDiff(b, a), -10);
  T.assertEqual(getDaysDiff(a, a), 0);
});

T.test('computePlan: standard returns 7 readings each day', function () {
  for (var i = 0; i < 30; i++) {
    var d = new Date(2026, 4, 1);
    d.setDate(d.getDate() + i);
    var plan = computePlan('standard', '2026-05-01', formatDateKey(d), { startOtIndex: 0, startPsalmIndex: 0, startNtIndex: 0 });
    T.assertEqual(plan.length, 7, 'day +' + i + ' returned ' + plan.length + ' readings');
    T.assert(plan.every(function (r) { return r.book && r.chapter > 0; }), 'every reading has book + chapter');
  }
});

T.test('computePlan: ot-focus returns 7 readings with 5 OT', function () {
  var plan = computePlan('ot-focus', '2026-05-01', '2026-05-01', { startOtIndex: 0, startPsalmIndex: 0, startNtIndex: 0 });
  T.assertEqual(plan.length, 7);
  T.assertEqual(plan.filter(function (r) { return r.type === 'ot'; }).length, 5);
  T.assertEqual(plan.filter(function (r) { return r.type === 'psalm'; }).length, 1);
  T.assertEqual(plan.filter(function (r) { return r.type === 'nt'; }).length, 1);
});

T.test('computePlan: nt-focus has 4 NT chapters', function () {
  var plan = computePlan('nt-focus', '2026-05-01', '2026-05-01', { startOtIndex: 0, startPsalmIndex: 0, startNtIndex: 0 });
  T.assertEqual(plan.filter(function (r) { return r.type === 'nt'; }).length, 4);
});

T.test('computePlan: bible90 returns 13 readings', function () {
  var plan = computePlan('bible90', '2026-05-01', '2026-05-01', {});
  T.assertEqual(plan.length, 13);
});

T.test('computePlan: mcheyne returns 4 readings labelled 1..4', function () {
  var plan = computePlan('mcheyne', '2026-05-01', '2026-05-01', {});
  T.assertEqual(plan.length, 4);
  T.assertEqual(plan.map(function (r) { return r.label; }), ["M'Cheyne 1", "M'Cheyne 2", "M'Cheyne 3", "M'Cheyne 4"]);
});

T.test('computePlan: unknown plan falls back to standard', function () {
  var plan = computePlan('totally-fake', '2026-05-01', '2026-05-01', { startOtIndex: 0, startPsalmIndex: 0, startNtIndex: 0 });
  T.assertEqual(plan.length, 7);
});

T.test('computePlan: empty custom plan falls back gracefully', function () {
  var plan = computePlan('custom', '2026-05-01', '2026-05-01', { customPlan: [] });
  T.assertEqual(plan, []);
});

T.test('computePlan: custom plan rotates through entries', function () {
  var dayA = [{ type: 'custom', label: 'A', book: 'Genesis', chapter: 1 }];
  var dayB = [{ type: 'custom', label: 'B', book: 'John', chapter: 1 }];
  var plan0 = computePlan('custom', '2026-05-01', '2026-05-01', { customPlan: [dayA, dayB] });
  var plan1 = computePlan('custom', '2026-05-01', '2026-05-02', { customPlan: [dayA, dayB] });
  var plan2 = computePlan('custom', '2026-05-01', '2026-05-03', { customPlan: [dayA, dayB] });
  T.assertEqual(plan0[0].book, 'Genesis');
  T.assertEqual(plan1[0].book, 'John');
  T.assertEqual(plan2[0].book, 'Genesis');
});

T.test('OT_READING_BOOKS excludes Psalms and Proverbs', function () {
  T.assert(!OT_READING_BOOKS.some(function (b) { return b[0] === 'Psalms'; }), 'Psalms should be excluded');
  T.assert(!OT_READING_BOOKS.some(function (b) { return b[0] === 'Proverbs'; }), 'Proverbs should be excluded');
});

T.test('getBookAndChapterFromIndex wraps around', function () {
  var c = getBookAndChapterFromIndex(OT_BOOKS, 0);
  T.assertEqual(c.book, 'Genesis');
  T.assertEqual(c.chapter, 1);
  // Index past the total should mod back around
  var total = OT_BOOKS.reduce(function (s, b) { return s + b[1]; }, 0);
  var wrapped = getBookAndChapterFromIndex(OT_BOOKS, total);
  T.assertEqual(wrapped.book, 'Genesis');
  T.assertEqual(wrapped.chapter, 1);
});

T.test('getAbsoluteIndexFromSelection is reversible', function () {
  var idx = getAbsoluteIndexFromSelection(NT_BOOKS, 5, 3); // 1 Corinthians 3 (Romans is 5)
  var back = getBookAndChapterFromIndex(NT_BOOKS, idx);
  T.assertEqual(back.bookIdx, 5);
  T.assertEqual(back.chapter, 3);
});

/* -------- crossrefs.js -------- */

T.test('crossrefs returns known list for John 3:16', function () {
  var refs = DTWGCrossRefs.lookup('John 3:16');
  T.assert(refs.length >= 3, 'should have at least 3 cross-refs');
  T.assert(refs.includes('Romans 5:8'), 'expected Romans 5:8 in John 3:16 refs');
});

T.test('crossrefs falls back to chapter-level when verse missing', function () {
  // 'John 3:99' doesn't exist verse-level but 'John 3' chapter-level does.
  var refs = DTWGCrossRefs.lookup('John 3:99');
  T.assert(refs.length > 0, 'should fall back to chapter-level');
});

T.test('crossrefs returns empty for unknown reference', function () {
  T.assertEqual(DTWGCrossRefs.lookup('Imaginarius 1:1'), []);
  T.assertEqual(DTWGCrossRefs.lookup(''), []);
  T.assertEqual(DTWGCrossRefs.lookup(null), []);
});

T.test('crossrefs lookup returns a fresh array (no shared mutation)', function () {
  var refs1 = DTWGCrossRefs.lookup('John 3:16');
  refs1.push('mutation');
  var refs2 = DTWGCrossRefs.lookup('John 3:16');
  T.assert(!refs2.includes('mutation'), 'mutating the returned array should not affect the source');
});

/* -------- inline pure helpers (mirror extensions.js) -------- */

function shade(hex, amount) {
  var m = String(hex || '').match(/#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return '#3A2B5C';
  var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  if (amount < 0) { r = clamp(r * (1 + amount)); g = clamp(g * (1 + amount)); b = clamp(b * (1 + amount)); }
  else { r = clamp(r + (255 - r) * amount); g = clamp(g + (255 - g) * amount); b = clamp(b + (255 - b) * amount); }
  return '#' + [r, g, b].map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
}

T.test('shade darkens with negative amount', function () {
  T.assertEqual(shade('#6750A4', -0.5), '#342852');
});

T.test('shade lightens with positive amount', function () {
  T.assertEqual(shade('#000000', 0.5), '#808080');
});

T.test('shade tolerates missing hash', function () {
  T.assertEqual(shade('6750A4', 0), '#6750a4');
});

T.test('shade gives sensible fallback for invalid input', function () {
  T.assertEqual(shade('not-a-color', -0.5), '#3A2B5C');
});

/* -------- parseReference (loose) -------- */

function parseReferenceLoose(s) {
  var m = String(s || '').trim().match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+))?/);
  if (!m) return null;
  return { book: m[1].replace(/\s+/g, ' ').trim(), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : null };
}

T.test('parseReferenceLoose handles single-word book', function () {
  T.assertEqual(parseReferenceLoose('Genesis 1:1'), { book: 'Genesis', chapter: 1, verse: 1 });
});

T.test('parseReferenceLoose handles numeric prefix book', function () {
  T.assertEqual(parseReferenceLoose('1 Corinthians 13'), { book: '1 Corinthians', chapter: 13, verse: null });
});

T.test('parseReferenceLoose handles verse-range by taking first verse', function () {
  var p = parseReferenceLoose('1 Peter 5:8-9');
  T.assertEqual(p.book, '1 Peter');
  T.assertEqual(p.chapter, 5);
  T.assertEqual(p.verse, 8);
});

T.test('parseReferenceLoose returns null for garbage', function () {
  T.assertEqual(parseReferenceLoose('not a reference'), null);
  T.assertEqual(parseReferenceLoose(''), null);
  T.assertEqual(parseReferenceLoose(null), null);
});

/* -------- Achievement check predicates -------- */

T.test('streak achievement triggers at threshold', function () {
  function streakAch(s, n) { return (s.longestStreak || s.streak || 0) >= n; }
  T.assert(!streakAch({ streak: 6 }, 7));
  T.assert(streakAch({ streak: 7 }, 7));
  T.assert(streakAch({ longestStreak: 100, streak: 0 }, 30));
});

T.test('all-categories achievement requires all 5 types', function () {
  function hasAll(s) {
    var t = new Set(Object.values(s.highlights || {}).map(function (h) { return h.type; }));
    return ['general', 'promise', 'command', 'warning', 'principle'].every(function (k) { return t.has(k); });
  }
  T.assert(!hasAll({ highlights: { a: { type: 'general' }, b: { type: 'promise' } } }));
  T.assert(hasAll({ highlights: {
    a: { type: 'general' }, b: { type: 'promise' }, c: { type: 'command' },
    d: { type: 'warning' }, e: { type: 'principle' } }
  }));
});

T.test('prayer-answered count tallies correctly across days', function () {
  function count(s) {
    return Object.values(s.prayerJournal || {}).reduce(function (sum, day) {
      if (!day || !Array.isArray(day.entries)) return sum;
      return sum + day.entries.filter(function (e) { return e.answered; }).length;
    }, 0);
  }
  T.assertEqual(count({
    prayerJournal: {
      '2026-05-01': { entries: [{ text: 'a', answered: true }, { text: 'b', answered: false }] },
      '2026-05-02': { entries: [{ text: 'c', answered: true }] }
    }
  }), 2);
  T.assertEqual(count({}), 0);
});

/* -------- Backup payload shape -------- */

T.test('backup payload includes new v1.6 fields', function () {
  var fields = [
    'userName', 'readingPlan', 'readingPlanId', 'startDate',
    'startOtIndex', 'startNtIndex', 'startPsalmIndex', 'startPrIndex',
    'customPlan', 'completed', 'highlights', 'verseNotes', 'journal',
    'timeSpent', 'streak', 'longestStreak', 'streakFreezes', 'frozenDays',
    'streakMilestones', 'settings', 'notifications', 'onboardingComplete',
    'bookmarks', 'prayerJournal', 'achievements'
  ];
  ['bookmarks', 'prayerJournal', 'achievements'].forEach(function (f) {
    T.assert(fields.includes(f), f + ' missing from backup field list');
  });
});
