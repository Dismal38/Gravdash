import React from "react";
import ScoreDisplay from "./gameover/ScoreDisplay";
import NameSubmitForm from "./gameover/NameSubmitForm";
import ShareSection from "./gameover/ShareSection";
import GameOverActions from "./gameover/GameOverActions";

export default function GameOverScreen({
    score,
    highScore,
    isNewHigh,
    globalRank,
    setGlobalRank,
    playerName,
    setPlayerName,
    onRetry,
    onMenu,
    onShowLeaderboard,
}) {
    return (
        <div
            data-ui-overlay="true"
            className="absolute inset-0 z-40 flex items-center justify-center px-4"
            style={{ background: "rgba(5,5,8,0.85)" }}
        >
            <div className="panel w-full max-w-md p-8 text-center" data-testid="gameover-panel">
                <ScoreDisplay
                    score={score}
                    isNewHigh={isNewHigh}
                    highScore={highScore}
                    globalRank={globalRank}
                />
                <NameSubmitForm
                    score={score}
                    playerName={playerName}
                    setPlayerName={setPlayerName}
                    setGlobalRank={setGlobalRank}
                />
                <div className="mt-3 flex flex-col gap-3">
                    <ShareSection
                        score={score}
                        isNewHigh={isNewHigh}
                        globalRank={globalRank}
                        playerName={playerName}
                    />
                    <GameOverActions
                        onRetry={onRetry}
                        onShowLeaderboard={onShowLeaderboard}
                        onMenu={onMenu}
                    />
                </div>
            </div>
        </div>
    );
}
