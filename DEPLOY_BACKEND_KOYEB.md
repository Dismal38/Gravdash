# Free-Tier Backend Deploy: Koyeb + MongoDB Atlas

This guide gets your GRAV-SHIFT backend live on a public HTTPS URL at **$0/month forever** so your published Android app can talk to it. Total time: **~20 min**.

---

## Files already prepared for you

| File | Purpose |
|---|---|
| `backend/Procfile` | Tells Koyeb how to start the FastAPI app (`uvicorn ...`) |
| `backend/Dockerfile` | Optional explicit Docker build (Koyeb will use this if present, otherwise falls back to Procfile + buildpacks) |
| `backend/runtime.txt` | Pins Python 3.11 |
| `backend/requirements.txt` | Already complete |
| `backend/.env` | Local dev only — **do not commit** |
| `frontend/.env.production` | Template; you'll paste your Koyeb URL here later |

---

## Part 1 — MongoDB Atlas (free database) — 5 min

1. Sign up: <https://www.mongodb.com/cloud/atlas/register> (no credit card required)
2. Build a Cluster → **M0 Free Tier** → AWS → pick your nearest region → Create
3. **Database Access** → Add User
   - Username: `gravshift`
   - Password: click *Autogenerate Secure Password* → **save it somewhere safe**
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. **Connect** → **Drivers** → Python → copy the connection string. It looks like:
   ```
   mongodb+srv://gravshift:<password>@gravshift.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the password you saved.
   **Save this. It is your `MONGO_URL`.**

---

## Part 2 — Push backend to GitHub — 3 min

Easiest: use the **"Save to GitHub"** button in your Emergent chat input.

Manual route:
```bash
cd /app
git init -b main
git add backend/Procfile backend/Dockerfile backend/runtime.txt \
        backend/requirements.txt backend/server.py backend/tests/
git commit -m "GRAV-SHIFT backend ready for Koyeb"
# Create a new empty repo at https://github.com/new (call it 'gravshift-backend')
git remote add origin https://github.com/YOUR_USERNAME/gravshift-backend.git
git push -u origin main
```

⚠️ **Do NOT commit `backend/.env`** — it contains your dev `ADMIN_TOKEN`. Verify with:
```bash
git status                       # should NOT list backend/.env
git ls-files | grep '\.env$'     # should be empty
```
If `.env` shows up, add it to `.gitignore` first:
```bash
echo "backend/.env" >> .gitignore && git add .gitignore && git commit -m "ignore env"
```

---

## Part 3 — Generate a fresh production `ADMIN_TOKEN` — 10 sec

**Don't reuse your dev token.** Generate a new one:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy the output. You'll paste it into Koyeb's env var settings in Part 4.

---

## Part 4 — Deploy on Koyeb — 7 min

1. Sign up: <https://app.koyeb.com/signup> (sign in with GitHub — no credit card needed for Free tier)
2. **Create App** → **GitHub** → pick your `gravshift-backend` repo → **main** branch
3. Build settings:
   - **Builder:** *Buildpack* (default — Koyeb will detect Python and use your `Procfile`)
     - *(or: pick Dockerfile if you prefer reproducible builds — both work)*
   - **Work directory:** `/backend` (so Koyeb finds the Procfile and requirements.txt)
4. **Instance:** select **Free** (Nano, 0.1 vCPU, 512 MB RAM) → 1 region near your audience
5. **Environment variables** — click *Add variable* and paste these four (one at a time):

   | Key | Value |
   |---|---|
   | `MONGO_URL` | The full Atlas connection string from Part 1, step 5 |
   | `DB_NAME` | `gravshift` |
   | `ADMIN_TOKEN` | The fresh token from Part 3 (NOT your dev token) |
   | `CORS_ORIGINS` | `*` (you can tighten to your specific domain later) |

6. **Health check (optional but recommended):**
   - Path: `/api/`
   - Port: same as `$PORT`
7. Click **Deploy**. Wait ~3-5 min for the build + first cold start.
8. Koyeb gives you a public URL like:
   ```
   https://gravshift-backend-yourname.koyeb.app
   ```
9. **Smoke-test it:**
   ```bash
   curl https://gravshift-backend-yourname.koyeb.app/api/
   # → {"message":"GRAV-SHIFT API online"}
   ```
   Auth check:
   ```bash
   curl -o /dev/null -w "%{http_code}\n" \
     https://gravshift-backend-yourname.koyeb.app/api/admin/scores
   # → 401 (good — admin endpoint is protected)
   ```

---

## Part 5 — Wire the new URL into the Android build — 2 min

1. Open `/app/frontend/.env.production` and replace the placeholder URL:
   ```
   REACT_APP_BACKEND_URL=https://gravshift-backend-yourname.koyeb.app
   ```
2. Rebuild the React app and resync Capacitor:
   ```bash
   cd /app/frontend
   yarn build
   npx cap sync android
   ```
3. The next signed AAB you generate in Android Studio will hit your live free backend.

---

## Part 6 — Lock down `CORS_ORIGINS` (optional, after launch) — 1 min

Once the Capacitor app is live, tighten CORS to only allow:
- `https://localhost` (default Capacitor scheme)
- `capacitor://localhost`
- `https://your-deployed-website.com` (if you have a web version too)

In Koyeb's env-var panel, change `CORS_ORIGINS` to:
```
https://localhost,capacitor://localhost
```
Then redeploy (Koyeb auto-restarts on env var changes).

---

## Maintenance recipes

### Push an update
```bash
cd /app && git add . && git commit -m "fix: ..." && git push
# Koyeb auto-detects the push and redeploys in ~2 min
```

### Rotate `ADMIN_TOKEN`
1. Generate new: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
2. Koyeb dashboard → your app → Settings → Environment variables → edit `ADMIN_TOKEN`
3. Save → app auto-restarts → old token immediately invalid

### Purge spammy leaderboard entries (after launch)
```bash
TOKEN="your_production_admin_token"
URL="https://gravshift-backend-yourname.koyeb.app"

# List suspicious entries (very high scores)
curl -H "Authorization: Bearer $TOKEN" "$URL/api/admin/scores?min_score=1000000"

# Bulk-purge by name (dry-run first)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$URL/api/admin/scores/purge?name_pattern=CHEAT"

# Then confirm:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$URL/api/admin/scores/purge?name_pattern=CHEAT&confirm=true"
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails with "ModuleNotFoundError: emergentintegrations" | Koyeb cannot reach Emergent's private package index. Remove `emergentintegrations==0.1.0` from `backend/requirements.txt` (it's not used by the leaderboard backend) and redeploy. |
| Build fails "no requirements.txt" | Wrong work directory — set it to `/backend` in Koyeb build settings |
| App crashes on start with "MONGO_URL" KeyError | Env var not set. Add it in Koyeb dashboard → Settings → Environment variables |
| Atlas connection times out | You skipped the *Allow Access from Anywhere* step in Atlas → Network Access |
| API responds but `/api/admin/scores` is always 503 | `ADMIN_TOKEN` env var is missing or empty — set it in Koyeb |
| Cold start takes 30s+ | You picked Render free tier instead of Koyeb. Koyeb's free Nano stays always-on. |

---

## Cost summary

| Item | $/month |
|---|---|
| Koyeb (1 free Nano instance) | **$0** |
| MongoDB Atlas (M0 free cluster) | **$0** |
| **Total backend hosting** | **$0** |

Add only:
- **$25 one-time** Google Play Console fee
- **$0** keystore (you generate it locally in Android Studio)

Your Emergent subscription is unaffected — your existing website stays on Emergent at your current $10/mo tier.
