# Music Setup — Drop in a Royalty-Free Track

GravDash now supports a bundled MP3 background track. If `loop.mp3` is present
in this folder, the game plays it instead of the built-in procedural chiptune.
**No code changes needed — just drop the file here and rebuild.**

---

## Step-by-step

### 1. Find a free synthwave / neon-arcade track

These sources are **100% free for commercial use** (Google Play included),
**no attribution required**, and have clear, downloadable MP3 files:

| Source | URL | Notes |
|---|---|---|
| **Pixabay Music** | https://pixabay.com/music/search/synthwave/ | Best option. Pixabay Content License — free for commercial use, no attribution required. |
| **Pixabay (retro)** | https://pixabay.com/music/search/retro%20arcade/ | Same license, different vibe. |
| **OpenGameArt** | https://opengameart.org/art-search-advanced?keys=synthwave&field_art_type_tid%5B%5D=12 | Look for CC0 or CC-BY licenses (CC0 = no attribution; CC-BY = credit needed in your About screen). |
| **FreePD** | https://freepd.com/electronic.php | All Creative Commons 0 (public domain). |

### 2. What to look for

- **Length**: 60-120 seconds (it loops automatically — short is fine)
- **Vibe**: synthwave, retro-arcade, chiptune, "neon," 80s-electronic — anything that pairs with the cyan/magenta visuals
- **Energy**: medium to high tempo (140-180 BPM is the sweet spot for one-tap arcade)
- **No vocals** (vocals get repetitive on loop fast)
- **Loud peaks below -3 dB** (anything louder will clip on phone speakers — most free tracks are already mastered fine)

### 3. Download and place

1. Download the MP3 from your chosen source.
2. **Rename it to `loop.mp3`** (lowercase).
3. Place it in this folder: `/app/frontend/public/music/loop.mp3`
4. That's it.

### 4. Rebuild and verify

```bash
cd /app/frontend && yarn build
```

Then play the game in the preview. The MP3 plays automatically; tap **SOUND ON**
to mute (same toggle as before). If the MP3 is missing or fails to load, the
game falls back to the built-in procedural chiptune — no errors, no crashes.

---

## How it works (technical)

`/app/frontend/src/lib/audio.js` does a one-time `HEAD` request to
`/music/loop.mp3` when the game starts. If the file exists, it pipes an
`HTMLAudioElement` through the existing Web Audio master gain (so the mute
toggle still works). If the fetch fails (no file there), it falls back to
the procedural oscillator loop.

This means **you can ship without the file** and it'll still work — the
procedural music is the safety net.

---

## Attribution requirements

- **Pixabay Content License**: no attribution required.
- **CC0 (Public Domain)**: no attribution required.
- **CC-BY**: you must credit the artist somewhere — easiest place is to add
  a small "MUSIC BY [name]" line to a future About / Credits screen.
- **Never use CC-BY-NC** or any "non-commercial" license — your game is paid,
  which means it counts as commercial.
