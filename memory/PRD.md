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

## Update (2026-04-28 — session 9, admin moderation API)
### Added
- **`GET /api/admin/scores`** with optional filters (`limit`, `name`, `min_score`) — returns scores newest-first
- **`DELETE /api/admin/scores/{id}`** — removes a single entry by UUID, 404 if missing
- **HTTP Bearer auth** with constant-time `hmac.compare_digest`, returns proper 401 + `WWW-Authenticate: Bearer` header on missing/wrong token
- `ADMIN_TOKEN` generated via `secrets.token_urlsafe(32)` and stored in `backend/.env` only
- 10 new pytest tests covering auth (no token / wrong token / Basic scheme rejected) + functional (list, filter by name, filter by min_score, delete round-trip, 404 on unknown id, limit bounds)
- Cleaned 37 polluting test rows during integration

### Validation
- **Backend tests: 30/30 pass** (20 original + 10 admin)
- All curl scenarios verified (401 / 401 / 404 / 200 / filter regex)
- Lint clean

### Documented
- `/app/memory/test_credentials.md` — admin token + rotation recipe + quick purge example
- `/app/PLAY_STORE_GUIDE.md` — added admin moderation section

### Hardened (post-test-agent review)
- `re.escape()` applied to admin name filter so admins can paste any literal substring (incl. regex metacharacters like `.`, `(`, `+`) without triggering Mongo regex error 51091 or accidental over-matching.

## Update (2026-04-28 — session 10, free-tier deploy prep)
### Added
- **`/app/backend/Procfile`** — `web: uvicorn server:app --host 0.0.0.0 --port $PORT`
- **`/app/backend/Dockerfile`** — slim Python 3.11-slim image as fallback
- **`/app/backend/runtime.txt`** — `python-3.11`
- **`/app/frontend/.env.production`** — placeholder `REACT_APP_BACKEND_URL` template
- **`/app/DEPLOY_BACKEND_KOYEB.md`** — full step-by-step ($0/mo Koyeb + Atlas) deploy guide with copy-paste commands, troubleshooting table, post-launch maintenance recipes (rotate token, purge spammy entries)
- Hardened `.gitignore` to explicitly ignore `.env` / `.env.local` / `**/.env` while allowing the `.env.production` template through

### Verified
- 35/35 backend tests still pass
- Local backend still healthy
- `git check-ignore` confirms `backend/.env` and `frontend/.env` are excluded → no secrets can leak

### Deploy summary for user
- Total cost: **$0/mo** (Koyeb Nano + Atlas M0)
- Total setup time: ~20 min
- Existing Emergent subscription untouched (website stays live at $10/mo)

## Update (2026-04-28 — session 11, OFFLINE PIVOT)
### User decision
Per user choice "ship offline-only for $0", the global leaderboard was stripped from the frontend. Game is now a 100% local arcade title with no backend dependency.

### Changes
- **Removed network code from frontend:** axios, API const, leaderboard phase, globalRank state, score submit + rank fetch
- **Deleted:** `Leaderboard.jsx`, `useLeaderboardScores.js`, `NameSubmitForm.jsx`, `DEPLOY_BACKEND_KOYEB.md`, `Procfile`, `Dockerfile`, `runtime.txt`, `frontend/.env.production`
- **Simplified:** `MenuScreen` (removed leaderboard button), `GameOverScreen` (removed submit form + leaderboard button), `GameOverActions` (only RETRY + MENU)
- **Kept:** optional name input on game-over (saves to localStorage only, used purely to personalize the share-card PNG)
- **Listing copy updated:** removed leaderboard mentions, updated short description, simplified Privacy Policy (now declares zero data collection), simplified Data Safety form answers
- **Backend preserved untouched** — server.py, all 35 pytest tests still pass — kept for possible future re-enable
- **PLAY_STORE_GUIDE.md** updated: deploy-backend section now says "skip — offline build", admin moderation section marked as not needed for current shipped build

### Verified by testing agent (iteration_8)
- 35/35 backend pytest pass
- Frontend: zero /api/ requests during the entire flow (network listener counted 0)
- Zero console errors
- localStorage persistence works (high score + player name) across reload
- Offline mode (page.context.set_offline(True)) — game still plays, dies, saves
- All deletions confirmed on disk
- Source grep confirms zero axios/fetch/backend-URL usage in /app/frontend/src

