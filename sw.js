// Service Worker for Daily Time with God (DTWG)
importScripts('./plan.js');

const SW_VERSION = '1.1.0';
const CACHE_NAME = 'dtwg-v1.1.0';
const UPDATE_CHECK_URL = 'https://blayalems.github.io/DTWG/version.json';

let latestState = null;
let reminderTimer = null;

const APP_SHELL = [
  './index.html',
  './styles.css',
  './plan.js',
  './app.js',
  './manifest.json',
  './version.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(APP_SHELL.map(url =>
        cache.add(url).catch(err => console.warn('[SW] cache miss:', url, err))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => {
      self.clients.claim();
      // Check for a newer version after activating
      checkForUpdate().catch(() => {});
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const host = url.hostname;

  if (host === 'api.anthropic.com' || host.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (host === 'bible-api.com' || host === 'rest.api.bible' ||
      host === 'api.esv.org' || host.endsWith('.dbt.io')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // For version.json always try network first so update checks are fresh
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Offline and no cache available');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && request.method === 'GET') {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
  }
  return response;
}

/* ===== AUTO-UPDATE CHECK ===== */
async function checkForUpdate() {
  try {
    const res = await fetch(UPDATE_CHECK_URL + '?_sw=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const remote = await res.json();
    if (remote.version && remote.version !== SW_VERSION) {
      // Notify all open clients that an update is available
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.postMessage({
        type: 'updateAvailable',
        version: remote.version,
        notes: remote.notes || ''
      }));
    }
  } catch {
    // Network unavailable — silent fail
  }
}

/* ===== MESSAGE HANDLER ===== */
self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.state) latestState = msg.state;
  if (msg.type === 'scheduleReminder') scheduleReminder(msg.time);
  if (msg.type === 'updateProgress')   showLiveReading(msg);
  if (msg.type === 'milestone')        showMilestone(msg.milestone);
  if (msg.type === 'checkUpdate')      checkForUpdate().catch(() => {});
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'dtwg-daily')  event.waitUntil(showDaily());
  if (event.tag === 'dtwg-update') event.waitUntil(checkForUpdate());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

/* ===== HELPERS ===== */
function todayKey() {
  return DTWGPlan.formatDateKey(new Date());
}

function computeTodayPlan() {
  return DTWGPlan.getReadingPlanForState(latestState || {}, todayKey());
}

function scheduleReminder(time) {
  clearTimeout(reminderTimer);
  const [h, m] = String(time || '07:00').split(':').map(Number);
  const target = new Date();
  target.setHours(h || 7, m || 0, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  reminderTimer = setTimeout(
    () => showDaily().then(() => scheduleReminder(time)),
    target - Date.now()
  );
}

async function showDaily() {
  const plan = computeTodayPlan();
  await self.registration.showNotification('Daily Time with God', {
    body: plan.map(r => `• ${r.book} ${r.chapter}`).join('\n'),
    tag: 'dtwg-daily',
    renotify: true,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    actions: [
      { action: 'open',     title: 'Open' },
      { action: 'complete', title: 'Done' },
      { action: 'snooze',   title: '+1h' },
      { action: 'reply',    title: 'Reflect', type: 'text', placeholder: 'Today…' }
    ],
    data: { plan, dateKey: todayKey() }
  });
}

/* ===== ANDROID 16 LIVE READING NOTIFICATION ===== *
 * Silently replaces an existing notification as chapters are marked,
 * creating a native-feel live-progress update on Android.               */
async function showLiveReading({ dateKey, done, total, readings }) {
  if (!done && done !== 0) return;
  const remaining = total - done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Progress bar using block characters (visible in all notification styles)
  const filled = Math.round(pct / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const isComplete = done >= total;
  const nextUp = readings && readings[done] ? `Next: ${readings[done].book} ${readings[done].chapter}` : '';

  const body = isComplete
    ? `${bar} Complete!\nAll ${total} readings done. Great is His faithfulness!`
    : `${bar} ${pct}%\n${done}/${total} complete${nextUp ? ' · ' + nextUp : ''}`;

  await self.registration.showNotification('Daily Time with God', {
    body,
    tag: 'dtwg-live-reading',     // same tag = silent replace (live update)
    renotify: isComplete,          // only buzz on completion
    silent: !isComplete,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: isComplete ? [100, 60, 100, 60, 200] : undefined,
    actions: [
      { action: 'open', title: 'Open App' },
      ...(isComplete ? [] : [{ action: 'complete', title: 'Mark All Done' }])
    ],
    data: { dateKey, done, total }
  });
}

async function showMilestone(n) {
  await self.registration.showNotification(`${n}-day streak! 🔥`, {
    body: `You've built a ${n}-day daily reading habit. Keep going!`,
    tag: `dtwg-milestone-${n}`,
    renotify: true,
    vibrate: [120, 80, 120],
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png'
  });
}

async function handleNotificationClick(event) {
  const { dateKey } = event.notification.data || {};
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const client = clients[0];

  if (event.action === 'complete') {
    if (client) client.postMessage({ type: 'markAllComplete', dateKey });
    else await self.clients.openWindow('./index.html');
  } else if (event.action === 'snooze') {
    setTimeout(showDaily, 60 * 60 * 1000);
  } else if (event.action === 'reply') {
    if (event.reply && client) {
      client.postMessage({ type: 'focusJournal', dateKey, draft: event.reply });
    } else {
      await self.clients.openWindow(`./index.html?focus=journal&date=${dateKey || todayKey()}`);
    }
  } else {
    if (client) { client.focus(); client.postMessage({ type: 'navigate', dateKey }); }
    else await self.clients.openWindow('./index.html');
  }
}
