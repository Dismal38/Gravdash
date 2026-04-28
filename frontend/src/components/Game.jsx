import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import {
    unlockAudio,
    setMuted,
    isMuted,
    sfxFlap,
    sfxScore,
    sfxFlip,
    sfxOrb,
    sfxCrash,
    sfxGameOver,
    startMusic,
    stopMusic,
} from "../lib/audio";
import Leaderboard from "./Leaderboard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HIGH_SCORE_KEY = "gravshift_local_high";

// === Game tuning constants ===
const GAME = {
    birdRadius: 14,
    flapStrength: 360, // px/sec impulse magnitude (always against gravity)
    gravity: 1100, // px/sec^2
    maxFallSpeed: 720,
    pipeSpeed: 200, // px/sec, increases over time
    pipeGap: 200,
    pipeWidth: 70,
    pipeSpacing: 280, // distance between pipe pairs
    flipPipeChance: 0.22, // chance a pipe pair is a flip-pipe
    orbChance: 0.35, // chance an orb spawns between pipes (when not flip pipe)
    autoFlipEverySec: 22, // periodic global gravity flip
    speedRamp: 6, // px/sec gained per scored point
    maxSpeed: 460,
};

const COLORS = {
    bg: "#050508",
    grid: "rgba(0, 240, 255, 0.06)",
    bird: "#FFD600",
    birdGlow: "rgba(255, 214, 0, 0.55)",
    pipe: "#00F0FF",
    pipeGlow: "rgba(0, 240, 255, 0.55)",
    flipPipe: "#FF3366",
    flipPipeGlow: "rgba(255, 51, 102, 0.55)",
    orb: "#39FF14",
    orbGlow: "rgba(57, 255, 20, 0.7)",
    particleA: "#00F0FF",
    particleB: "#FF3366",
};

function nowMs() {
    return performance.now();
}

function randRange(a, b) {
    return a + Math.random() * (b - a);
}

