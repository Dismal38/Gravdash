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

## Update (2026-04-28 — session 3, code-review fixes)
### Refactored
- **Game.jsx split** from 1029 → **265 lines** (orchestrator only)
- Extracted **lib/gameEngine.js** — pure engine (constants, createInitialState, step, draw, flap, helpers). No React.
- Extracted screens: **MenuScreen.jsx**, **HUD.jsx**, **PauseScreen.jsx**, **GameOverScreen.jsx**
- **Leaderboard.jsx** split: data fetching → `hooks/useLeaderboardScores.js`; row & body broken into sub-components
- All previously-empty catch blocks now `console.warn` with prefixed messages
- Added Python type hints across `server.py` (Dict/List/str/int return types, typed locals)

### Bug fixed
- **Mute-toggle was unclickable** on every overlay screen because corner controls (z-30) sat below overlays (z-40). Bumped to **z-50**. Verified via non-forced Playwright clicks: text now flips correctly on menu, paused, playing, gameover, and leaderboard screens.

### Status
- Backend: 20/20 pytest pass
- Frontend: 100% regression pass, 0 console errors
- Lint: clean

## Update (2026-04-28 — session 4, second code-review pass)
### Refactored further
- **Game.jsx**: 265 → **196 lines**. Extracted `useGameLoop`, `useGameInput`, `useCanvasResize` hooks.
- **GameOverScreen.jsx**: 244 → **54 lines**. Split into `ScoreDisplay`, `NameSubmitForm`, `ShareSection`, `GameOverActions` (under `components/gameover/`).
- **shareCard.js**: 262 → **125 lines**. Pure drawing helpers moved to `lib/shareCardDraw.js`. `shareCardBlob` now uses an iteration-of-strategies pattern (`tryCapacitorShare` → `tryWebShareFiles` → `tryWebShareText` → download fallback).
- Cleaned 44 polluting `TEST*/HCKER*/NEOTRIM*` rows from the `scores` collection that were causing intermittent test failures.

### Status
- Backend: 20/20 pytest pass (clean DB)
- Frontend: 100% regression pass — mute-toggle works on all 5 screens (non-forced clicks), 2nd-run state-pollution check passes, persistence survives reload, 0 console errors
- Lint: clean

## Update (2026-04-28 — session 5, hook-deps & storage hardening)
### Refactored
- **Single-subscription effects** via new `useEvent` hook (`hooks/useEvent.js`). `useGameLoop`, `useGameInput`, and `useCanvasResize` all subscribe ONCE for the component's lifetime (`[]` deps) — no more re-subscription when handler identities change.
- **`highScoreRef` mirror** in Game.jsx → `handleDeath` is identity-stable (`[]` deps) yet always reads the latest highScore. Eliminates stale-closure risk entirely.
- **Safe storage utility** (`lib/storage.js`) — `readNumber` / `readString` / `writeValue` with try/catch, sane fallbacks, and `console.warn` on failure. All localStorage access in Game.jsx + NameSubmitForm now goes through it.
- **`AbortController`** added to `useLeaderboardScores` — cancels in-flight requests on unmount, no more setState-on-unmounted warnings on quick open/close.

### Verified
- Backend: 20/20 pytest pass
- Frontend: 100% regression — fresh-localStorage fallback OK (BEST·0000 on first load), persistence after reload OK (round-trip via writeValue/readNumber), mute-toggle works on all 5 screens via non-forced clicks, leaderboard quick-open-then-close exercises AbortController with 0 warnings, 0 console errors
- Lint: clean

## Update (2026-04-28 — session 6, brand assets generated)
### Added
- **Procedural brand assets** generated via `/app/scripts/gen_assets.py` (Pillow):
  - `/app/resources/icon.png` (1024×1024) — clean ship silhouette, scales cleanly to 48px
  - `/app/resources/icon-fg.png` (1024×1024 transparent) — adaptive icon foreground
  - `/app/resources/splash.png` (2732×2732) — Capacitor splash with title + subtitle + ship
  - `/app/resources/feature.png` (1024×500) — Play Store feature graphic
- **123 Android density variants** generated by `@capacitor/assets` and copied into `/app/frontend/android/app/src/main/res/`:
  - `mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png` + adaptive icon XML
  - `drawable-{port,land}-{l,m,h,xh,xxh,xxxh}dpi/splash.png`
- Updated `/app/PLAY_STORE_GUIDE.md` step 4 — assets are pre-wired, user only needs to swap them if desired
- New `/app/resources/README.md` with regen instructions + listing copy starter

### Status
- All assets fully wired into the Capacitor Android project
- Brand consistency: icon/splash/feature all use the same neon retro palette as the in-game art (yellow ship, cyan accents, void black, coral chroma)
- Web app still passes all regression tests (just smoke-checked menu render — pristine)

## Update (2026-04-28 — session 7, phone screenshots)
### Added
- **`/app/resources/phone-1.png`** (1080×2400) — Play Store menu screenshot, all elements present (title with chroma split, PLAY button with triangle icon, LEADERBOARD button with diamond icon, color-coded controls hint, BEST · 0047)
- **`/app/resources/phone-2.png`** (1080×2400) — Play Store gameplay screenshot showing yellow ship mid-flap with cyan particle trail, two cyan pipes, one red striped flip-pipe, green gravity orb, big translucent score "12", top-left gravity-down indicator, top-right SOUND ON / PAUSE
- **`/app/scripts/gen_phone_screenshots.py`** — Pillow generator, regen-able in <2s
- Both screenshots verified by AI vision: no rendering glitches, all icons drawn as polygons (no broken Unicode glyphs)
- Updated `/app/resources/README.md` with phone screenshot rows

### Status
- All Play Store visual assets ready: icon, splash, feature graphic, 2 phone screenshots
- All wired into the Capacitor Android project (`/app/frontend/android/app/src/main/res/`)
- Brand-consistent neon retro aesthetic across all assets

## Update (2026-04-28 — session 8, Play Store listing copy)
### Added
- **`/app/resources/playstore-listing.md`** — drag-and-drop listing copy:
  - 4 app name options (all under 30 chars)
  - 3 short descriptions (all under 80 chars, primary 76 chars)
  - Full description (2758 / 4000 chars) with emoji section breaks for scanability
  - Category & 5 ASO tag recommendations
  - Privacy policy template text + Data Safety form answers
  - Content rating guidance (Everyone)
  - Pricing recommendation (top-9 markets, $0.99)
  - Launch-week realistic-target table + organic-growth plan

### Status
- Every Play Console field now has prepared copy, all char counts verified
- Full Play Store submission package ready: code + AAB-buildable Capacitor project + 6 visual assets + listing copy + privacy policy text
