import React, { useEffect, useRef, useState, useCallback } from "react";
import { unlockAudio, setMuted, isMuted, startMusic, stopMusic } from "../lib/audio";
import {
    createInitialState,
    flap as engineFlap,
    getDailySeed,
    getDailyDateLabel,
} from "../lib/gameEngine";
import { readNumber, readString, writeValue } from "../lib/storage";
import MenuScreen from "./MenuScreen";
import HUD from "./HUD";
import PauseScreen from "./PauseScreen";
import GameOverScreen from "./GameOverScreen";
import TutorialOverlay from "./TutorialOverlay";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameInput } from "../hooks/useGameInput";
import { useCanvasResize } from "../hooks/useCanvasResize";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

const HIGH_SCORE_KEY = "gravdash_local_high";
const PLAYER_NAME_KEY = "gravdash_name";
const DAILY_BEST_KEY_PREFIX = "gravdash_daily_";
const TUTORIAL_SEEN_KEY = "gravdash_tutorial_seen";

function dailyBestKey(dateLabel) {
    return `${DAILY_BEST_KEY_PREFIX}${dateLabel}`;
}

export default function Game() {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const phaseRef = useRef("menu");
    const modeRef = useRef("endless");

    const dailyDate = getDailyDateLabel();

    const [phase, setPhase] = useState("menu");
    const [mode, setMode] = useState("endless"); // "endless" | "daily"
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => readNumber(HIGH_SCORE_KEY, 0));
    const [dailyBest, setDailyBest] = useState(() =>
        readNumber(dailyBestKey(dailyDate), 0)
    );
    const [gravityDir, setGravityDir] = useState(1);
    const [muted, setMutedState] = useState(false);
    const [playerName, setPlayerName] = useState(() => readString(PLAYER_NAME_KEY, ""));
    const [exitPrompt, setExitPrompt] = useState(false);
    const [showTutorial, setShowTutorial] = useState(
        () => readNumber(TUTORIAL_SEEN_KEY, 0) === 0
    );

    const dismissTutorial = useCallback(() => {
        setShowTutorial(false);
        writeValue(TUTORIAL_SEEN_KEY, 1);
    }, []);

    const highScoreRef = useRef(highScore);
    const dailyBestRef = useRef(dailyBest);
    useEffect(() => {
        highScoreRef.current = highScore;
    }, [highScore]);
    useEffect(() => {
        dailyBestRef.current = dailyBest;
    }, [dailyBest]);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);
    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useCanvasResize(canvasRef, stateRef);

    const beginRun = useCallback((nextMode) => {
        unlockAudio();
        startMusic();
        const seed = nextMode === "daily" ? getDailySeed() : null;
        stateRef.current = createInitialState(
            { w: window.innerWidth, h: window.innerHeight },
            seed
        );
        setMode(nextMode);
        setScore(0);
        setGravityDir(1);
        setPhase("playing");
    }, []);

    const startGame = useCallback(() => beginRun("endless"), [beginRun]);
    const startDaily = useCallback(() => beginRun("daily"), [beginRun]);

    // Used by input/back-button hooks to restart in whatever mode was last played.
    const restartCurrentMode = useCallback(() => {
        beginRun(modeRef.current);
    }, [beginRun]);

    const pauseGame = useCallback(() => {
        setPhase((p) => (p === "playing" ? "paused" : p));
    }, []);

    const resumeGame = useCallback(() => {
        setPhase((p) => (p === "paused" ? "playing" : p));
    }, []);

    const quitToMenu = useCallback(() => {
        stopMusic();
        stateRef.current = null;
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
            if (modeRef.current === "daily") {
                if (finalScore > dailyBestRef.current) {
                    setDailyBest(finalScore);
                    writeValue(dailyBestKey(dailyDate), finalScore);
                }
            } else if (finalScore > highScoreRef.current) {
                setHighScore(finalScore);
                writeValue(HIGH_SCORE_KEY, finalScore);
            }
            setPhase("gameover");
        },
        [dailyDate]
    );

    const handleSetPlayerName = useCallback((next) => {
        setPlayerName(next);
        if (next && next.trim()) {
            writeValue(PLAYER_NAME_KEY, next.trim().toUpperCase());
        }
    }, []);

    useGameInput({
        canvasRef,
        phaseRef,
        onFlap: handleFlap,
        onStart: restartCurrentMode,
        onPause: pauseGame,
        onResume: resumeGame,
        onMute: toggleMute,
    });

    useAndroidBackButton({
        phaseRef,
        onPause: pauseGame,
        onResume: resumeGame,
        onMenu: quitToMenu,
        onExitPrompt: () => {
            setExitPrompt(true);
            setTimeout(() => setExitPrompt(false), 2000);
        },
    });

    useGameLoop({
        canvasRef,
        stateRef,
        phaseRef,
        onScore: setScore,
        onGravityChange: setGravityDir,
        onDeath: handleDeath,
    });

    const activeBest = mode === "daily" ? dailyBest : highScore;
    const isNewHigh = score > 0 && score >= activeBest;

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

            {phase === "playing" && (
                <HUD score={score} gravityDir={gravityDir} mode={mode} />
            )}

            {phase === "menu" && (
                <MenuScreen
                    highScore={highScore}
                    dailyBest={dailyBest}
                    dailyDate={dailyDate}
                    onPlay={startGame}
                    onPlayDaily={startDaily}
                />
            )}

            {phase === "paused" && <PauseScreen onResume={resumeGame} onQuit={quitToMenu} />}

            {phase === "gameover" && (
                <GameOverScreen
                    score={score}
                    highScore={activeBest}
                    isNewHigh={isNewHigh}
                    mode={mode}
                    dailyDate={dailyDate}
                    playerName={playerName}
                    setPlayerName={handleSetPlayerName}
                    onRetry={restartCurrentMode}
                    onMenu={quitToMenu}
                />
            )}

            {/* Android back-button "press again to exit" toast */}
            {exitPrompt && phase === "menu" && (
                <div
                    data-testid="exit-prompt-toast"
                    className="absolute left-1/2 -translate-x-1/2 bottom-16 z-50 font-mono uppercase tracking-[0.3em] text-xs px-5 py-3 panel"
                    style={{
                        color: "rgba(244,244,245,0.9)",
                        borderColor: "rgba(255, 51, 102, 0.55)",
                        boxShadow: "0 0 24px rgba(255, 51, 102, 0.35)",
                    }}
                >
                    PRESS BACK AGAIN TO EXIT
                </div>
            )}

            {/* First-launch tutorial — sits above everything, skippable */}
            {showTutorial && phase === "menu" && (
                <TutorialOverlay onClose={dismissTutorial} />
            )}
        </div>
    );
}
