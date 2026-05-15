# Daily Time with God (DTWG)

A beautiful, Material Design 3 Progressive Web App for building a consistent daily Bible reading habit.

## Features

### Reading
- **Structured Reading Plan**: 7 daily readings — 3 Old Testament, 1 Psalm, 1 Proverb, 2 New Testament (Standard preset). Six more presets: OT-focus, NT-focus, Chronological, M'Cheyne, Bible in 90 Days, and Custom.
- **Dynamic Onboarding**: Set your starting position in the Bible; the plan adapts from there.
- **Live Bible Reader**: Fetches scripture from bible-api.com by default, with optional BYO-key API.Bible translations (NIV, NLT, NKJV) and ESV support.
- **Cross-reference suggestions** *(new in 1.6)*: Static, curated cross-references for 100+ famous verses surface as chips inside the reader so you can hop to related passages without searching.
- **Quick-jump verse navigator**: `Ctrl/Cmd+K` (or the header search icon) jumps to any reference like `John 3:16`.
- **Text-to-speech fallback** *(new in 1.6)*: Tap **Audio** without a Bible Brain key and the chapter reads aloud via the Web Speech API, with rate control and an active-verse follow highlight.

### Study
- **5-Category Highlight System**: General, Promise, Command, Warning, Principle — each with customizable colors.
- **Verse Bookmarks** *(new in 1.6)*: Star any verse to pin it to a dedicated **Bookmarks** tab in History.
- **Devotional Notebook**: A styled paper-like view aggregating highlights, verse notes, and readings per day. Exports to **PDF** *(printable)* or **Markdown** *(new in 1.6)*.
- **Verse-of-the-day share cards** *(new in 1.6)*: Tap the share icon on a verse to render a 1080×1080 PNG card (themed gradient + reference + translation) and save it or hand it to the system share sheet.

### Reflection
- **Journal**: Daily reflection prompts with auto-saving textarea.
- **Prayer Journal** *(new in 1.6)*: Per-day prayer requests with an "answered" checkbox. Logs the date a prayer was marked answered.
- **Search across your notes** *(new in 1.6)*: The command palette now searches your highlights, verse notes, bookmarks, journal, and prayers — not just cached scripture.

### Habits
- **Spiritual Analytics**: Track streaks, monthly progress, total reading time, and longest streaks.
- **Streak Freeze System**: Earn freezes every 7-day streak; use them to protect your streak on missed days.
- **Achievements / Badges** *(new in 1.6)*: 16 unlockable badges beyond the streak — First Steps, Full Day, One Week Devoted, Century Saint, A Year With the Word, Highlighter, Margin Maker, Full Palette, In Conversation, Faithful Witness, etc. Unlocks fire a celebration toast.

### System
- **Material You Theming**: 5 preset color themes + custom color picker, with auto-syncing highlight palette.
- **Dark Mode**: System-detect, light, or dark — with refreshed contrast for highlight overlays, badges, and primary tones *(updated in 1.6)*.
- **Progressive Web App**: Installable, offline-capable, with service worker caching.
- **Accessibility**: Focus-visible outlines, ARIA roles, keyboard navigation, focus traps in modals.
- **Responsive**: Mobile-first with a premium 2-column desktop layout at ≥900px.
- **Sound & Haptics**: Optional audio feedback (Web Audio API) and vibration patterns.
- **Cross-Tab Sync**: State changes propagate across open tabs via storage events.
- **XSS Safe**: All API-sourced content rendered via DOM methods, never innerHTML.
- **Cloud backup** (BYO-key Supabase): AES-GCM ciphertext encrypted with your passphrase, stored client-side only.
- **Local JSON backup/restore**: Export and import a full state snapshot — version-tolerant.

### Native Android
- **WebView wrapper** under `android/` opens the GitHub Pages PWA and exposes a `DTWGAndroid` bridge for reading-progress notifications, app-widget updates, haptics, file sharing, and backup file save.
- **Material 3 Expressive home-screen widget** *(redesigned in 1.6)*: Hero progress ring drawn dynamically on a Canvas, bold done/total readout, status pill, and CTA pill. On Android 12+ all colors are pulled from the user's wallpaper via `system_accent*` tokens, and the outer radius tracks the launcher's widget background radius.
- **Status-bar sync** *(new in 1.6)*: The web layer pushes the active theme color and dark/light hint to the native shell, fixing the white-status-bar bug in light mode.
- **Native alarm-backed reminder** *(new in 1.6)*: `AlarmManager`-scheduled exact alarm fires reliably even when the WebView is closed.
- **Live-update notification** (Android 16): foreground service publishes a progress-style notification that silently re-renders as chapters are completed.

## Integration Notes

DTWG is still a serverless PWA. Premium Bible providers, Claude commentary, Bible Brain audio, and Supabase backup use bring-your-own keys stored in this browser's localStorage. Keys are not encrypted by DTWG and are sent directly from the browser to the selected provider.

Android support includes both the installable PWA and a native WebView wrapper under `android/`. The native wrapper opens the GitHub Pages PWA and exposes a `DTWGAndroid` bridge for reading-progress notifications, app-widget updates, haptics, file sharing, status-bar sync, and alarm scheduling.

Local development secrets belong in `.env`, which is ignored by Git. Because GitHub Pages serves static files, `.env` is not a secure runtime secret store for the deployed app; production keys must still be entered by the user or mediated by a secured backend.

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES2020+)
- Material Design 3 Expressive Color System
- Google Fonts (Outfit) + Material Symbols Rounded
- bible-api.com REST API, optional API.Bible and ESV API adapters
- Web Speech API (TTS fallback)
- IndexedDB for offline Bible text caching
- Service Worker (Cache-first static, Network-first API)
- Web Audio API for sound effects
- Vibration API for haptic feedback
- Canvas 2D for share-card rendering

## Testing

Open `tests/index.html` directly in any browser — no build, no server. 30 unit tests cover plan computation, date math, cross-reference lookup, achievement predicates, color shading, and reference parsing. The runner is `tests/test-runner.js` and the suite is `tests/dtwg.tests.js`.

## Deployment

Deploy to any static file host:

1. **GitHub Pages**: Enable Pages in repo Settings → set source to `main` branch root
2. **Netlify/Vercel/Cloudflare Pages**: Point to repo, no build step needed
3. **Local**: `npx serve .` or any static server

## License

MIT
