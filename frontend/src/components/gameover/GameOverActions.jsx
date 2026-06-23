import React from "react";
import { openPlayStoreForRating } from "../../lib/rateApp";

export default function GameOverActions({ onRetry, onMenu }) {
    return (
        <div className="flex flex-col gap-3 items-stretch">
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
            <button
                type="button"
                data-testid="rate-app-button"
                onClick={openPlayStoreForRating}
                className="btn-ghost mx-auto"
                style={{
                    fontSize: "0.8rem",
                    borderColor: "#FFD600",
                    color: "#FFD600",
                    textShadow: "0 0 10px rgba(255, 214, 0, 0.4)",
                }}
            >
                ★ RATE THIS APP
            </button>
        </div>
    );
}
