/* Tiny zero-dependency test runner for DTWG.
 *
 * Usage from a browser: open tests/index.html. Tests are functions registered
 * via `test('name', fn)` — each fn either returns/awaits cleanly (pass) or
 * throws (fail). The runner prints a colored summary to the page and to the
 * console.
 *
 * The runner intentionally has no async-suite magic. If a test needs to be
 * async, declare it async; the runner awaits any returned Promise.
 */

(function (root) {
  'use strict';

  var registry = [];

  function test(name, fn) {
    registry.push({ name: name, fn: fn });
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
  }

  function assertEqual(a, b, msg) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) throw new Error((msg || 'Not equal') + ': expected ' + sb + ', got ' + sa);
  }

  function assertThrows(fn, msg) {
    var threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error(msg || 'Expected to throw');
  }

  async function run(onProgress) {
    var pass = 0, fail = 0;
    var results = [];
    for (var i = 0; i < registry.length; i++) {
      var t = registry[i];
      var entry = { name: t.name, ok: false, err: null, ms: 0 };
      var start = performance.now();
      try {
        var r = t.fn();
        if (r && typeof r.then === 'function') await r;
        entry.ok = true; pass++;
      } catch (e) {
        entry.ok = false; entry.err = e && e.stack ? e.stack : String(e); fail++;
      }
      entry.ms = Math.round(performance.now() - start);
      results.push(entry);
      if (onProgress) onProgress(entry, i, registry.length);
    }
    return { pass: pass, fail: fail, total: registry.length, results: results };
  }

  root.DTWGTest = {
    test: test,
    assert: assert,
    assertEqual: assertEqual,
    assertThrows: assertThrows,
    run: run,
    registry: registry
  };
})(typeof window !== 'undefined' ? window : globalThis);
