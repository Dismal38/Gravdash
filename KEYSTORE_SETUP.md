# GRAV-SHIFT — Keystore + GitHub Actions Setup

This is the **one and only** time you need to do anything "developery" outside
your browser. ~10 minutes total. After this, every Play Store update is a
single git push and a download.

> ⚠️ **About the keystore:** It's a single file that proves *you* are the
> publisher of the GRAV-SHIFT app on Play Store. If you lose it, you can
> never publish an update — Google will treat your next signed AAB as a
> different app. **Back it up in 2-3 places** (password manager + cloud
> drive + USB stick is a good combo).

---

## Step 1 — Install Java (lightweight, 1-time)

The `keytool` command needed to generate the keystore is bundled with
Java. **You do NOT need Android Studio or any IDE.** Any modern laptop
running Windows / Mac / Linux can install Java in ~5 minutes:

| OS | How |
|---|---|
| **Mac** | `brew install openjdk@21` (or download from <https://adoptium.net>) |
| **Windows** | Download installer from <https://adoptium.net> → "Temurin 21 (LTS)" → run installer |
| **Linux** | `sudo apt install openjdk-21-jdk` (Debian/Ubuntu) or equivalent |

Verify with:

```bash
keytool -help    # should print a long help message — that's success
```

---

## Step 2 — Generate your keystore (1 command, ~30 seconds)

In any terminal:

```bash
keytool -genkey -v \
  -keystore gravshift-release.keystore \
  -alias gravshift \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storetype PKCS12
```

It will prompt for:

1. **A keystore password** — invent a strong one. **Save it.** *(suggestion:
   open your password manager, create a new entry "GRAV-SHIFT Keystore",
   stick the password there)*
2. **A key password** — for simplicity, use the *same* password as #1
   (you can hit Enter when it asks if you want to reuse the store password)
3. **Identity questions** — answer honestly, or with reasonable filler:
   - First and last name: *(your name or your studio name)*
   - Organizational unit: *(blank or "Indie")*
   - Organization: *(your name/studio)*
   - City / State / Country: *(your city / state / 2-letter country code)*

You'll get a file: **`gravshift-release.keystore`** in your current directory.

### Back it up RIGHT NOW

Before doing anything else:

1. Copy the `.keystore` file to your password manager as a file attachment
2. Copy it to your cloud drive (iCloud / Google Drive / Dropbox / OneDrive)
3. Optionally copy to a USB stick

If you lose this file, you can never update your app on Play Store. Period.

---

## Step 3 — Convert the keystore to base64 (for GitHub Secrets)

GitHub Secrets can only store text, so we encode the binary keystore as text:

| OS | Command |
|---|---|
| **Mac / Linux** | `base64 -i gravshift-release.keystore -o keystore.base64` |
| **Windows (PowerShell)** | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("gravshift-release.keystore")) > keystore.base64` |

Open `keystore.base64` in any text editor (Notepad / TextEdit / VS Code).
You'll see one big block of letters and numbers. **Copy all of it** —
you'll paste it into a GitHub Secret in Step 5.

---

## Step 4 — Push the code to GitHub

Use the **"Save to GitHub"** button in your Emergent chat input. It will
create a private repo with your code in one click.

If you'd rather do it manually:

```bash
cd /app
git init -b main
git add .
git commit -m "GRAV-SHIFT initial commit"
# Create an empty repo at https://github.com/new (call it 'gravshift')
git remote add origin https://github.com/YOUR_USERNAME/gravshift.git
git push -u origin main
```

The workflow file at `.github/workflows/build-android.yml` is already
committed and will start triggering as soon as code lives on GitHub.

---

## Step 5 — Add the 4 GitHub Secrets

In your repo on GitHub:

1. Click **Settings** (top of the repo)
2. Sidebar → **Secrets and variables → Actions**
3. Click **New repository secret** four times, adding each of these:

| Secret name | Value |
|---|---|
| `RELEASE_KEYSTORE_BASE64` | The huge base64 blob you copied in Step 3 |
| `KEYSTORE_PASSWORD` | The keystore password from Step 2 |
| `KEY_ALIAS` | `gravshift` (the alias from the keytool command) |
| `KEY_PASSWORD` | Same as `KEYSTORE_PASSWORD` (since you reused it in Step 2) |

GitHub never displays these values back to you after saving — that's by
design. You'll only ever need to enter them again if you rotate them.

---

## Step 6 — Trigger your first build

1. In your repo, click the **Actions** tab
2. Click the workflow **"Build Android AAB"** in the sidebar
3. Click **Run workflow** → green button **Run workflow**
4. Wait ~5-8 minutes (you'll see live logs)
5. When it finishes with a green ✅, scroll down to **"Artifacts"** and
   download `gravshift-release-1.aab`

You now have a Play-Store-uploadable signed AAB on your laptop.

---

## Step 7 — From here it's just Play Console clicks

1. Go to <https://play.google.com/console> (pay the one-time $25 fee if
   you haven't already)
2. **Create app** → fill in basics → choose **Paid** → set price **$0.99**
3. Upload your **AAB** to the **Internal testing** track first
4. Paste in the listing copy from `/app/resources/playstore-listing.md`
5. Upload the 6 visual assets from `/app/resources/`
6. Fill the Content Rating questionnaire (rates Everyone)
7. Fill the Data Safety form (everything is "No data collected" — we made
   the game fully offline)
8. Submit for review
9. After internal testing on a real device, promote to **Production**

---

## Future updates

Every code change you push to `main` automatically rebuilds a fresh AAB
in 5-8 minutes, available for download from the GitHub Actions tab.

Don't forget to bump the version before each Play Store release:

```bash
# In android/app/build.gradle
versionCode 2       # increment by 1 every release
versionName "1.0.1" # human-readable version
```

Then upload the new AAB to Play Console → **Production → Create new release**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Workflow fails with "Keystore was tampered with" | `KEYSTORE_PASSWORD` doesn't match what you used in keytool. Re-check the secret. |
| Workflow fails with "Failed to read key" | `KEY_ALIAS` doesn't match. Should be `gravshift` (or whatever you used after `-alias` in Step 2). |
| Workflow runs forever on Gradle step | First build is slow (~6-8 min). Subsequent builds cache and run in 2-3 min. Be patient. |
| `keytool` command not found | Java isn't installed or not on PATH. On Windows, restart your terminal after installing. |
| Lost the keystore | You can NOT recover this. Generate a new one, but you'll have to publish as a NEW app on Play Store. |
| Want to switch to a different keystore | Generate a new one, re-encode to base64, replace the GitHub Secret. The next build will use the new one. |

---

## What if you don't want to install Java?

If even installing Java feels like too much: pay a Fiverr freelancer
$25-$50 to do Steps 1-3 for you. Send them the resulting `.keystore` file
and password by encrypted email (Proton Mail, or password-manager
attachment). You stay in control of the keystore — they just generate it.

After that, Steps 4-7 are all browser clicks anyone can do.
