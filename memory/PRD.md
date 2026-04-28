# GRAV-SHIFT — Product Requirements Document

## Original Problem Statement
"What is a trending, simple app game that people would buy for .99 cents, that also you can create for me to put on the android play store?"

## Concept
**GRAV-SHIFT** — a trending one-tap arcade game (Flappy-style) with a unique **multiple gravity-flip mechanics** twist. Designed as a paid $0.99 title for the Google Play Store. Built as React + HTML5 Canvas so it can be wrapped with Capacitor for native Android packaging.

## User Personas
- **Casual mobile gamer** — wants quick, addictive 30-second sessions on the go
- **Arcade/retro fan** — drawn to neon CRT aesthetic and high-score chasing
- **Speedrunner / leaderboard hunter** — competes for global top-10 placement

## Core Requirements (Static)
- One-tap controls (tap / click / Space) — the game must be playable with a single input
- Three distinct gravity-flip mechanics:
  1. **Green Orbs** — collect to flip gravity (player choice)
  2. **Red Flip-Pipes** — passing them auto-flips gravity (forced)
  3. **Global Auto-Flip** — every 22s the world flips (timing pressure)
- Endless side-scrolling pipes with increasing speed
- Local high-score persistence (localStorage)
- Global leaderboard (top 10) — name + score, backed by FastAPI/MongoDB
- Procedural sound effects + chiptune music (Web Audio API, no asset files)
- Pause / resume / mute / restart flows
- Neon retro arcade visuals with CRT scanlines (per design_guidelines.json)
- All interactive elements have data-testid attributes
- Paid-only — no ads, no IAP

## Tech Stack
- **Frontend**: React 19, HTML5 Canvas, Tailwind CSS, Axios
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic v2
- **Database**: MongoDB collection `scores` (id, name, score, timestamp ISO string)
- **Audio**: Web Audio API (procedurally generated)
- **Fonts**: Unbounded (display) + Azeret Mono (HUD/body)

## Architecture
- `/app/backend/server.py` — `/api/scores` (POST/GET), `/api/scores/rank` (GET), `/api/status` (kept for health), `/api/`
- `/app/frontend/src/App.js` — shell that mounts `<Game />`
- `/app/frontend/src/components/Game.jsx` — canvas engine, physics, all phase overlays (menu/playing/paused/gameover)
- `/app/frontend/src/components/Leaderboard.jsx` — leaderboard fetch + render
- `/app/frontend/src/lib/audio.js` — Web Audio sound engine
- `/app/frontend/src/index.css` — neon retro design tokens + utility classes
- `/app/design_guidelines.json` — design source of truth

## What's Been Implemented (2026-04-28)
- Full one-tap canvas game with 3 gravity-flip mechanics (orbs, flip-pipes, periodic global flip)
- Increasing speed difficulty curve (capped)
- Particle effects on flap, flip, crash; screen shake on death
- Main menu with title, play, leaderboard, mute, controls hint, local best score
- In-game HUD: large translucent score, gravity direction indicator, pause button
- Pause overlay with resume + quit
- Game-over panel with final score, new-high-score badge, name input, submit, retry, leaderboard, menu
- Global rank lookup on game-over (`/api/scores/rank`)
- Top-10 leaderboard with rank-1/2/3 colored glow
- Procedural sounds (flap, score, flip, orb, crash, game-over) + chiptune music loop
- CRT scanlines + vignette overlay
- Submit blocked when score === 0 (anti-spam UX guard)
- Backend tests: 20/20 passing in `/app/backend/tests/test_gravshift_api.py`

## Backlog (Prioritized)
### P1 — Play Store packaging
- Wrap with **Capacitor** to produce a signed Android APK / AAB (`@capacitor/core`, `@capacitor/android`)
- Add app icon set + splash screen + Play Store metadata (description, screenshots)
- Configure proper app id (e.g., `com.yourstudio.gravshift`)
- Test on real Android device

### P2 — Game polish
- Skins / cosmetic ship variants (cyan, coral, yellow) unlocked by score milestones
- Daily challenge (deterministic seed)
- Combo multiplier for chained orb flips
- Haptic feedback (Capacitor Haptics) on flip/crash
- Settings: difficulty, music volume slider

### P3 — Backend hardening (only if leaderboard spam appears)
- Rate-limiting per IP on POST /api/scores
- Optional anti-cheat: HMAC-signed score submissions

## Next Action Items
- Review current build in browser
- When ready: scaffold Capacitor wrapper, build signed AAB, upload to Play Console
- Decide on app icon / splash art direction

## Notes
- Game is fully E2E functional. Backend leaderboard verified with curl + automated tests. Frontend verified end-to-end including natural game-over loop.
- No third-party paid integrations used. No auth required.

## Update (2026-04-28 — session 2)
### Added
- **Shareable game-over card** — generates a 1080×1080 PNG with score, global rank, name, NEW HIGH badge, branded GRAV-SHIFT styling. SHARE button uses Capacitor native share on Android, Web Share API in browser, falls back to PNG download. SAVE PNG button always downloads.
- **Capacitor wrapper for Android** — `@capacitor/{core,cli,android,haptics,share,status-bar,splash-screen}` v7 installed; `capacitor.config.json` configured (appId `com.emergent.gravshift`, dark `#050508` theme); `npx cap add android` scaffolded the full Android Studio project at `/app/frontend/android/`.
- **Native haptics** — medium impulse on every gravity flip, heavy on crash. No-op on web.
- **Play Store guide** — `/app/PLAY_STORE_GUIDE.md` with full publish workflow ($0.99 paid setup, signed AAB build, internal testing).

### Status
- Backend: 20/20 tests still pass
- Frontend: All flows + new share buttons verified
- Android AAB build is a user-machine step (no Android SDK in this container — documented)
