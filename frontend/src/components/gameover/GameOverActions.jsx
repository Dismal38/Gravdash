import React from "react";

export default function GameOverActions({ onRetry, onMenu }) {
    return (
        <div className="flex gap-3 justify-center">
            <button
                type="button"
                data-testid="retry-button"
                onClick={onRetry}
                className="btn-primary"
                style={{ fontSize: "0.9rem" }}
            >
                ↻ RETRY
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