export default function Game() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const stateRef = useRef(null);
    const rafRef = useRef(null);
    const lastTimeRef = useRef(0);

    const [phase, setPhase] = useState("menu"); // menu | playing | paused | gameover | leaderboard
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const raw = localStorage.getItem(HIGH_SCORE_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    });
    const [gravityDir, setGravityDir] = useState(1);
    const [muted, setMutedState] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [playerName, setPlayerName] = useState(
        () => localStorage.getItem("gravshift_name") || "",
    );
    const [submitError, setSubmitError] = useState("");
    const [globalRank, setGlobalRank] = useState(null);

    // ========================================================
    // Canvas sizing
    // ========================================================
    useEffect(() => {
        const handleResize = () => {
            const c = canvasRef.current;
            if (!c) return;
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            c.width = Math.floor(w * dpr);
            c.height = Math.floor(h * dpr);
            c.style.width = w + "px";
            c.style.height = h + "px";
            const ctx = c.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (stateRef.current) {
                stateRef.current.viewport = { w, h };
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // ========================================================
    // Init / reset game state
    // ========================================================
    const initGame = useCallback(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        stateRef.current = {
            viewport: { w, h },
            bird: {
                x: Math.min(160, w * 0.28),
                y: h / 2,
                vy: 0,
                rotation: 0,
            },
            gravityDir: 1,
            pipes: [],
            orbs: [],
            particles: [],
            score: 0,
            speed: GAME.pipeSpeed,
            distSinceLastPipe: 0,
            timeSec: 0,
            timeSinceAutoFlip: 0,
            shake: 0,
            autoFlipFlash: 0,
        };
        spawnPipe(stateRef.current);
        setScore(0);
        setGravityDir(1);
        setSubmitted(false);
        setSubmitError("");
        setGlobalRank(null);
    }, []);

    function spawnPipe(s) {
        const w = s.viewport.w;
        const h = s.viewport.h;
        const margin = 70;
        const gap = GAME.pipeGap;
        const gapY = randRange(margin + gap / 2, h - margin - gap / 2);
        const isFlip = Math.random() < GAME.flipPipeChance;
        s.pipes.push({
            x: w + 40,
            gapY,
            gapH: gap,
            scored: false,
            isFlip,
            flipTriggered: false,
        });
        // Maybe spawn an orb between pipes (not for flip pipes — too much flipping)
        if (!isFlip && Math.random() < GAME.orbChance) {
            const orbX = w + 40 + GAME.pipeSpacing / 2;
            const orbY = randRange(margin + 30, h - margin - 30);
            s.orbs.push({ x: orbX, y: orbY, collected: false, t: 0 });
        }
    }

    // ========================================================
    // Input handling
    // ========================================================
    const flap = useCallback(() => {
        const s = stateRef.current;
        if (!s) return;
        s.bird.vy = -GAME.flapStrength * s.gravityDir;
        sfxFlap();
        // small puff particle
        for (let i = 0; i < 4; i++) {
            s.particles.push({
                x: s.bird.x - 8,
                y: s.bird.y,
                vx: -randRange(60, 140),
                vy: randRange(-50, 50) - s.gravityDir * 30,
                life: 0.4,
                maxLife: 0.4,
                color: COLORS.particleA,
                size: randRange(2, 4),
            });
        }
    }, []);

    const startGame = useCallback(() => {
        unlockAudio();
        startMusic();
        initGame();
        setPhase("playing");
    }, [initGame]);

    const pauseGame = useCallback(() => {
        setPhase((p) => (p === "playing" ? "paused" : p));
    }, []);

    const resumeGame = useCallback(() => {
        setPhase((p) => (p === "paused" ? "playing" : p));
    }, []);

    const quitToMenu = useCallback(() => {
        stopMusic();
        setPhase("menu");
    }, []);

    // Global input listeners
    useEffect(() => {
        const handlePointer = (e) => {
            if (phase === "playing") {
                // ignore taps on UI (pause/mute) — those have their own handlers
                if (e.target && e.target.closest && e.target.closest("[data-ui-overlay]")) return;
                e.preventDefault();
                flap();
            }
        };
        const handleKey = (e) => {
            if (e.code === "Space" || e.code === "ArrowUp") {
                if (phase === "playing") {
                    e.preventDefault();
                    flap();
                } else if (phase === "menu") {
                    e.preventDefault();
                    startGame();
                } else if (phase === "gameover") {
                    e.preventDefault();
                    startGame();
                }
            } else if (e.code === "KeyP") {
                if (phase === "playing") pauseGame();
                else if (phase === "paused") resumeGame();
            } else if (e.code === "KeyM") {
                toggleMute();
            }
        };
        const c = canvasRef.current;
        if (c) {
            c.addEventListener("pointerdown", handlePointer);
        }
        window.addEventListener("keydown", handleKey);
        return () => {
            if (c) c.removeEventListener("pointerdown", handlePointer);
            window.removeEventListener("keydown", handleKey);
        };
    }, [phase, flap, startGame, pauseGame, resumeGame]);

    // ========================================================
    // Main loop
    // ========================================================
    useEffect(() => {
        const tick = (t) => {
            const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000 || 0);
            lastTimeRef.current = t;
            const s = stateRef.current;
            if (s && phase === "playing") {
                step(s, dt);
            }
            draw();
            rafRef.current = requestAnimationFrame(tick);
        };
        lastTimeRef.current = nowMs();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    function step(s, dt) {
        s.timeSec += dt;
        s.timeSinceAutoFlip += dt;

        // Periodic global gravity flip — third gravity-flip mechanic
        if (s.timeSinceAutoFlip >= GAME.autoFlipEverySec) {
            s.timeSinceAutoFlip = 0;
            s.autoFlipFlash = 0.7;
            doGravityFlip(s, "auto");
        }

        // Bird physics
        const g = GAME.gravity * s.gravityDir;
        s.bird.vy += g * dt;
        if (s.bird.vy > GAME.maxFallSpeed) s.bird.vy = GAME.maxFallSpeed;
        if (s.bird.vy < -GAME.maxFallSpeed) s.bird.vy = -GAME.maxFallSpeed;
        s.bird.y += s.bird.vy * dt;
        s.bird.rotation = Math.max(-0.7, Math.min(0.9, s.bird.vy / 600)) * s.gravityDir;

        // Boundaries — instant death
        if (s.bird.y + GAME.birdRadius > s.viewport.h || s.bird.y - GAME.birdRadius < 0) {
            return endRun(s);
        }

        // Pipes
        const ds = s.speed * dt;
        s.distSinceLastPipe += ds;
        if (s.distSinceLastPipe >= GAME.pipeSpacing) {
            s.distSinceLastPipe = 0;
            spawnPipe(s);
        }
        for (const p of s.pipes) {
            p.x -= ds;
        }
        for (const o of s.orbs) {
            o.x -= ds;
            o.t += dt;
        }
        // Cleanup
        s.pipes = s.pipes.filter((p) => p.x + GAME.pipeWidth > -10);
        s.orbs = s.orbs.filter((o) => o.x > -30 && !o.collected);

        // Scoring & flip-pipe trigger
        for (const p of s.pipes) {
            if (!p.scored && p.x + GAME.pipeWidth < s.bird.x) {
                p.scored = true;
                s.score += 1;
                setScore(s.score);
                s.speed = Math.min(GAME.maxSpeed, s.speed + GAME.speedRamp);
                sfxScore();
            }
            if (p.isFlip && !p.flipTriggered && p.x + GAME.pipeWidth < s.bird.x) {
                p.flipTriggered = true;
                doGravityFlip(s, "pipe");
            }
        }

        // Orb collection — first gravity-flip mechanic
        for (const o of s.orbs) {
            if (o.collected) continue;
            const dx = o.x - s.bird.x;
            const dy = o.y - s.bird.y;
            if (dx * dx + dy * dy < (GAME.birdRadius + 14) * (GAME.birdRadius + 14)) {
                o.collected = true;
                sfxOrb();
                doGravityFlip(s, "orb");
            }
        }

        // Pipe collision
        for (const p of s.pipes) {
            if (
                s.bird.x + GAME.birdRadius > p.x &&
                s.bird.x - GAME.birdRadius < p.x + GAME.pipeWidth
            ) {
                const top = p.gapY - p.gapH / 2;
                const bot = p.gapY + p.gapH / 2;
                if (s.bird.y - GAME.birdRadius < top || s.bird.y + GAME.birdRadius > bot) {
                    return endRun(s);
                }
            }
        }

        // Particles
        for (const part of s.particles) {
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.life -= dt;
        }
        s.particles = s.particles.filter((p) => p.life > 0);

        // Effect timers
        if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
        if (s.autoFlipFlash > 0) s.autoFlipFlash = Math.max(0, s.autoFlipFlash - dt);
    }

    function doGravityFlip(s, source) {
        s.gravityDir *= -1;
        setGravityDir(s.gravityDir);
        s.bird.vy *= -0.5;
        sfxFlip();
        // burst particles
        const baseColor = source === "pipe" ? COLORS.particleB : COLORS.particleA;
        for (let i = 0; i < 24; i++) {
            const ang = (Math.PI * 2 * i) / 24;
            const sp = randRange(120, 240);
            s.particles.push({
                x: s.bird.x,
                y: s.bird.y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                life: 0.6,
                maxLife: 0.6,
                color: baseColor,
                size: randRange(2, 4),
            });
        }
    }

    function endRun(s) {
        sfxCrash();
        sfxGameOver();
        stopMusic();
        // big shake + particles
        s.shake = 0.5;
        for (let i = 0; i < 40; i++) {
            const ang = randRange(0, Math.PI * 2);
            const sp = randRange(60, 320);
            s.particles.push({
                x: s.bird.x,
                y: s.bird.y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                life: randRange(0.5, 1.1),
                maxLife: 1.1,
                color: i % 2 ? COLORS.particleA : COLORS.particleB,
                size: randRange(2, 5),
            });
        }
        const finalScore = s.score;
        if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        }
        // fetch global rank
        fetchRank(finalScore);
        setPhase("gameover");
    }

    async function fetchRank(scoreVal) {
        try {
            const r = await axios.get(`${API}/scores/rank`, { params: { score: scoreVal } });
            setGlobalRank(r.data);
        } catch (e) {
            // silent
        }
    }

    // ========================================================
    // Drawing
    // ========================================================
    function draw() {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        const s = stateRef.current;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);

        // Background grid
        drawGrid(ctx, w, h, s ? s.timeSec : 0);

        if (!s) return;

        ctx.save();
        if (s.shake > 0) {
            ctx.translate(randRange(-6, 6) * s.shake, randRange(-6, 6) * s.shake);
        }

        // Auto-flip flash
        if (s.autoFlipFlash > 0) {
            ctx.fillStyle = `rgba(255, 214, 0, ${s.autoFlipFlash * 0.45})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Pipes
        for (const p of s.pipes) {
            drawPipe(ctx, p, h);
        }

        // Orbs
        for (const o of s.orbs) {
            if (o.collected) continue;
            drawOrb(ctx, o);
        }

        // Particles
        for (const part of s.particles) {
            const alpha = Math.max(0, part.life / part.maxLife);
            ctx.fillStyle = part.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Bird
        drawBird(ctx, s.bird, s.gravityDir);

        ctx.restore();
    }

    function drawGrid(ctx, w, h, time) {
        ctx.save();
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        const spacing = 60;
        const offset = ((time * 60) % spacing) || 0;
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

        // horizon glow line
        ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
        ctx.lineWidth = 1;
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

        // gap edge ticks
        ctx.fillStyle = color;
        ctx.fillRect(p.x - 4, top - 14, GAME.pipeWidth + 8, 6);
        ctx.fillRect(p.x - 4, bot + 8, GAME.pipeWidth + 8, 6);

        // flip pipe stripes
        if (p.isFlip) {
            ctx.fillStyle = color;
            for (let yy = 16; yy < top - 24; yy += 18) {
                ctx.fillRect(p.x + 8, yy, GAME.pipeWidth - 16, 4);
            }
            for (let yy = bot + 24; yy < h - 16; yy += 18) {
                ctx.fillRect(p.x + 8, yy, GAME.pipeWidth - 16, 4);
            }
        }
        ctx.restore();
    }

    function drawOrb(ctx, o) {
        ctx.save();
        const pulse = 1 + Math.sin(o.t * 6) * 0.15;
        ctx.shadowColor = COLORS.orbGlow;
        ctx.shadowBlur = 24;
        ctx.fillStyle = COLORS.orb;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 10 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(o.x - 2, o.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // arrows indicating flip
        ctx.strokeStyle = COLORS.orb;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y - 18);
        ctx.lineTo(o.x - 4, o.y - 14);
        ctx.moveTo(o.x, o.y - 18);
        ctx.lineTo(o.x + 4, o.y - 14);
        ctx.moveTo(o.x, o.y + 18);
        ctx.lineTo(o.x - 4, o.y + 14);
        ctx.moveTo(o.x, o.y + 18);
        ctx.lineTo(o.x + 4, o.y + 14);
        ctx.stroke();
        ctx.restore();
    }

    function drawBird(ctx, b, gravityDir) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);
        ctx.shadowColor = COLORS.birdGlow;
        ctx.shadowBlur = 22;
        ctx.fillStyle = COLORS.bird;
        // diamond/triangle ship pointing right
        ctx.beginPath();
        ctx.moveTo(GAME.birdRadius + 4, 0);
        ctx.lineTo(-GAME.birdRadius + 2, -GAME.birdRadius);
        ctx.lineTo(-GAME.birdRadius + 8, 0);
        ctx.lineTo(-GAME.birdRadius + 2, GAME.birdRadius);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        // tail thrust
        ctx.fillStyle = gravityDir > 0 ? COLORS.pipe : COLORS.flipPipe;
        ctx.beginPath();
        ctx.moveTo(-GAME.birdRadius + 8, -4);
        ctx.lineTo(-GAME.birdRadius - 6, 0);
        ctx.lineTo(-GAME.birdRadius + 8, 4);
        ctx.closePath();
        ctx.fill();

        // eye
        ctx.fillStyle = "#050508";
        ctx.beginPath();
        ctx.arc(4, -3 * gravityDir, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ========================================================
    // UI helpers
    // ========================================================
    const toggleMute = useCallback(() => {
        const newMute = !isMuted();
        setMuted(newMute);
        setMutedState(newMute);
    }, []);

    const submitScore = async () => {
        if (submitting || submitted) return;
        const name = (playerName || "").trim().toUpperCase().slice(0, 12);
        if (!name) {
            setSubmitError("Enter a name");
            return;
        }
        setSubmitting(true);
        setSubmitError("");
        try {
            await axios.post(`${API}/scores`, { name, score });
            localStorage.setItem("gravshift_name", name);
            setSubmitted(true);
        } catch (e) {
            setSubmitError("Could not submit. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const isNewHigh = score > 0 && score >= highScore;

    return (
        <div className="App crt-scanlines">
            <canvas
                ref={canvasRef}
                data-testid="game-canvas"
                style={{ position: "absolute", inset: 0, display: "block" }}
            />

            {/* Top corner UI */}
            <div
                data-ui-overlay
                className="absolute top-4 right-4 z-30 flex items-center gap-2"
            >
                <button
                    type="button"
                    onClick={toggleMute}
                    data-testid="mute-toggle"
                    className="btn-ghost"
                    aria-label="Toggle sound"
                >
                    {muted ? "SOUND OFF" : "SOUND ON"}
                </button>
                {phase === "playing" && (
                    <button
                        type="button"
                        onClick={pauseGame}
                        data-testid="pause-button"
                        className="btn-ghost"
                    >
                        ❚❚ PAUSE
                    </button>
                )}
            </div>

            {/* In-game HUD */}
            {phase === "playing" && (
                <>
                    <div
                        className="absolute left-1/2 -translate-x-1/2 top-10 z-20 pointer-events-none font-display"
                        style={{
                            fontSize: "min(18vw, 9rem)",
                            color: "rgba(244,244,245,0.18)",
                            fontWeight: 900,
                        }}
                        data-testid="hud-score"
                    >
                        {score.toString().padStart(2, "0")}
                    </div>
                    <div
                        className="absolute top-4 left-4 z-20 font-mono uppercase text-xs tracking-[0.3em] flex items-center gap-3 pointer-events-none"
                        data-testid="hud-gravity"
                    >
                        <span
                            className={
                                gravityDir > 0 ? "yellow-glow" : "coral-glow"
                            }
                            style={{
                                color: gravityDir > 0 ? "#FFD600" : "#FF3366",
                                fontSize: "1.2rem",
                            }}
                        >
                            {gravityDir > 0 ? "↓" : "↑"}
                        </span>
                        <span style={{ color: "rgba(244,244,245,0.6)" }}>
                            GRAVITY {gravityDir > 0 ? "DOWN" : "UP"}
                        </span>
                    </div>
                </>
            )}

            {/* Main Menu */}
            {phase === "menu" && (
                <div
                    data-ui-overlay
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6"
                >
                    <div
                        className="font-display flicker title-glow"
                        style={{
                            fontSize: "clamp(3rem, 11vw, 8rem)",
                            fontWeight: 900,
                            letterSpacing: "0.02em",
                            color: "#F4F4F5",
                            lineHeight: 1,
                        }}
                        data-testid="game-title"
                    >
                        GRAV-SHIFT
                    </div>
                    <div
                        className="mt-2 font-mono uppercase tracking-[0.4em] text-xs"
                        style={{ color: "rgba(244,244,245,0.4)" }}
                    >
                        ONE TAP // FLIP GRAVITY // SURVIVE
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4">
                        <button
                            type="button"
                            data-testid="play-button"
                            onClick={startGame}
                            className="btn-primary"
                            style={{ fontSize: "1rem" }}
                        >
                            ▶ PLAY
                        </button>
                        <button
                            type="button"
                            data-testid="leaderboard-button"
                            onClick={() => setPhase("leaderboard")}
                            className="btn-secondary"
                        >
                            ◆ LEADERBOARD
                        </button>
                    </div>

                    <div
                        className="mt-12 font-mono text-xs uppercase tracking-[0.3em] text-center max-w-md"
                        style={{ color: "rgba(244,244,245,0.5)" }}
                    >
                        TAP / SPACE: FLAP
                        <br />
                        <span style={{ color: COLORS.orb }}>GREEN ORB</span>: FLIP GRAVITY ·{" "}
                        <span style={{ color: COLORS.flipPipe }}>RED PIPES</span>: AUTO-FLIP ·{" "}
                        <span style={{ color: COLORS.bird }}>EVERY 22S</span>: GLOBAL FLIP
                    </div>

                    <div
                        className="mt-10 font-mono text-xs uppercase tracking-[0.3em]"
                        style={{ color: "rgba(244,244,245,0.45)" }}
                        data-testid="menu-high-score"
                    >
                        BEST · {highScore.toString().padStart(4, "0")}
                    </div>
                </div>
            )}

            {/* Pause */}
            {phase === "paused" && (
                <div
                    data-ui-overlay
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                    style={{ background: "rgba(5,5,8,0.85)" }}
                >
                    <div
                        className="font-display tracking-widest mb-8"
                        style={{ fontSize: "3rem", color: "#F4F4F5" }}
                    >
                        PAUSED
                    </div>
                    <button
                        type="button"
                        data-testid="resume-button"
                        onClick={resumeGame}
                        className="btn-primary"
                    >
                        ▶ RESUME
                    </button>
                    <button
                        type="button"
                        data-testid="quit-button"
                        onClick={quitToMenu}
                        className="btn-secondary mt-4"
                    >
                        ◀ QUIT TO MENU
                    </button>
                </div>
            )}

            {/* Game Over */}
            {phase === "gameover" && (
                <div
                    data-ui-overlay
                    className="absolute inset-0 z-40 flex items-center justify-center px-4"
                    style={{ background: "rgba(5,5,8,0.85)" }}
                >
                    <div
                        className="panel w-full max-w-md p-8 text-center"
                        data-testid="gameover-panel"
                    >
                        <div
                            className="font-display coral-glow"
                            style={{
                                fontSize: "clamp(2.5rem, 7vw, 4rem)",
                                color: COLORS.flipPipe,
                                fontWeight: 900,
                            }}
                        >
                            GAME OVER
                        </div>

                        <div
                            className="font-display mt-4"
                            style={{
                                fontSize: "clamp(3rem, 12vw, 6rem)",
                                color: "#F4F4F5",
                                fontWeight: 900,
                                lineHeight: 1,
                            }}
                            data-testid="final-score"
                        >
                            {score.toString().padStart(4, "0")}
                        </div>

                        {isNewHigh && (
                            <div
                                className="hiscore-blink green-glow font-mono uppercase tracking-[0.4em] text-sm mt-3"
                                style={{ color: COLORS.orb }}
                                data-testid="new-high-badge"
                            >
                                ★ NEW HIGH SCORE ★
                            </div>
                        )}

                        <div
                            className="mt-2 font-mono uppercase tracking-[0.3em] text-xs"
                            style={{ color: "rgba(244,244,245,0.55)" }}
                        >
                            BEST · {Math.max(score, highScore).toString().padStart(4, "0")}
                            {globalRank && (
                                <span style={{ color: COLORS.cyan, marginLeft: 12 }}>
                                    GLOBAL · #{globalRank.rank}
                                </span>
                            )}
                        </div>

                        <div className="mt-8">
                            <input
                                data-testid="player-name-input"
                                className="input-arcade"
                                placeholder="ENTER NAME"
                                maxLength={12}
                                value={playerName}
                                disabled={submitted}
                                onChange={(e) =>
                                    setPlayerName(
                                        e.target.value
                                            .replace(/[^a-zA-Z0-9 _\-.!]/g, "")
                                            .toUpperCase(),
                                    )
                                }
                            />
                            {submitError && (
                                <div
                                    className="mt-2 font-mono text-xs uppercase tracking-widest"
                                    style={{ color: COLORS.flipPipe }}
                                    data-testid="submit-error"
                                >
                                    {submitError}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                type="button"
                                data-testid="submit-score-button"
                                onClick={submitScore}
                                disabled={submitting || submitted || !playerName.trim() || score === 0}
                                className="btn-primary w-full"
                            >
                                {submitted
                                    ? "✓ SUBMITTED"
                                    : submitting
                                      ? "SENDING…"
                                      : "SUBMIT SCORE"}
                            </button>
                            <div className="flex gap-3 justify-center">
                                <button
                                    type="button"
                                    data-testid="retry-button"
                                    onClick={startGame}
                                    className="btn-secondary"
                                >
                                    ↻ RETRY
                                </button>
                                <button
                                    type="button"
                                    data-testid="leaderboard-button-go"
                                    onClick={() => setPhase("leaderboard")}
                                    className="btn-secondary"
                                >
                                    ◆ BOARD
                                </button>
                                <button
                                    type="button"
                                    data-testid="menu-button"
                                    onClick={quitToMenu}
                                    className="btn-ghost"
                                >
                                    MENU
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard view */}
            {phase === "leaderboard" && (
                <Leaderboard
                    onClose={() => setPhase(score > 0 ? "gameover" : "menu")}
                />
            )}
        </div>
    );
}
