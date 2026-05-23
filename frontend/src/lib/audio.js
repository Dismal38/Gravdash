// Lightweight Web Audio sound engine for GRAVDASH.
// Generates all sounds procedurally, no asset downloads needed.

let ctx = null;
let masterGain = null;
let muted = false;
let musicNodes = null;

function ensureCtx() {
    if (ctx) return ctx;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.5;
        masterGain.connect(ctx.destination);
    } catch (e) {
        console.warn("[GRAVDASH audio] context init failed:", e);
        return null;
    }
    return ctx;
}

export function unlockAudio() {
    const c = ensureCtx();
    if (c && c.state === "suspended") {
        c.resume().catch(() => {});
    }
}

export function setMuted(value) {
    muted = !!value;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
    return muted;
}

function blip({ freq = 440, type = "square", duration = 0.12, gain = 0.25, slide = 0 }) {
    const c = ensureCtx();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) {
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(40, freq + slide),
            c.currentTime + duration,
        );
    }
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
}

export function sfxFlap() {
    blip({ freq: 520, type: "square", duration: 0.09, gain: 0.18, slide: 240 });
}

export function sfxScore() {
    blip({ freq: 880, type: "triangle", duration: 0.08, gain: 0.18 });
    setTimeout(() => blip({ freq: 1320, type: "triangle", duration: 0.09, gain: 0.18 }), 70);
}

export function sfxFlip() {
    const c = ensureCtx();
    if (!c || muted) return;
    blip({ freq: 220, type: "sawtooth", duration: 0.18, gain: 0.22, slide: 600 });
    setTimeout(
        () => blip({ freq: 740, type: "square", duration: 0.16, gain: 0.18, slide: -300 }),
        90,
    );
}

export function sfxOrb() {
    blip({ freq: 660, type: "sine", duration: 0.1, gain: 0.22, slide: 400 });
}

export function sfxCrash() {
    const c = ensureCtx();
    if (!c || muted) return;
    blip({ freq: 180, type: "sawtooth", duration: 0.22, gain: 0.3, slide: -120 });
    setTimeout(
        () => blip({ freq: 90, type: "square", duration: 0.35, gain: 0.28, slide: -50 }),
        120,
    );
}

export function sfxGameOver() {
    const c = ensureCtx();
    if (!c || muted) return;
    const notes = [523.25, 415.3, 311.13, 233.08];
    notes.forEach((f, i) => {
        setTimeout(() => blip({ freq: f, type: "triangle", duration: 0.22, gain: 0.22 }), i * 140);
    });
}

// Chiptune-ish loop: simple bass + arpeggio
export function startMusic() {
    const c = ensureCtx();
    if (!c) return;
    if (musicNodes) return;

    const musicGain = c.createGain();
    musicGain.gain.value = 0.08;
    musicGain.connect(masterGain);

    const bass = c.createOscillator();
    bass.type = "triangle";
    const bassGain = c.createGain();
    bassGain.gain.value = 0.6;
    bass.connect(bassGain);
    bassGain.connect(musicGain);

    const lead = c.createOscillator();
    lead.type = "square";
    const leadGain = c.createGain();
    leadGain.gain.value = 0.25;
    lead.connect(leadGain);
    leadGain.connect(musicGain);

    bass.start();
    lead.start();

    // Schedule a simple progression
    const bassNotes = [82.41, 82.41, 110.0, 73.42]; // E2 E2 A2 D2
    const leadPattern = [
        329.63, 392.0, 493.88, 587.33, 493.88, 392.0, // E A B D B A
        329.63, 392.0, 493.88, 587.33, 659.25, 587.33,
    ];
    let step = 0;
    const interval = setInterval(() => {
        if (!musicNodes) return;
        const t = c.currentTime;
        const bn = bassNotes[Math.floor(step / 8) % bassNotes.length];
        bass.frequency.setValueAtTime(bn, t);
        const ln = leadPattern[step % leadPattern.length];
        lead.frequency.setValueAtTime(ln, t);
        step++;
    }, 200);

    musicNodes = { bass, lead, musicGain, interval };
}

export function stopMusic() {
    if (!musicNodes) return;
    try {
        clearInterval(musicNodes.interval);
        musicNodes.bass.stop();
        musicNodes.lead.stop();
    } catch (e) {
        /* noop */
    }
    musicNodes = null;
}
