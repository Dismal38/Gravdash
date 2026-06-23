// Pure game engine: physics, spawning, and rendering for GRAVDASH.
// No React. No DOM lifecycle. Just functions over a state object.

import {
    sfxFlap,
    sfxScore,
    sfxFlip,
    sfxCrash,
    sfxGameOver,
    stopMusic,
} from "./audio";
import { hapticMedium, hapticHeavy } from "./native";

export const GAME = {
    birdRadius: 14,
    flapStrength: 360, // px/sec impulse magnitude (always against gravity)
    gravity: 1100, // px/sec^2
    maxFallSpeed: 720,
    pipeSpeed: 130, // px/sec starting speed (gentle for new players)
    pipeGap: 220, // generous starting gap
    pipeWidth: 70,
    pipeSpacing: 340, // generous spacing between consecutive pipes
    flipPipeChance: 0.20, // ~1 in 5 pipes flips gravity
    speedRamp: 2, // very gradual speed increase
    maxSpeed: 360, // capped so late-game remains beatable
    // Vertical gap delta is computed dynamically per-speed (see safeGapDelta below)
    // so every consecutive pipe is reachable at any speed, not just the starting one.
    gapReachFraction: 0.78,
};

// Maximum vertical distance the bird can travel UPWARD between two consecutive
// pipes given the current scroll speed. = flapStrength * (pipeSpacing / speed),
// scaled by gapReachFraction so the gap is always reachable with margin.
export function safeGapDelta(speed) {
    const timeBetweenPipes = GAME.pipeSpacing / speed;
    const maxReachUp = GAME.flapStrength * timeBetweenPipes;
    return Math.max(140, maxReachUp * GAME.gapReachFraction);
}

export const COLORS = {
    bg: "#050508",
    grid: "rgba(0, 240, 255, 0.06)",
    bird: "#FFD600",
    birdGlow: "rgba(255, 214, 0, 0.55)",
    pipe: "#00F0FF",
    pipeGlow: "rgba(0, 240, 255, 0.55)",
    flipPipe: "#FF3366",
    flipPipeGlow: "rgba(255, 51, 102, 0.55)",
    particleA: "#00F0FF",
    particleB: "#FF3366",
};

