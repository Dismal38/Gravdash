import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { unlockAudio, setMuted, isMuted, startMusic, stopMusic } from "../lib/audio";
import { createInitialState, flap as engineFlap } from "../lib/gameEngine";
import Leaderboard from "./Leaderboard";
import MenuScreen from "./MenuScreen";
import HUD from "./HUD";
import PauseScreen from "./PauseScreen";
import GameOverScreen from "./GameOverScreen";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameInput } from "../hooks/useGameInput";
import { useCanvasResize } from "../hooks/useCanvasResize";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HIGH_SCORE_KEY = "gravshift_local_high";
const PLAYER_NAME_KEY = "gravshift_name";

export default function Game() {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
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

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useCanvasResize(canvasRef, stateRef);

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
        if (s) engineFlap(s);
    }, []);

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

    useGameInput({
        canvasRef,
        phaseRef,
        onFlap: handleFlap,
        onStart: startGame,
        onPause: pauseGame,
        onResume: resumeGame,
        onMute: toggleMute,
    });

    useGameLoop({
        canvasRef,
        stateRef,
        phaseRef,
        onScore: setScore,
        onGravityChange: setGravityDir,
        onDeath: handleDeath,
    });

    const isNewHigh = score > 0 && score >= highScore;

    return (
        <div className="App crt-scanlines">
            <canvas
                ref={canvasRef}
                data-testid="game-canvas"
                style={{ position: "absolute", inset: 0, display: "block" }}
            />

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
