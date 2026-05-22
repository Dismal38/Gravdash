import React from "react";
import ScoreDisplay from "./gameover/ScoreDisplay";
import ShareSection from "./gameover/ShareSection";
import GameOverActions from "./gameover/GameOverActions";

export default function GameOverScreen({
    score,
    highScore,
    isNewHigh,
    mode,
    dailyDate,
    playerName,
    setPlayerName,
    onRetry,
    onMenu,
}) {
    const handleNameChange = (e) => {
        setPlayerName(e.target.value.replace(/[^a-zA-Z0-9 _\-.!]/g, "").toUpperCase());
    };

    return (
        <div
            data-ui-overlay="true"
            className="absolute inset-0 z-40 flex items-center justify-center px-4"
            style={{ background: "rgba(5,5,8,0.85)" }}
        >
            <div className="panel w-full max-w-md p-8 text-center" data-testid="gameover-panel">
                {mode === "daily" && (
                    <div
                        className="mb-4 font-mono uppercase tracking-[0.3em] text-[10px]"
                        style={{
                            color: "#39FF14",
                            textShadow: "0 0 8px rgba(57, 255, 20, 0.5)",
                        }}
                        data-testid="gameover-daily-badge"
                    >
                        ★ DAILY CHALLENGE · {dailyDate}
                    </div>
                )}

                <ScoreDisplay
                    score={score}
                    isNewHigh={isNewHigh}
                    highScore={highScore}
                    globalRank={null}
                />

                {/* Optional name field — purely local, used only to personalize the share card */}
                <div className="mt-8">
                    <input
                        data-testid="player-name-input"
                        className="input-arcade"
                        placeholder="YOUR NAME (OPTIONAL)"
                        maxLength={12}
                        value={playerName}
                        onChange={handleNameChange}
                    />
                    <div
                        className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em]"
                        style={{ color: "rgba(244,244,245,0.35)" }}
                    >
                        SHOWS UP ON YOUR SHARE CARD
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    <ShareSection
                        score={score}
                        isNewHigh={isNewHigh}
                        globalRank={null}
                        playerName={playerName}
                    />
                    <GameOverActions onRetry={onRetry} onMenu={onMenu} />
                </div>
            </div>
        </div>
    );
}
