import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { unlockAudio, setMuted, isMuted, startMusic, stopMusic } from "../lib/audio";
import {
    createInitialState,
    flap as engineFlap,
    step as engineStep,
    draw as engineDraw,
} from "../lib/gameEngine";
import Leaderboard from "./Leaderboard";
import MenuScreen from "./MenuScreen";
import HUD from "./HUD";
import PauseScreen from "./PauseScreen";
import GameOverScreen from "./GameOverScreen";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HIGH_SCORE_KEY = "gravshift_local_high";
const PLAYER_NAME_KEY = "gravshift_name";

export default function Game() {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const rafRef = useRef(null);
    const lastTimeRef = useRef(0);
    const phaseRef = useRef("menu");

    const [phase, setPhase] = useState("menu");
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const raw = localStorage.getItem(HIGH_SCORE_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    });
    const [gravityDir, setGravityDir] = useState(1);
    const [muted, setMutedState] = useState(false);
    const [globalRank, setGlobalRank] = useState(null);
    const [playerName, setPlayerName] = useState(
        () => localStorage.getItem(PLAYER_NAME_KEY) || "",
    );

    // Keep ref in sync so the rAF loop doesn't restart on phase changes
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // Resize canvas to viewport
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
            c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
            if (stateRef.current) stateRef.current.viewport = { w, h };
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const startGame = useCallback(() => {
        unlockAudio();
        startMusic();
        stateRef.current = createInitialState({
            w: window.innerWidth,
            h: window.innerHeight,
        });
        setScore(0);
        setGravityDir(1);
        setGlobalRank(null);
        setPhase("playing");
    }, []);

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

    const toggleMute = useCallback(() => {
        const nextMuted = !isMuted();
        setMuted(nextMuted);
        setMutedState(nextMuted);
    }, []);

    const handleFlap = useCallback(() => {
        const s = stateRef.current;
        if (!s) return;
        engineFlap(s);
    }, []);

    // After a death, persist high-score and fetch global rank
    const handleDeath = useCallback(
        (finalScore) => {
            stopMusic();
            if (finalScore > highScore) {
                setHighScore(finalScore);
                try {
                    localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
                } catch (e) {
                    console.warn("[GRAV-SHIFT] could not persist high score:", e);
                }
            }
            axios
                .get(`${API}/scores/rank`, { params: { score: finalScore } })
                .then((r) => setGlobalRank(r.data))
                .catch((e) => console.warn("[GRAV-SHIFT] rank fetch failed:", e));
            setPhase("gameover");
        },
        [highScore],
    );

    // Persist player name when it changes
    const handleSetPlayerName = useCallback((next) => {
        setPlayerName(next);
        try {
            if (next && next.trim()) {
                localStorage.setItem(PLAYER_NAME_KEY, next.trim().toUpperCase());
            }
        } catch (e) {
            console.warn("[GRAV-SHIFT] could not persist name:", e);
        }
    }, []);

    // Input listeners
    useEffect(() => {
        const canvasEl = canvasRef.current;
        const onPointer = (e) => {
            if (phaseRef.current !== "playing") return;
            if (e.target && e.target.closest && e.target.closest("[data-ui-overlay='true']")) {
                return;
            }
            e.preventDefault();
            handleFlap();
        };
        const onKey = (e) => {
            const cur = phaseRef.current;
            if (e.code === "Space" || e.code === "ArrowUp") {
                if (cur === "playing") {
                    e.preventDefault();
                    handleFlap();
                } else if (cur === "menu" || cur === "gameover") {
                    e.preventDefault();
                    startGame();
                }
            } else if (e.code === "KeyP") {
                if (cur === "playing") pauseGame();
                else if (cur === "paused") resumeGame();
            } else if (e.code === "KeyM") {
                toggleMute();
            }
        };
        if (canvasEl) canvasEl.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            if (canvasEl) canvasEl.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
    }, [handleFlap, startGame, pauseGame, resumeGame, toggleMute]);

    // rAF loop — single subscription, reads phase from ref so it doesn't churn
    useEffect(() => {
        const tick = (t) => {
            const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000 || 0);
            lastTimeRef.current = t;
            const s = stateRef.current;
            if (s && phaseRef.current === "playing") {
                const result = engineStep(s, dt, {
                    onScore: (newScore) => setScore(newScore),
                });
                if (result.gravityDir !== gravityDir) {
                    setGravityDir(result.gravityDir);
                }
                if (result.died) {
                    handleDeath(result.score);
                }
            }
            engineDraw(canvasRef.current, s);
            rafRef.current = requestAnimationFrame(tick);
        };
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [gravityDir, handleDeath]);

    const isNewHigh = score > 0 && score >= highScore;

    return (
        <div className="App crt-scanlines">
            <canvas
                ref={canvasRef}
                data-testid="game-canvas"
                style={{ position: "absolute", inset: 0, display: "block" }}
            />

            {/* Top corner UI (always visible — z-50 to sit above overlay screens) */}
            <div
                data-ui-overlay="true"
                className="absolute top-4 right-4 z-50 flex items-center gap-2"
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

            {phase === "playing" && <HUD score={score} gravityDir={gravityDir} />}

            {phase === "menu" && (
                <MenuScreen
                    highScore={highScore}
                    onPlay={startGame}
                    onLeaderboard={() => setPhase("leaderboard")}
                />
            )}

            {phase === "paused" && <PauseScreen onResume={resumeGame} onQuit={quitToMenu} />}

            {phase === "gameover" && (
                <GameOverScreen
                    score={score}
                    highScore={highScore}
                    isNewHigh={isNewHigh}
                    globalRank={globalRank}
                    setGlobalRank={setGlobalRank}
                    playerName={playerName}
                    setPlayerName={handleSetPlayerName}
                    onRetry={startGame}
                    onMenu={quitToMenu}
                    onShowLeaderboard={() => setPhase("leaderboard")}
                />
            )}

            {phase === "leaderboard" && (
                <Leaderboard onClose={() => setPhase(score > 0 ? "gameover" : "menu")} />
            )}
        </div>
    );
}
