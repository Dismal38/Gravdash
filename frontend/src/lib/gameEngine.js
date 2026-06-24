// Pure game engine: physics, spawning, and rendering for GRAVDASH.
// No React. No DOM lifecycle. Just functions over a state object.

import {
    sfxFlap,
    sfxScore,
    sfxFlip,
    sfxCrash,
    sfxGameOver,
    sfxMilestoneChime,
    sfxVoidBreach,
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
        flipGraceTimer: 0, // post-flip reduced-gravity window (seconds)
        // Milestone cameos
        guardianTimer: 0, // 100: cyan AI guardian on top of a pipe (seconds remaining)
        guardianPipe: null, // ref to the pipe the guardian sits on
        flockTimer: 0, // 200: background ship flock (seconds remaining)
        flockShips: null, // [{x, y, vx, vy, phase}]
        voidBreachTimer: 0, // 300: VOID BREACH effect (seconds remaining)
        invertedTimer: 0, // 500: grid color invert (seconds remaining)
        cometTimer: 0, // 50: rainbow phoenix-comet (seconds remaining)
        comet: null, // {startX,startY,endX,endY,life,total}
        triggeredCameos: new Set(), // milestones already triggered this run
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
    // Kill most of the bird's momentum on flip so the player doesn't get
    // yanked into a fast dive. Tiny inertial nudge (vy * -0.15) keeps it
    // feeling physical without the snap-dive.
    s.bird.vy *= -0.15;
    // Brief reduced-gravity grace window — gives the player ~0.2 sec to read
    // the new gravity direction before falling/rising kicks in fully.
    s.flipGraceTimer = 0.22;
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
    // During the brief post-flip grace window, gravity is heavily reduced
    // so the bird floats for ~0.2 sec — gives the player time to react to
    // the new gravity direction without being snapped into a dive.
    const graceFactor = s.flipGraceTimer > 0 ? 0.35 : 1;
    const g = GAME.gravity * s.gravityDir * graceFactor;
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

function triggerCameoFor(s, score) {
    if (s.triggeredCameos.has(score)) return;
    s.triggeredCameos.add(score);
    if (score === 50) {
        // 50: rainbow phoenix-comet streaks diagonally across background, right to left
        const { w, h } = s.viewport;
        s.cometTimer = 2.8;
        s.comet = {
            startX: w + 120,
            startY: h * 0.18,
            endX: -180,
            endY: h * 0.42,
            life: 2.8,
            total: 2.8,
        };
    } else if (score === 100) {
        // Find the most recently spawned pipe to sit the guardian on top of
        const upcoming = s.pipes.filter((p) => !p.scored);
        const pipe = upcoming[upcoming.length - 1] || s.pipes[s.pipes.length - 1];
        if (pipe) {
            s.guardianPipe = pipe;
            s.guardianTimer = 3.2;
            sfxMilestoneChime();
        }
    } else if (score === 200) {
        // Spawn a background flock of 7 ships flying across in formation
        const { w, h } = s.viewport;
        s.flockTimer = 4.0;
        s.flockShips = [];
        for (let i = 0; i < 7; i++) {
            s.flockShips.push({
                x: w + 80 + i * 35,
                y: h * 0.18 + (i % 2) * 22 + Math.sin(i) * 14,
                vx: -180,
                vy: 0,
                phase: i * 0.4,
            });
        }
    } else if (score === 300) {
        s.voidBreachTimer = 2.0;
        s.shake = Math.max(s.shake, 0.4);
        sfxVoidBreach();
    } else if (score === 500) {
        s.invertedTimer = 5.0;
    }
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
            triggerCameoFor(s, s.score);
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
    if (s.flipGraceTimer > 0) s.flipGraceTimer = Math.max(0, s.flipGraceTimer - dt);

    // Cameos
    if (s.guardianTimer > 0) {
        s.guardianTimer = Math.max(0, s.guardianTimer - dt);
        if (s.guardianTimer === 0) s.guardianPipe = null;
    }
    if (s.flockTimer > 0) {
        s.flockTimer = Math.max(0, s.flockTimer - dt);
        if (s.flockShips) {
            for (const sh of s.flockShips) {
                sh.x += sh.vx * dt;
                sh.y += Math.sin(s.timeSec * 3 + sh.phase) * 0.6;
            }
        }
        if (s.flockTimer === 0) s.flockShips = null;
    }
    if (s.voidBreachTimer > 0) s.voidBreachTimer = Math.max(0, s.voidBreachTimer - dt);
    if (s.invertedTimer > 0) s.invertedTimer = Math.max(0, s.invertedTimer - dt);
    if (s.cometTimer > 0) {
        s.cometTimer = Math.max(0, s.cometTimer - dt);
        if (s.comet) s.comet.life = s.cometTimer;
        if (s.cometTimer === 0) s.comet = null;
    }
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

// ====== Cameo render helpers ======

// 100-mark: cyan AI guardian sits on top of a pipe, salutes, dissolves into pixels.
function drawGuardian(ctx, s) {
    if (s.guardianTimer <= 0 || !s.guardianPipe) return;
    const p = s.guardianPipe;
    const total = 3.2;
    const t = s.guardianTimer;
    const age = total - t;
    // Guardian sits ON TOP edge of upper pipe segment (just above the gap-top pipe).
    const pipeTop = p.gapY - p.gapH / 2; // y of gap top edge — top pipe ends here
    const gx = p.x + GAME.pipeWidth / 2;
    const gy = pipeTop - 14;

    // Salute animation: arm raises 0.4s → 1.4s, then falls
    const saluteT = Math.max(0, Math.min(1, (age - 0.4) / 1.0));
    const armAngle = -Math.PI / 2 + Math.sin(saluteT * Math.PI) * -0.8;

    // Dissolve: last 0.6s breaks into pixel particles
    const dissolveProgress = Math.max(0, Math.min(1, (age - 2.4) / 0.7));
    const alpha = 1 - dissolveProgress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "#00F0FF";
    ctx.shadowBlur = 14;

    // Body — small cyan rounded rect with a slight glitch jitter
    const jitter = Math.sin(s.timeSec * 50) * 1.2;
    ctx.fillStyle = "#00F0FF";
    ctx.fillRect(gx - 6 + jitter, gy - 12, 12, 14);

    // Single white eye
    ctx.fillStyle = "#F4F4F5";
    ctx.beginPath();
    ctx.arc(gx + jitter, gy - 6, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050508";
    ctx.beginPath();
    ctx.arc(gx + jitter, gy - 6, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Salute arm
    ctx.strokeStyle = "#00F0FF";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(gx + 4 + jitter, gy - 8);
    ctx.lineTo(
        gx + 4 + jitter + Math.cos(armAngle) * 10,
        gy - 8 + Math.sin(armAngle) * 10,
    );
    ctx.stroke();

    // Tiny legs
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx - 3 + jitter, gy + 2);
    ctx.lineTo(gx - 3 + jitter, gy + 6);
    ctx.moveTo(gx + 3 + jitter, gy + 2);
    ctx.lineTo(gx + 3 + jitter, gy + 6);
    ctx.stroke();

    // Dissolve sparkles (last 0.7s)
    if (dissolveProgress > 0) {
        ctx.fillStyle = "#00F0FF";
        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            const r = dissolveProgress * 28;
            const px = gx + Math.cos(ang) * r;
            const py = gy - 4 + Math.sin(ang) * r;
            ctx.fillRect(px - 1, py - 1, 2, 2);
        }
    }
    ctx.restore();
}

// 200-mark: background flock of mini ships flying across the screen.
function drawFlock(ctx, s) {
    if (s.flockTimer <= 0 || !s.flockShips) return;
    const fadeIn = Math.min(1, (4.0 - s.flockTimer) / 0.4);
    const fadeOut = Math.min(1, s.flockTimer / 0.8);
    const alpha = Math.min(fadeIn, fadeOut) * 0.65;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "#FF3366";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FF3366";
    for (const sh of s.flockShips) {
        ctx.beginPath();
        ctx.moveTo(sh.x + 6, sh.y);
        ctx.lineTo(sh.x - 4, sh.y - 4);
        ctx.lineTo(sh.x - 4, sh.y + 4);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// 50-mark: rainbow phoenix-comet streaks diagonally across the background.
// Triangle body with rainbow gradient, single white eye, cyan flame above,
// orange flame trail behind, plus sparks.
function drawComet(ctx, s) {
    if (s.cometTimer <= 0 || !s.comet) return;
    const c = s.comet;
    const t = 1 - c.life / c.total; // 0 -> 1 progress
    const x = c.startX + (c.endX - c.startX) * t;
    // Slight sine wave so it doesn't feel like a straight line
    const baseY = c.startY + (c.endY - c.startY) * t;
    const y = baseY + Math.sin(t * Math.PI * 2.5) * 18;

    // Fade in/out at the edges of the timer
    const fade = Math.min(1, Math.min(c.life / 0.4, (c.total - c.life) / 0.3));

    const size = 22; // half-width of the triangle body

    ctx.save();
    ctx.globalAlpha = fade * 0.85;
    ctx.translate(x, y);
    // Point the triangle in the direction of travel (leftward, with slight tilt)
    const angle = Math.atan2(c.endY - c.startY, c.endX - c.startX);
    ctx.rotate(angle);

    // --- Orange flame trail (drawn first, behind the body) ---
    ctx.shadowColor = "#FF8800";
    ctx.shadowBlur = 18;
    for (let i = 0; i < 10; i++) {
        const flicker = 0.7 + Math.sin(s.timeSec * 18 + i) * 0.3;
        const fx = size + i * 10;
        const fy = Math.sin(i * 0.7 + s.timeSec * 6) * (3 + i * 0.6);
        const fr = (10 - i) * 1.6 * flicker;
        const gradColor = i < 5 ? "#FFD600" : "#FF6600";
        ctx.fillStyle = gradColor;
        ctx.globalAlpha = fade * (0.85 - i * 0.07);
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = fade * 0.85;

    // --- Cyan flame "halo" above the body ---
    ctx.shadowColor = "#00F0FF";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#00F0FF";
    for (let i = 0; i < 5; i++) {
        const flicker = 0.7 + Math.sin(s.timeSec * 22 + i) * 0.3;
        ctx.globalAlpha = fade * (0.6 - i * 0.1);
        ctx.beginPath();
        ctx.arc(-i * 3, -size - 4 - i * 2, (8 - i) * flicker, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = fade * 0.95;

    // --- Triangle body with rainbow gradient ---
    const grad = ctx.createLinearGradient(-size, -size, size, size);
    grad.addColorStop(0, "#FF3366");
    grad.addColorStop(0.25, "#FFD600");
    grad.addColorStop(0.5, "#39FF14");
    grad.addColorStop(0.75, "#00F0FF");
    grad.addColorStop(1, "#A663FF");
    ctx.fillStyle = grad;
    ctx.shadowColor = "#FFFFFF";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-size, 0); // tip (pointing direction of motion = forward = -x in local space)
    ctx.lineTo(size, -size * 0.7);
    ctx.lineTo(size, size * 0.7);
    ctx.closePath();
    ctx.fill();

    // White outline for that "neon outlined" look
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // --- Single white eye in the body ---
    ctx.shadowColor = "#FFFFFF";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(2, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#050508";
    ctx.beginPath();
    ctx.arc(3, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(3.8, -1, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // --- Spark trail (small dots in the flame wake) ---
    ctx.shadowBlur = 0;
    for (let i = 0; i < 14; i++) {
        const sp = size + i * 14 + (i % 3) * 3;
        const sy = Math.sin(i * 1.3 + s.timeSec * 8) * 12;
        const colorRoll = i % 4;
        ctx.fillStyle = ["#FFD600", "#00F0FF", "#FF3366", "#FFFFFF"][colorRoll];
        ctx.globalAlpha = fade * (0.7 - i * 0.04);
        const r = 1.4 + (i % 2) * 0.6;
        ctx.beginPath();
        ctx.arc(sp, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// 300-mark: VOID BREACH banner + chromatic distortion.
function drawVoidBreach(ctx, s, w, h) {
    if (s.voidBreachTimer <= 0) return;
    const total = 2.0;
    const t = s.voidBreachTimer;
    const age = total - t;
    const fadeIn = Math.min(1, age / 0.2);
    const fadeOut = Math.min(1, t / 0.4);
    const alpha = Math.min(fadeIn, fadeOut);

    // Magenta tint overlay
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = "#FF3366";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Centered banner
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 60px "Press Start 2P", "VT323", system-ui, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#FF3366";
    ctx.shadowBlur = 32;
    ctx.fillStyle = "#FF3366";
    ctx.fillText("VOID BREACH", w / 2, h / 2);
    // Cyan chromatic offset duplicate
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = "#00F0FF";
    ctx.fillText("VOID BREACH", w / 2 + 4, h / 2 + 2);
    ctx.restore();
}

export function draw(canvas, s) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 500-mark: inverted grid colors for 5 sec
    const inverted = s && s.invertedTimer > 0;
    ctx.fillStyle = inverted ? "#1a0a1a" : COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    // For inverted mode, temporarily switch grid color
    const savedGrid = COLORS.grid;
    if (inverted) COLORS.grid = "rgba(255, 51, 102, 0.12)";
    drawGrid(ctx, w, h, s ? s.timeSec : 0);
    if (inverted) COLORS.grid = savedGrid;
    if (!s) return;

    ctx.save();
    if (s.shake > 0) {
        ctx.translate(randRange(s.rng, -6, 6) * s.shake, randRange(s.rng, -6, 6) * s.shake);
    }

    // Cameo: 50-mark phoenix-comet streaks across the background
    drawComet(ctx, s);
    // Cameo: 200-mark flock flies behind pipes
    drawFlock(ctx, s);
    for (const p of s.pipes) drawPipe(ctx, p, h);
    drawParticles(ctx, s.particles);
    // Cameo: 100-mark guardian on top of its pipe
    drawGuardian(ctx, s);
    drawBird(ctx, s.bird, s.gravityDir);
    ctx.restore();

    // Cameo: 300-mark VOID BREACH overlay
    drawVoidBreach(ctx, s, w, h);

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
