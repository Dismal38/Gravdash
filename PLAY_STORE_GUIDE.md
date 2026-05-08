# GRAV-SHIFT — Play Store Build Guide

This document walks you through turning the GRAV-SHIFT web build into a signed
Android **AAB** ready to upload to the Google Play Console at the **$0.99**
price point.

The Capacitor project is already initialized for you:

```
/app/frontend/
├── capacitor.config.json       ← App ID, name, web dir
├── android/                    ← Android Studio project (scaffolded)
└── build/                      ← React production bundle
```

App identity (already configured):
- **App ID**: `com.emergent.gravshift`  ← change to your studio's reverse-domain before publishing
- **App Name**: `GRAV-SHIFT`
- **Background color**: `#050508` (matches the in-game void)

---

## 1. One-time setup on your local machine

You will do the actual signed build on your Mac/PC because the cloud sandbox
does not have the Android SDK installed.

### Install:
1. **Node.js 20+** and **Yarn** (already match this repo)
2. **Android Studio** (latest) — installs the Android SDK + platform-tools
3. **Java 17** (Android Studio bundles a JDK; otherwise install OpenJDK 17)

### Clone / copy the project to your machine

Pull this repo, or copy the `/app/frontend` directory locally.

### Install JS deps

```bash
cd frontend
yarn install
```

---

## 2. Change the App ID to your own (recommended)

In `frontend/capacitor.config.json` change `appId` from `com.emergent.gravshift`
to your reverse-domain (e.g. `com.yourstudio.gravshift`). Then re-sync:

```bash
yarn build
npx cap sync android
```

Update the package in `android/app/build.gradle` `applicationId` and
`android/app/src/main/AndroidManifest.xml` `package=` to match — Android Studio
can refactor this for you (Refactor → Rename Package).

---

## 3. Point the production build at your live API

**🎮 OFFLINE BUILD — SKIP THIS SECTION!**

GRAV-SHIFT now ships as a 100% offline game. There is **no backend to deploy**.
The React build is bundled directly into the Android APK by Capacitor and
requires zero internet connection to play. Your high score and player name
are saved locally on the device.

If you ever want to re-enable an online leaderboard later, the backend code
is preserved in `/app/backend/` and the original deployment guidance is in
the git history.

For now — just run:

```bash
cd frontend
yarn build
npx cap sync android
```

…and proceed to step 4.

---

## 4. App icon + splash screen

**✅ Already done for you.** The brand assets (icon, splash, feature graphic)
are pre-generated in `/app/resources/` and the Android density variants are
already wired into `frontend/android/app/src/main/res/` — see
`/app/resources/README.md` for details.

If you want to **regenerate** with tweaks:

```bash
python /app/scripts/gen_assets.py    # rebuild source PNGs
cd frontend
npx capacitor-assets generate --android --assetPath assets
```

If you want to **replace with your own designs**, drop your 1024² icon,
1024² icon-foreground, and 2732² splash into `frontend/assets/` then run the
capacitor-assets command above.

---

## 5. Open in Android Studio + build a release AAB

```bash
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync.
2. **Build → Generate Signed Bundle / APK → Android App Bundle**.
3. Create a new keystore (save the JKS + passwords somewhere safe — you'll
   need them for every future update).
4. Choose **release** build variant.
5. The signed `.aab` will be at:
   `android/app/release/app-release.aab`

---

## 6. Publish to Google Play

1. Go to the **Google Play Console** (one-time $25 developer fee).
2. Create a new app → choose **Paid**, set price to **$0.99 USD**.
3. Upload `app-release.aab` to the **Production** track.
4. Fill out:
   - Short description (e.g. *"One tap. Three gravity flips. One run."*)
   - Full description (mention the three flip mechanics + global leaderboard)
   - Screenshots (use the in-game screenshots + the **share card** the game
     itself can generate from any high score!)
   - Feature graphic (1024×500) — neon GRAV-SHIFT logo on void black
   - Content rating questionnaire
   - Data safety form (only data collected: player name + score, sent to your
     own backend)
5. Submit for review. First review usually completes within 1–7 days.

---

## 7. Test track first (recommended)

Before going **Production**, push to **Internal testing**:
1. Add yourself as a tester via email.
2. Install via Play Store on a real device.
3. Check: gravity flips feel responsive, audio plays, leaderboard submits
   work, share card downloads/shares correctly, haptics fire on flip & crash.

---

## 8. Updating later

```bash
# bump versionCode + versionName in android/app/build.gradle
yarn build
npx cap sync android
# Open Android Studio → Generate Signed Bundle (use the SAME keystore!)
# Upload new AAB to Play Console
```

---

## What's already wired for native

- **Haptics** (`@capacitor/haptics`) — fires medium impulse on every gravity
  flip and heavy impulse on crash. Silent on web.
- **Share** (`@capacitor/share`) — the SHARE button on the game-over screen
  uses the native share sheet on Android, falls back to Web Share API in the
  browser, and finally falls back to a PNG download.
- **StatusBar / SplashScreen** — configured for dark theme with `#050508`
  background to match the game void seamlessly.

---

## Admin moderation API

**🎮 OFFLINE BUILD — NOT NEEDED**

The shipped game is fully offline. The admin endpoints below are part of
the optional backend (preserved in `/app/backend/` for future use) but are
not deployed and are not callable from the released Android app.

If you re-enable an online leaderboard in a future update, see the admin
moderation section in the git history of this file.

You're ready to ship. 🚀
