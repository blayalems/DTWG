/* Static cross-reference table for DTWG.
 * Keys are normalized "Book Chapter:Verse" strings. Values are arrays of
 * cross-reference strings. This is intentionally small and curated — the goal
 * is to surface 2-6 helpful related verses for famous passages without
 * requiring a remote API. Fall back to chapter-level refs when a verse-level
 * entry is absent. */
(function (root) {
  'use strict';

  // Verse-level cross references. Lowercased on lookup, so casing here is for
  // readability only.
  var VERSE_REFS = {
    'Genesis 1:1':       ['John 1:1-3', 'Hebrews 11:3', 'Colossians 1:16', 'Psalms 33:6'],
    'Genesis 1:27':      ['Genesis 5:1', 'Matthew 19:4', 'Colossians 3:10', 'James 3:9'],
    'Genesis 3:15':      ['Romans 16:20', 'Revelation 12:17', 'Galatians 4:4', '1 John 3:8'],
    'Genesis 12:3':      ['Galatians 3:8', 'Acts 3:25', 'Romans 4:11'],
    'Genesis 50:20':     ['Romans 8:28', 'Psalms 76:10', 'Acts 2:23'],
    'Exodus 20:3':       ['Deuteronomy 5:7', 'Matthew 4:10', '1 Corinthians 8:6'],
    'Deuteronomy 6:5':   ['Matthew 22:37', 'Mark 12:30', 'Luke 10:27'],
    'Joshua 1:9':        ['Deuteronomy 31:6', 'Psalms 27:1', 'Isaiah 41:10', 'Hebrews 13:5'],
    'Psalms 23:1':       ['John 10:11', 'Isaiah 40:11', 'Ezekiel 34:11-12', 'Revelation 7:17'],
    'Psalms 23:4':       ['Isaiah 43:2', '2 Corinthians 1:3-4', 'Romans 8:38-39'],
    'Psalms 27:1':       ['Isaiah 12:2', 'Psalms 118:6', 'Romans 8:31'],
    'Psalms 46:1':       ['Psalms 18:2', 'Deuteronomy 33:27', 'Isaiah 25:4'],
    'Psalms 51:10':      ['Ezekiel 36:26', 'Acts 15:9', '2 Corinthians 5:17'],
    'Psalms 91:1':       ['Psalms 27:5', 'Psalms 121:5', 'Proverbs 18:10'],
    'Psalms 119:105':    ['Proverbs 6:23', '2 Peter 1:19', 'John 1:9'],
    'Psalms 139:14':     ['Psalms 8:3-4', 'Ephesians 2:10', 'Job 10:8-12'],
    'Proverbs 3:5':      ['Jeremiah 17:7', 'Psalms 37:5', 'Isaiah 26:3'],
    'Proverbs 3:6':      ['Psalms 32:8', 'James 1:5', 'Isaiah 30:21'],
    'Proverbs 16:9':     ['Proverbs 19:21', 'Psalms 37:23', 'Jeremiah 10:23'],
    'Proverbs 22:6':     ['Deuteronomy 6:7', 'Ephesians 6:4', '2 Timothy 3:15'],
    'Ecclesiastes 3:1':  ['Romans 12:11', 'Galatians 6:9', 'James 4:14'],
    'Isaiah 9:6':        ['Luke 2:11', 'Matthew 1:23', 'John 14:27', 'Isaiah 7:14'],
    'Isaiah 26:3':       ['Philippians 4:7', 'John 14:27', 'Psalms 119:165'],
    'Isaiah 40:31':      ['Psalms 103:5', '2 Corinthians 4:16', 'Habakkuk 3:19'],
    'Isaiah 41:10':      ['Joshua 1:9', 'Deuteronomy 31:6', 'Hebrews 13:5'],
    'Isaiah 53:5':       ['1 Peter 2:24', 'Romans 4:25', 'Matthew 8:17'],
    'Isaiah 55:8':       ['Romans 11:33', 'Job 11:7', '1 Corinthians 2:16'],
    'Jeremiah 29:11':    ['Romans 8:28', 'Proverbs 23:18', 'Psalms 40:5'],
    'Lamentations 3:22': ['Psalms 86:15', 'Numbers 14:18', '2 Peter 3:9'],
    'Lamentations 3:23': ['Psalms 30:5', 'Isaiah 33:2', '1 Corinthians 1:9'],
    'Matthew 5:3':       ['Luke 6:20', 'Isaiah 57:15', 'Isaiah 66:2'],
    'Matthew 5:14':      ['John 8:12', 'Philippians 2:15', 'Ephesians 5:8'],
    'Matthew 6:33':      ['Luke 12:31', 'Psalms 37:4', '1 Kings 3:11-13'],
    'Matthew 6:34':      ['Luke 12:22-26', 'Philippians 4:6', '1 Peter 5:7'],
    'Matthew 7:7':       ['Luke 11:9', 'John 14:13', 'James 1:5-6'],
    'Matthew 11:28':     ['John 7:37', 'Isaiah 55:1-3', 'Jeremiah 6:16'],
    'Matthew 22:37':     ['Deuteronomy 6:5', 'Mark 12:30', 'Luke 10:27'],
    'Matthew 22:39':     ['Leviticus 19:18', 'Romans 13:9', 'Galatians 5:14', 'James 2:8'],
    'Matthew 28:19':     ['Mark 16:15', 'Acts 1:8', 'Romans 10:14-15'],
    'Mark 10:45':        ['Matthew 20:28', 'Isaiah 53:11', '1 Timothy 2:6'],
    'Luke 6:31':         ['Matthew 7:12', 'Galatians 5:14', 'Leviticus 19:18'],
    'John 1:1':          ['Genesis 1:1', '1 John 1:1', 'Revelation 19:13', 'Colossians 1:15-17'],
    'John 1:14':         ['Philippians 2:7-8', 'Hebrews 2:14', '1 John 4:2'],
    'John 3:3':          ['1 Peter 1:23', 'Titus 3:5', '2 Corinthians 5:17'],
    'John 3:16':         ['John 3:36', 'Romans 5:8', '1 John 4:9-10', 'Romans 6:23'],
    'John 8:32':         ['John 17:17', 'Psalms 119:45', 'Romans 6:18'],
    'John 10:10':        ['John 3:16', 'Romans 6:23', '1 John 5:12'],
    'John 11:25':        ['John 5:24', '1 Corinthians 15:21-22', 'Romans 6:5'],
    'John 13:34':        ['John 15:12', '1 John 3:23', 'Ephesians 5:2'],
    'John 14:6':         ['John 10:9', 'Acts 4:12', 'Hebrews 10:20'],
    'John 14:27':        ['Philippians 4:7', 'John 16:33', 'Isaiah 26:3'],
    'John 15:5':         ['Philippians 4:13', '2 Corinthians 12:9', 'Galatians 2:20'],
    'John 16:33':        ['Romans 8:37', '1 John 5:4', 'John 14:27'],
    'Acts 1:8':          ['Luke 24:48-49', 'Matthew 28:19', 'Mark 16:15'],
    'Acts 2:38':         ['Mark 16:16', 'Acts 22:16', 'Romans 6:3-4'],
    'Acts 4:12':         ['John 14:6', '1 Timothy 2:5', 'Matthew 1:21'],
    'Romans 1:16':       ['1 Corinthians 1:18', 'Psalms 119:46', '2 Timothy 1:8'],
    'Romans 3:23':       ['Romans 5:12', 'Galatians 3:22', 'Ecclesiastes 7:20'],
    'Romans 5:8':        ['John 3:16', '1 John 4:10', '1 Peter 3:18'],
    'Romans 6:23':       ['Genesis 2:17', 'James 1:15', 'John 3:16'],
    'Romans 8:1':        ['John 3:18', 'Romans 8:33-34', 'Galatians 3:13'],
    'Romans 8:28':       ['Genesis 50:20', 'Ephesians 1:11', 'James 1:2-4'],
    'Romans 8:38':       ['John 10:28-29', '1 Peter 1:5', '2 Timothy 1:12'],
    'Romans 10:9':       ['Acts 16:31', '1 John 4:15', '1 Corinthians 12:3'],
    'Romans 12:1':       ['1 Corinthians 6:20', 'Hebrews 13:15-16', '1 Peter 2:5'],
    'Romans 12:2':       ['Ephesians 4:23', '1 Peter 1:14', 'Colossians 3:10'],
    'Romans 15:13':      ['Isaiah 11:10', 'Romans 14:17', 'Galatians 5:22'],
    '1 Corinthians 10:13': ['1 Peter 5:9', 'James 1:13', '2 Peter 2:9'],
    '1 Corinthians 13:4': ['1 Corinthians 13:7', 'Galatians 5:22', 'Proverbs 10:12'],
    '1 Corinthians 13:13': ['Galatians 5:6', 'Colossians 1:4-5', '1 Thessalonians 1:3'],
    '1 Corinthians 15:58': ['Galatians 6:9', '2 Chronicles 15:7', 'Hebrews 6:10'],
    '2 Corinthians 5:17': ['Galatians 6:15', 'Ephesians 4:24', 'Romans 6:4'],
    '2 Corinthians 5:21': ['Isaiah 53:6', 'Romans 1:17', 'Hebrews 4:15'],
    '2 Corinthians 12:9': ['John 15:5', 'Philippians 4:13', 'Romans 5:3-5'],
    'Galatians 2:20':    ['Romans 6:6', 'Colossians 3:3', 'Philippians 1:21'],
    'Galatians 5:22':    ['Ephesians 5:9', 'Colossians 3:12-15', 'James 3:17-18'],
    'Galatians 6:9':     ['1 Corinthians 15:58', '2 Thessalonians 3:13', 'Hebrews 12:3'],
    'Ephesians 2:8':     ['Romans 4:16', 'Titus 3:5', '2 Timothy 1:9'],
    'Ephesians 2:10':    ['Psalms 139:14', 'Philippians 2:13', 'Titus 2:14'],
    'Ephesians 4:32':    ['Colossians 3:13', 'Matthew 6:14', 'Luke 17:3-4'],
    'Ephesians 6:11':    ['Romans 13:12', '1 Thessalonians 5:8', '1 Peter 5:8-9'],
    'Philippians 1:6':   ['1 Thessalonians 5:24', 'Hebrews 13:21', 'Jude 1:24'],
    'Philippians 4:6':   ['Matthew 6:34', '1 Peter 5:7', 'Psalms 55:22'],
    'Philippians 4:7':   ['John 14:27', 'Isaiah 26:3', 'Colossians 3:15'],
    'Philippians 4:8':   ['Romans 12:2', 'Colossians 3:2', '2 Corinthians 10:5'],
    'Philippians 4:13':  ['John 15:5', '2 Corinthians 12:9', 'Ephesians 3:16'],
    'Philippians 4:19':  ['Psalms 23:1', 'Matthew 6:33', '2 Corinthians 9:8'],
    'Colossians 3:23':   ['Ephesians 6:7', 'Ecclesiastes 9:10', '1 Corinthians 10:31'],
    '1 Thessalonians 5:16': ['Philippians 4:4', 'Psalms 34:1', 'Romans 12:12'],
    '1 Thessalonians 5:17': ['Luke 18:1', 'Ephesians 6:18', 'Romans 12:12'],
    '1 Thessalonians 5:18': ['Ephesians 5:20', 'Philippians 4:6', 'Colossians 3:17'],
    '2 Timothy 1:7':     ['Romans 8:15', '1 John 4:18', 'Acts 1:8'],
    '2 Timothy 3:16':    ['2 Peter 1:21', 'Romans 15:4', '1 Corinthians 10:11'],
    'Hebrews 4:12':      ['Ephesians 6:17', '1 Peter 1:23', 'Jeremiah 23:29'],
    'Hebrews 11:1':      ['Romans 8:24-25', '2 Corinthians 4:18', 'Hebrews 11:6'],
    'Hebrews 11:6':      ['Romans 14:23', 'James 1:6', 'Hebrews 11:1'],
    'Hebrews 12:1':      ['1 Corinthians 9:24', '2 Timothy 4:7', 'Philippians 3:14'],
    'Hebrews 12:2':      ['Philippians 3:14', '1 Peter 2:21', 'Hebrews 2:10'],
    'Hebrews 13:8':      ['Malachi 3:6', 'James 1:17', 'Revelation 1:8'],
    'James 1:2':         ['Romans 5:3-5', '1 Peter 1:6-7', 'Matthew 5:11-12'],
    'James 1:5':         ['Proverbs 2:6', '1 Kings 3:9-12', 'Matthew 7:7'],
    'James 1:17':        ['Malachi 3:6', '1 John 1:5', 'Numbers 23:19'],
    'James 4:7':         ['Ephesians 6:12', '1 Peter 5:8-9', 'Matthew 4:10'],
    'James 4:8':         ['Zechariah 1:3', '2 Chronicles 15:2', 'Lamentations 3:57'],
    '1 Peter 2:9':       ['Exodus 19:5-6', 'Deuteronomy 7:6', 'Titus 2:14'],
    '1 Peter 5:7':       ['Psalms 55:22', 'Matthew 6:25', 'Philippians 4:6'],
    '1 John 1:9':        ['Proverbs 28:13', 'Psalms 32:5', 'James 5:16'],
    '1 John 4:7':        ['John 13:34-35', '1 John 3:11', '1 Peter 1:22'],
    '1 John 4:8':        ['1 John 4:16', 'John 4:24', '2 Corinthians 13:11'],
    '1 John 4:19':       ['John 15:16', 'Jeremiah 31:3', 'Romans 5:8'],
    'Revelation 3:20':   ['John 14:23', 'Luke 12:36-37', 'Song of Solomon 5:2'],
    'Revelation 21:4':   ['Isaiah 25:8', '1 Corinthians 15:54', 'Revelation 7:17'],
    'Revelation 22:13':  ['Isaiah 44:6', 'Revelation 1:8', 'Revelation 1:17']
  };

  // Chapter-level fallback for whole-chapter context.
  var CHAPTER_REFS = {
    'Genesis 1':   ['John 1:1-5', 'Hebrews 1:2', 'Psalms 8'],
    'Psalms 1':    ['Jeremiah 17:7-8', 'Matthew 7:24-27'],
    'Psalms 22':   ['Matthew 27:35-46', 'Isaiah 53'],
    'Psalms 23':   ['John 10:11-15', 'Ezekiel 34:11-16'],
    'Proverbs 31': ['1 Peter 3:1-6', 'Ecclesiastes 9:9'],
    'Isaiah 53':   ['1 Peter 2:21-25', 'Acts 8:32-35'],
    'Daniel 7':    ['Revelation 13', 'Matthew 24:30'],
    'Matthew 5':   ['Luke 6:20-49', 'James 1:22-25'],
    'Matthew 6':   ['Luke 11:1-13', 'James 1:5'],
    'John 1':      ['Genesis 1:1-3', 'Colossians 1:15-17'],
    'John 3':      ['1 John 5:1-12', 'Titus 3:3-7'],
    'John 14':     ['John 16:5-15', 'Hebrews 6:19-20'],
    'Romans 8':    ['Galatians 5:16-26', '1 Corinthians 15:42-58'],
    'Romans 12':   ['1 Peter 2:1-12', 'Ephesians 4:1-16'],
    '1 Corinthians 13': ['Galatians 5:22-23', 'Colossians 3:12-14'],
    'Ephesians 6': ['Romans 13:11-14', '1 Thessalonians 5:1-11'],
    'Hebrews 11':  ['Romans 4', 'James 2:14-26']
  };

  function lookup(refKey) {
    if (!refKey) return [];
    var verseRef = String(refKey).trim();
    var verse = VERSE_REFS[verseRef];
    if (verse && verse.length) return verse.slice();
    var chapter = verseRef.split(':')[0];
    var chap = CHAPTER_REFS[chapter];
    return chap ? chap.slice() : [];
  }

  root.DTWGCrossRefs = { lookup: lookup, VERSE_REFS: VERSE_REFS, CHAPTER_REFS: CHAPTER_REFS };
})(typeof window !== 'undefined' ? window : globalThis);
