/* ============================================================================
 * DTWG Extensions
 * ----------------------------------------------------------------------------
 * Adds the following features to the existing DTWG app without rewriting it:
 *   - Verse bookmarks                  (state.bookmarks)
 *   - Prayer journal w/ "answered" log (state.prayerJournal)
 *   - Achievements / badges            (state.achievements)
 *   - Cross-reference suggestions      (static — crossrefs.js)
 *   - Text-to-speech audio fallback    (Web Speech API)
 *   - Verse-of-the-day share card      (Canvas → PNG)
 *   - Notebook export to Markdown
 *   - Search across notes / highlights / journal in the palette
 *   - Status-bar / system-bar sync for the Android wrapper
 *
 * The original app.js is monkey-patched at boot so it keeps working unchanged.
 * Top-level `let` bindings in app.js (state, viewedDate, …) are shared in the
 * global lexical scope across classic scripts, so we read/write them directly.
 * ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. STATE SCHEMA MIGRATION ---------- */

  // We don't override the original STATE_VERSION constant; instead we add a
  // separate one-shot migration that runs on boot and bumps the saved blob to
  // the new shape. Re-running is a no-op.
  var EXT_STATE_VERSION = 14;

  function ensureExtensionFields() {
    if (!state) return;
    if (!state.bookmarks || typeof state.bookmarks !== 'object') state.bookmarks = {};
    if (!state.prayerJournal || typeof state.prayerJournal !== 'object') state.prayerJournal = {};
    if (!state.achievements || typeof state.achievements !== 'object') state.achievements = {};
    if (!state.settings) state.settings = {};
    if (state.settings.ttsRate == null) state.settings.ttsRate = 1.0;
    if (state.settings.ttsVoice == null) state.settings.ttsVoice = '';
  }

  /* ---------- 2. SAVE-STATE HOOK ----------
   * Every saveState() invocation re-checks achievements. We also want to
   * roll new fields into the backup export, but BACKUP_FIELDS is `const`
   * in app.js. We work around it by wrapping exportBackup / importBackup. */
  function patchSaveState() {
    var origSaveState = window.saveState;
    window.saveState = function patchedSaveState() {
      ensureExtensionFields();
      origSaveState.apply(this, arguments);
      try { unlockAchievementsFromState(); } catch (e) { /* never break save */ }
    };
  }

  function patchBackup() {
    // Replace exportBackup with a complete version that picks up new fields.
    window.exportBackup = function exportBackupExt() {
      ensureExtensionFields();
      var fields = [
        'userName', 'readingPlan', 'readingPlanId', 'startDate',
        'startOtIndex', 'startNtIndex', 'startPsalmIndex', 'startPrIndex',
        'customPlan', 'completed', 'highlights', 'verseNotes', 'journal',
        'timeSpent', 'streak', 'longestStreak', 'streakFreezes', 'frozenDays',
        'streakMilestones', 'settings', 'notifications', 'onboardingComplete',
        'bookmarks', 'prayerJournal', 'achievements'
      ];
      var payload = {
        _dtwg: true,
        exportedAt: new Date().toISOString(),
        appVersion: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.6.1'),
        data: {}
      };
      fields.forEach(function (f) {
        if (state[f] !== undefined) payload.data[f] = state[f];
      });
      var json = JSON.stringify(payload, null, 2);
      // Prefer native save on Android wrapper so the file lands in /Downloads
      var bridge = window.DTWGAndroid;
      if (bridge && typeof bridge.saveBackupFile === 'function') {
        try {
          bridge.saveBackupFile('dtwg-backup-' + formatDateKey(new Date()) + '.json', json);
          showToast('Backup saved');
          return;
        } catch (e) { /* fall through to web download */ }
      }
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dtwg-backup-' + formatDateKey(new Date()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported');
    };

    // Replace importBackup with a version that also restores extension fields.
    window.importBackup = function importBackupExt(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var parsed = JSON.parse(e.target.result);
          var data = parsed._dtwg ? parsed.data : parsed;
          if (!data || typeof data !== 'object') throw new Error('Unrecognised format');
          var allFields = [
            'userName', 'readingPlan', 'readingPlanId', 'startDate',
            'startOtIndex', 'startNtIndex', 'startPsalmIndex', 'startPrIndex',
            'customPlan', 'completed', 'highlights', 'verseNotes', 'journal',
            'timeSpent', 'streak', 'longestStreak', 'streakFreezes', 'frozenDays',
            'streakMilestones', 'settings', 'notifications', 'onboardingComplete',
            'bookmarks', 'prayerJournal', 'achievements'
          ];
          allFields.forEach(function (f) {
            if (data[f] === undefined) return;
            if (f === 'settings' && typeof data[f] === 'object') {
              state.settings = Object.assign({}, DEFAULT_STATE.settings, state.settings, data[f]);
            } else {
              state[f] = data[f];
            }
          });
          state.version = STATE_VERSION;
          state.onboardingComplete = true;
          ensureExtensionFields();
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
    };
  }

  /* ---------- 3. ACHIEVEMENTS ----------
   * 16 achievements, each is a pure function over `state`. A run on every
   * saveState; new unlocks trigger a confetti toast and play a check sound. */

  var ACHIEVEMENTS = [
    { id: 'first_read',    label: 'First Steps',          desc: 'Complete your first reading.',                  icon: 'flag',                check: function (s) { return countCompletedDays(s) >= 1; } },
    { id: 'first_full_day',label: 'Full Day',             desc: 'Finish every reading in a single day.',         icon: 'task_alt',            check: function (s) { return hasAnyFullDay(s); } },
    { id: 'streak_3',      label: 'Three for Three',      desc: 'Hit a 3-day streak.',                           icon: 'local_fire_department', check: function (s) { return (s.longestStreak || s.streak || 0) >= 3; } },
    { id: 'streak_7',      label: 'One Week Devoted',     desc: 'Hit a 7-day streak.',                           icon: 'local_fire_department', check: function (s) { return (s.longestStreak || s.streak || 0) >= 7; } },
    { id: 'streak_30',     label: 'One Month Strong',     desc: 'Hit a 30-day streak.',                          icon: 'whatshot',            check: function (s) { return (s.longestStreak || s.streak || 0) >= 30; } },
    { id: 'streak_100',    label: 'Century Saint',        desc: 'Hit a 100-day streak.',                         icon: 'workspace_premium',   check: function (s) { return (s.longestStreak || s.streak || 0) >= 100; } },
    { id: 'streak_365',    label: 'A Year With the Word', desc: 'Hit a 365-day streak.',                         icon: 'auto_awesome',        check: function (s) { return (s.longestStreak || s.streak || 0) >= 365; } },
    { id: 'highlight_1',   label: 'Highlighter',          desc: 'Mark your first verse.',                        icon: 'format_ink_highlighter', check: function (s) { return Object.keys(s.highlights || {}).length >= 1; } },
    { id: 'highlight_50',  label: 'Margin Maker',         desc: 'Save 50 highlights.',                           icon: 'collections_bookmark', check: function (s) { return Object.keys(s.highlights || {}).length >= 50; } },
    { id: 'note_1',        label: 'First Note',           desc: 'Write your first verse note.',                  icon: 'edit_note',           check: function (s) { return Object.keys(s.verseNotes || {}).length >= 1; } },
    { id: 'journal_1',     label: 'Reflection',           desc: 'Write your first journal entry.',               icon: 'book',                check: function (s) { return Object.values(s.journal || {}).some(function (j) { return j && j.trim(); }); } },
    { id: 'journal_30',    label: 'Disciplined Pen',      desc: 'Write 30 journal entries.',                     icon: 'history_edu',         check: function (s) { return Object.values(s.journal || {}).filter(function (j) { return j && j.trim(); }).length >= 30; } },
    { id: 'bookmark_1',    label: 'Folded Corner',        desc: 'Bookmark your first verse.',                    icon: 'bookmark',            check: function (s) { return Object.keys(s.bookmarks || {}).length >= 1; } },
    { id: 'prayer_1',      label: 'In Conversation',      desc: 'Log your first prayer.',                        icon: 'volunteer_activism',  check: function (s) { return countPrayers(s) >= 1; } },
    { id: 'prayer_answered_1', label: 'Faithful Witness', desc: 'Mark a prayer as answered.',                    icon: 'lightbulb',           check: function (s) { return countAnsweredPrayers(s) >= 1; } },
    { id: 'all_categories',label: 'Full Palette',         desc: 'Use every highlight category at least once.',   icon: 'palette',             check: function (s) { var t = new Set(Object.values(s.highlights || {}).map(function (h) { return h.type; })); return ['general','promise','command','warning','principle'].every(function (k) { return t.has(k); }); } }
  ];

  function countCompletedDays(s) {
    return Object.keys(s.completed || {}).filter(function (d) {
      var arr = s.completed[d];
      return Array.isArray(arr) && arr.length > 0;
    }).length;
  }
  function hasAnyFullDay(s) {
    return Object.keys(s.completed || {}).some(function (d) {
      try { return isFullCompletionDay(d); } catch (e) { return false; }
    });
  }
  function countPrayers(s) {
    return Object.values(s.prayerJournal || {}).reduce(function (sum, day) {
      return sum + ((day && Array.isArray(day.entries) ? day.entries.length : 0));
    }, 0);
  }
  function countAnsweredPrayers(s) {
    return Object.values(s.prayerJournal || {}).reduce(function (sum, day) {
      if (!day || !Array.isArray(day.entries)) return sum;
      return sum + day.entries.filter(function (e) { return e.answered; }).length;
    }, 0);
  }

  function unlockAchievementsFromState() {
    var unlocked = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (!state.achievements[a.id] && a.check(state)) {
        state.achievements[a.id] = { unlockedAt: new Date().toISOString() };
        unlocked.push(a);
      }
    });
    if (unlocked.length) {
      try { localStorage.setItem('dtwg_state', JSON.stringify(state)); } catch (e) {}
      unlocked.forEach(function (a, i) {
        setTimeout(function () { toastAchievement(a); }, i * 900);
      });
    }
    return unlocked;
  }

  function toastAchievement(a) {
    try { if (typeof playTone === 'function') { playTone(880, 0.12); setTimeout(function () { playTone(1320, 0.18); }, 100); } } catch (e) {}
    var t = document.getElementById('app-toast');
    if (!t) return;
    var prevTimer = window._dtwgAchTimer;
    if (prevTimer) clearTimeout(prevTimer);
    t.classList.add('achievement-toast');
    t.innerHTML = '';
    var icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = a.icon;
    var wrap = document.createElement('span');
    var top = document.createElement('strong');
    top.textContent = 'Achievement unlocked';
    var label = document.createElement('span');
    label.textContent = a.label;
    wrap.appendChild(top);
    wrap.appendChild(document.createElement('br'));
    wrap.appendChild(label);
    t.appendChild(icon);
    t.appendChild(wrap);
    t.hidden = false;
    t.classList.add('visible');
    window._dtwgAchTimer = setTimeout(function () {
      t.classList.remove('visible', 'achievement-toast');
      setTimeout(function () { t.hidden = true; t.innerHTML = ''; }, 300);
    }, 3500);
  }

  /* ---------- 4. BOOKMARKS ----------
   * A bookmark button appears next to each verse; clicking toggles
   * state.bookmarks[refKey]. They show up in a new History tab and in the
   * palette search. */

  function toggleBookmark(refKey, verseText) {
    if (!state.bookmarks) state.bookmarks = {};
    if (state.bookmarks[refKey]) {
      delete state.bookmarks[refKey];
    } else {
      state.bookmarks[refKey] = { text: verseText, ts: Date.now(), date: viewedDate };
    }
    saveState();
    document.querySelectorAll('[data-bookmark-ref="' + cssEscape(refKey) + '"]').forEach(function (b) {
      var icon = b.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = state.bookmarks[refKey] ? 'bookmark' : 'bookmark_border';
      b.classList.toggle('active', !!state.bookmarks[refKey]);
    });
    try { if (typeof renderHistoryList === 'function' && historyTab === 'bookmarks') renderHistoryList(); } catch (e) {}
  }

  function cssEscape(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (c) { return '\\' + c; });
  }

  /* ---------- 5. CROSS-REFERENCE STRIP ---------- */

  function renderCrossRefsFor(refKey) {
    var refs = (window.DTWGCrossRefs && window.DTWGCrossRefs.lookup(refKey)) || [];
    if (!refs.length) return null;
    var wrap = document.createElement('div');
    wrap.className = 'cr-strip';
    var label = document.createElement('span');
    label.className = 'cr-strip-label';
    label.textContent = 'See also';
    wrap.appendChild(label);
    refs.forEach(function (ref) {
      var chip = document.createElement('button');
      chip.className = 'cr-chip';
      chip.type = 'button';
      chip.textContent = ref;
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        openCrossRef(ref);
      });
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function openCrossRef(ref) {
    var parsed = parseReference(ref) || parseReferenceLoose(ref);
    if (!parsed) { openSideDrawer('Cross-reference', ref); return; }
    // Open in the bible modal at the chapter level; the user can scroll to the verse.
    openBibleModal(parsed.book, parsed.chapter, 0);
    // Try to scroll to verse after content loads.
    if (parsed.verse) {
      setTimeout(function () { scrollToVerse(parsed.book, parsed.chapter, parsed.verse); }, 800);
      setTimeout(function () { scrollToVerse(parsed.book, parsed.chapter, parsed.verse); }, 1800);
    }
  }

  function parseReferenceLoose(s) {
    // Accept "Genesis 50:20" and "1 Peter 5:8-9" — we just take the first verse.
    var m = String(s || '').trim().match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+))?/);
    if (!m) return null;
    return { book: m[1].replace(/\s+/g, ' ').trim(), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : null };
  }

  function scrollToVerse(book, chapter, verse) {
    var sel = '.verse-para[data-book="' + cssEscape(book) + '"][data-chapter="' + chapter + '"][data-verse="' + verse + '"]';
    var el = document.querySelector(sel);
    if (!el) return;
    var modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.scrollTop = el.offsetTop - 80;
    el.classList.add('verse-highlight-flash');
    setTimeout(function () { el.classList.remove('verse-highlight-flash'); }, 1800);
  }

  /* ---------- 6. PATCH renderBibleVerses ----------
   * After the original renders verses, we add a bookmark button to each
   * verse-para and append a cross-references strip per verse where we have one. */

  function patchRenderBibleVerses() {
    var orig = window.renderBibleVerses;
    if (!orig) return;
    window.renderBibleVerses = function patchedRenderBibleVerses(data, book, chapter) {
      orig.apply(this, arguments);
      var versesEl = document.getElementById('modal-verses');
      if (!versesEl) return;
      var paras = versesEl.querySelectorAll('.verse-para');
      paras.forEach(function (p) {
        var v = p.dataset.verse;
        var refKey = book + ' ' + chapter + ':' + v;
        // Bookmark button
        var btn = document.createElement('button');
        btn.className = 'verse-bookmark-btn' + (state.bookmarks && state.bookmarks[refKey] ? ' active' : '');
        btn.setAttribute('aria-label', state.bookmarks && state.bookmarks[refKey] ? 'Remove bookmark' : 'Bookmark verse');
        btn.dataset.bookmarkRef = refKey;
        var icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = state.bookmarks && state.bookmarks[refKey] ? 'bookmark' : 'bookmark_border';
        btn.appendChild(icon);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleBookmark(refKey, p.querySelector('.verse-text') ? p.querySelector('.verse-text').textContent : '');
        });
        p.appendChild(btn);
        // Share button (verse-of-the-day style PNG)
        var shareBtn = document.createElement('button');
        shareBtn.className = 'verse-share-btn';
        shareBtn.setAttribute('aria-label', 'Share verse');
        var shareIcon = document.createElement('span');
        shareIcon.className = 'material-symbols-rounded';
        shareIcon.textContent = 'ios_share';
        shareBtn.appendChild(shareIcon);
        shareBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openShareCard(refKey, p.querySelector('.verse-text') ? p.querySelector('.verse-text').textContent : '');
        });
        p.appendChild(shareBtn);
      });
      // Cross-references for the first verse in the chapter (chapter-level
      // entry) — appended below the verses.
      var chapterRef = book + ' ' + chapter;
      var strip = renderCrossRefsFor(chapterRef);
      if (strip) versesEl.appendChild(strip);
    };
  }

  /* ---------- 7. SHARE CARD (CANVAS → PNG) ---------- */

  function openShareCard(refKey, verseText) {
    var overlay = document.getElementById('share-card-overlay');
    if (!overlay) { overlay = buildShareCardOverlay(); document.body.appendChild(overlay); }
    overlay.hidden = false;
    drawShareCard(refKey, verseText);
  }
  function closeShareCard() {
    var overlay = document.getElementById('share-card-overlay');
    if (overlay) overlay.hidden = true;
  }
  function buildShareCardOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.className = 'share-overlay';
    overlay.hidden = true;
    overlay.innerHTML = ''
      + '<div class="share-panel" role="dialog" aria-modal="true" aria-label="Share verse card">'
      +   '<button class="modal-close-btn share-close" aria-label="Close"><span class="material-symbols-rounded">close</span></button>'
      +   '<h3 class="share-title">Share this verse</h3>'
      +   '<canvas id="share-card-canvas" width="1080" height="1080" aria-label="Verse share card preview"></canvas>'
      +   '<div class="share-actions">'
      +     '<button class="secondary-btn" id="share-download-btn"><span class="material-symbols-rounded">download</span> Save PNG</button>'
      +     '<button class="secondary-btn" id="share-native-btn"><span class="material-symbols-rounded">share</span> Share</button>'
      +   '</div>'
      + '</div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeShareCard(); });
    overlay.querySelector('.share-close').addEventListener('click', closeShareCard);
    return overlay;
  }

  function drawShareCard(refKey, verseText) {
    var canvas = document.getElementById('share-card-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var primary = getComputedStyle(document.documentElement).getPropertyValue('--md-primary').trim() || '#6750A4';
    var primaryDeep = shade(primary, -0.45);
    // Gradient background
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, primaryDeep);
    grad.addColorStop(1, primary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft halo
    var halo = ctx.createRadialGradient(W * 0.75, H * 0.2, 50, W * 0.75, H * 0.2, W * 0.7);
    halo.addColorStop(0, 'rgba(255,255,255,0.22)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // Top mark
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 38px "Outfit", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('📖  Daily Time with God', 80, 80);

    // Body verse text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 64px "Outfit", "Georgia", serif';
    ctx.textAlign = 'left';
    wrapText(ctx, '"' + verseText.trim() + '"', 80, 260, W - 160, 86);

    // Reference at bottom
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '500 48px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('— ' + refKey, W - 80, H - 180);

    // Translation
    var translation = (state.settings && state.settings.translation || 'web').toUpperCase();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 28px "Outfit", system-ui, sans-serif';
    ctx.fillText(translation, W - 80, H - 110);

    // Wire buttons
    var dataUrl = canvas.toDataURL('image/png');
    var filename = 'dtwg-' + refKey.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '.png';
    var dl = document.getElementById('share-download-btn');
    var sh = document.getElementById('share-native-btn');
    dl.onclick = function () {
      var bridge = window.DTWGAndroid;
      if (bridge && typeof bridge.saveImageFile === 'function') {
        try { bridge.saveImageFile(filename, dataUrl); showToast('Saved to Downloads'); return; }
        catch (e) { /* fall through */ }
      }
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast('Image downloaded');
    };
    sh.onclick = function () {
      var bridge = window.DTWGAndroid;
      if (bridge && typeof bridge.shareImageFile === 'function') {
        try { bridge.shareImageFile(filename, dataUrl, refKey); return; }
        catch (e) {}
      }
      if (navigator.share) {
        // Convert to blob for native share
        canvas.toBlob(function (blob) {
          var file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: refKey, text: verseText }).catch(function () {});
          } else {
            navigator.share({ title: refKey, text: '"' + verseText + '" — ' + refKey }).catch(function () {});
          }
        }, 'image/png');
      } else {
        // Last resort: copy to clipboard
        navigator.clipboard && navigator.clipboard.writeText('"' + verseText + '" — ' + refKey).then(function () { showToast('Verse copied'); });
      }
    };
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(/\s+/);
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[i] + ' ';
        y += lineHeight;
        if (y > ctx.canvas.height - 240) { ctx.fillText(line.trim() + '…', x, y); return; }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  function shade(hex, amount) {
    var m = String(hex || '').match(/#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (!m) return '#3A2B5C';
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
    if (amount < 0) { r = clamp(r * (1 + amount)); g = clamp(g * (1 + amount)); b = clamp(b * (1 + amount)); }
    else { r = clamp(r + (255 - r) * amount); g = clamp(g + (255 - g) * amount); b = clamp(b + (255 - b) * amount); }
    return '#' + [r,g,b].map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
  }

  /* ---------- 8. TTS FALLBACK ---------- */

  var ttsState = { utterance: null, queue: [], idx: 0, playing: false, intentionalCancel: false };

  function speakCurrentChapter() {
    if (!('speechSynthesis' in window)) { showToast('TTS not supported in this browser'); return; }
    if (!currentChapterData || !currentChapterData.verses) { showToast('No chapter loaded'); return; }
    speechSynthesis.cancel();
    ttsState.queue = currentChapterData.verses.map(function (v) { return v.text; });
    ttsState.idx = 0;
    ttsState.playing = true;
    renderTtsBar();
    speakNext();
  }

  function speakNext() {
    if (!ttsState.playing) return;
    if (ttsState.idx >= ttsState.queue.length) { stopTts(); return; }
    var u = new SpeechSynthesisUtterance(ttsState.queue[ttsState.idx]);
    u.rate = state.settings.ttsRate || 1.0;
    var voiceName = state.settings.ttsVoice || '';
    if (voiceName) {
      var v = speechSynthesis.getVoices().find(function (vv) { return vv.name === voiceName; });
      if (v) u.voice = v;
    }
    u.onend = function () {
      // highlight next verse
      ttsState.idx++;
      var v = currentChapterData.verses[ttsState.idx];
      if (v) flashVerse(currentModalReading.book, currentModalReading.chapter, v.verse);
      speakNext();
    };
    u.onerror = function () { if (!ttsState.intentionalCancel) stopTts(); };
    ttsState.utterance = u;
    speechSynthesis.speak(u);
    var v = currentChapterData.verses[ttsState.idx];
    if (v) flashVerse(currentModalReading.book, currentModalReading.chapter, v.verse);
  }

  function flashVerse(book, chapter, verse) {
    var sel = '.verse-para[data-book="' + cssEscape(book) + '"][data-chapter="' + chapter + '"][data-verse="' + verse + '"]';
    document.querySelectorAll('.verse-para.tts-active').forEach(function (n) { n.classList.remove('tts-active'); });
    var el = document.querySelector(sel);
    if (el) {
      el.classList.add('tts-active');
      var modalBody = document.getElementById('modal-body');
      if (modalBody) modalBody.scrollTop = el.offsetTop - 100;
    }
  }

  function stopTts() {
    ttsState.playing = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    document.querySelectorAll('.verse-para.tts-active').forEach(function (n) { n.classList.remove('tts-active'); });
    var bar = document.getElementById('audio-bar');
    if (bar) { bar.hidden = true; bar.innerHTML = ''; }
  }

  function renderTtsBar() {
    var bar = document.getElementById('audio-bar');
    if (!bar) return;
    bar.hidden = false;
    bar.innerHTML = '';
    bar.classList.add('tts-bar');
    var meta = document.createElement('div');
    meta.className = 'audio-meta';
    meta.textContent = 'TTS · ' + (currentModalReading ? currentModalReading.book + ' ' + currentModalReading.chapter : '');
    var controls = document.createElement('div');
    controls.className = 'tts-controls';
    var pause = document.createElement('button');
    pause.className = 'secondary-btn';
    pause.textContent = 'Pause';
    pause.onclick = function () {
      if (speechSynthesis.paused) { speechSynthesis.resume(); pause.textContent = 'Pause'; }
      else { speechSynthesis.pause(); pause.textContent = 'Resume'; }
    };
    var stop = document.createElement('button');
    stop.className = 'secondary-btn';
    stop.textContent = 'Stop';
    stop.onclick = stopTts;
    var rate = document.createElement('select');
    rate.className = 'settings-select';
    [0.7, 0.85, 1.0, 1.15, 1.3, 1.5].forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = String(r);
      opt.textContent = r + '×';
      if (Math.abs((state.settings.ttsRate || 1.0) - r) < 0.01) opt.selected = true;
      rate.appendChild(opt);
    });
    rate.onchange = function () {
      state.settings.ttsRate = parseFloat(rate.value);
      saveState();
      // restart from current verse for new rate
      if (ttsState.playing) {
        ttsState.intentionalCancel = true;
        speechSynthesis.cancel();
        ttsState.intentionalCancel = false;
        speakNext();
      }
    };
    controls.appendChild(rate);
    controls.appendChild(pause);
    controls.appendChild(stop);
    bar.appendChild(meta);
    bar.appendChild(controls);
  }

  /* ---------- 9. NOTEBOOK MARKDOWN EXPORT ---------- */

  function exportNotebookMarkdown() {
    var dateKey = (typeof notebookDate !== 'undefined') ? notebookDate : formatDateKey(new Date());
    var dateObj = new Date(dateKey + 'T00:00:00');
    var opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    var dateStr = dateObj.toLocaleDateString('en-US', opts);

    var dayHighlights = Object.entries(state.highlights || {}).filter(function (kv) { return kv[1] && kv[1].date === dateKey; });
    var dayVerseNotes = (typeof getVerseNoteEntriesForDate === 'function') ? getVerseNoteEntriesForDate(dateKey) : [];
    var journalEntry = (state.journal || {})[dateKey] || '';
    var readings = getReadingPlan(dateKey);
    var prayer = (state.prayerJournal || {})[dateKey];

    var lines = [];
    lines.push('# 📖 Daily Time with God');
    lines.push('');
    lines.push('**' + dateStr + '**');
    lines.push('');
    lines.push('## Today\u2019s Readings');
    readings.forEach(function (r) { lines.push('- ' + r.book + ' ' + r.chapter + ' _(' + r.label + ')_'); });
    lines.push('');

    var cats = [
      { type: 'promise',   label: '🤝 Promises' },
      { type: 'command',   label: '📋 Commands' },
      { type: 'warning',   label: '⚠️ Warnings' },
      { type: 'principle', label: '💡 Principles' },
      { type: 'general',   label: '✨ General' }
    ];
    cats.forEach(function (cat) {
      var items = dayHighlights.filter(function (kv) { return (kv[1].type || 'general') === cat.type; });
      if (!items.length) return;
      lines.push('## ' + cat.label);
      items.forEach(function (kv) {
        lines.push('- **' + kv[0] + '** — ' + (kv[1].text || ''));
      });
      lines.push('');
    });

    if (dayVerseNotes.length) {
      lines.push('## ✍️ Verse Notes');
      dayVerseNotes.forEach(function (kv) {
        lines.push('### ' + kv[0]);
        if (kv[1].verseText) lines.push('> ' + kv[1].verseText);
        lines.push('');
        lines.push(kv[1].text || '');
        lines.push('');
      });
    }

    if (prayer && Array.isArray(prayer.entries) && prayer.entries.length) {
      lines.push('## 🙏 Prayer Journal');
      prayer.entries.forEach(function (e) {
        lines.push('- ' + (e.answered ? '✅ ' : '☐ ') + (e.text || ''));
      });
      lines.push('');
    }

    if (journalEntry) {
      lines.push('## 📓 Application');
      lines.push('');
      lines.push(journalEntry);
      lines.push('');
    }

    lines.push('---');
    lines.push('_Exported from Daily Time with God on ' + new Date().toLocaleString() + '_');

    var md = lines.join('\n');
    var filename = 'dtwg-notebook-' + dateKey + '.md';
    var bridge = window.DTWGAndroid;
    if (bridge && typeof bridge.saveBackupFile === 'function') {
      try { bridge.saveBackupFile(filename, md); showToast('Markdown saved'); return; }
      catch (e) {}
    }
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Markdown exported');
  }

  /* ---------- 10. PRAYER JOURNAL ---------- */

  function renderPrayerSection() {
    var dateKey = viewedDate;
    var section = document.getElementById('prayer-section');
    if (!section) return;
    var entry = state.prayerJournal[dateKey] || { entries: [] };

    section.innerHTML = '';
    var heading = document.createElement('h3');
    heading.className = 'journal-heading';
    var icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = 'volunteer_activism';
    heading.appendChild(icon);
    heading.appendChild(document.createTextNode(' Prayer Journal'));
    section.appendChild(heading);

    var list = document.createElement('div');
    list.className = 'prayer-list';
    (entry.entries || []).forEach(function (e, idx) {
      var row = document.createElement('div');
      row.className = 'prayer-item' + (e.answered ? ' answered' : '');

      var check = document.createElement('button');
      check.className = 'prayer-check';
      check.setAttribute('aria-label', e.answered ? 'Mark unanswered' : 'Mark answered');
      var cicon = document.createElement('span');
      cicon.className = 'material-symbols-rounded';
      cicon.textContent = e.answered ? 'check_circle' : 'radio_button_unchecked';
      check.appendChild(cicon);
      check.onclick = function () {
        var en = state.prayerJournal[dateKey];
        if (!en) return;
        en.entries[idx].answered = !en.entries[idx].answered;
        if (en.entries[idx].answered) en.entries[idx].answeredAt = new Date().toISOString();
        else delete en.entries[idx].answeredAt;
        saveState();
        renderPrayerSection();
      };

      var txt = document.createElement('div');
      txt.className = 'prayer-text';
      txt.textContent = e.text || '';

      var del = document.createElement('button');
      del.className = 'prayer-del';
      del.setAttribute('aria-label', 'Delete prayer');
      var dicon = document.createElement('span');
      dicon.className = 'material-symbols-rounded';
      dicon.textContent = 'close';
      del.appendChild(dicon);
      del.onclick = function () {
        var en = state.prayerJournal[dateKey];
        if (!en) return;
        en.entries.splice(idx, 1);
        saveState();
        renderPrayerSection();
      };

      row.appendChild(check);
      row.appendChild(txt);
      row.appendChild(del);
      list.appendChild(row);
    });
    section.appendChild(list);

    var addRow = document.createElement('div');
    addRow.className = 'prayer-add-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input';
    input.placeholder = 'New prayer or request…';
    input.maxLength = 200;
    var addBtn = document.createElement('button');
    addBtn.className = 'secondary-btn';
    addBtn.textContent = 'Add';
    function commit() {
      var v = input.value.trim();
      if (!v) return;
      if (!state.prayerJournal[dateKey]) state.prayerJournal[dateKey] = { entries: [] };
      state.prayerJournal[dateKey].entries.push({ text: v, ts: Date.now(), answered: false });
      input.value = '';
      saveState();
      renderPrayerSection();
    }
    addBtn.onclick = commit;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') commit(); });
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    section.appendChild(addRow);
  }

  /* ---------- 11. EXTENDED PALETTE: search across notes / highlights / journal ---------- */

  function patchPalette() {
    var orig = window.renderPaletteResults;
    if (!orig) return;
    window.renderPaletteResults = function patchedRenderPaletteResults(query) {
      // Always show user-content matches first when query is at least 2 chars.
      var results = document.getElementById('palette-results');
      results.innerHTML = '';

      var jump = parseReference(query);
      if (jump) {
        results.appendChild(paletteItem(jump.book + ' ' + jump.chapter + (jump.verse ? ':' + jump.verse : ''), 'Open passage', function () {
          closePalette(); openBibleModal(jump.book, jump.chapter, 0);
        }));
        return Promise.resolve();
      }

      var q = String(query || '').trim().toLowerCase();
      if (q.length < 2) {
        results.innerHTML = '<div class="palette-result"><span>Type at least 2 letters to search your notes, highlights, journal, and cached scripture.</span></div>';
        return Promise.resolve();
      }

      var userMatches = collectUserMatches(q);
      if (userMatches.length) {
        var header = document.createElement('div');
        header.className = 'palette-section-header';
        header.textContent = 'In your notes & highlights';
        results.appendChild(header);
        userMatches.slice(0, 30).forEach(function (m) {
          var label = m.kind + ' · ' + m.ref;
          var item = paletteItem(label, m.preview, function () {
            closePalette();
            if (m.openDate) { viewedDate = m.openDate; switchPage('dashboard'); }
            else if (m.book && m.chapter) openBibleModal(m.book, m.chapter, 0);
          });
          results.appendChild(item);
        });
      }

      // Then defer to the original Bible-cache search for the same query.
      if (q.length >= 3) {
        var divider = document.createElement('div');
        divider.className = 'palette-section-header';
        divider.textContent = 'In cached scripture';
        results.appendChild(divider);
        var scriptureContainer = document.createElement('div');
        results.appendChild(scriptureContainer);
        // The original writes into #palette-results directly. We can't sandbox
        // it cleanly, so simulate it by calling buildSearchIndex ourselves
        // and rendering inline.
        return buildSearchIndex().then(function (idx) {
          var terms = q.match(/[a-z]{3,}/g) || [];
          var refs = [].concat.apply([], terms.map(function (t) { return idx.terms[t] || []; }));
          refs = Array.from(new Set(refs)).slice(0, 20);
          if (!refs.length) {
            scriptureContainer.innerHTML = '<div class="palette-result"><span>No cached scripture matches yet — open and read chapters to build the index.</span></div>';
          } else {
            refs.forEach(function (r) {
              var item = idx.refs[r];
              if (item) scriptureContainer.appendChild(paletteItem(item.ref, item.text, function () {
                closePalette();
                openBibleModal(item.book, item.chapter, 0);
              }));
            });
          }
        });
      }

      if (!userMatches.length) {
        results.innerHTML = '<div class="palette-result"><span>No matches in your notes — try a longer query for scripture search.</span></div>';
      }
      return Promise.resolve();
    };
  }

  function collectUserMatches(q) {
    var out = [];

    Object.entries(state.highlights || {}).forEach(function (kv) {
      var ref = kv[0], hl = kv[1];
      if (!hl) return;
      if ((hl.text || '').toLowerCase().indexOf(q) === -1 && ref.toLowerCase().indexOf(q) === -1) return;
      var parsed = parseReference(ref) || parseReferenceLoose(ref);
      out.push({ kind: 'Highlight (' + (hl.type || 'general') + ')', ref: ref, preview: hl.text || '', book: parsed && parsed.book, chapter: parsed && parsed.chapter });
    });

    Object.entries(state.verseNotes || {}).forEach(function (kv) {
      var ref = kv[0], n = kv[1];
      if (!n || !n.text) return;
      if (n.text.toLowerCase().indexOf(q) === -1 && ref.toLowerCase().indexOf(q) === -1 && (n.verseText || '').toLowerCase().indexOf(q) === -1) return;
      var parsed = parseReference(ref) || parseReferenceLoose(ref);
      out.push({ kind: 'Note', ref: ref, preview: n.text, book: parsed && parsed.book, chapter: parsed && parsed.chapter });
    });

    Object.entries(state.bookmarks || {}).forEach(function (kv) {
      var ref = kv[0], b = kv[1];
      if (!b) return;
      if ((b.text || '').toLowerCase().indexOf(q) === -1 && ref.toLowerCase().indexOf(q) === -1) return;
      var parsed = parseReference(ref) || parseReferenceLoose(ref);
      out.push({ kind: 'Bookmark', ref: ref, preview: b.text || '', book: parsed && parsed.book, chapter: parsed && parsed.chapter });
    });

    Object.entries(state.journal || {}).forEach(function (kv) {
      var dateKey = kv[0], text = kv[1];
      if (!text || text.toLowerCase().indexOf(q) === -1) return;
      out.push({ kind: 'Journal', ref: dateKey, preview: text.slice(0, 200), openDate: dateKey });
    });

    Object.entries(state.prayerJournal || {}).forEach(function (kv) {
      var dateKey = kv[0], rec = kv[1];
      if (!rec || !rec.entries) return;
      rec.entries.forEach(function (e) {
        if (!e.text || e.text.toLowerCase().indexOf(q) === -1) return;
        out.push({ kind: 'Prayer' + (e.answered ? ' ✓' : ''), ref: dateKey, preview: e.text, openDate: dateKey });
      });
    });

    return out;
  }

  /* ---------- 12. HISTORY: Bookmarks + Achievements tabs ---------- */

  function patchHistoryRender() {
    var orig = window.renderHistoryList;
    if (!orig) return;
    window.renderHistoryList = function patchedRenderHistoryList() {
      if (historyTab === 'bookmarks') return renderBookmarksList();
      if (historyTab === 'achievements') return renderAchievementsList();
      return orig.apply(this, arguments);
    };

    var origSet = window.setHistoryTab;
    if (origSet) {
      window.setHistoryTab = function patchedSetHistoryTab(tab) {
        historyTab = tab;
        ['highlights','notes','bookmarks','achievements'].forEach(function (t) {
          var btn = document.getElementById('tab-' + t);
          if (btn) btn.classList.toggle('active', t === tab);
        });
        var chips = document.getElementById('filter-chips');
        if (chips) chips.style.display = tab === 'highlights' ? 'flex' : 'none';
        renderHistoryList();
      };
    }
  }

  function renderBookmarksList() {
    var list = document.getElementById('history-list');
    list.innerHTML = '';
    var entries = Object.entries(state.bookmarks || {});
    if (!entries.length) {
      var empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No bookmarks yet. Tap the bookmark icon next to a verse to save it here.';
      list.appendChild(empty);
      return;
    }
    entries.sort(function (a, b) { return (b[1].ts || 0) - (a[1].ts || 0); });
    entries.forEach(function (kv) {
      var ref = kv[0], b = kv[1];
      var item = document.createElement('div');
      item.className = 'history-item bookmark-item';

      var refEl = document.createElement('div');
      refEl.className = 'history-ref';
      refEl.textContent = ref;

      var text = document.createElement('p');
      text.className = 'history-text';
      text.textContent = b.text || '';

      var meta = document.createElement('div');
      meta.className = 'history-meta';
      var badge = document.createElement('span');
      badge.className = 'hl-badge hl-badge-bookmark';
      badge.textContent = 'Bookmark';
      var dateSpan = document.createElement('span');
      dateSpan.className = 'history-date';
      dateSpan.textContent = b.date || (b.ts ? formatDateKey(new Date(b.ts)) : '');

      var remove = document.createElement('button');
      remove.className = 'bookmark-remove-btn';
      remove.setAttribute('aria-label', 'Remove bookmark');
      var rIcon = document.createElement('span');
      rIcon.className = 'material-symbols-rounded';
      rIcon.textContent = 'close';
      remove.appendChild(rIcon);
      remove.onclick = function (e) {
        e.stopPropagation();
        delete state.bookmarks[ref];
        saveState();
        renderBookmarksList();
      };

      meta.appendChild(badge);
      meta.appendChild(dateSpan);
      item.appendChild(refEl);
      item.appendChild(text);
      item.appendChild(meta);
      item.appendChild(remove);
      item.addEventListener('click', function () {
        var parsed = parseReference(ref) || parseReferenceLoose(ref);
        if (parsed) openBibleModal(parsed.book, parsed.chapter, 0);
      });
      list.appendChild(item);
    });
  }

  function renderAchievementsList() {
    var list = document.getElementById('history-list');
    list.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'achievement-grid';
    var unlockedCount = 0;
    ACHIEVEMENTS.forEach(function (a) {
      var unlocked = !!state.achievements[a.id];
      if (unlocked) unlockedCount++;
      var card = document.createElement('div');
      card.className = 'achievement-card' + (unlocked ? ' unlocked' : ' locked');

      var iconWrap = document.createElement('div');
      iconWrap.className = 'achievement-icon';
      var icon = document.createElement('span');
      icon.className = 'material-symbols-rounded';
      icon.textContent = unlocked ? a.icon : 'lock';
      iconWrap.appendChild(icon);

      var body = document.createElement('div');
      body.className = 'achievement-body';
      var label = document.createElement('strong');
      label.textContent = a.label;
      var desc = document.createElement('p');
      desc.textContent = a.desc;
      body.appendChild(label);
      body.appendChild(desc);
      if (unlocked && state.achievements[a.id].unlockedAt) {
        var when = document.createElement('span');
        when.className = 'achievement-date';
        try {
          when.textContent = new Date(state.achievements[a.id].unlockedAt).toLocaleDateString();
        } catch (e) {}
        body.appendChild(when);
      }
      card.appendChild(iconWrap);
      card.appendChild(body);
      grid.appendChild(card);
    });

    var progress = document.createElement('div');
    progress.className = 'achievement-progress';
    progress.textContent = unlockedCount + ' / ' + ACHIEVEMENTS.length + ' unlocked';
    list.appendChild(progress);
    list.appendChild(grid);
  }

  /* ---------- 13. PATCH renderDashboard to add prayer section ---------- */

  function patchDashboard() {
    var orig = window.renderDashboard;
    if (!orig) return;
    window.renderDashboard = function patchedRenderDashboard() {
      orig.apply(this, arguments);
      renderPrayerSection();
    };
  }

  function patchNotebook() {
    var orig = window.renderNotebook;
    if (!orig) return;
    window.renderNotebook = function patchedRenderNotebook() {
      orig.apply(this, arguments);
      var pdfBtn = document.getElementById('nb-export-btn');
      var mdBtn = document.getElementById('nb-export-md-btn');
      if (mdBtn && pdfBtn) mdBtn.hidden = pdfBtn.hidden;
    };
  }

  /* ---------- 14. NATIVE BRIDGE WIRING ----------
   * On theme change, push the new status-bar color + dark/light icon hint
   * down to the native wrapper. Also exposed: native reminder scheduling
   * and a "system settings" deep-link. */

  function patchThemeApply() {
    var orig = window.applyTheme;
    if (!orig) return;
    window.applyTheme = function patchedApplyTheme(mode) {
      orig.apply(this, arguments);
      syncSystemBars();
    };
    var origColor = window.applyAppColor;
    if (origColor) {
      window.applyAppColor = function patchedApplyAppColor(colorName, customHex) {
        origColor.apply(this, arguments);
        var name = colorName || (state && state.settings && state.settings.appColor) || 'purple';
        document.documentElement.setAttribute('data-app-color', name);
        syncSystemBars();
      };
    }
  }

  function syncSystemBars() {
    try {
      var root = document.documentElement;
      var isDark = root.getAttribute('data-theme') === 'dark';
      var surface = getComputedStyle(root).getPropertyValue('--md-surface').trim() || (isDark ? '#1C1B1F' : '#FFFBFE');
      // Update the meta theme color to match the SURFACE (header bg) rather
      // than the primary swatch. This is what fixes the white-status-bar bug
      // in light mode on Android — Chrome was reading the primary purple even
      // when light theme was active, and the WebView system bar mirrored that.
      var meta = document.getElementById('meta-theme-color');
      if (meta) meta.content = surface;
      // Push to native wrapper if available
      var bridge = window.DTWGAndroid;
      if (bridge && typeof bridge.setStatusBarStyle === 'function') {
        try { bridge.setStatusBarStyle(surface, !!isDark); } catch (e) {}
      }
    } catch (e) {}
  }

  /* ---------- 15. PATCH mountAudioBar to offer TTS fallback ---------- */

  function patchAudio() {
    var orig = window.mountAudioBar;
    if (!orig) return;
    window.mountAudioBar = function patchedMountAudioBar(refKey) {
      // If no Bible Brain key, go straight to TTS.
      if (!state.apiKeys || !state.apiKeys.bibleBrain) {
        speakCurrentChapter();
        return Promise.resolve();
      }
      return orig.apply(this, arguments);
    };
  }

  /* ---------- Native reminder bridge --------- */

  function patchReminderSchedule() {
    var orig = window.scheduleReminderIfEnabled;
    if (!orig) return;
    window.scheduleReminderIfEnabled = async function patchedScheduleReminder() {
      try { await orig.apply(this, arguments); } catch (e) {}
      var bridge = window.DTWGAndroid;
      if (!bridge) return;
      try {
        if (state.settings.reminder && typeof bridge.scheduleNativeReminder === 'function') {
          bridge.scheduleNativeReminder(state.settings.reminderTime || '07:00');
        } else if (!state.settings.reminder && typeof bridge.cancelNativeReminder === 'function') {
          bridge.cancelNativeReminder();
        }
      } catch (e) {}
    };
  }

  /* ---------- 16. WIRE UP UI ---------- */

  function wireDom() {
    // Header search/palette button
    var headerSearchBtn = document.getElementById('header-search-btn');
    if (headerSearchBtn) headerSearchBtn.addEventListener('click', openPalette);

    // Notebook MD export button
    var nbMdBtn = document.getElementById('nb-export-md-btn');
    if (nbMdBtn) nbMdBtn.addEventListener('click', exportNotebookMarkdown);

    // History tabs we added in HTML
    var tabBookmarks = document.getElementById('tab-bookmarks');
    if (tabBookmarks) tabBookmarks.addEventListener('click', function () { setHistoryTab('bookmarks'); });
    var tabAch = document.getElementById('tab-achievements');
    if (tabAch) tabAch.addEventListener('click', function () { setHistoryTab('achievements'); });

    // System color scheme listener — keep status bar in sync
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncSystemBars);
    }
    // Listen for our own state-change pings (other tabs)
    window.addEventListener('storage', function (e) { if (e.key === 'dtwg_state') setTimeout(syncSystemBars, 50); });
  }

  /* ---------- 17. BOOT ---------- */

  window.addEventListener('load', function () {
    // Defer past app.js's load handler so all top-level state is bound.
    setTimeout(function () {
      ensureExtensionFields();
      patchSaveState();
      patchBackup();
      patchRenderBibleVerses();
      patchPalette();
      patchHistoryRender();
      patchDashboard();
      patchNotebook();
      patchThemeApply();
      patchAudio();
      patchReminderSchedule();
      wireDom();
      // Re-apply current color so the data-app-color attribute lands (the
      // original applyAppColor ran before our patch was installed).
      try {
        var colorName = (state && state.settings && state.settings.appColor) || 'purple';
        document.documentElement.setAttribute('data-app-color', colorName);
      } catch (e) {}
      syncSystemBars();
      // Initial achievements scan (counts pre-existing data)
      unlockAchievementsFromState();
      // First render of prayer section if dashboard is active
      try { renderPrayerSection(); } catch (e) {}
      // Re-render history if user has it open
      try { if (typeof renderHistoryList === 'function' && document.getElementById('page-history').classList.contains('active')) renderHistoryList(); } catch (e) {}
    }, 0);
  });

  // Expose for tests + console debugging
  window.DTWGExtensions = {
    ACHIEVEMENTS: ACHIEVEMENTS,
    EXT_STATE_VERSION: EXT_STATE_VERSION,
    countCompletedDays: countCompletedDays,
    hasAnyFullDay: hasAnyFullDay,
    countPrayers: countPrayers,
    countAnsweredPrayers: countAnsweredPrayers,
    collectUserMatches: collectUserMatches,
    parseReferenceLoose: parseReferenceLoose,
    shade: shade,
    exportNotebookMarkdown: exportNotebookMarkdown,
    syncSystemBars: syncSystemBars,
    speakCurrentChapter: speakCurrentChapter,
    stopTts: stopTts,
    toggleBookmark: toggleBookmark,
    drawShareCard: drawShareCard,
    openShareCard: openShareCard,
    closeShareCard: closeShareCard,
    renderPrayerSection: renderPrayerSection,
    unlockAchievementsFromState: unlockAchievementsFromState
  };
})();