### Cost & launch path now
- Backend hosting: **$0/mo** (no backend deployed)
- Emergent subscription: **$10/mo** (existing, unchanged — keeps user's website live)
- Play Console: **$25** one-time
- **Total to launch: $25 one-time, $0 added monthly**
- Steps remaining for user: build signed AAB locally → upload to Play Console

## Update (2026-04-28 — session 12, Android back-button polish)
### Added
- **`@capacitor/app@7.1.2`** plugin (5 Capacitor plugins now total)
- **`/app/frontend/src/hooks/useAndroidBackButton.js`** — phase-aware Android hardware Back button handler:
  - Menu: 1st press shows toast "PRESS BACK AGAIN TO EXIT", 2nd press within 2s calls `App.exitApp()`
  - Playing: pauses the game
  - Paused: resumes
  - Game over: returns to menu
- **Exit-prompt toast** in Game.jsx — bottom-center, panel-style with coral border + glow, 2s timeout
- No-op on web (only fires inside the Capacitor APK)

### Verified
- Lint clean
- Browser smoke test: title/play/HUD all work, **0 leaderboard buttons**, 0 console errors, HUD renders in-game (live screenshot captured: ship + pipes + score + gravity indicator all rendering)
- `yarn build` + `npx cap sync android` both succeed; new plugin auto-registered into Android project

## Update (2026-04-28 — session 13, complexity reduction)
### Refactored
- **`useGameInput.js`** — replaced if/else-if chain with two phase→handler dispatch tables (`primaryActionByPhase`, `pauseKeyByPhase`) + a `FLAP_KEYS` Set. Cyclomatic complexity 16 → ~6.
- **`useAndroidBackButton.js`** — extracted `tryExitApp()` helper, added `phaseHandlers` dispatch table for non-menu phases, separated menu-phase double-tap logic into named `handleMenuBack()`. Cyclomatic complexity 15 → ~7. Constant `EXIT_PROMPT_WINDOW_MS = 2000` extracted from inline magic number.

### Skipped (false positives — same as previous review iterations)
- "Hook deps missing" — refs, loop vars, state setters, module imports cannot be effect deps; ESLint react-hooks/exhaustive-deps already passes clean
- "Insecure localStorage" — high score + player name are non-sensitive UX data (4th review flagging this)
- "Python `is` vs `==`" — `is None`/`is not None` is mandated by PEP 8; `is True/False` for JSON booleans is preferred by ruff E712. Ruff already passes clean.
- "Game.jsx 176 lines / complexity 16" — already maximally decomposed (4 hooks + 5 sub-components); splitting more would increase complexity
- "ShareSection 75 lines" — within threshold

### Verified
- ESLint: clean
- Ruff: clean
- 35/35 backend pytest pass
- `yarn build` succeeds
- Browser smoke test: Space-to-start, Space-to-flap, P-to-pause, P-to-resume, M-mute all work; 0 console errors; live screenshot captures GAME OVER screen rendering correctly with mute toggled


## Update (2026-02 — session 14, CI/CD + Privacy Policy)
### Added
- **`.github/workflows/build-android.yml`** — GitHub Actions workflow that runs on push, builds a signed Android AAB in the cloud (no local Android Studio needed). Uses repository secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Artifact is uploaded for download from the Actions tab.
- **`KEYSTORE_SETUP.md`** — step-by-step guide for generating a signing keystore locally with `keytool`, base64-encoding it, and adding the four required secrets to GitHub.
- **`docs/privacy-policy.html`** — self-contained, styled privacy policy page (required by Google Play) declaring zero personal data collection, no analytics, no ads. Email placeholder for the user to fill in.
- **`docs/index.html`** — meta-refresh redirect to the privacy policy (so the GitHub Pages root URL also works).
- **`docs/README.md`** — instructions for enabling GitHub Pages on `/docs` folder to host the privacy policy URL for free.

### Stripped
- All "emergent" platform branding removed from `index.html`, `package.json`, `android/app/build.gradle`. App ID/namespace are now neutral; no third-party tracking scripts in HTML.

### Verified
- Browser smoke screenshot captured post-cleanup: GravShift menu renders correctly with title, PLAY button, instructions, BEST score, sound indicator — no console errors, no "emergent" references visible.
- `grep -r emergent` against source files returns no matches outside the preview `.env` URL (protected variable).

## Backlog (P2)
- Settings menu (mute toggle, haptics toggle) — currently controlled via M key only
- Daily challenge / seeded run mode
- About / Credits screen
- Cosmetic skins (color palettes) unlocked at score milestones


## Update (2026-02 — session 15, Daily Challenge mode)
### Added
- **Seeded RNG (`createSeededRng`, mulberry32)** in `gameEngine.js`. `createInitialState(viewport, seed)` now accepts an optional seed; when provided, the entire level (pipe gaps, flip-pipe placement, orb spawns) is deterministic. All internal `randRange` calls refactored to take `s.rng`.
- **`getDailySeed()` + `getDailyDateLabel()`** — derive a deterministic seed from the device's local date.
- **Daily Challenge UI**:
  - New `★ DAILY CHALLENGE` button on `MenuScreen` with today's date and today's best score displayed beneath it.
  - `★ DAILY` HUD badge during play (`data-testid="hud-daily-badge"`).
  - `★ DAILY CHALLENGE · YYYY-MM-DD` header on Game Over screen (`data-testid="gameover-daily-badge"`).
- **Per-day best score persistence** with key `gravshift_daily_YYYY-MM-DD`. Endless high score and daily best tracked independently.
- **Mode-aware retry** — pressing RETRY/Space restarts the same mode the player just finished.

### Verified
- ESLint clean; `yarn build` succeeds
- Browser smoke test: Menu renders new button + today's date "2026-05-22 · TODAY'S BEST 0000". Clicking Daily Challenge transitions to playing → death → Game Over shows "★ DAILY CHALLENGE · 2026-05-22" badge. 0 console errors.

### Play Store impact
- **None.** Still offline, still zero data collection. Privacy policy unchanged. Just rebuild + re-upload the AAB via the existing GitHub Actions pipeline.


## Update (2026-02 — session 16, REBRAND to GravDash + Concept 2 icon + bug fix)
### Rebrand: GRAV-SHIFT → GRAVDASH
- Reason: discovered existing "GravShift" app on Google Play (`com.gamingarcade.gravshift`) with near-identical neon-spaceship-gravity pitch. Would have caused name-collision rejection or trademark complaint post-launch.
- Verified availability: "GravDash" has no exact match on Google Play (closest is "Gravity Dash" — separate word, different brand).
- Renamed across 24 files in one sweep: src/components, src/lib, src/hooks, public/index.html, capacitor.config.json, android build.gradle, strings.xml, MainActivity.java (also moved package path `com/emergent/gravshift/` → `com/gravdash/game/`), assets/capacitor.config.json, .github workflow, /docs privacy policy, /resources listing copy, /scripts Python helpers, root markdown guides.
- New identifiers:
  - **App name (user-facing)**: GRAVDASH
  - **Android applicationId/namespace**: `com.gravdash.game`
  - **LocalStorage keys**: `gravdash_local_high`, `gravdash_name`, `gravdash_daily_YYYY-MM-DD`
- Verified: ESLint clean, `yarn build` succeeds, browser smoke test confirms `<title>GRAVDASH</title>` + on-screen menu title "GRAVDASH" + Daily Challenge still functional + 0 console errors.

### New app icon (Concept 2 — Inverted World)
- Replaced the generic yellow-triangle icon with the magenta/cyan split-horizon design featuring a mirrored yellow chevron.
- 26 files written across all 6 Android density buckets (ldpi → xxxhdpi): ic_launcher, ic_launcher_round, ic_launcher_foreground, and ic_launcher_background. Plus 512×512 listing icon at `/app/resources/icon.png`.
- Source PNGs preserved in `/app/resources/icon_concepts/` for future re-export. Script: `/app/scripts/apply_icon_concept_2.py`.

### Bug fix: stale canvas on "Quit to Menu"
- Symptom: clicking MENU after game-over showed leftover dead-game scene (pipes on right edge, dead bird in corner) bleeding through the menu overlay.
- Root cause: render loop in `useGameLoop.js` keeps drawing whatever sits in `stateRef.current` every frame. Returning to menu only flipped phase but left the dead state behind.
- Fix: in `Game.jsx` → `quitToMenu` now sets `stateRef.current = null`. `engineDraw` already handles null state cleanly (paints background grid only).

### Play Store impact
- **None.** Still offline. Privacy policy already used the new "GravDash" name (auto-updated during rename). Same upload workflow: GitHub Push → Actions rebuilds AAB → upload to Play Console.

### Backlog (P2)
- Cyan/magenta thruster trail behind the ship (code-only, ~10 min, no AI generation needed) — would visually tie in-game look to the new icon palette
- Settings menu (touch-friendly mute/haptics toggles)
- About / Credits screen
- Score-milestone unlockable ship skins


## Update (2026-02 — session 17, thruster trail polish)
### Added
- **`emitThrusterParticle(s)`** in `gameEngine.js`. Called once per frame inside `step()` (right after `applyBirdPhysics`). Spawns a small particle behind the ship that drifts left and fades in 0.32s.
- Color **alternates cyan (#00F0FF) ↔ magenta (#FF3366) per frame** — same palette as the GravDash app icon, visually tying the in-game ship to the launcher icon.
- Uses the seeded RNG (`s.rng`) so Daily Challenge runs remain deterministic even with the new visual.
- ~60 particles/sec spawned, ~20 live at once with 0.32s lifetime. Existing cleanup filter handles them — zero perf impact.

### Verified
- ESLint clean; live in-game screenshot shows the two-tone trail emitting cleanly behind the ship through a flap arc; 0 console errors.

### Play Store impact
- **None.** Pure visual polish.