// mulberry32 — small, fast, well-distributed seeded RNG.
// Used for the Daily Challenge so every player sees the same level today.
function createSeededRng(seed) {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randRange(rng, a, b) {
    return a + rng() * (b - a);
}

/**
 * Returns the seed for today's Daily Challenge based on the device's local date.
 * Same date → same seed → identical level layout for everyone playing today.
 */
export function getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function getDailyDateLabel() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

export function createInitialState(viewport, seed = null) {
    const { w, h } = viewport;
    const rng = seed == null ? Math.random : createSeededRng(seed);
    const s = {
        viewport,
        rng,
        bird: {
            x: Math.min(160, w * 0.28),
            y: h / 2,
            vy: 0,
            rotation: 0,
        },
        gravityDir: 1,
        pipes: [],
        particles: [],
        score: 0,
        speed: GAME.pipeSpeed,
        distSinceLastPipe: 0,
        timeSec: 0,
        shake: 0,
        dead: false,
        lastGapY: null, // tracks previous pipe's gap for max-delta clamp
        // Polish state
        slowMoTimer: 0, // close-call slow motion (seconds remaining)
        milestoneFlash: 0, // brief celebratory pulse on milestones (0..1)
        milestoneValue: 0, // value to render in the pulse text
    };
    spawnPipe(s);
    return s;
}

// Milestone scores that trigger a celebratory pulse.
const MILESTONES = new Set([10, 25, 50, 75, 100, 150, 200, 300, 500]);

export function spawnPipe(s) {
    const { w, h } = s.viewport;
    const margin = 70;
    const gap = GAME.pipeGap;
    const minY = margin + gap / 2;
    const maxY = h - margin - gap / 2;
    // Pick a candidate gap Y, then clamp to within safeGapDelta of the previous
    // gap. This guarantees every consecutive pipe is physically reachable.
    let gapY = randRange(s.rng, minY, maxY);
    if (s.lastGapY != null) {
        const delta = safeGapDelta(s.speed);
        const lo = Math.max(minY, s.lastGapY - delta);
        const hi = Math.min(maxY, s.lastGapY + delta);
        if (gapY < lo) gapY = lo;
        else if (gapY > hi) gapY = hi;
    }
    s.lastGapY = gapY;
    const isFlip = s.rng() < GAME.flipPipeChance;
    s.pipes.push({
        x: w + 40,
        gapY,
        gapH: gap,
        scored: false,
        isFlip,
        flipTriggered: false,
    });
}

export function flap(s) {
    s.bird.vy = -GAME.flapStrength * s.gravityDir;
    sfxFlap();
    for (let i = 0; i < 4; i++) {
        s.particles.push({
            x: s.bird.x - 8,
            y: s.bird.y,
            vx: -randRange(s.rng, 60, 140),
            vy: randRange(s.rng, -50, 50) - s.gravityDir * 30,
            life: 0.4,
            maxLife: 0.4,
            color: COLORS.particleA,
            size: randRange(s.rng, 2, 4),
        });
    }
}

function doGravityFlip(s, source) {
    s.gravityDir *= -1;
    s.bird.vy *= -0.5;
    sfxFlip();
    hapticMedium();
    const baseColor = source === "pipe" ? COLORS.particleB : COLORS.particleA;
    for (let i = 0; i < 24; i++) {
        const ang = (Math.PI * 2 * i) / 24;
        const sp = randRange(s.rng, 120, 240);
        s.particles.push({
            x: s.bird.x,
            y: s.bird.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 0.6,
            maxLife: 0.6,
            color: baseColor,
            size: randRange(s.rng, 2, 4),
        });
    }
}

function endRun(s) {
    sfxCrash();
    sfxGameOver();
    hapticHeavy();
    stopMusic();
    s.shake = 0.5;
    for (let i = 0; i < 40; i++) {
        const ang = randRange(s.rng, 0, Math.PI * 2);
        const sp = randRange(s.rng, 60, 320);
        s.particles.push({
            x: s.bird.x,
            y: s.bird.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: randRange(s.rng, 0.5, 1.1),
            maxLife: 1.1,
            color: i % 2 ? COLORS.particleA : COLORS.particleB,
            size: randRange(s.rng, 2, 5),
        });
    }
    s.dead = true;
}

// ====== Sub-step helpers (extracted to keep step() small) ======

function applyBirdPhysics(s, dt) {
    const g = GAME.gravity * s.gravityDir;
    s.bird.vy = Math.max(-GAME.maxFallSpeed, Math.min(GAME.maxFallSpeed, s.bird.vy + g * dt));
    s.bird.y += s.bird.vy * dt;
    s.bird.rotation = Math.max(-0.7, Math.min(0.9, s.bird.vy / 600)) * s.gravityDir;
}

function birdHitsBoundary(s) {
    return (
        s.bird.y + GAME.birdRadius > s.viewport.h ||
        s.bird.y - GAME.birdRadius < 0
    );
}

function advanceWorld(s, dt) {
    const ds = s.speed * dt;
    s.distSinceLastPipe += ds;
    if (s.distSinceLastPipe >= GAME.pipeSpacing) {
        s.distSinceLastPipe = 0;
        spawnPipe(s);
    }
    for (const p of s.pipes) p.x -= ds;
    s.pipes = s.pipes.filter((p) => p.x + GAME.pipeWidth > -10);
}

function processScoringAndFlipPipes(s, onScore) {
    for (const p of s.pipes) {
        if (!p.scored && p.x + GAME.pipeWidth < s.bird.x) {
            p.scored = true;
            s.score += 1;
            s.speed = Math.min(GAME.maxSpeed, s.speed + GAME.speedRamp);
            sfxScore();
            if (MILESTONES.has(s.score)) {
                s.milestoneFlash = 1.0;
                s.milestoneValue = s.score;
            }
            if (onScore) onScore(s.score);
        }
        if (p.isFlip && !p.flipTriggered && p.x + GAME.pipeWidth < s.bird.x) {
            p.flipTriggered = true;
            doGravityFlip(s, "pipe");
        }
    }
}

function birdHitsAnyPipe(s) {
    for (const p of s.pipes) {
        if (
            s.bird.x + GAME.birdRadius > p.x &&
            s.bird.x - GAME.birdRadius < p.x + GAME.pipeWidth
        ) {
            const top = p.gapY - p.gapH / 2;
            const bot = p.gapY + p.gapH / 2;
            if (s.bird.y - GAME.birdRadius < top || s.bird.y + GAME.birdRadius > bot) {
                return true;
            }
        }
    }
    return false;
}

// Detects "close calls" — the bird passing within `closeCallMargin` of a pipe
// edge. When detected, briefly enter slow-motion for cinematic flair.
const CLOSE_CALL_MARGIN = 12; // px
function detectCloseCalls(s) {
    for (const p of s.pipes) {
        if (p.closeCallSeen) continue;
        // Only check while the bird is overlapping the pipe horizontally.
        if (
            s.bird.x + GAME.birdRadius > p.x &&
            s.bird.x - GAME.birdRadius < p.x + GAME.pipeWidth
        ) {
            const top = p.gapY - p.gapH / 2;
            const bot = p.gapY + p.gapH / 2;
            const distTop = s.bird.y - GAME.birdRadius - top;
            const distBot = bot - (s.bird.y + GAME.birdRadius);
            const minDist = Math.min(distTop, distBot);
            if (minDist >= 0 && minDist < CLOSE_CALL_MARGIN) {
                p.closeCallSeen = true;
                // ~0.28s of slow-mo, doesn't stack hard if multiple in a row
                s.slowMoTimer = Math.max(s.slowMoTimer, 0.28);
            }
        }
    }
}

function tickParticles(s, dt) {
    for (const part of s.particles) {
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.life -= dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);
}

// Emits a small cyan/magenta particle behind the ship every frame.
// Particles drift left and fade quickly, creating a continuous trail.
// Color alternates each frame so the trail reads as the icon's two-tone palette.
function emitThrusterParticle(s) {
    const useCyan = Math.floor(s.timeSec * 30) % 2 === 0;
    const color = useCyan ? COLORS.particleA : COLORS.particleB;
    s.particles.push({
        x: s.bird.x - GAME.birdRadius - 2,
        y: s.bird.y + randRange(s.rng, -3, 3),
        vx: -randRange(s.rng, 90, 150),
        vy: randRange(s.rng, -25, 25),
        life: 0.32,
        maxLife: 0.32,
        color,
        size: randRange(s.rng, 1.6, 2.8),
    });
}

function tickEffectTimers(s, dt) {
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
    if (s.slowMoTimer > 0) s.slowMoTimer = Math.max(0, s.slowMoTimer - dt);
    if (s.milestoneFlash > 0) s.milestoneFlash = Math.max(0, s.milestoneFlash - dt * 1.2);
}

/**
 * Advance the game state by `dt` seconds.
 * Returns an event object { died, gravityDir, score } the caller may use
 * to react with React state updates.
 */
export function step(s, dt, callbacks = {}) {
    if (s.dead) return { died: false, gravityDir: s.gravityDir, score: s.score };
    // Apply close-call slow motion (does NOT slow effect timers, only world physics)
    const worldDt = s.slowMoTimer > 0 ? dt * 0.55 : dt;
    s.timeSec += worldDt;

    applyBirdPhysics(s, worldDt);
    emitThrusterParticle(s);

    if (birdHitsBoundary(s)) {
        endRun(s);
        return { died: true, gravityDir: s.gravityDir, score: s.score };
    }

    advanceWorld(s, worldDt);
    processScoringAndFlipPipes(s, callbacks.onScore);
    detectCloseCalls(s);

    if (birdHitsAnyPipe(s)) {
        endRun(s);
        return { died: true, gravityDir: s.gravityDir, score: s.score };
    }

    tickParticles(s, worldDt);
    tickEffectTimers(s, dt);
    return { died: false, gravityDir: s.gravityDir, score: s.score };
}

// ============================================================
// Drawing
// ============================================================

function drawGrid(ctx, w, h, time) {
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const spacing = 60;
    const offset = (time * 60) % spacing || 0;
    ctx.beginPath();
    for (let x = -offset; x < w; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.restore();
}

function drawPipe(ctx, p, h) {
    const color = p.isFlip ? COLORS.flipPipe : COLORS.pipe;
    const glow = p.isFlip ? COLORS.flipPipeGlow : COLORS.pipeGlow;
    const top = p.gapY - p.gapH / 2;
    const bot = p.gapY + p.gapH / 2;

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(p.x, 0, GAME.pipeWidth, top);
    ctx.fillRect(p.x, bot, GAME.pipeWidth, h - bot);

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.strokeRect(p.x + 0.5, 0.5, GAME.pipeWidth - 1, top - 1);
    ctx.strokeRect(p.x + 0.5, bot + 0.5, GAME.pipeWidth - 1, h - bot - 1);

    ctx.fillStyle = color;
    ctx.fillRect(p.x - 4, top - 14, GAME.pipeWidth + 8, 6);
    ctx.fillRect(p.x - 4, bot + 8, GAME.pipeWidth + 8, 6);

    if (p.isFlip) {
        for (let yy = 16; yy < top - 24; yy += 18) {
            ctx.fillRect(p.x + 8, yy, GAME.pipeWidth - 16, 4);
        }
        for (let yy = bot + 24; yy < h - 16; yy += 18) {
            ctx.fillRect(p.x + 8, yy, GAME.pipeWidth - 16, 4);
        }
    }
    ctx.restore();
}

function drawBird(ctx, b, gravityDir) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    ctx.shadowColor = COLORS.birdGlow;
    ctx.shadowBlur = 22;
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.moveTo(GAME.birdRadius + 4, 0);
    ctx.lineTo(-GAME.birdRadius + 2, -GAME.birdRadius);
    ctx.lineTo(-GAME.birdRadius + 8, 0);
    ctx.lineTo(-GAME.birdRadius + 2, GAME.birdRadius);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = gravityDir > 0 ? COLORS.pipe : COLORS.flipPipe;
    ctx.beginPath();
    ctx.moveTo(-GAME.birdRadius + 8, -4);
    ctx.lineTo(-GAME.birdRadius - 6, 0);
    ctx.lineTo(-GAME.birdRadius + 8, 4);
    ctx.closePath();
    ctx.fill();

    // Eye — bigger, two-tone, shifts dramatically with gravity flip for personality.
    // White sclera + dark pupil + tiny highlight = reads as a "face" even at 14px.
    const eyeX = 4;
    const eyeY = -5 * gravityDir;   // larger vertical shift on flip
    // White sclera
    ctx.fillStyle = "#F4F4F5";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 4.2, 0, Math.PI * 2);
    ctx.fill();
    // Dark pupil
    ctx.fillStyle = "#050508";
    ctx.beginPath();
    ctx.arc(eyeX + 0.6, eyeY, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Specular highlight (gives it life)
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(eyeX + 1.4, eyeY - 1, 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawParticles(ctx, particles) {
    for (const part of particles) {
        const alpha = Math.max(0, part.life / part.maxLife);
        ctx.fillStyle = part.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function draw(canvas, s) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, w, h, s ? s.timeSec : 0);
    if (!s) return;

    ctx.save();
    if (s.shake > 0) {
        ctx.translate(randRange(s.rng, -6, 6) * s.shake, randRange(s.rng, -6, 6) * s.shake);
    }

    for (const p of s.pipes) drawPipe(ctx, p, h);
    drawParticles(ctx, s.particles);
    drawBird(ctx, s.bird, s.gravityDir);
    ctx.restore();

    // ===== Polish overlays =====
    // Close-call slow-mo vignette: subtle dark edge gradient while time is slowed
    if (s.slowMoTimer > 0) {
        const intensity = Math.min(1, s.slowMoTimer / 0.28);
        const grad = ctx.createRadialGradient(
            w / 2,
            h / 2,
            Math.min(w, h) * 0.25,
            w / 2,
            h / 2,
            Math.max(w, h) * 0.6
        );
        grad.addColorStop(0, "rgba(0, 240, 255, 0)");
        grad.addColorStop(1, `rgba(0, 240, 255, ${0.18 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // Milestone celebration pulse — large flash number that scales+fades
    if (s.milestoneFlash > 0) {
        const t = s.milestoneFlash; // 1 -> 0
        const scale = 1.6 + (1 - t) * 1.4;
        const alpha = t;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.font = `900 80px "Press Start 2P", "VT323", system-ui, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#FFD600";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "#FFD600";
        ctx.fillText(String(s.milestoneValue), 0, 0);
        ctx.restore();
    }
}
