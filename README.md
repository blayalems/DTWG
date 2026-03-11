# Daily Time with God (DTWG)

A beautiful, Material Design 3 Progressive Web App for building a consistent daily Bible reading habit.

## Features

- **Structured Reading Plan**: 7 daily readings — 3 Old Testament, 1 Psalm, 1 Proverb, 2 New Testament
- **Dynamic Onboarding**: Set your starting position in the Bible; the plan adapts from there
- **Live Bible Reader**: Fetches scripture from bible-api.com with multiple translations (WEB, KJV, BBE, ASV, Darby)
- **5-Category Highlight System**: General, Promise, Command, Warning, Principle — each with customizable colors
- **Devotional Notebook**: A styled paper-like view aggregating highlights, notes, and readings per day
- **Spiritual Analytics**: Track streaks, monthly progress, total reading time, and longest streaks
- **Streak Freeze System**: Earn freezes every 7-day streak; use them to protect your streak on missed days
- **Material You Theming**: 5 preset color themes + custom color picker, with auto-syncing highlight palette
- **Dark Mode**: System-detect, light, or dark — with full token adaptation
- **Progressive Web App**: Installable, offline-capable, with service worker caching
- **Accessibility**: Focus-visible outlines, ARIA roles, keyboard navigation, focus traps in modals
- **Responsive**: Mobile-first with a premium 2-column desktop layout at ≥900px
- **Sound & Haptics**: Optional audio feedback (Web Audio API) and vibration patterns
- **Cross-Tab Sync**: State changes propagate across open tabs via storage events
- **XSS Safe**: All API-sourced content rendered via DOM methods, never innerHTML
- **Journal**: Daily reflection prompts with auto-saving textarea
- **Confetti Celebration**: Canvas particle system on daily completion

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES2020+)
- Material Design 3 Expressive Color System
- Google Fonts (Outfit) + Material Symbols Rounded
- bible-api.com REST API
- IndexedDB for offline Bible text caching
- Service Worker (Cache-first static, Network-first API)
- Web Audio API for sound effects
- Vibration API for haptic feedback

## Deployment

Deploy to any static file host:

1. **GitHub Pages**: Enable Pages in repo Settings → set source to `main` branch root
2. **Netlify/Vercel/Cloudflare Pages**: Point to repo, no build step needed
3. **Local**: `npx serve .` or any static server

## License

MIT