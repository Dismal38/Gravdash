import React from "react";

export default function GameOverActions({ onRetry, onShowLeaderboard, onMenu }) {
    return (
        <div className="flex gap-3 justify-center">
            <button
                type="button"
                data-testid="retry-button"
                onClick={onRetry}
                className="btn-secondary"
            >
                ↻ RETRY
            </button>
            <button
                type="button"
                data-testid="leaderboard-button-go"
                onClick={onShowLeaderboard}
                className="btn-secondary"
            >
                ◆ BOARD
            </button>
            <button
                type="button"
                data-testid="menu-button"
                onClick={onMenu}
                className="btn-ghost"
            >
                MENU
            </button>
        </div>
    );
}
