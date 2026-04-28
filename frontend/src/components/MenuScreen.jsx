import React from "react";

export default function MenuScreen({ highScore, onPlay, onLeaderboard }) {
    return (
        <div
            data-ui-overlay="true"
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
                    onClick={onPlay}
                    className="btn-primary"
                    style={{ fontSize: "1rem" }}
                >
                    ▶ PLAY
                </button>
                <button
                    type="button"
                    data-testid="leaderboard-button"
                    onClick={onLeaderboard}
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
                <span style={{ color: "#39FF14" }}>GREEN ORB</span>: FLIP GRAVITY ·{" "}
                <span style={{ color: "#FF3366" }}>RED PIPES</span>: AUTO-FLIP ·{" "}
                <span style={{ color: "#FFD600" }}>EVERY 22S</span>: GLOBAL FLIP
            </div>

            <div
                className="mt-10 font-mono text-xs uppercase tracking-[0.3em]"
                style={{ color: "rgba(244,244,245,0.45)" }}
                data-testid="menu-high-score"
            >
                BEST · {highScore.toString().padStart(4, "0")}
            </div>
        </div>
    );
}
