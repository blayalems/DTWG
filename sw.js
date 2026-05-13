// Service Worker for Daily Time with God (DTWG)
importScripts('./plan.js');

const CACHE_NAME = 'dtwg-cache-v3';
let latestState = null;
let reminderTimer = null;

const APP_SHELL = [
  './index.html',
  './styles.css',
  './plan.js',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    Promise.allSettled(APP_SHELL.map(url => cache.add(url).catch(err => console.warn('[SW] cache miss:', url, err))))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names =>
    Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const host = url.hostname;

  if (host === 'api.anthropic.com' || host.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (host === 'bible-api.com' || host === 'rest.api.bible' || host === 'api.esv.org' || host.endsWith('.dbt.io')) {
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
    return caches.match(request);
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

self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.state) latestState = msg.state;
  if (msg.type === 'scheduleReminder') scheduleReminder(msg.time);
  if (msg.type === 'updateProgress') showProgress(msg);
  if (msg.type === 'milestone') showMilestone(msg.milestone);
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'dtwg-daily') event.waitUntil(showDaily());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

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
  reminderTimer = setTimeout(() => showDaily().then(() => scheduleReminder(time)), target - Date.now());
}

async function showDaily() {
  const plan = computeTodayPlan();
  await self.registration.showNotification('Daily Time with God', {
    body: plan.map(r => `• ${r.book} ${r.chapter}`).join('\n'),
    tag: 'dtwg-daily',
    renotify: true,
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'complete', title: 'Done' },
      { action: 'snooze', title: '+1h' },
      { action: 'reply', title: 'Reflect', type: 'text', placeholder: 'Today...' }
    ],
    data: { plan, dateKey: todayKey() }
  });
}

async function showProgress({ dateKey, done, total }) {
  await self.registration.showNotification('Daily Time with God', {
    body: done >= total ? `${done} / ${total} readings done. Day complete.` : `${done} / ${total} readings done. Keep going.`,
    tag: 'dtwg-daily',
    renotify: true,
    vibrate: done >= total ? [80, 60, 120] : [30],
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'complete', title: 'Done' },
      { action: 'snooze', title: '+1h' }
    ],
    data: { dateKey }
  });
}

async function showMilestone(n) {
  await self.registration.showNotification(`${n}-day streak`, {
    body: `You reached a ${n}-day DTWG milestone.`,
    tag: `dtwg-milestone-${n}`,
    renotify: true,
    vibrate: [120, 80, 120],
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png'
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
    if (event.reply && client) client.postMessage({ type: 'focusJournal', dateKey, draft: event.reply });
    else await self.clients.openWindow(`./index.html?focus=journal&date=${dateKey || todayKey()}`);
  } else {
    await self.clients.openWindow('./index.html');
  }
}
